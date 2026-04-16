import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ip = { width:'18',height:'18',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round' };

const NAV = [
  { path:'/dashboard', label:'Dashboard', icon:<svg {...ip}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
  { path:'/groups',    label:'Groups',    icon:<svg {...ip}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { path:'/expenses',  label:'Expenses',  icon:<svg {...ip}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 14h-6"/><path d="M16 10h-6"/></svg> },
  { path:'/settle',    label:'Settle Up', icon:<svg {...ip}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
  { path:'/analytics', label:'Analytics', icon:<svg {...ip}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
];

const NOTIF_COLORS = { expense_added:'#22d3a5', settlement_recorded:'#6d5beb', chat_message:'#f97316', default:'#a09dba' };
const NOTIF_ICONS = {
  expense_added:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  settlement_recorded:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  default:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}

function NotifPanel({ history }) {
  if (!history.length) return <div style={{padding:'24px 16px',color:'var(--text3)',fontSize:'12px',textAlign:'center',fontWeight:500}}>You're all caught up</div>;
  return (
    <div style={{maxHeight:'340px',overflowY:'auto'}}>
      {history.slice(0,20).map(n => {
        const col = NOTIF_COLORS[n.type] || NOTIF_COLORS.default;
        return (
          <div key={n.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:'10px',alignItems:'flex-start'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'8px',background:`${col}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:col,marginTop:'1px'}}>
              {NOTIF_ICONS[n.type]||NOTIF_ICONS.default}
            </div>
            <div style={{flex:1,minWidth:0}}>
              {n.groupName && <div style={{fontSize:'9px',color:'var(--accent)',fontFamily:'var(--font-display)',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'2px'}}>{n.groupName}</div>}
              <div style={{fontSize:'12px',color:'var(--text)',lineHeight:1.5}}>{n.message}</div>
              <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}}>{new Date(n.at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfilePanel({ user, logout, onClose }) {
  const { theme, toggleTheme } = useTheme();
  const ini = initials(user?.name);
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow-lg)',overflow:'hidden',position:'absolute',bottom:'calc(100% + 8px)',left:0,right:0,zIndex:60}}>
      <div style={{padding:'16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:800,color:'#fff',flexShrink:0}}>{ini}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:'14px',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
          <div style={{fontSize:'11px',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:'4px',display:'flex',borderRadius:'6px'}} onMouseEnter={e=>e.currentTarget.style.color='var(--text)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:'12px',color:'var(--text2)',fontWeight:500}}>Appearance</span>
        <button onClick={toggleTheme} style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)',fontSize:'12px',fontWeight:600,fontFamily:'var(--font-display)',transition:'all 0.15s'}}>
          {theme==='dark'
            ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Light</>
            : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Dark</>
          }
        </button>
      </div>
      <div style={{padding:'10px 16px'}}>
        <button onClick={logout} style={{width:'100%',padding:'10px',background:'rgba(244,63,94,0.06)',border:'1px solid rgba(244,63,94,0.2)',color:'var(--red)',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'13px',fontFamily:'var(--font-display)',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',transition:'all 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(244,63,94,0.12)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(244,63,94,0.06)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout }                 = useAuth();
  const { history, unread, clearUnread } = useNotif();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [showNotif,   setShowNotif]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const ini = initials(user?.name);

  function toggleNotif()   { setShowProfile(false); setShowNotif(p => { if (!p) clearUnread(); return !p; }); }
  function toggleProfile() { setShowNotif(false);   setShowProfile(p => !p); }

  const bellBtn = (size = 20) => (
    <button onClick={toggleNotif} style={{position:'relative',background:showNotif?'rgba(109,91,235,0.15)':'none',border:'none',cursor:'pointer',color:showNotif?'var(--accent)':'currentColor',padding:'8px',display:'flex',alignItems:'center',borderRadius:'10px',transition:'all 0.15s'}}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      {unread > 0 && <span style={{position:'absolute',top:'4px',right:'4px',background:'var(--red)',color:'#fff',fontSize:'9px',fontWeight:700,borderRadius:'999px',minWidth:'15px',height:'15px',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'}}>{unread>9?'9+':unread}</span>}
    </button>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ───────────────────────────── */}
      <aside className="desktop-sidebar" style={{width:'var(--sidebar-w)',minWidth:'var(--sidebar-w)',background:'var(--sidebar-bg)',display:'flex',flexDirection:'column',padding:'0',position:'relative',zIndex:10,boxShadow:'4px 0 24px rgba(109,91,235,0.2)'}}>

        {/* Logo */}
        <div style={{padding:'28px 24px 20px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:800,color:'#fff',letterSpacing:'-0.5px'}}>
            Fair<span style={{opacity:0.7}}>Share</span>
          </div>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginTop:'2px',fontWeight:500}}>Expense splitting</div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'16px 14px',display:'flex',flexDirection:'column',gap:'4px'}}>
          {NAV.map(({path,label,icon})=>{
            const active = location.pathname === path;
            return (
              <button key={path} onClick={()=>navigate(path)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',border:'none',background:active?'rgba(255,255,255,0.18)':'transparent',color:active?'#fff':'rgba(255,255,255,0.6)',fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:active?700:500,borderRadius:'12px',cursor:'pointer',transition:'all 0.18s',textAlign:'left',width:'100%'}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,0.10)';e.currentTarget.style.color='rgba(255,255,255,0.85)';}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.6)';}}}>
                <span style={{display:'flex',flexShrink:0}}>{icon}</span>
                {label}
                {active && <div style={{marginLeft:'auto',width:'6px',height:'6px',borderRadius:'50%',background:'#fff',opacity:0.8}} />}
              </button>
            );
          })}
        </nav>

        {/* Notif dropdown */}
        {showNotif && (
          <div style={{position:'absolute',bottom:'140px',left:'14px',right:'14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow-lg)',zIndex:50,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:'12px',fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text)'}}>Notifications</span>
              <button onClick={()=>setShowNotif(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',display:'flex',padding:'2px',borderRadius:'4px'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <NotifPanel history={history}/>
          </div>
        )}

        {/* Bottom user area */}
        <div style={{padding:'14px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',gap:'8px',position:'relative'}}>
          <button onClick={toggleProfile} style={{flex:1,display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.10)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',padding:'10px 12px',cursor:'pointer',transition:'all 0.15s',textAlign:'left'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.16)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.10)'}>
            <div style={{width:'30px',height:'30px',borderRadius:'8px',background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:'11px',fontWeight:800,color:'#fff',flexShrink:0}}>{ini}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'#fff',fontFamily:'var(--font-display)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||'—'}</div>
            </div>
          </button>
          <div style={{color:'rgba(255,255,255,0.6)'}}>{bellBtn(18)}</div>
          {showProfile && <ProfilePanel user={user} logout={logout} onClose={()=>setShowProfile(false)}/>}
        </div>
      </aside>

      {/* ── MOBILE TOP BAR (pill-style navbar from Image 2) ── */}
      <div className="mobile-topbar" style={{display:'none',position:'fixed',top:'12px',left:'12px',right:'12px',zIndex:100,height:'52px',alignItems:'center',justifyContent:'space-between',background:'#13111a',borderRadius:'999px',padding:'0 8px 0 16px',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:800,color:'#fff',letterSpacing:'-0.3px'}}>
          Fair<span style={{opacity:0.5}}>Share</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          <div style={{color:'rgba(255,255,255,0.7)'}}>{bellBtn(18)}</div>
          <button onClick={toggleProfile} style={{background:'linear-gradient(135deg,var(--accent),var(--accent2))',border:'none',cursor:'pointer',width:'36px',height:'36px',borderRadius:'999px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:'12px',fontWeight:800,color:'#fff'}}>
            {ini}
          </button>
        </div>
        {showNotif && (
          <div style={{position:'fixed',top:'70px',left:'12px',right:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow-lg)',zIndex:200,overflow:'hidden',maxHeight:'60vh',overflowY:'auto'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'12px',fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text)'}}>Notifications</span>
              <button onClick={()=>setShowNotif(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',display:'flex'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <NotifPanel history={history}/>
          </div>
        )}
        {showProfile && (
          <div style={{position:'fixed',top:'70px',left:'12px',right:'12px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',boxShadow:'var(--shadow-lg)',zIndex:200}}>
            <ProfilePanel user={user} logout={logout} onClose={()=>setShowProfile(false)}/>
          </div>
        )}
      </div>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────── */}
      <nav className="mobile-bottomnav" style={{display:'none',position:'fixed',bottom:'10px',left:'12px',right:'12px',zIndex:100,background:'#13111a',borderRadius:'999px',padding:'8px 10px',flexDirection:'row',justifyContent:'space-around',alignItems:'center',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
        {NAV.map(({path,label,icon})=>{
          const active = location.pathname === path;
          return (
            <button key={path} onClick={()=>navigate(path)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',padding:'7px 12px',border:'none',background:active?'rgba(109,91,235,0.35)':'transparent',color:active?'#fff':'rgba(255,255,255,0.45)',cursor:'pointer',transition:'all 0.18s',borderRadius:'999px',flex:1}}>
              <span style={{display:'flex'}}>{icon}</span>
              <span style={{fontSize:'9px',fontFamily:'var(--font-display)',fontWeight:600,letterSpacing:'0.2px'}}>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}