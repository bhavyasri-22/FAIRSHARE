const Settlement = require('../models/Settlement');
const Group      = require('../models/Group');

function toPlainBalances(balances) {
  if (!balances) return {};
  if (balances instanceof Map) return Object.fromEntries(balances);
  if (typeof balances.toObject === 'function') return balances.toObject();
  return { ...balances };
}

// RECORD A SETTLEMENT
exports.recordSettlement = async (req, res) => {
  try {
    const { groupId, paidTo, amount, note } = req.body;

    if (!groupId || !paidTo || !amount) {
      return res.status(400).json({ success: false, message: 'groupId, paidTo, and amount are required' });
    }

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m._id));

    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }
    if (!groupMemberIds.includes(String(paidTo))) {
      return res.status(400).json({ success: false, message: 'paidTo user is not a group member' });
    }
    if (String(req.user._id) === String(paidTo)) {
      return res.status(400).json({ success: false, message: 'You cannot settle with yourself' });
    }

    // ── Update group balances ─────────────────────────────
    const balances   = toPlainBalances(group.balances);
    const payerId    = String(req.user._id);
    const receiverId = String(paidTo);

    balances[payerId]    = (balances[payerId]    || 0) + parseFloat(amount);
    balances[receiverId] = (balances[receiverId] || 0) - parseFloat(amount);

    group.balances = balances;
    await group.save();

    // ── Save settlement record ────────────────────────────
    const settlement = await Settlement.create({
      group:  groupId,
      paidBy: req.user._id,
      paidTo,
      amount: parseFloat(amount),
      currency: group.currency || 'INR',
      note: note || ''
    });

    const populated = await settlement.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'paidTo', select: 'name email' }
    ]);

    // ── Emit notification to the receiver ────────────────
    try {
      const { io } = require('../server');
      const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ' };
      const currSym = sym[group.currency] || (group.currency + ' ');

      const notification = {
        type:      'settlement_recorded',
        groupId,
        groupName: group.name,
        message:   `${req.user.name} paid you ${currSym}${parseFloat(amount).toFixed(2)} in ${group.name}`,
        at:        new Date().toISOString(),
      };

      // Notify the receiver
      io.to(`user_${receiverId}`).emit('notification', notification);

      // Also broadcast balance refresh to the group room
      io.to(groupId.toString()).emit('settlement_recorded', { groupId });
    } catch (notifErr) {
      console.error('Notification emit error:', notifErr.message);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET SETTLEMENT HISTORY FOR A GROUP
exports.getSettlementHistory = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m));
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const history = await Settlement.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('paidTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};