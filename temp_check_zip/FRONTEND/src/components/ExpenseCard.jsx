import { useState } from 'react';
import { Badge } from './UI';

const currencyFlag = (c) => ({
  INR: '🇮🇳', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
  JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', AED: '🇦🇪'
}[c] || '💱');

const currencySymbol = (c) => ({
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ'
}[c] || c + ' ');

export default function ExpenseCard({ expense, groupCurrency = 'INR' }) {
  const [open, setOpen] = useState(false);

  const wasCurrencyConverted = expense.currency && expense.currency !== groupCurrency;
  const sym = currencySymbol(groupCurrency);
  const origSym = currencySymbol(expense.currency);

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: '12px',
      display: 'flex', gap: '16px', alignItems: 'flex-start',
      transition: 'border-color 0.2s'
    }}>
      <div style={{ flex: 1 }}>
        {/* Title row */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
          {expense.description}
        </div>

        {/* Meta row */}
        <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span>Paid by <strong style={{ color: 'var(--text)' }}>{expense.paidBy?.name}</strong></span>
          <Badge color={expense.splitType === 'equal' ? 'green' : 'yellow'}>{expense.splitType}</Badge>
          <span>{new Date(expense.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>

        {/* Currency conversion badge */}
        {wasCurrencyConverted && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '8px', padding: '4px 10px',
            background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)',
            borderRadius: '999px', fontSize: '11px', color: 'var(--yellow)'
          }}>
            <span>{currencyFlag(expense.currency)} {origSym}{expense.totalAmount} {expense.currency}</span>
            <span style={{ color: 'var(--text3)' }}>→</span>
            <span>{currencyFlag(groupCurrency)} {sym}{expense.convertedAmount?.toFixed(2)} {groupCurrency}</span>
            <span style={{ color: 'var(--text3)', fontSize: '10px' }}>@ {expense.exchangeRate?.toFixed(4)}</span>
          </div>
        )}

        {/* Splits toggle */}
        <div
          onClick={() => setOpen(!open)}
          style={{ fontSize: '11px', color: 'var(--text3)', cursor: 'pointer', marginTop: '8px', letterSpacing: '0.5px' }}
        >
          {open ? '▴ hide splits' : '▾ view splits'}
        </div>

        {/* Splits detail */}
        {open && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            {expense.splits.map(s => (
              <div key={s.user?._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)', padding: '3px 0' }}>
                <span>{s.user?.name}</span>
                <span>
                  {sym}{s.amount.toFixed(2)}
                  {expense.splitType === 'percentage' && (
                    <span style={{ color: 'var(--text3)' }}> ({s.percentage}%)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amount — show converted amount in group currency */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
          {sym}{(expense.convertedAmount ?? expense.totalAmount).toFixed(2)}
        </div>
        {wasCurrencyConverted && (
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>
            {origSym}{expense.totalAmount} {expense.currency}
          </div>
        )}
      </div>
    </div>
  );
}