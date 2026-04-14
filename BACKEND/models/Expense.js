const mongoose = require('mongoose');

// ── Per-person split entry ────────────────────────────────────────────────
const splitSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:     { type: Number, required: true },   // absolute amount owed
  percentage: { type: Number },                   // only if splitType === 'percentage'
});

// ── A single receipt line item ────────────────────────────────────────────
const lineItemSchema = new mongoose.Schema({
  description: { type: String },
  quantity:    { type: Number },
  unit_price:  { type: Number },
  total_price: { type: Number },

  // Sub-group: which members share this line item
  splitAmong:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Optional tag for categorisation (e.g. "veg", "non-veg", "drinks")
  category:    { type: String, default: '' },
});

const expenseSchema = new mongoose.Schema({
  group:           { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  description:     { type: String, required: true },
  totalAmount:     { type: Number, required: true },
  currency:        { type: String, default: 'INR' },
  convertedAmount: { type: Number, required: true },
  exchangeRate:    { type: Number, default: 1 },
  paidBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitType:       { type: String, enum: ['equal', 'percentage', 'itemized'], default: 'equal' },
  splits:          [splitSchema],

  // ── Itemized receipt data ─────────────────────────────────────────────
  lineItems:       [lineItemSchema],  // populated when splitType === 'itemized'
  billImage:       { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);