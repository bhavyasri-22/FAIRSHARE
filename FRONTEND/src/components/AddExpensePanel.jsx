import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { groupsAPI, expensesAPI } from '../api';
import { Card, CardTitle, FormGroup, Input, Select, Button, Alert, Loading, Empty } from './UI';
import GroupChat from './GroupChat';
import AddExpensePanel from './AddExpensePanel';

const CURRENCIES  = ['INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED'];
const GROUP_COLORS = ['#6d5beb','#f97316','#22d3a5','#f43f5e','#f59e0b','#3b82f6','#8b5cf6','#ec4899'];

export default function GroupsPage() {
  const { groups, setGroups, user, token } = useAuth();
  const isMobile = useIsMobile();
  const [loading,     setLoading]     = useState(false);
  const [grpName,     setGrpName]     = useState('');
  const [currency,    setCurrency]    = useState('INR');
  const [joinCode,    setJoinCode]    = useState('');
  const [createAlert, setCreateAlert] = useState(null);
  const [joinAlert,   setJoinAlert]   = useState(null);
  const [activeTab,   setActiveTab]   = useState('list');

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    setLoading(true);
    const data = await groupsAPI.getAll();
    if (data.success) setGroups(data.data);
    setLoading(false);
  }

  async function createGroup() {
    setCreateAlert(null);
    if (!grpName.trim()) return setCreateAlert({ msg: 'Group name required', type: 'error' });
    const data = await groupsAPI.create(grpName.trim(), currency);
    if (!data.success) return setCreateAlert({ msg: data.message, type: 'error' });
    setCreateAlert({ msg: `"${data.data.name}" created!`, type: 'success' });
    setGrpName(''); setCurrency('INR');
    loadGroups();
    if (isMobile) setTimeout(() => setActiveTab('list'), 900);
  }

  async function joinGroup() {
    setJoinAlert(null);
    if (!joinCode.trim()) return setJoinAlert({ msg: 'Invite code required', type: 'error' });
    const data = await groupsAPI.join(joinCode.trim().toUpperCase());
    if (!data.success) return setJoinAlert({ msg: data.message, type: 'error' });
    setJoinAlert({ msg: `Joined "${data.data.name}"!`, type: 'success' });
    setJoinCode('');
    loadGroups();
    if (isMobile) setTimeout(() => setActiveTab('list'), 900);
  }

  const TAB_STYLE = (id) => ({
    flex:1, padding:'10px', border:'none',
    background: activeTab===id ? 'var(--accent)' : 'transparent',
    color: activeTab===id ? '#fff' : 'var(--text2)',
    fontFamily:'var(--font-display)', fontSize:'13px', fontWeight:700,
    borderRadius:'8px', cursor:'pointer', transition:'all 0.18s',
    boxShadow: activeTab===id ? '0 2px 8px rgba(109,91,235,0.3)' : 'none',
  });

  const FormCard = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <Card>
        <CardTitle>Create Group</CardTitle>
        <FormGroup label="Group Name">
          <Input placeholder="Goa Trip 2025, Office Lunch…" value={grpName}
            onChange={e => setGrpName(e.target.value)} onKeyDown={e => e.key==='Enter'&&createGroup()} />
        </FormGroup>
        <FormGroup label="Base Currency">
          <Select value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FormGroup>
        <Alert message={createAlert?.msg} type={createAlert?.type} />
        <Button onClick={createGroup}>Create Group</Button>
      </Card>
      <Card>
        <CardTitle>Join Group</CardTitle>
        <FormGroup label="Invite Code">
          <Input placeholder="ABC123" value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter'&&joinGroup()}
            style={{ letterSpacing:'3px', textTransform:'uppercase' }} />
        </FormGroup>
        <Alert message={joinAlert?.msg} type={joinAlert?.type} />
        <Button onClick={joinGroup}>Join Group</Button>
      </Card>
    </div>
  );

  const ListCard = () => (
    <Card>
      <CardTitle>{groups.length} Group{groups.length!==1?'s':''}</CardTitle>
      {loading ? <Loading /> : groups.length===0 ? (
        <Empty text="No groups yet — create or join one" />
      ) : groups.map((g,i) => (
        <GroupCard key={g._id} group={g} user={user} token={token}
          color={GROUP_COLORS[i % GROUP_COLORS.length]}
          onExpenseAdded={loadGroups} />
      ))}
    </Card>
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:isMobile?'22px':'28px', fontWeight:800, letterSpacing:'-0.5px' }}>Groups</div>
        <div style={{ color:'var(--text2)', fontSize:'14px', marginTop:'4px', fontWeight:500 }}>
          Create, join, and manage your expense groups
        </div>
      </div>

      {isMobile ? (
        <>
          <div style={{ display:'flex', gap:'4px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'4px', marginBottom:'16px', boxShadow:'var(--shadow)' }}>
            {[['list',`Groups (${groups.length})`],['create','+ Create'],['join','+ Join']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={TAB_STYLE(id)}>{label}</button>
            ))}
          </div>

          {activeTab==='list' && <ListCard />}
          {activeTab==='create' && (
            <Card>
              <CardTitle>Create Group</CardTitle>
              <FormGroup label="Group Name">
                <Input placeholder="Goa Trip 2025" value={grpName} onChange={e=>setGrpName(e.target.value)} />
              </FormGroup>
              <FormGroup label="Base Currency">
                <Select value={currency} onChange={e=>setCurrency(e.target.value)}>
                  {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                </Select>
              </FormGroup>
              <Alert message={createAlert?.msg} type={createAlert?.type} />
              <Button onClick={createGroup}>Create Group</Button>
            </Card>
          )}
          {activeTab==='join' && (
            <Card>
              <CardTitle>Join Group</CardTitle>
              <FormGroup label="Invite Code">
                <Input placeholder="ABC123" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} style={{letterSpacing:'3px'}}/>
              </FormGroup>
              <Alert message={joinAlert?.msg} type={joinAlert?.type}/>
              <Button onClick={joinGroup}>Join Group</Button>
            </Card>
          )}
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'24px' }}>
          <FormCard />
          <ListCard />
        </div>
      )}
    </div>
  );
}

