const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  balances: { type: Map, of: Number, default: {} }.default,
   currency: { type: String, default: 'INR' }
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);