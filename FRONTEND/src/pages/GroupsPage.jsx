import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { groupsAPI } from '../api';
import { Card, CardTitle, FormGroup, Input, Select, Button, Alert, Loading, Empty } from '../components/UI';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];
const currencyFlag = (c) => ({ INR: '🇮🇳', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', AED: '🇦🇪' }[c] || '💱');

export default function GroupsPage() {
  const { groups, setGroups } = useAuth();
  const isMobile = useIsMobile();
  const [loading,      setLoading]      = useState(false);
  const [grpName,      setGrpName]      = useState('');
  const [currency,     setCurrency]     = useState('INR');
  const [joinCode,     setJoinCode]     = useState('');
  const [createAlert,  setCreateAlert]  = useState(null);
  const [joinAlert,    setJoinAlert]    = useState(null);
  const [activeTab,    setActiveTab]    = useState('list'); // mobile tab: list | create | join

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
    if (isMobile) setTimeout(() => setActiveTab('list'), 1000);
  }

  async function joinGroup() {
    setJoinAlert(null);
    if (!joinCode.trim()) return setJoinAlert({ msg: 'Invite code required', type: 'error' });
    const data = await groupsAPI.join(joinCode.trim().toUpperCase());
    if (!data.success) return setJoinAlert({ msg: data.message, type: 'error' });
    setJoinAlert({ msg: `Joined "${data.data.name}"!`, type: 'success' });
    setJoinCode('');
    loadGroups();
    if (isMobile) setTimeout(() => setActiveTab('list'), 1000);
  }

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={{
      flex: 1, padding: '9px', border: 'none',
      background: activeTab === id ? 'var(--accent)' : 'transparent',
      color: activeTab === id ? '#000' : 'var(--text2)',
      fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
      borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s'
    }}>{label}</button>
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>Groups</div>
        <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Create, join, and manage your groups</div>
      </div>

      {isMobile ? (
        <>
          {/* Mobile tab switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '16px' }}>
            {tabBtn('list', `My Groups (${groups.length})`)}
            {tabBtn('create', '+ Create')}
            {tabBtn('join', '+ Join')}
          </div>

          {activeTab === 'list' && (
            <Card>
              {loading ? <Loading /> : groups.length === 0 ? (
                <Empty icon="🏝" text="No groups yet" />
              ) : groups.map(g => (
                <GroupCard key={g._id} group={g} />
              ))}
            </Card>
          )}

          {activeTab === 'create' && (
            <Card>
              <CardTitle>Create Group</CardTitle>
              <FormGroup label="Group Name">
                <Input placeholder="Goa Trip 2025" value={grpName} onChange={e => setGrpName(e.target.value)} />
              </FormGroup>
              <FormGroup label="Base Currency">
                <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{currencyFlag(c)} {c}</option>)}
                </Select>
              </FormGroup>
              <Alert message={createAlert?.msg} type={createAlert?.type} />
              <Button onClick={createGroup}>Create Group</Button>
            </Card>
          )}

          {activeTab === 'join' && (
            <Card>
              <CardTitle>Join Group</CardTitle>
              <FormGroup label="Invite Code">
                <Input placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} style={{ letterSpacing: '3px' }} />
              </FormGroup>
              <Alert message={joinAlert?.msg} type={joinAlert?.type} />
              <Button onClick={joinGroup}>Join Group</Button>
            </Card>
          )}
        </>
      ) : (
        /* Desktop layout */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
          <div>
            <Card>
              <CardTitle>Create Group</CardTitle>
              <FormGroup label="Group Name">
                <Input placeholder="Goa Trip 2025" value={grpName} onChange={e => setGrpName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroup()} />
              </FormGroup>
              <FormGroup label="Base Currency">
                <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{currencyFlag(c)} {c}</option>)}
                </Select>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>All balances shown in this currency</div>
              </FormGroup>
              <Alert message={createAlert?.msg} type={createAlert?.type} />
              <Button onClick={createGroup}>Create Group</Button>
            </Card>

            <Card style={{ marginTop: '20px' }}>
              <CardTitle>Join Group</CardTitle>
              <FormGroup label="Invite Code">
                <Input placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} style={{ letterSpacing: '3px' }} onKeyDown={e => e.key === 'Enter' && joinGroup()} />
              </FormGroup>
              <Alert message={joinAlert?.msg} type={joinAlert?.type} />
              <Button onClick={joinGroup}>Join Group</Button>
            </Card>
          </div>

          <Card>
            <CardTitle>My Groups</CardTitle>
            {loading ? <Loading /> : groups.length === 0 ? (
              <Empty icon="🏝" text="No groups yet — create or join one" />
            ) : groups.map(g => <GroupCard key={g._id} group={g} />)}
          </Card>
        </div>
      )}
    </div>
  );
}

function GroupCard({ group: g }) {
  function copyCode(code, btn) {
    navigator.clipboard.writeText(code);
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  }

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>{g.name}</div>
        <div style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', color: 'var(--accent)' }}>
          {g.currency || 'INR'}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px' }}>
        {g.members.length} member{g.members.length !== 1 ? 's' : ''} · {g.members.map(m => m.name).join(', ')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px', letterSpacing: '4px', color: 'var(--accent)', flex: 1, fontWeight: 500 }}>{g.inviteCode}</span>
        <button onClick={e => copyCode(g.inviteCode, e.target)} style={{ padding: '5px 12px', background: 'none', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Copy</button>
      </div>
    </div>
  );
}