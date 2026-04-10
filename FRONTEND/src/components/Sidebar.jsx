import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { path: '/groups',    label: 'Groups',    icon: '◈' },
  { path: '/expenses',  label: 'Expenses',  icon: '◎' },
  { path: '/settle',    label: 'Settle Up', icon: '◉' },
  { path: '/analytics', label: 'Analytics', icon: '◑' },
];

const NOTIF_ICONS = { expense_added: '💸', settlement_recorded: '✅' };

function NotifPanel({ history, onClose }) {
  if (!history.length) {
    return (
      <div style={{ padding: '20px 16px', color: 'var(--text3)', fontSize: '12px', textAlign: 'center' }}>
        No notifications yet
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
      {history.slice(0, 20).map(n => (
        <div key={n.id} style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
            {NOTIF_ICONS[n.type] || '🔔'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {n.groupName && (
              <div style={{ fontSize: '9px', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                {n.groupName}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>{n.message}</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>
              {new Date(n.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout }          = useAuth();
  const { history, unread, clearUnread } = useNotif();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [showNotif, setShowNotif] = useState(false);

  function toggleNotif() {
    setShowNotif(prev => {
      if (!prev) clearUnread(); // mark read when opened
      return !prev;
    });
  }

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

        {/* Brand + notification bell */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px', padding: '0 8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Fair<span style={{ color: 'var(--accent)' }}>Share</span>
          </div>

          {/* Bell button */}
          <button
            onClick={toggleNotif}
            style={{
              position: 'relative', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '18px', lineHeight: 1,
              color: showNotif ? 'var(--accent)' : 'var(--text2)',
              padding: '4px',
            }}
            title="Notifications"
          >
            🔔
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px',
                background: 'var(--red)', color: '#fff',
                fontSize: '9px', fontWeight: 700,
                borderRadius: '999px', minWidth: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', fontFamily: 'var(--font-display)',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        {/* Notification dropdown */}
        {showNotif && (
          <div style={{
            position: 'absolute', top: '70px', left: '16px', right: '16px',
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            zIndex: 50,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text2)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Notifications
              </span>
              <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <NotifPanel history={history} onClose={() => setShowNotif(false)} />
          </div>
        )}

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

        {/* Mobile bell */}
        <button
          onClick={toggleNotif}
          style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text2)', padding: '4px' }}
        >
          🔔
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-2px',
              background: 'var(--red)', color: '#fff',
              fontSize: '9px', fontWeight: 700,
              borderRadius: '999px', minWidth: '16px', height: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Mobile notif dropdown */}
        {showNotif && (
          <div style={{
            position: 'fixed', top: '56px', left: 0, right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderTop: 'none',
            zIndex: 200,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text2)', letterSpacing: '1px', textTransform: 'uppercase' }}>Notifications</span>
              <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <NotifPanel history={history} />
          </div>
        )}
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
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.3px' }}>{label}</span>
              {active && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', marginTop: '1px' }} />}
            </button>
          );
        })}
      </nav>
    </>
  );
}