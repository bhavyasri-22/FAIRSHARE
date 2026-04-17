const Group = require('../models/Group');
const User = require('../models/User');
const generateInviteCode = require('../utils/generateInviteCode');

// Helper — safely convert Mongoose Map or plain object to JS object
function toPlainBalances(balances) {
  if (!balances) return {};
  if (balances instanceof Map) return Object.fromEntries(balances);
  if (typeof balances.toObject === 'function') return balances.toObject();
  return { ...balances };
}

// Create Group
exports.createGroup = async (req, res) => {
  try {
    const { name, currency = 'INR' } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    // Generate unique invite code
    let code;
    let exists = true;
    while (exists) {
      code = generateInviteCode();
      exists = await Group.findOne({ inviteCode: code });
    }

    const group = await Group.create({
      name,
      currency: currency.toUpperCase(),
      createdBy: req.user._id,
      inviteCode: code,
      members: [req.user._id],
      balances: { [req.user._id]: 0 }
    });

    // Add group to user's groups
    req.user.groups.push(group._id);
    await req.user.save();

    res.status(201).json({ success: true, data: group });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Join Group
exports.joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ success: false, message: 'Invite code required' });

    const group = await Group.findOne({ inviteCode });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Prevent duplicate join
    if (group.members.map(String).includes(String(req.user._id))) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    group.members.push(req.user._id);

    // ✅ Use plain object instead of .set()
    const balances = toPlainBalances(group.balances);
    balances[String(req.user._id)] = 0;
    group.balances = balances;

    await group.save();

    req.user.groups.push(group._id);
    await req.user.save();

    // Emit member_joined and notify existing members
    try {
      const { io } = require('../server');
      const groupIdStr = group._id.toString();
      
      // 1. Emit to group room (for chat/active views)
      io.to(groupIdStr).emit('member_joined', { 
        groupId: group._id, 
        member: { _id: req.user._id, name: req.user.name, email: req.user.email } 
      });

      // 2. Notify existing members via personal rooms (for background refresh)
      // group.members already includes the new member at this point
      group.members.forEach(memberId => {
        const mid = String(memberId);
        if (mid === String(req.user._id)) return; // skip the person who just joined
        
        io.to(`user_${mid}`).emit('notification', {
          type: 'member_joined',
          groupId: groupIdStr,
          groupName: group.name,
          message: `${req.user.name} joined ${group.name}`,
          at: new Date().toISOString(),
        });
      });
    } catch(err) {
      console.error('Socket emit err:', err);
    }

    res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Fetch User Groups
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .select('name members inviteCode balances currency')
      .populate('members', 'name email');

    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Remove Member
exports.removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Ensure requesting user is admin
    if (String(group.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admin can remove members' });
    }

    // Can't remove admin
    if (String(memberId) === String(group.createdBy)) {
      return res.status(400).json({ success: false, message: 'Cannot remove the admin' });
    }

    if (!group.members.map(String).includes(String(memberId))) {
      return res.status(400).json({ success: false, message: 'Not a member' });
    }

    // Remove from group
    group.members = group.members.filter(id => String(id) !== String(memberId));
    const balances = toPlainBalances(group.balances);
    delete balances[String(memberId)];
    group.balances = balances;
    await group.save();

    // Remove group from User's groups
    await User.findByIdAndUpdate(memberId, { $pull: { groups: group._id } });

    // Notify all members (including removed one) to refresh their group data
    try {
      const { io } = require('../server');
      const groupIdStr = group._id.toString();
      
      // Join existing members + the one being removed
      const allAffected = [...group.members.map(String), String(memberId)];
      
      allAffected.forEach(mid => {
        io.to(`user_${mid}`).emit('notification', {
          type: 'member_removed',
          groupId: groupIdStr,
          groupName: group.name,
          message: mid === String(memberId) ? `You were removed from ${group.name}` : `A member was removed from ${group.name}`,
          at: new Date().toISOString(),
        });
      });
    } catch(err) {
      console.error('Socket emit err:', err);
    }

    res.status(200).json({ success: true, message: 'Member removed' });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Leave Group
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = String(req.user._id);

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Verify membership
    if (!group.members.map(String).includes(userId)) {
      return res.status(400).json({ success: false, message: 'You are not a member of this group' });
    }

    // Check balance — user must be settled
    const balances = toPlainBalances(group.balances);
    const balance = balances[userId] || 0;

    if (Math.abs(balance) >= 0.01) {
      return res.status(400).json({ 
        success: false, 
        message: `Current balance is ${group.currency} ${balance.toFixed(2)}. Please settle up before leaving.` 
      });
    }

    // Creator check: they can't leave if there are others (ownership transfer not supported)
    if (String(group.createdBy) === userId && group.members.length > 1) {
      return res.status(400).json({ success: false, message: 'As the creator, you cannot leave while there are other members.' });
    }

    // Remove from group
    group.members = group.members.filter(id => String(id) !== userId);
    delete balances[userId];
    group.balances = balances;
    await group.save();

    // Remove from user
    req.user.groups = req.user.groups.filter(id => String(id) !== String(group._id));
    await req.user.save();

    // Notify others
    try {
      const { io } = require('../server');
      const groupIdStr = group._id.toString();
      
      group.members.forEach(mid => {
        io.to(`user_${mid}`).emit('notification', {
          type: 'member_removed',
          groupId: groupIdStr,
          groupName: group.name,
          message: `${req.user.name} has left the group`,
          at: new Date().toISOString(),
        });
      });
    } catch(err) {
      console.error('Socket emit err:', err);
    }

    res.status(200).json({ success: true, message: 'You have left the group' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};