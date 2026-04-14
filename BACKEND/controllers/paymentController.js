const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const Settlement = require('../models/Settlement');
const Group      = require('../models/Group');

// ── Razorpay instance (reads keys from .env) ─────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function toPlainBalances(balances) {
  if (!balances) return {};
  if (balances instanceof Map) return Object.fromEntries(balances);
  if (typeof balances.toObject === 'function') return balances.toObject();
  return { ...balances };
}

// ── CREATE ORDER ─────────────────────────────────────────────────────────
// POST /api/payments/create-order
// Body: { groupId, paidTo, amount, note }
exports.createOrder = async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'paidTo is not a group member' });
    }
    if (String(req.user._id) === String(paidTo)) {
      return res.status(400).json({ success: false, message: 'Cannot pay yourself' });
    }

    // Razorpay amounts are in the smallest currency unit (paise for INR)
    const currency      = group.currency || 'INR';
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency,
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        groupId:  String(groupId),
        paidTo:   String(paidTo),
        paidBy:   String(req.user._id),
        note:     note || '',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId:  order.id,
        amount:   order.amount,       // in paise
        currency: order.currency,
        keyId:    process.env.RAZORPAY_KEY_ID,  // needed by frontend SDK
      },
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
};

// ── VERIFY PAYMENT & RECORD SETTLEMENT ───────────────────────────────────
// POST /api/payments/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, groupId, paidTo, amount, note }
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      groupId,
      paidTo,
      amount,
      note,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay payment fields' });
    }

    // ── Signature verification ────────────────────────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
    }

    // ── Update group balances (same logic as recordSettlement) ────────
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m._id));
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const { updateBalances } = require('../utils/balance');

const payerId    = req.user._id;
const receiverId = paidTo;
const parsedAmt  = parseFloat(amount);

updateBalances(group, payerId, receiverId, parsedAmt);
await group.save();


    // ── Persist settlement with payment reference ─────────────────────
    const settlement = await Settlement.create({
      group:            groupId,
      paidBy:           req.user._id,
      paidTo,
      amount:           parsedAmt,
      currency:         group.currency || 'INR',
      note:             note || '',
      razorpayOrderId:  razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    const populated = await settlement.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'paidTo', select: 'name email' },
    ]);

    // ── Real-time notification to receiver ────────────────────────────
    try {
      const { io } = require('../server');
      const sym      = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
      const currSym  = sym[group.currency] || (group.currency + ' ');

      io.to(`user_${receiverId}`).emit('notification', {
        type:      'payment_received',
        groupId,
        groupName: group.name,
        message:   `${req.user.name} paid you ${currSym}${parsedAmt.toFixed(2)} via Razorpay in ${group.name}`,
        at:        new Date().toISOString(),
      });

      io.to(groupId.toString()).emit('settlement_recorded', { groupId });
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
};

// ── PAYMENT HISTORY ───────────────────────────────────────────────────────
// GET /api/payments/:groupId
exports.getPaymentHistory = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m));
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    // Return only settlements that went through Razorpay (have a paymentId)
    const payments = await Settlement.find({
      group: groupId,
      razorpayPaymentId: { $exists: true, $ne: '' },
    })
      .populate('paidBy', 'name email')
      .populate('paidTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error('getPaymentHistory error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};