// utils/balance.js

function toPlainBalances(balances) {
  if (!balances) return {};
  if (balances instanceof Map) return Object.fromEntries(balances);
  if (typeof balances.toObject === 'function') return balances.toObject();
  return { ...balances };
}

exports.updateBalances = (group, payerId, receiverId, amount) => {
  const balances = toPlainBalances(group.balances);

  const payer   = String(payerId);
  const receiver = String(receiverId);
  const amt     = parseFloat(amount);

  balances[payer]    = (balances[payer] || 0) + amt;
  balances[receiver] = (balances[receiver] || 0) - amt;

  group.balances = balances;
};