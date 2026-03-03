const Expense = require('../models/Expense');
const Group = require('../models/Group');

// ADD EXPENSE
exports.addExpense = async (req, res) => {
  try {
    const { groupId, description, totalAmount, splitType, splits } = req.body;

    // --- Validation ---
    if (!groupId || !description || !totalAmount || !splitType) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Only members can add expenses
    if (!group.members.map(String).includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    let computedSplits = [];

    if (splitType === 'equal') {
      const share = parseFloat((totalAmount / group.members.length).toFixed(2));
      computedSplits = group.members.map(memberId => ({
        user: memberId,
        amount: share
      }));

    } else if (splitType === 'percentage') {
      if (!splits || !Array.isArray(splits)) {
        return res.status(400).json({ success: false, message: 'Splits array required for percentage split' });
      }

      // Validate percentages sum to 100
      const total = splits.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.round(total) !== 100) {
        return res.status(400).json({ success: false, message: 'Percentages must total 100' });
      }

      computedSplits = splits.map(s => ({
        user: s.userId,
        amount: parseFloat(((s.percentage / 100) * totalAmount).toFixed(2)),
        percentage: s.percentage
      }));
    }

    const expense = await Expense.create({
      group: groupId,
      description,
      totalAmount,
      paidBy: req.user._id,
      splitType,
      splits: computedSplits
    });

    // --- Update group balances ---
    // paidBy gets credited the full amount
    const payerId = String(req.user._id);
    const currentPayerBal = group.balances.get(payerId) || 0;
    group.balances.set(payerId, currentPayerBal + totalAmount);

    // Each person in splits gets debited their share
    for (const split of computedSplits) {
      const uid = String(split.user);
      const current = group.balances.get(uid) || 0;
      group.balances.set(uid, current - split.amount);
    }

    await group.save();

    const populated = await expense.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'splits.user', select: 'name email' }
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET EXPENSES FOR A GROUP
exports.getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (!group.members.map(String).includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: expenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('members', 'name email');
      
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (!group.members.map(m => String(m._id)).includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ createdAt: -1 });

    // Build balance summary
    const balanceSummary = group.members.map(member => {
      const balance = group.balances.get(String(member._id)) || 0;
      return {
        user: { id: member._id, name: member.name, email: member.email },
        balance: parseFloat(balance.toFixed(2)),
        status: balance > 0 ? `is owed ₹${balance.toFixed(2)}`
               : balance < 0 ? `owes ₹${Math.abs(balance).toFixed(2)}`
               : 'is settled up'
      };
    });

    res.status(200).json({ 
      success: true, 
      data: {
        expenses,         // list of all expenses
        balanceSummary    // net balance per person
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};