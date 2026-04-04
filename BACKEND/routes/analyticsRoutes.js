const express = require('express');
const router  = express.Router();
const protect = require('../middleware/authMiddleware');
const Expense    = require('../models/Expense');
const Group      = require('../models/Group');
const Settlement = require('../models/Settlement');

// Helper — same as expenseController
function toPlainBalances(balances) {
  if (!balances) return {};
  if (balances instanceof Map) return Object.fromEntries(balances);
  if (typeof balances.toObject === 'function') return balances.toObject();
  return { ...balances };
}

// GET /api/analytics?period=6m
router.get('/', protect, async (req, res) => {
  try {
    const userId = String(req.user._id);
    const period = req.query.period || '6m';
    const months = period === '3m' ? 3 : period === '1y' ? 12 : 6;

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    // Groups the user belongs to
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .lean();
    const groupIds = groups.map(g => g._id);

    // Expenses within period
    const expenses = await Expense.find({
      group: { $in: groupIds },
      createdAt: { $gte: cutoff },
    })
      .populate('paidBy', 'name email')
      .populate('group', 'name currency')
      .lean();

    // All expenses last 84 days for heatmap
    const heatmapCutoff = new Date();
    heatmapCutoff.setDate(heatmapCutoff.getDate() - 83);
    const heatmapExpenses = await Expense.find({
      group: { $in: groupIds },
      createdAt: { $gte: heatmapCutoff },
    }).lean();

    // Settlements within period
    const settlements = await Settlement.find({
      group: { $in: groupIds },
      createdAt: { $gte: cutoff },
    }).lean();

    // Primary currency
    const currencyCount = {};
    expenses.forEach(e => {
      const c = e.currency || e.group?.currency || 'INR';
      currencyCount[c] = (currencyCount[c] || 0) + 1;
    });
    const primaryCurrency =
      Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'INR';

    // Totals — use convertedAmount (already in group base currency)
    const totalSpent = expenses.reduce((s, e) => s + (e.convertedAmount || e.totalAmount || 0), 0);

    // You paid (paidBy === current user)
    const youPaid = expenses
      .filter(e => String(e.paidBy?._id || e.paidBy) === userId)
      .reduce((s, e) => s + (e.convertedAmount || e.totalAmount || 0), 0);

    // You owe (negative balance across groups)
    let youOwe = 0;
    groups.forEach(g => {
      const balances = toPlainBalances(g.balances);
      const bal = balances[userId] || 0;
      if (bal < 0) youOwe += Math.abs(bal);
    });

    // Spending by month — build last N months as ordered labels
    const monthLabels = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthLabels.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short' }),
      });
    }
    const monthMap = {};
    monthLabels.forEach(m => { monthMap[m.key] = 0; });
    expenses.forEach(e => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthMap) monthMap[key] += e.convertedAmount || e.totalAmount || 0;
    });
    const spendingByMonth = monthLabels.map(m => ({
      label: m.label,
      amount: Math.round((monthMap[m.key] || 0) * 100) / 100,
    }));

    // Top spenders
    const spenderMap = {};
    expenses.forEach(e => {
      const name = e.paidBy?.name || 'Unknown';
      spenderMap[name] = (spenderMap[name] || 0) + (e.convertedAmount || e.totalAmount || 0);
    });
    const topSpenders = Object.entries(spenderMap)
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // By group
    const groupSpendMap = {};
    const groupCurrencyMap = {};
    expenses.forEach(e => {
      const name = e.group?.name || 'Unknown';
      groupSpendMap[name] = (groupSpendMap[name] || 0) + (e.convertedAmount || e.totalAmount || 0);
      groupCurrencyMap[name] = e.group?.currency || 'INR';
    });
    const byGroup = Object.entries(groupSpendMap)
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100, currency: groupCurrencyMap[name] }))
      .sort((a, b) => b.amount - a.amount);

    // Heatmap — last 84 days
    const dayMap = {};
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    heatmapExpenses.forEach(e => {
      const key = new Date(e.createdAt).toISOString().slice(0, 10);
      if (key in dayMap) dayMap[key]++;
    });
    const heatmap = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    // Settlement stats
    const settlementCount = settlements.length;
    const settledAmount   = settlements.reduce((s, st) => s + (st.amount || 0), 0);
    const expenseCount    = expenses.length;
    const settlementRate  = expenseCount > 0
      ? Math.min(100, Math.round((settlementCount / expenseCount) * 100))
      : 0;

    // Split type breakdown (equal vs percentage)
    const splitTypes = { equal: 0, percentage: 0 };
    expenses.forEach(e => { splitTypes[e.splitType] = (splitTypes[e.splitType] || 0) + 1; });

    res.json({
      success: true,
      data: {
        primaryCurrency,
        totalSpent:      Math.round(totalSpent * 100) / 100,
        youPaid:         Math.round(youPaid * 100) / 100,
        youOwe:          Math.round(youOwe * 100) / 100,
        groupCount:      groups.length,
        settlementCount,
        settledAmount:   Math.round(settledAmount * 100) / 100,
        expenseCount,
        settlementRate,
        spendingByMonth,
        topSpenders,
        byGroup,
        heatmap,
        splitTypes,
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

module.exports = router;