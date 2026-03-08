const Expense = require('../models/Expense');
const Group = require('../models/Group');
const getExchangeRate = require('../utils/getExchangeRate');

// Helper — safely convert Mongoose Map or plain object to JS object
function toPlainBalances(balances) {
  if (!balances) return {};
  if (balances instanceof Map) return Object.fromEntries(balances);
  if (typeof balances.toObject === 'function') return balances.toObject();
  return { ...balances };
}

// ADD EXPENSE
exports.addExpense = async (req, res) => {
  try {
    const { groupId, description, totalAmount, currency, splitType, splits, splitAmong } = req.body;

    if (!groupId || !description || !totalAmount || !splitType) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m._id));

    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    // ── Currency conversion ──────────────────────────────
    const expenseCurrency = (currency || group.currency || 'INR').toUpperCase();
    const groupCurrency = (group.currency || 'INR').toUpperCase();
    let exchangeRate = 1;
    let convertedAmount = totalAmount;

    if (expenseCurrency !== groupCurrency) {
      exchangeRate = await getExchangeRate(expenseCurrency, groupCurrency);
      convertedAmount = parseFloat((totalAmount * exchangeRate).toFixed(2));
    }

    // ── Build splits using converted amount ──────────────
    let computedSplits = [];

    if (splitType === 'equal') {
      let targetMembers = groupMemberIds;

      if (splitAmong && Array.isArray(splitAmong) && splitAmong.length > 0) {
        const invalid = splitAmong.filter(id => !groupMemberIds.includes(String(id)));
        if (invalid.length > 0) {
          return res.status(400).json({ success: false, message: 'splitAmong contains non-members' });
        }
        targetMembers = splitAmong;
      }

      const share = parseFloat((convertedAmount / targetMembers.length).toFixed(2));
      computedSplits = targetMembers.map(userId => ({ user: userId, amount: share }));

    } else if (splitType === 'percentage') {
      if (!splits || !Array.isArray(splits)) {
        return res.status(400).json({ success: false, message: 'Splits array required for percentage split' });
      }

      const invalid = splits.filter(s => !groupMemberIds.includes(String(s.userId)));
      if (invalid.length > 0) {
        return res.status(400).json({ success: false, message: 'Splits contain non-members' });
      }

      const total = splits.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.round(total) !== 100) {
        return res.status(400).json({ success: false, message: 'Percentages must total 100' });
      }

      computedSplits = splits.map(s => ({
        user: s.userId,
        amount: parseFloat(((s.percentage / 100) * convertedAmount).toFixed(2)),
        percentage: s.percentage
      }));
    }

    // ── Save expense ─────────────────────────────────────
    const expense = await Expense.create({
      group: groupId,
      description,
      totalAmount,
      currency: expenseCurrency,
      convertedAmount,
      exchangeRate,
      paidBy: req.user._id,
      splitType,
      splits: computedSplits
    });

    // ── Update group balances ─────────────────────────────
    const balances = toPlainBalances(group.balances);

    const payerId = String(req.user._id);
    balances[payerId] = (balances[payerId] || 0) + convertedAmount;

    for (const split of computedSplits) {
      const uid = String(split.user);
      balances[uid] = (balances[uid] || 0) - split.amount;
    }

    group.balances = balances;
    await group.save();

    const populated = await expense.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'splits.user', select: 'name email' }
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
};

// GET EXPENSES + BALANCE SUMMARY FOR A GROUP
exports.getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const groupMemberIds = group.members.map(m => String(m._id));
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ createdAt: -1 });

    // ── Build balance summary ─────────────────────────────
    const balances = toPlainBalances(group.balances);
    const groupCurrency = group.currency || 'INR';

    const balanceSummary = group.members.map(member => {
      const balance = parseFloat((balances[String(member._id)] || 0).toFixed(2));
      return {
        user: { id: member._id, name: member.name, email: member.email },
        balance,
        currency: groupCurrency,
        status: balance > 0
          ? `is owed ${groupCurrency} ${balance.toFixed(2)}`
          : balance < 0
          ? `owes ${groupCurrency} ${Math.abs(balance).toFixed(2)}`
          : 'is settled up'
      };
    });

    res.status(200).json({
      success: true,
      data: { expenses, balanceSummary, groupCurrency }
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

    const groupMemberIds = group.members.map(m => String(m._id));
    if (!groupMemberIds.includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    const balances = toPlainBalances(group.balances);
    const groupCurrency = group.currency || 'INR';

    // Build balances array
    let balanceList = group.members.map(member => ({
      id: String(member._id),
      name: member.name,
      balance: parseFloat((balances[String(member._id)] || 0).toFixed(2))
    }));

    // Separate creditors and debtors
    let creditors = balanceList.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    let debtors   = balanceList.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    const settlements = [];

    // Greedy algorithm — minimum transactions
    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor   = debtors[0];

      const amount  = Math.min(creditor.balance, Math.abs(debtor.balance));
      const settled = parseFloat(amount.toFixed(2));

      settlements.push({
        from: { id: debtor.id,   name: debtor.name },
        to:   { id: creditor.id, name: creditor.name },
        amount: settled,
        currency: groupCurrency,
        description: `${debtor.name} should pay ${groupCurrency} ${settled} to ${creditor.name}`
      });

      creditor.balance -= settled;
      debtor.balance   += settled;

      if (Math.abs(creditor.balance) < 0.01) creditors.shift();
      if (Math.abs(debtor.balance)   < 0.01) debtors.shift();
    }

    res.status(200).json({ success: true, data: settlements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};