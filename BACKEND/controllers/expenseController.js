const Expense = require('../models/Expense');
const Group = require('../models/Group');

// ADD EXPENSE
exports.addExpense = async (req, res) => {
  try {
    const { groupId, description, totalAmount, splitType, splits, splitAmong } = req.body;

    // --- Validation ---
    if (!groupId || !description || !totalAmount || !splitType) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m._id));

    // Only members can add expenses
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    let computedSplits = [];

    if (splitType === 'equal') {
      // splitAmong: optional array of userIds to split among
      // if not provided, split among all group members
      let targetMembers;

      if (splitAmong && Array.isArray(splitAmong) && splitAmong.length > 0) {
        // Validate all provided userIds are group members
        const invalidMembers = splitAmong.filter(id => !groupMemberIds.includes(String(id)));
        if (invalidMembers.length > 0) {
          return res.status(400).json({ success: false, message: 'splitAmong contains non-members' });
        }
        targetMembers = splitAmong;
      } else {
        targetMembers = groupMemberIds;
      }

      const share = parseFloat((totalAmount / targetMembers.length).toFixed(2));
      computedSplits = targetMembers.map(userId => ({
        user: userId,
        amount: share
      }));

    } else if (splitType === 'percentage') {
      if (!splits || !Array.isArray(splits)) {
        return res.status(400).json({ success: false, message: 'Splits array required for percentage split' });
      }

      // Validate all users are group members
      const invalidMembers = splits.filter(s => !groupMemberIds.includes(String(s.userId)));
      if (invalidMembers.length > 0) {
        return res.status(400).json({ success: false, message: 'Splits contain non-members' });
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
    const payerId = String(req.user._id);
    const currentPayerBal = group.balances.get(payerId) || 0;
    group.balances.set(payerId, currentPayerBal + totalAmount);

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

// GET EXPENSES + BALANCE SUMMARY FOR A GROUP
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
      data: { expenses, balanceSummary }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET SETTLEMENT PLAN
exports.getSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (!group.members.map(m => String(m._id)).includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    // Build balances array
    let balances = group.members.map(member => ({
      id: String(member._id),
      name: member.name,
      balance: parseFloat((group.balances.get(String(member._id)) || 0).toFixed(2))
    }));

    // Separate into creditors (owed money) and debtors (owe money)
    let creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    let debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    const settlements = [];

    // Greedy algorithm — match largest debtor to largest creditor
    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];

      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
      const settled = parseFloat(amount.toFixed(2));

      settlements.push({
        from: { id: debtor.id, name: debtor.name },
        to: { id: creditor.id, name: creditor.name },
        amount: settled,
        description: `${debtor.name} should pay ₹${settled} to ${creditor.name}`
      });

      creditor.balance -= settled;
      debtor.balance += settled;

      if (creditor.balance === 0) creditors.shift();
      if (debtor.balance === 0) debtors.shift();
    }

    res.status(200).json({ success: true, data: settlements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

