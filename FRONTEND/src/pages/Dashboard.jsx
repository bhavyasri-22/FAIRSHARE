import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { groupsAPI, expensesAPI } from '../api';
import { Card, CardTitle, Loading, Empty, StatCard } from '../components/UI';

const SYM = { INR:'₹',USD:'$',EUR:'€',GBP:'£',JPY:'¥',AUD:'A$',CAD:'C$',SGD:'S$',AED:'د.إ' };
const sym = c => SYM[c] || (c+' ');

function fmt(map) {
  const e = Object.entries(map).filter(([,v])=>v>0);
  if (!e.length) return null;
  return e.map(([c,a])=>`${sym(c)}${a.toFixed(0)}`).join(' · ');
}

const GROUP_CARD_COLORS = ['#6d5beb','#f97316','#22d3a5','#f43f5e','#f59e0b','#3b82f6'];

export default function Dashboard() {
  const { user, setGroups, groups } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ groupCount:0, owedMap:{}, oweMap:{} });
  const [recent,  setRecent]  = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const gData = await groupsAPI.getAll();
    if (!gData.success) { setLoading(false); return; }
    const grps = gData.data;
    setGroups(grps);
    const owedMap={}, oweMap={};
    let allExp=[];
    for (const g of grps) {
      const eData = await expensesAPI.getForGroup(g._id);
      if (!eData.success) continue;
      const { expenses, balanceSummary, groupCurrency } = eData.data;
      const cur = groupCurrency||g.currency||'INR';
      allExp.push(...expenses.map(e=>({...e,groupName:g.name,groupCurrency:cur})));
      const me = balanceSummary.find(b=>b.user.id===user._id||b.user.id===user.id);
      if (me) {
        if (me.balance>0) owedMap[cur]=(owedMap[cur]||0)+me.balance;
        if (me.balance<0) oweMap[cur]=(oweMap[cur]||0)+Math.abs(me.balance);
      }
    }
    allExp.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    setStats({ groupCount:grps.length, owedMap, oweMap });
    setRecent(allExp.slice(0,5));
    setLoading(false);
  }

  const owedText = fmt(stats.owedMap);
  const oweText  = fmt(stats.oweMap);
  const hour = new Date().getHours();
  const greeting = hour < 12 
  ? 'Good morning' 
  : hour < 18 
    ? 'Good afternoon' 
    : 'Good evening';

  return (
    <div className="fade-up">
      {/* Header greeting */}
      <div style={{ marginBottom:'28px' }}>
        <div style={{ fontFamily:'var(--font-display)',fontSize:isMobile?'22px':'30px',fontWeight:800,letterSpacing:'-0.5px',color:'var(--text)' }}>
          {greeting}, {user?.name?.split(' ')[0]}
        </div>
        <div style={{ color:'var(--text2)',fontSize:'14px',marginTop:'4px',fontWeight:500 }}>Here's your financial snapshot</div>
      </div>

      {loading ? <Loading /> : (
        <>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)', gap:'14px', marginBottom:'24px' }}>
            <StatCard
              label="Active Groups"
              value={stats.groupCount}
              sub="joined groups"
              color="var(--accent)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
            <StatCard
              label="You Are Owed"
              value={owedText || '—'}
              sub="across all groups"
              color="var(--green)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
            />
            <StatCard
              label="You Owe"
              value={oweText || '—'}
              sub="settle up soon"
              color="var(--red)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}
            />
          </div>

          {/* Groups quick access */}
          {groups.length > 0 && (
            <Card style={{ marginBottom:'20px' }}>
              <CardTitle>Your Groups</CardTitle>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(auto-fill,minmax(160px,1fr))', gap:'10px' }}>
                {groups.map((g,i) => (
                  <div key={g._id} style={{ background:`${GROUP_CARD_COLORS[i%GROUP_CARD_COLORS.length]}14`, border:`1px solid ${GROUP_CARD_COLORS[i%GROUP_CARD_COLORS.length]}22`, borderRadius:'12px', padding:'14px', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute',top:0,left:0,right:0,height:'3px',background:GROUP_CARD_COLORS[i%GROUP_CARD_COLORS.length],borderRadius:'12px 12px 0 0' }} />
                    <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'14px',color:'var(--text)',marginBottom:'6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{g.name}</div>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                      <div style={{ fontSize:'11px',color:'var(--text2)',fontWeight:500 }}>{g.members.length} member{g.members.length!==1?'s':''}</div>
                      <span style={{ fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',background:GROUP_CARD_COLORS[i%GROUP_CARD_COLORS.length],color:'#fff' }}>{g.currency||'INR'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent activity */}
          <Card>
            <CardTitle>Recent Activity</CardTitle>
            {recent.length===0 ? (
              <Empty text="No activity yet — add your first expense" />
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                {recent.map(e=>(
                  <div key={e._id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',background:'var(--surface2)',borderRadius:'10px',border:'1px solid var(--border)',transition:'all 0.15s' }}
                    onMouseEnter={ev=>ev.currentTarget.style.borderColor='var(--border2)'}
                    onMouseLeave={ev=>ev.currentTarget.style.borderColor='var(--border)'}>
                    <div style={{ width:'36px',height:'36px',borderRadius:'10px',background:'rgba(109,91,235,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div style={{ flex:1,minWidth:0,fontSize:'13px',lineHeight:1.5 }}>
                      <div style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                        <strong style={{ fontFamily:'var(--font-display)' }}>{e.paidBy?.name}</strong>
                        <span style={{ color:'var(--text2)' }}> paid for </span>
                        <em style={{ fontStyle:'normal',fontWeight:600 }}>{e.description}</em>
                        <span style={{ color:'var(--text3)',fontSize:'12px' }}> · {e.groupName}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:'15px',color:'var(--accent)',flexShrink:0 }}>
                      {sym(e.currency||e.groupCurrency)}{(e.convertedAmount??e.totalAmount).toFixed(0)}
                    </div>
                    <div style={{ fontSize:'11px',color:'var(--text3)',flexShrink:0,minWidth:'44px',textAlign:'right' }}>
                      {new Date(e.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}