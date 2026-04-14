import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const navIconProps = { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
const bellProps = { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: <svg {...navIconProps}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { path: '/groups',    label: 'Groups',    icon: <svg {...navIconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { path: '/expenses',  label: 'Expenses',  icon: <svg {...navIconProps}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 14h-6"/><path d="M16 10h-6"/></svg> },
  { path: '/settle',    label: 'Settle Up', icon: <svg {...navIconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
  { path: '/analytics', label: 'Analytics', icon: <svg {...navIconProps}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> },
];

const NOTIF_ICONS = { 
  expense_added: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, 
  settlement_recorded: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  default: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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
          <span style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text2)' }}>
            {NOTIF_ICONS[n.type] || NOTIF_ICONS.default}
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
  const { theme, toggleTheme }    = useTheme();
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
            <svg {...bellProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* User profile banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
                {getInitials(user?.name)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || '—'}
              </div>
            </div>
            
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Theme">
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile Theme Toggle */}
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {/* Mobile bell */}
          <button
            onClick={toggleNotif}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg {...bellProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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

          {/* Mobile Logout */}
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to log out?")) {
                logout();
              }
            }} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

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
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.3px', marginTop: '2px' }}>{label}</span>
              {active && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)', marginTop: '1px' }} />}
            </button>
          );
        })}
      </nav>
    </>
  );
}