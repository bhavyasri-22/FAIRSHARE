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

    // Emit member_joined
    try {
      const { io } = require('../server');
      io.to(group._id.toString()).emit('member_joined', { 
        groupId: group._id, 
        member: { _id: req.user._id, name: req.user.name, email: req.user.email } 
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

    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};