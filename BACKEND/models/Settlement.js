const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  group:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true }, // who paid
  paidTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true }, // who received
  amount:   { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  note:     { type: String, default: '' },

  // ── Razorpay fields (populated after a successful online payment) ──
  razorpayOrderId:   { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Settlement', settlementSchema);