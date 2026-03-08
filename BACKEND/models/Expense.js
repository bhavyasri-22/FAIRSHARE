const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },      // absolute amount owed
  percentage: { type: Number }                   // only if splitType is 'percentage'
});

const expenseSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  description: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },         // ✅ currency of this expense
  convertedAmount: { type: Number, required: true },   // ✅ amount in group base currency
  exchangeRate: { type: Number, default: 1 },  
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitType: { type: String, enum: ['equal', 'percentage'], default: 'equal' },
  splits: [splitSchema]
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);