/* ── GroupCard ──────────────────────────────────────────────────────────────── */
function GroupCard({ group: g, user, token, color, onExpenseAdded }) {
  const [panel,  setPanel]  = useState(null); // null | 'expense' | 'chat'
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(g.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function togglePanel(name) {
    setPanel(p => p === name ? null : name);
  }

  const ActionBtn = ({ name, icon, label }) => {
    const active = panel === name;
    return (
      <button onClick={() => togglePanel(name)} style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
        padding:'9px 10px', background: active ? `${color}14` : 'transparent',
        border:`1.5px solid ${active ? color : 'var(--border)'}`,
        color: active ? color : 'var(--text2)',
        borderRadius:'var(--radius-sm)', cursor:'pointer',
        fontSize:'13px', fontFamily:'var(--font-display)', fontWeight:600,
        transition:'all 0.18s',
      }}
        onMouseEnter={e => { if(!active){ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text)'; }}}
        onMouseLeave={e => { if(!active){ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}}>
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div style={{
      background:'var(--surface2)', border:'1px solid var(--border)',
      borderRadius:'var(--radius)', padding:'16px', marginBottom:'10px',
      borderLeft:`4px solid ${color}`, transition:'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='var(--shadow)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>

      {/* ── Top row: name + currency badge ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'15px', fontWeight:700 }}>{g.name}</div>
        <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px', background:`${color}18`, color, border:`1px solid ${color}30` }}>
          {g.currency||'INR'}
        </span>
      </div>

      {/* ── Members ── */}
      <div style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'12px', fontWeight:500 }}>
        {g.members.length} member{g.members.length!==1?'s':''} · {g.members.map(m=>m.name).join(', ')}
      </div>

      {/* ── Invite code row ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'var(--surface)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', marginBottom:'12px' }}>
        <span style={{ fontSize:'10px', color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', flexShrink:0 }}>Code</span>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'4px', color, flex:1, fontWeight:700 }}>{g.inviteCode}</span>
        <button onClick={copyCode} style={{ padding:'4px 10px', background:copied?`${color}18`:'transparent', border:`1px solid ${copied?color:'var(--border)'}`, color:copied?color:'var(--text3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:600, fontFamily:'var(--font-display)', transition:'all 0.2s' }}>
          {copied?'Copied!':'Copy'}
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display:'flex', gap:'8px' }}>
        <ActionBtn
          name="expense"
          label="Add Expense"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          }
        />
        <ActionBtn
          name="chat"
          label="Chat"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          }
        />
      </div>

      {/* ── Add Expense panel ── */}
      {panel === 'expense' && (
        <AddExpensePanel
          group={g}
          color={color}
          onSuccess={onExpenseAdded}
          onClose={() => setPanel(null)}
        />
      )}

      {/* ── Chat panel ── */}
      {panel === 'chat' && (
        <div style={{ marginTop:'14px' }}>
          <GroupChat groupId={g._id} user={user} token={token} />
        </div>
      )}
    </div>
  );
}