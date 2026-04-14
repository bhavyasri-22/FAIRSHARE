import { useState } from 'react';

const s = {
  // Layout
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', boxShadow: 'var(--shadow)' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
  pip: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', flexShrink: 0 },

  // Forms
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '10px', color: 'var(--text2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '7px' },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none' },
  select: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer' },

  // Buttons
  btnPrimary: { width: '100%', padding: '13px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#000', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.4px', transition: 'all 0.2s' },
  btnSecondary: { padding: '8px 16px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
};

export function Card({ children, style = {} }) {
  return <div style={{ ...s.card, ...style }}>{children}</div>;
}

export function CardTitle({ children }) {
  return <div style={s.cardTitle}><div style={s.pip} />{children}</div>;
}

export function FormGroup({ label, children }) {
  return (
    <div style={s.formGroup}>
      {label && <label style={s.label}>{label}</label>}
      {children}
    </div>
  );
}

export function Input({ style = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{ ...s.input, ...(focused ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px rgba(0,212,170,0.08)' } : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

export function Select({ children, style = {}, ...props }) {
  return <select style={{ ...s.select, ...style }} {...props}>{children}</select>;
}

export function Button({ children, variant = 'primary', style = {}, ...props }) {
  const base = variant === 'primary' ? s.btnPrimary : s.btnSecondary;
  return <button style={{ ...base, ...style }} {...props}>{children}</button>;
}

export function Alert({ message, type = 'error' }) {
  if (!message) return null;
  const colors = {
    error:   { bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.25)', color: 'var(--red)' },
    success: { bg: 'rgba(0,212,170,0.1)',   border: 'rgba(0,212,170,0.25)',   color: 'var(--green)' },
    info:    { bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.25)', color: 'var(--yellow)' },
  };
  const c = colors[type];
  return (
    <div style={{ padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: '13px', marginBottom: '14px' }}>
      {message}
    </div>
  );
}

export function Loading() {
  return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: '12px', letterSpacing: '3px' }}>
      LOADING
      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', marginLeft: '8px', animation: 'pulse 1s infinite' }} />
    </div>
  );
}

export function Empty({ icon = '📭', text = 'Nothing here yet' }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text2)' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '13px' }}>{text}</div>
    </div>
  );
}

export function Badge({ children, color = 'green' }) {
  const colors = {
    green:  { bg: 'rgba(0,212,170,0.15)',   border: 'rgba(0,212,170,0.2)',   text: 'var(--green)' },
    red:    { bg: 'rgba(255,107,107,0.15)', border: 'rgba(255,107,107,0.2)', text: 'var(--red)' },
    yellow: { bg: 'rgba(255,209,102,0.15)', border: 'rgba(255,209,102,0.2)', text: 'var(--yellow)' },
  };
  const c = colors[color] || colors.green;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {children}
    </span>
  );
}
