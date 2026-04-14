import { useNotif } from '../context/NotifContext';

const ICONS = {
  expense_added: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  settlement_recorded: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  chat_message: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  default: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
};

const ACCENT_COLORS = {
  expense_added:       'var(--accent)',
  settlement_recorded: 'var(--green)',
  chat_message:        'var(--yellow)',
  default:             'var(--accent)',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotif();
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '340px',
      width: 'calc(100vw - 32px)',
      pointerEvents: 'none', // let clicks pass through the gap between toasts
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderLeft: `3px solid ${ACCENT_COLORS[t.type] || ACCENT_COLORS.default}`,
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'fadeUp 0.25s ease both',
            pointerEvents: 'all',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
            {ICONS[t.type] || ICONS.default}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            {t.groupName && (
              <div style={{
                fontSize: '10px',
                color: ACCENT_COLORS[t.type] || 'var(--accent)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '3px',
              }}>
                {t.groupName}
              </div>
            )}
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              {t.message}
            </div>
          </div>

          <button
            onClick={() => dismissToast(t.id)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text3)', cursor: 'pointer',
              fontSize: '16px', lineHeight: 1,
              padding: '0 0 0 4px', flexShrink: 0,
            }}
          >✕</button>
        </div>
      ))}
    </div>
  );
}