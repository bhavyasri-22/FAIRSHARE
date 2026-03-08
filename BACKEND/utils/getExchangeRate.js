// Uses frankfurter.app — free, no API key needed
const getExchangeRate = async (from, to) => {
  if (from === to) return 1;
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const data = await res.json();
    return data.rates[to];
  } catch (err) {
    console.error('Exchange rate fetch failed:', err);
    throw new Error('Could not fetch exchange rate. Try again.');
  }
};

module.exports = getExchangeRate;