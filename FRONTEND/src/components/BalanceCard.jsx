const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ'
};

function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || (code ? code + ' ' : '₹');
}

export default function BalanceCard({ balance: b }) {
  const amtColor = b.balance > 0 ? 'var(--green)' : b.balance < 0 ? 'var(--red)' : 'var(--text3)';
  const barColor = b.balance > 0 ? 'var(--green)' : b.balance < 0 ? 'var(--red)' : 'var(--text3)';
  const sign = b.balance > 0 ? '+' : '';
  const sym  = currencySymbol(b.currency);

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: barColor }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>
        {b.user.name}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: amtColor }}>
        {sign}{sym}{Math.abs(b.balance).toFixed(2)}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>{b.status}</div>
    </div>
  );
}