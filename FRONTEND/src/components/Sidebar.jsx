import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { path: '/groups',    label: 'Groups',    icon: '◈' },
  { path: '/expenses',  label: 'Expenses',  icon: '◎' },
  { path: '/settle',    label: 'Settle Up', icon: '◉' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <>
      {/* ── DESKTOP SIDEBAR ───────────────────────────────── */}
      <aside style={{
        width: '220px', minWidth: '220px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '28px 16px',
        position: 'relative', zIndex: 10
      }} className="desktop-sidebar">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '36px', padding: '0 8px' }}>
          Fair<span style={{ color: 'var(--accent)' }}>Share</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV.map(({ path, label, icon }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => navigate(path)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '11px 12px',
                border: active ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent',
                background: active ? 'rgba(0,212,170,0.1)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600,
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                transition: 'all 0.18s', textAlign: 'left'
              }}>
                <span style={{ fontSize: '16px' }}>{icon}</span> {label}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px', padding: '6px 10px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || '—'}
          </div>
          <button onClick={logout} style={{
            width: '100%', padding: '9px', background: 'transparent',
            border: '1px solid var(--border2)', color: 'var(--text3)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px',
            fontFamily: 'var(--font-mono)', transition: 'all 0.2s'
          }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text3)'; }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ────────────────────────────────── */}
      <div className="mobile-topbar" style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        height: '56px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
          Fair<span style={{ color: 'var(--accent)' }}>Share</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{user?.name}</div>
      </div>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────── */}
      <nav className="mobile-bottomnav" style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {NAV.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '6px 12px', border: 'none', background: 'transparent',
              color: active ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer', transition: 'color 0.18s', flex: 1
            }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.3px' }}>
                {label}
              </span>
              {active && (
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', marginTop: '1px' }} />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}