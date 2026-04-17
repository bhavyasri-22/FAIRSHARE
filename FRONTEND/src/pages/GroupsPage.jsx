import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { groupsAPI, expensesAPI } from '../api';
import { Card, CardTitle, FormGroup, Input, Select, Button, Alert, Loading, Empty } from '../components/UI';
import GroupChat from '../components/GroupChat';
import ReceiptScanner from '../components/ReceiptScanner';

const CURRENCIES   = ['INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED'];
const GROUP_COLORS = ['#6d5beb','#f97316','#22d3a5','#f43f5e','#f59e0b','#3b82f6','#8b5cf6','#ec4899'];

// ── Shared icon props ─────────────────────────────────────────────────────────
const ip = { width:'16', height:'16', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' };

// ── Sub-components (Defined outside to prevent focus loss issues) ──────────────

function AddExpenseModal({ group, onClose, onSuccess }) {
  const isMobile = useIsMobile();
  const members       = group?.members || [];
  const groupCurrency = group?.currency || 'INR';

  const [desc,        setDesc]        = useState('');
  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState('');
  const [splitType,   setSplitType]   = useState('equal');
  const [selectedIds, setSelectedIds] = useState([]);
  const [pctMap,      setPctMap]      = useState({});
  const [lineItems,   setLineItems]   = useState([]); // { id, description, total_price, splitAmong: [] }
  const [billImage,   setBillImage]   = useState(null);
  const [alert,       setAlert]       = useState(null);
  const [adding,      setAdding]      = useState(false);

  const isDiff   = currency && currency !== groupCurrency;
  const pctTotal = members.reduce((s, m) => s + (parseFloat(pctMap[m._id]) || 0), 0);

  function handleOCR({ description, amount: a, billImage: b, lineItems: items }) {
    if (description) setDesc(description);
    if (a)           setAmount(String(a));
    if (b)           setBillImage(b);
    if (items && items.length > 0) {
      setLineItems(items.map(i => ({
        id:          Math.random().toString(36).substr(2, 9),
        description: i.description || 'Item',
        total_price: i.total_price || 0,
        splitAmong:  members.map(m => m._id) // default to everyone
      })));
      setSplitType('itemized');
    }
  }

  async function submit() {
    setAlert(null);
    if (!desc.trim())                    return setAlert({ msg: 'Description required',   type: 'error' });
    if (!amount || parseFloat(amount) <= 0) return setAlert({ msg: 'Enter a valid amount', type: 'error' });

    const payload = {
      groupId:     group._id,
      description: desc.trim(),
      totalAmount: parseFloat(amount),
      splitType,
      ...(currency    && { currency }),
      ...(billImage   && { billImage }),
    };

    if (splitType === 'equal' && selectedIds.length > 0) payload.splitAmong = selectedIds;
    if (splitType === 'percentage') {
      const splits = members
        .map(m => ({ userId: m._id, percentage: parseFloat(pctMap[m._id]) || 0 }))
        .filter(s => s.percentage > 0);
      if (Math.round(pctTotal) !== 100)
        return setAlert({ msg: `Percentages total ${pctTotal.toFixed(1)}%, must be 100%`, type: 'error' });
      payload.splits = splits;
    }
    if (splitType === 'itemized') {
      if (lineItems.length === 0) return setAlert({ msg: 'Add at least one item', type: 'error' });
      const itemTotal = lineItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
      if (Math.abs(itemTotal - parseFloat(amount)) > 0.01) {
        return setAlert({ msg: `Items total ${itemTotal.toFixed(2)}, but bill is ${parseFloat(amount).toFixed(2)}`, type: 'error' });
      }
      payload.lineItems = lineItems;
    }

    setAdding(true);
    const data = await expensesAPI.add(payload);
    setAdding(false);

    if (!data.success) return setAlert({ msg: data.message, type: 'error' });

    setAlert({ msg: `"${desc.trim()}" added!`, type: 'success' });
    setTimeout(() => { onSuccess(); onClose(); }, 900);
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,8,20,0.7)', backdropFilter: 'blur(6px)',
        zIndex: 300,
        display: 'flex',
        alignItems:     isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding:        isMobile ? 0 : '20px',
      }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: isMobile ? '24px 24px 0 0' : 'var(--radius-lg)',
        width: '100%', maxWidth: isMobile ? '100%' : '520px',
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        animation: 'fadeUp 0.28s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2,
        }}>
          {isMobile && (
            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border2)' }} />
          )}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>
              Add Expense
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px', fontWeight: 500 }}>
              to <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{group.name}</span>
              {' '}&middot; {groupCurrency}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', flexShrink: 0, transition: 'all 0.15s' }}
          >
            <svg {...ip}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: '20px 24px 28px' }}>
          <ReceiptScanner onResult={handleOCR} />
          <FormGroup label="Description">
            <Input placeholder="Hotel, Dinner, Cab ride…" value={desc} onChange={e => setDesc(e.target.value)} />
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormGroup label="Amount">
              <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </FormGroup>
            <FormGroup label="Currency">
              <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="">Same ({groupCurrency})</option>
                {CURRENCIES.filter(c => c !== groupCurrency).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormGroup>
          </div>
          {isDiff && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg {...ip}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              {amount || '0'} {currency} → auto-converted to {groupCurrency}
            </div>
          )}
          <FormGroup label="Split Method">
            <Select value={splitType} onChange={e => setSplitType(e.target.value)}>
              <option value="equal">Equal split</option>
              <option value="percentage">By percentage</option>
              <option value="itemized">Itemized split (sub-splits)</option>
            </Select>
          </FormGroup>

          {splitType === 'itemized' && (
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text2)' }}>Line Items</div>
                <div style={{ fontSize: '11px', color: Math.abs(lineItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0) - parseFloat(amount || 0)) < 0.01 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                  Sum: {lineItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0).toFixed(2)} / {parseFloat(amount || 0).toFixed(2)}
                </div>
              </div>

              {lineItems.map((item) => (
                <div key={item.id} style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      placeholder="Item name"
                      value={item.description}
                      onChange={e => {
                        setLineItems(prev => prev.map(it => it.id === item.id ? { ...it, description: e.target.value } : it));
                      }}
                      style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: 'var(--text)', outline: 'none' }}
                    />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={item.total_price}
                      onChange={e => {
                        setLineItems(prev => prev.map(it => it.id === item.id ? { ...it, total_price: e.target.value } : it));
                      }}
                      style={{ width: '80px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: 'var(--text)', outline: 'none', textAlign: 'right' }}
                    />
                    <button
                      onClick={() => setLineItems(lineItems.filter(it => it.id !== item.id))}
                      style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                    >
                      <svg {...ip} style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {members.map(m => {
                      const isSel = item.splitAmong.includes(m._id);
                      return (
                        <div
                          key={m._id}
                          onClick={() => {
                            setLineItems(prev => prev.map(it => {
                              if (it.id !== item.id) return it;
                              const newSplit = isSel ? it.splitAmong.filter(id => id !== m._id) : [...it.splitAmong, m._id];
                              return { ...it, splitAmong: newSplit };
                            }));
                          }}
                          style={{
                            padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            background: isSel ? 'rgba(109,91,235,0.1)' : 'transparent',
                            border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                            color: isSel ? 'var(--accent)' : 'var(--text3)',
                            transition: 'all 0.1s'
                          }}
                        >
                          {m.name.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={() => setLineItems([...lineItems, { id: Math.random().toString(36).substr(2, 9), description: '', total_price: '', splitAmong: members.map(m => m._id) }])}
                style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
              >
                + Add Another Item
              </button>
            </div>
          )}

          {splitType === 'equal' && members.length > 0 && (
            <FormGroup label="Split Among (empty = everyone)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {members.map(m => {
                  const sel = selectedIds.includes(m._id);
                  return (
                    <div
                      key={m._id}
                      onClick={() => setSelectedIds(p => p.includes(m._id) ? p.filter(x => x !== m._id) : [...p, m._id])}
                      style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', background: sel ? 'rgba(109,91,235,0.12)' : 'var(--surface2)', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, color: sel ? 'var(--accent)' : 'var(--text2)', fontWeight: sel ? 600 : 400, transition: 'all 0.15s' }}
                    >
                      {m.name}
                    </div>
                  );
                })}
              </div>
            </FormGroup>
          )}

          {splitType === 'percentage' && members.length > 0 && (
            <FormGroup label={`Percentages (total: ${pctTotal.toFixed(1)}%)`}>
              {members.map(m => (
                <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(109,91,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{m.name}</span>
                  <input
                    type="number" placeholder="0" min="0" max="100"
                    value={pctMap[m._id] || ''}
                    onChange={e => setPctMap(p => ({ ...p, [m._id]: e.target.value }))}
                    style={{ width: '72px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'right', outline: 'none' }}
                  />
                  <span style={{ color: 'var(--text3)', width: '14px', fontSize: '13px' }}>%</span>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: Math.round(pctTotal) === 100 ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
                {Math.round(pctTotal) === 100 ? '✓ Perfect' : `${pctTotal.toFixed(1)}% / 100%`}
              </div>
            </FormGroup>
          )}

          <Alert message={alert?.msg} type={alert?.type} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={submit} disabled={adding} style={{ flex: 2 }}>
              {adding ? 'Adding…' : 'Add Expense'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, label, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, padding: '10px', border: 'none',
        background:  activeTab === id ? 'var(--accent)' : 'transparent',
        color:       activeTab === id ? '#fff' : 'var(--text2)',
        fontFamily:  'var(--font-display)', fontSize: '13px', fontWeight: 700,
        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.18s',
        boxShadow: activeTab === id ? '0 2px 8px rgba(109,91,235,0.3)' : 'none',
      }}
    >{label}</button>
  );
}

function FormCard({ grpName, setGrpName, createGroup, currency, setCurrency, joinCode, setJoinCode, joinGroup, createAlert, joinAlert }) {
  const showCreate = grpName !== undefined;
  const showJoin = joinCode !== undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showCreate && (
        <Card>
          <CardTitle>Create Group</CardTitle>
          <FormGroup label="Group Name">
            <Input placeholder="Goa Trip 2025, Office Lunch…" value={grpName} onChange={e => setGrpName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroup()} />
          </FormGroup>
          <FormGroup label="Base Currency">
            <Select value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <Alert message={createAlert?.msg} type={createAlert?.type} />
          <Button onClick={createGroup}>Create Group</Button>
        </Card>
      )}

      {showJoin && (
        <Card>
          <CardTitle>Join Group</CardTitle>
          <FormGroup label="Invite Code">
            <Input placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && joinGroup()} style={{ letterSpacing: '3px' }} />
          </FormGroup>
          <Alert message={joinAlert?.msg} type={joinAlert?.type} />
          <Button onClick={joinGroup}>Join Group</Button>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const [expenseGroup, setExpenseGroup] = useState(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const data = await groupsAPI.getAll();
    if (data.success) setGroups(data.data);
    setLoading(false);
  }, [setGroups]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

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

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Groups
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
          Create, join, and manage your expense groups
        </div>
      </div>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '16px', boxShadow: 'var(--shadow)' }}>
            <TabButton id="list"   label={`Groups (${groups.length})`} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="create" label="+ Create" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="join"   label="+ Join" activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {activeTab === 'list' && (
            <Card>
              <CardTitle>{groups.length} Group{groups.length !== 1 ? 's' : ''}</CardTitle>
              {loading ? <Loading /> : groups.length === 0 ? (
                <Empty text="No groups yet — create or join one" />
              ) : groups.map((g, i) => (
                <GroupCard
                  key={g._id}
                  group={g}
                  user={user}
                  token={token}
                  color={GROUP_COLORS[i % GROUP_COLORS.length]}
                  onAddExpense={() => setExpenseGroup(g)}
                  onLeave={loadGroups}
                />
              ))}
            </Card>
          )}
          {activeTab === 'create' && (
            <FormCard 
              grpName={grpName} setGrpName={setGrpName} createGroup={createGroup}
              currency={currency} setCurrency={setCurrency} 
              createAlert={createAlert}
            />
          )}
          {activeTab === 'join' && (
            <FormCard 
              joinCode={joinCode} setJoinCode={setJoinCode} joinGroup={joinGroup}
              joinAlert={joinAlert}
            />
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          <FormCard 
            grpName={grpName} setGrpName={setGrpName} createGroup={createGroup}
            currency={currency} setCurrency={setCurrency} 
            joinCode={joinCode} setJoinCode={setJoinCode} joinGroup={joinGroup}
            createAlert={createAlert} joinAlert={joinAlert}
          />
          <Card>
            <CardTitle>{groups.length} Group{groups.length !== 1 ? 's' : ''}</CardTitle>
            {loading ? <Loading /> : groups.length === 0 ? (
              <Empty text="No groups yet — create or join one" />
            ) : groups.map((g, i) => (
              <GroupCard
                key={g._id}
                group={g}
                user={user}
                token={token}
                color={GROUP_COLORS[i % GROUP_COLORS.length]}
                onAddExpense={() => setExpenseGroup(g)}
                onLeave={loadGroups}
              />
            ))}
          </Card>
        </div>
      )}

      {expenseGroup && (
        <AddExpenseModal
          group={expenseGroup}
          onClose={() => setExpenseGroup(null)}
          onSuccess={loadGroups}
        />
      )}
    </div>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────
function GroupCard({ group: g, user, token, color, onAddExpense, onLeave }) {
  const [showChat, setShowChat] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [leaving,  setLeaving]  = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(g.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    const userId  = user?._id || user?.id;
    const balance = g.balances?.[userId] || 0;
    
    if (Math.abs(balance) >= 0.01) {
      alert(`Cannot leave ${g.name}. You have a pending balance of ${g.currency} ${balance.toFixed(2)}. Please settle up first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to leave ${g.name}?`)) return;

    setLeaving(true);
    const res = await groupsAPI.leave(g._id);
    setLeaving(false);

    if (res.success) {
      onLeave();
    } else {
      alert(res.message || 'Failed to leave group');
    }
  }

  return (
    <div
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '10px', borderLeft: `4px solid ${color}`, transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>{g.name}</div>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: `${color}18`, color, border: `1px solid ${color}30` }}>
          {g.currency || 'INR'}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', fontWeight: 500 }}>
        {g.members.length} member{g.members.length !== 1 ? 's' : ''} · {g.members.map(m => m.name).join(', ')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>Code</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '4px', color, flex: 1, fontWeight: 700 }}>{g.inviteCode}</span>
        <button
          onClick={copyCode}
          style={{ padding: '4px 10px', background: copied ? `${color}18` : 'transparent', border: `1px solid ${copied ? color : 'var(--border)'}`, color: copied ? color : 'var(--text3)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-display)', transition: 'all 0.2s' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onAddExpense}
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 12px', background: color, border: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 700, transition: 'all 0.18s', boxShadow: `0 4px 12px ${color}40` }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Expense
        </button>

        <button
          onClick={() => setShowChat(s => !s)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 12px', background: showChat ? `${color}12` : 'transparent', border: `1px solid ${showChat ? color : 'var(--border)'}`, color: showChat ? color : 'var(--text2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, transition: 'all 0.18s' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>

        <button
          onClick={handleLeave}
          disabled={leaving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', padding: '10px 0', background: 'transparent', border: '1px solid var(--border)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.18s', opacity: leaving ? 0.5 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {showChat && <div style={{ marginTop: '12px' }}><GroupChat groupId={g._id} user={user} token={token} /></div>}
    </div>
  );
}