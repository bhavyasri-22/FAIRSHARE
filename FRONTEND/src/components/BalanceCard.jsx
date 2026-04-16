const SYM = {INR:'₹',USD:'$',EUR:'€',GBP:'£',JPY:'¥',AUD:'A$',CAD:'C$',SGD:'S$',AED:'د.إ'};
const csym = c => SYM[c]||(c?c+' ':'₹');

export default function BalanceCard({ balance: b }) {
  const pos   = b.balance > 0;
  const neg   = b.balance < 0;
  const color = pos ? 'var(--green)' : neg ? 'var(--red)' : 'var(--text3)';
  const bgCol = pos ? 'rgba(34,211,165,0.08)' : neg ? 'rgba(244,63,94,0.08)' : 'var(--surface2)';
  const bord  = pos ? 'rgba(34,211,165,0.2)'  : neg ? 'rgba(244,63,94,0.2)'  : 'var(--border)';
  const sign  = pos ? '+' : '';
  const sym   = csym(b.currency);

  return (
    <div style={{background:bgCol,border:`1px solid ${bord}`,borderRadius:'var(--radius)',padding:'18px',textAlign:'center',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'3px',background:color}} />
      <div style={{width:'40px',height:'40px',borderRadius:'50%',background:`${color}1a`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',color}}>
        {pos
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          : neg
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        }
      </div>
      <div style={{fontFamily:'var(--font-display)',fontSize:'14px',fontWeight:700,marginBottom:'8px',color:'var(--text)'}}>{b.user.name}</div>
      <div style={{fontFamily:'var(--font-display)',fontSize:'24px',fontWeight:800,color}}>{sign}{sym}{Math.abs(b.balance).toFixed(2)}</div>
      <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'5px',fontWeight:500}}>{b.status}</div>
    </div>
  );
}