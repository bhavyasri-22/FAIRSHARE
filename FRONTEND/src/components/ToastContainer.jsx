import { useNotif } from '../context/NotifContext';

const COLORS = {
  expense_added:       'var(--accent)',
  settlement_recorded: 'var(--green)',
  chat_message:        'var(--orange)',
  default:             'var(--accent)',
};

const ICONS = {
  expense_added: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  settlement_recorded: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  chat_message: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  default: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotif();
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:'90px', right:'20px', zIndex:9999, display:'flex', flexDirection:'column', gap:'10px', maxWidth:'340px', width:'calc(100vw - 40px)', pointerEvents:'none' }}>
      {toasts.map(t => {
        const col = COLORS[t.type]||COLORS.default;
        const ico = ICONS[t.type]||ICONS.default;
        return (
          <div key={t.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:`4px solid ${col}`, borderRadius:'var(--radius)', padding:'14px 16px', boxShadow:'var(--shadow-lg)', display:'flex', alignItems:'flex-start', gap:'12px', animation:'fadeUp 0.25s cubic-bezier(0.22,1,0.36,1) both', pointerEvents:'all' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${col}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:col }}>
              {ico}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {t.groupName && <div style={{ fontSize:'10px', color:col, fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'3px' }}>{t.groupName}</div>}
              <div style={{ fontSize:'13px', color:'var(--text)', lineHeight:1.5, fontWeight:500 }}>{t.message}</div>
            </div>
            <button onClick={()=>dismissToast(t.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:'2px', borderRadius:'4px', display:'flex', flexShrink:0, transition:'color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}