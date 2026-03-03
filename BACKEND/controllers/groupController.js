const Group = require('../models/Group');
const User = require('../models/User');
const generateInviteCode = require('../utils/generateInviteCode');

// Create Group
exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
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
    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    group.members.push(req.user._id);
    group.balances.set(req.user._id.toString(), 0);
    await group.save();

    req.user.groups.push(group._id);
    await req.user.save();

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
      .select('name members inviteCode balances')
      .populate('members', 'name email');

    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};