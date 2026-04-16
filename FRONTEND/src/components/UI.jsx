import { useState } from 'react';

export function Card({ children, style = {}, accent }) {
  const accentStyle = accent ? { borderTop: `3px solid ${accent}` } : {};
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      padding: '24px', boxShadow: 'var(--shadow)',
      border: '1px solid var(--border)', ...accentStyle, ...style
    }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
        color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(109,91,235,0.15)' }} />
        {children}
      </div>
      {action && action}
    </div>
  );
}

export function FormGroup({ label, children, hint }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
          {label}
        </label>
      )}
      {children}
      {hint && <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '5px' }}>{hint}</div>}
    </div>
  );
}

export function Input({ style = {}, rightIcon, onRightIconClick, wrapperStyle = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%', ...wrapperStyle }}>
      <input
        style={{
          width: '100%', background: 'var(--surface2)',
          border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', padding: '11px 14px',
          color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px',
          outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(109,91,235,0.12)' : 'none',
          paddingRight: rightIcon ? '42px' : '14px', ...style
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {rightIcon && (
        <button type="button" onClick={onRightIconClick} tabIndex="-1" style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
          display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '4px',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
        >
          {rightIcon}
        </button>
      )}
    </div>
  );
}

export function Select({ children, style = {}, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <select style={{
        width: '100%', background: 'var(--surface2)',
        border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        padding: '11px 36px 11px 14px', color: 'var(--text)',
        fontFamily: 'var(--font-body)', fontSize: '14px',
        outline: 'none', appearance: 'none', cursor: 'pointer', ...style
      }} {...props}>
        {children}
      </select>
      <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'md', style = {}, icon, ...props }) {
  const sizes = {
    sm: { padding: '8px 14px', fontSize: '12px' },
    md: { padding: '12px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '15px' },
  };
  const variants = {
    primary: {
      background: 'var(--accent)', color: '#fff', border: 'none',
      boxShadow: '0 4px 14px rgba(109,91,235,0.35)',
    },
    secondary: {
      background: 'var(--surface2)', color: 'var(--text)',
      border: '1.5px solid var(--border)', boxShadow: 'none',
    },
    ghost: {
      background: 'transparent', color: 'var(--accent)',
      border: '1.5px solid var(--border2)', boxShadow: 'none',
    },
    danger: {
      background: 'rgba(244,63,94,0.1)', color: 'var(--red)',
      border: '1.5px solid rgba(244,63,94,0.25)', boxShadow: 'none',
    },
  };
  return (
    <button style={{
      ...variants[variant] || variants.primary,
      ...sizes[size] || sizes.md,
      width: variant === 'primary' && !style.width ? '100%' : 'auto',
      borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)',
      fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: icon ? '8px' : '0', letterSpacing: '0.2px', ...style
    }}
      onMouseEnter={e => { if (variant === 'primary') e.currentTarget.style.background = 'var(--accent-hover)'; }}
      onMouseLeave={e => { if (variant === 'primary') e.currentTarget.style.background = 'var(--accent)'; }}
      {...props}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

export function Alert({ message, type = 'error' }) {
  if (!message) return null;
  const styles = {
    error:   { bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   color: 'var(--red)',    icon: '!' },
    success: { bg: 'rgba(34,211,165,0.08)',  border: 'rgba(34,211,165,0.2)',  color: 'var(--green)',  icon: '✓' },
    info:    { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  color: 'var(--yellow)', icon: 'i' },
  };
  const c = styles[type] || styles.error;
  return (
    <div style={{
      padding: '11px 14px', borderRadius: 'var(--radius-sm)',
      background: c.bg, border: `1.5px solid ${c.border}`,
      color: c.color, fontSize: '13px', marginBottom: '14px',
      display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5,
    }}>
      <span style={{ fontWeight: 700, flexShrink: 0, fontSize: '12px', width: '18px', height: '18px', borderRadius: '50%', border: `1.5px solid ${c.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>{c.icon}</span>
      <span>{message}</span>
    </div>
  );
}

export function Loading({ text = 'Loading' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: '14px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '12px', color: 'var(--text3)', letterSpacing: '0.5px' }}>{text}</span>
    </div>
  );
}

export function Empty({ icon, text = 'Nothing here yet' }) {
  const defaultIcon = (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>{icon || defaultIcon}</div>
      <div style={{ fontSize: '13px', fontWeight: 500 }}>{text}</div>
    </div>
  );
}

export function Badge({ children, color = 'accent' }) {
  const map = {
    accent: { bg: 'rgba(109,91,235,0.1)', border: 'rgba(109,91,235,0.2)', text: 'var(--accent)' },
    green:  { bg: 'rgba(34,211,165,0.1)', border: 'rgba(34,211,165,0.2)', text: 'var(--green)' },
    red:    { bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.2)',  text: 'var(--red)' },
    yellow: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: 'var(--yellow)' },
    orange: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', text: 'var(--orange)' },
  };
  const c = map[color] || map.accent;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
      borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
      textTransform: 'uppercase', background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, color = 'var(--accent)', icon }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      padding: '20px 22px', border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: 'var(--radius) var(--radius) 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color, lineHeight: 1, wordBreak: 'break-all' }}>{value}</div>
          {sub && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}