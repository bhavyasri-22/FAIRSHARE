import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { expensesAPI } from '../api';
import { Card, CardTitle, FormGroup, Input, Select, Button, Alert, Loading, Empty } from '../components/UI';
import ExpenseCard    from '../components/ExpenseCard';
import ReceiptScanner from '../components/ReceiptScanner';
import { socket }     from '../socket';

const CURRENCIES = ['INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED'];
const ip = { width:'16', height:'16', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' };

// ── Sub-components (Defined outside to prevent focus loss issues) ──────────────

function AddForm({ 
  groups, groupId, setGroupId, desc, setDesc, amount, setAmount, 
  currency, setCurrency, splitType, setSplitType, lineItems, setLineItems,
  billImage, setBillImage, selectedIds, setSelectedIds, pctMap, setPctMap,
  formAlert, addExpense, adding, members, groupCurrency, isMobile, handleOCR 
}) {
  const isDiff = currency && currency !== groupCurrency;
  const pctTotal = members.reduce((s, m) => s + (parseFloat(pctMap[m._id]) || 0), 0);

  return (
    <Card>
      <CardTitle>Add Expense</CardTitle>
      <ReceiptScanner onResult={handleOCR} />

      <FormGroup label="Group">
        <Select value={groupId} onChange={e => setGroupId(e.target.value)}>
          <option value="">Select a group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.currency || 'INR'})</option>)}
        </Select>
      </FormGroup>

      <FormGroup label="Description">
        <Input placeholder="Hotel, Dinner, Cab ride..." value={desc} onChange={e => setDesc(e.target.value)} />
      </FormGroup>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <FormGroup label="Amount">
          <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </FormGroup>
        <FormGroup label="Currency">
          <Select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="">Same ({groupCurrency})</option>
            {CURRENCIES.filter(c => c !== groupCurrency).map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FormGroup>
      </div>

      {isDiff && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg {...ip} style={{ width: 13, height: 13 }}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          {amount || '0'} {currency} will be auto-converted to {groupCurrency}
        </div>
      )}

      <FormGroup label="Split Method">
        <Select value={splitType} onChange={e => setSplitType(e.target.value)}>
          <option value="equal">Equal split</option>
          <option value="percentage">By percentage</option>
          <option value="itemized">Itemized split (sub-splits)</option>
        </Select>
      </FormGroup>

      {splitType === 'itemized' && groupId && (
        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text2)' }}>Line Items</div>
            <div style={{ fontSize: '11px', color: Math.abs(lineItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0) - parseFloat(amount || 0)) < 0.01 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              Sum: {lineItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0).toFixed(2)} / {parseFloat(amount || 0).toFixed(2)}
            </div>
          </div>

          {lineItems.map((item) => (
            <div key={item.id} style={{ padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  placeholder="Item"
                  value={item.description}
                  onChange={e => setLineItems(prev => prev.map(it => it.id === item.id ? { ...it, description: e.target.value } : it))}
                  style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', color: 'var(--text)', outline: 'none' }}
                />
                <input
                  type="number"
                  placeholder="0.00"
                  value={item.total_price}
                  onChange={e => setLineItems(prev => prev.map(it => it.id === item.id ? { ...it, total_price: e.target.value } : it))}
                  style={{ width: '70px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', color: 'var(--text)', outline: 'none', textAlign: 'right' }}
                />
                <button onClick={() => setLineItems(prev => prev.filter(it => it.id !== item.id))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '2px' }}>
                  <svg {...ip} style={{ width: 14, height: 14 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {members.map(m => {
                  const isSel = item.splitAmong.includes(m._id);
                  return (
                    <div
                      key={m._id}
                      onClick={() => setLineItems(prev => prev.map(it => {
                        if (it.id !== item.id) return it;
                        const newSplit = isSel ? it.splitAmong.filter(id => id !== m._id) : [...it.splitAmong, m._id];
                        return { ...it, splitAmong: newSplit };
                      }))}
                      style={{
                        padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                        background: isSel ? 'rgba(109,91,235,0.1)' : 'transparent',
                        border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                        color: isSel ? 'var(--accent)' : 'var(--text3)',
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
            style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Add Item
          </button>
        </div>
      )}

      {splitType === 'equal' && members.length > 0 && (
        <FormGroup label="Split Among (empty = everyone)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {members.map(m => {
              const sel = selectedIds.includes(m._id);
              return (
                <div key={m._id} onClick={() => setSelectedIds(p => p.includes(m._id) ? p.filter(x => x !== m._id) : [...p, m._id])}
                  style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', background: sel ? 'rgba(109,91,235,0.12)' : 'var(--surface2)', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, color: sel ? 'var(--accent)' : 'var(--text2)', fontWeight: sel ? 600 : 400, transition: 'all 0.15s' }}>
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
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{m.name}</span>
              <input type="number" placeholder="0" min="0" max="100" value={pctMap[m._id] || ''} onChange={e => setPctMap(p => ({ ...p, [m._id]: e.target.value }))}
                style={{ width: '72px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'right', outline: 'none' }} />
              <span style={{ color: 'var(--text3)', fontSize: '13px', width: '14px' }}>%</span>
            </div>
          ))}
          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: Math.round(pctTotal) === 100 ? 'var(--green)' : 'var(--red)' }}>
            {Math.round(pctTotal) === 100 ? '✓ Perfect' : `${pctTotal.toFixed(1)}% / 100%`}
          </div>
        </FormGroup>
      )}

      <Alert message={formAlert?.msg} type={formAlert?.type} />
      <Button onClick={addExpense} disabled={adding}>{adding ? 'Adding…' : 'Add Expense'}</Button>
    </Card>
  );
}

function ListView({ viewGroupId, setViewGroupId, groups, listLoading, expenses, viewGroup, loadExpenses }) {
  return (
    <Card>
      <CardTitle>Expense History</CardTitle>
      <FormGroup label="Filter by Group">
        <Select value={viewGroupId} onChange={e => { setViewGroupId(e.target.value); loadExpenses(e.target.value); }}>
          <option value="">Select a group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </Select>
      </FormGroup>
      {listLoading ? <Loading /> : !viewGroupId ? (
        <Empty text="Select a group to view expenses" />
      ) : expenses.length === 0 ? (
        <Empty text="No expenses yet — add the first one!" />
      ) : expenses.map(e => <ExpenseCard key={e._id} expense={e} groupCurrency={viewGroup?.currency || 'INR'} />)}
    </Card>
  );
}

function TabButton({ id, label, activeTab, setActiveTab }) {
  return (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1, padding: '10px', border: 'none',
        background: activeTab === id ? 'var(--accent)' : 'transparent',
        color: activeTab === id ? '#fff' : 'var(--text2)',
        fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.18s',
        boxShadow: activeTab === id ? '0 2px 8px rgba(109,91,235,0.3)' : 'none'
      }}
    >{label}</button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { groups } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('list');

  const [groupId,     setGroupId]     = useState('');
  const [desc,        setDesc]        = useState('');
  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState('');
  const [splitType,   setSplitType]   = useState('equal');
  const [lineItems,   setLineItems]   = useState([]);
  const [billImage,   setBillImage]   = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pctMap,      setPctMap]      = useState({});
  const [formAlert,   setFormAlert]   = useState(null);
  const [adding,      setAdding]      = useState(false);

  const [viewGroupId, setViewGroupId] = useState('');
  const [expenses,    setExpenses]    = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const selectedGroup = groups.find(g => g._id === groupId);
  const members       = selectedGroup?.members || [];
  const groupCurrency = selectedGroup?.currency || 'INR';
  const viewGroup     = groups.find(g => g._id === viewGroupId);

  const loadExpenses = useCallback(async (gid) => {
    if (!gid) { setExpenses([]); return; }
    setListLoading(true);
    const data = await expensesAPI.getForGroup(gid);
    setListLoading(false);
    if (data.success) setExpenses(data.data.expenses);
  }, []);

  useEffect(() => { setSelectedIds([]); setPctMap({}); setCurrency(''); setLineItems([]); }, [groupId]);

  useEffect(() => {
    if (!viewGroupId) return;
    socket.emit('join_group', viewGroupId);
    const h = ({ groupId: gid }) => { if (gid === viewGroupId) loadExpenses(viewGroupId); };
    socket.on('expense_added', h);
    return () => socket.off('expense_added', h);
  }, [viewGroupId, loadExpenses]);

  async function addExpense() {
    setFormAlert(null);
    if (!groupId)                       return setFormAlert({ msg: 'Select a group', type: 'error' });
    if (!desc.trim())                   return setFormAlert({ msg: 'Description required', type: 'error' });
    if (!amount || parseFloat(amount) <= 0) return setFormAlert({ msg: 'Enter a valid amount', type: 'error' });

    const payload = { 
      groupId, 
      description: desc.trim(), 
      totalAmount: parseFloat(amount), 
      splitType, 
      ...(currency && { currency }), 
      ...(billImage && { billImage }) 
    };

    if (splitType === 'equal' && selectedIds.length > 0) payload.splitAmong = selectedIds;
    if (splitType === 'percentage') {
      const pctTotal = members.reduce((s, m) => s + (parseFloat(pctMap[m._id]) || 0), 0);
      const splits = members.map(m => ({ userId: m._id, percentage: parseFloat(pctMap[m._id]) || 0 })).filter(s => s.percentage > 0);
      if (Math.round(pctTotal) !== 100) return setFormAlert({ msg: `Total is ${pctTotal.toFixed(1)}%, must be 100%`, type: 'error' });
      payload.splits = splits;
    }
    if (splitType === 'itemized') {
      if (lineItems.length === 0) return setFormAlert({ msg: 'Add at least one item', type: 'error' });
      const itemTotal = lineItems.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0);
      if (Math.abs(itemTotal - parseFloat(amount)) > 0.01) {
        return setFormAlert({ msg: `Items total ${itemTotal.toFixed(2)}, but bill is ${parseFloat(amount).toFixed(2)}`, type: 'error' });
      }
      payload.lineItems = lineItems;
    }

    setAdding(true);
    const data = await expensesAPI.add(payload);
    setAdding(false);
    if (!data.success) return setFormAlert({ msg: data.message, type: 'error' });

    setFormAlert({ msg: `"${desc.trim()}" added!`, type: 'success' });
    setDesc(''); setAmount(''); setCurrency(''); setBillImage(null); setLineItems([]);
    if (viewGroupId === groupId) loadExpenses(viewGroupId);
    if (isMobile) setTimeout(() => setActiveTab('list'), 800);
  }

  const handleOCR = ({ description, amount: a, billImage: b, lineItems: items }) => {
    if (description) setDesc(description);
    if (a) setAmount(String(a));
    if (b) setBillImage(b);
    if (items && items.length > 0) {
      setLineItems(items.map(i => ({
        id: Math.random().toString(36).substr(2, 9),
        description: i.description || 'Item',
        total_price: i.total_price || 0,
        splitAmong: members.map(m => m._id)
      })));
      setSplitType('itemized');
    }
  };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>Expenses</div>
        <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>Add and track group expenses</div>
      </div>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '16px', boxShadow: 'var(--shadow)' }}>
            <TabButton id="list" label="History" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="add" label="+ Add Expense" activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          {activeTab === 'list' ? (
            <ListView 
              viewGroupId={viewGroupId} setViewGroupId={setViewGroupId} groups={groups} 
              listLoading={listLoading} expenses={expenses} viewGroup={viewGroup} loadExpenses={loadExpenses} 
            />
          ) : (
            <AddForm 
              groups={groups} groupId={groupId} setGroupId={setGroupId} desc={desc} setDesc={setDesc} 
              amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} 
              splitType={splitType} setSplitType={setSplitType} lineItems={lineItems} setLineItems={setLineItems}
              billImage={billImage} setBillImage={setBillImage} selectedIds={selectedIds} setSelectedIds={setSelectedIds} 
              pctMap={pctMap} setPctMap={setPctMap} formAlert={formAlert} addExpense={addExpense} adding={adding} 
              members={members} groupCurrency={groupCurrency} isMobile={isMobile} handleOCR={handleOCR}
            />
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 400px) 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 0 }}>
            <AddForm 
              groups={groups} groupId={groupId} setGroupId={setGroupId} desc={desc} setDesc={setDesc} 
              amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} 
              splitType={splitType} setSplitType={setSplitType} lineItems={lineItems} setLineItems={setLineItems}
              billImage={billImage} setBillImage={setBillImage} selectedIds={selectedIds} setSelectedIds={setSelectedIds} 
              pctMap={pctMap} setPctMap={setPctMap} formAlert={formAlert} addExpense={addExpense} adding={adding} 
              members={members} groupCurrency={groupCurrency} isMobile={isMobile} handleOCR={handleOCR}
            />
          </div>
          <ListView 
            viewGroupId={viewGroupId} setViewGroupId={setViewGroupId} groups={groups} 
            listLoading={listLoading} expenses={expenses} viewGroup={viewGroup} loadExpenses={loadExpenses} 
          />
        </div>
      )}
    </div>
  );
}