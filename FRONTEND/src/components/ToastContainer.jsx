import { useNotif } from '../context/NotifContext';

const ICONS = {
  expense_added:       '💸',
  settlement_recorded: '✅',
  default:             '🔔',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotif();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',   // above mobile bottom nav
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '340px',
      width: 'calc(100vw - 32px)',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'fadeUp 0.25s ease both',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
            {ICONS[t.type] || ICONS.default}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            {t.groupName && (
              <div style={{
                fontSize: '10px',
                color: 'var(--accent)',
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
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '0 0 0 4px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}