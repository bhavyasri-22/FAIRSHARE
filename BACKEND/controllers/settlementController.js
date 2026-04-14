const Settlement = require('../models/Settlement');
const Group      = require('../models/Group');
const { updateBalances } = require('../utils/balance');

// ── RECORD MANUAL SETTLEMENT ───────────────────────────────────────────
// POST /api/settlements
// Body: { groupId, paidTo, amount, note }
exports.recordSettlement = async (req, res) => {
  try {
    const { groupId, paidTo, amount, note } = req.body;

    // ── Basic validation ─────────────────────────────────────────────
    if (!groupId || !paidTo || !amount) {
      return res.status(400).json({
        success: false,
        message: 'groupId, paidTo and amount are required',
      });
    }

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    // ── Fetch group ──────────────────────────────────────────────────
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const groupMemberIds = group.members.map(m => String(m._id));

    // ── Validate membership ──────────────────────────────────────────
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    if (!groupMemberIds.includes(String(paidTo))) {
      return res.status(400).json({
        success: false,
        message: 'paidTo is not a group member',
      });
    }

    if (String(req.user._id) === String(paidTo)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot settle with yourself',
      });
    }

    // ── Update balances using shared logic ───────────────────────────
    const payerId    = req.user._id;
    const receiverId = paidTo;

    updateBalances(group, payerId, receiverId, parsedAmt);
    await group.save();

    // ── Save settlement ──────────────────────────────────────────────
    const settlement = await Settlement.create({
      group: groupId,
      paidBy: payerId,
      paidTo: receiverId,
      amount: parsedAmt,
      currency: group.currency || 'INR',
      note: note || '',
    });

    const populated = await settlement.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'paidTo', select: 'name email' },
    ]);

    // ── Optional: socket notification (same style as paymentController)
    try {
      const { io } = require('../server');

      const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
      const currSym = sym[group.currency] || (group.currency + ' ');

      io.to(`user_${receiverId}`).emit('notification', {
        type: 'manual_settlement',
        groupId,
        groupName: group.name,
        message: `${req.user.name} marked ₹${parsedAmt.toFixed(2)} as paid in ${group.name}`,
        at: new Date().toISOString(),
      });

      io.to(groupId.toString()).emit('settlement_recorded', { groupId });

    } catch (err) {
      console.error('Socket error:', err.message);
    }

    // ── Response ─────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      data: populated,
    });

  } catch (err) {
    console.error('recordSettlement error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server Error',
    });
  }
};


// ── GET SETTLEMENT HISTORY ─────────────────────────────────────────────
// GET /api/settlements/:groupId
exports.getSettlementHistory = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const groupMemberIds = group.members.map(m => String(m));
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({
        success: false,
        message: 'Not a group member',
      });
    }

    const settlements = await Settlement.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('paidTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: settlements,
    });

  } catch (err) {
    console.error('getSettlementHistory error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};