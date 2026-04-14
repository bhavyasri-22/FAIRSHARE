import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { expensesAPI } from '../api';
import { Card, CardTitle, FormGroup, Input, Select, Button, Alert, Loading, Empty } from '../components/UI';
import ExpenseCard    from '../components/ExpenseCard';
import ReceiptScanner from '../components/ReceiptScanner';
import { socket } from '../socket';

const CURRENCIES   = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];
const currencyFlag = (c) => ({ INR: '🇮🇳', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', AED: '🇦🇪' }[c] || '💱');

export default function ExpensesPage() {
  const { groups } = useAuth();
  const isMobile   = useIsMobile();
  const [activeTab, setActiveTab] = useState('list');

  // Form state
  const [groupId,     setGroupId]     = useState('');
  const [desc,        setDesc]        = useState('');
  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState('');
  const [splitType,   setSplitType]   = useState('equal');
  const [selectedIds, setSelectedIds] = useState([]);
  const [pctMap,      setPctMap]      = useState({});
  const [formAlert,   setFormAlert]   = useState(null);
  const [adding,      setAdding]      = useState(false);

  // List state
  const [viewGroupId, setViewGroupId] = useState('');
  const [expenses,    setExpenses]    = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const selectedGroup = groups.find(g => g._id === groupId);
  const members       = selectedGroup?.members || [];
  const groupCurrency = selectedGroup?.currency || 'INR';
  const isDiff        = currency && currency !== groupCurrency;
  const pctTotal      = members.reduce((s, m) => s + (parseFloat(pctMap[m._id]) || 0), 0);
  const viewGroup     = groups.find(g => g._id === viewGroupId);

  useEffect(() => { setSelectedIds([]); setPctMap({}); setCurrency(''); }, [groupId]);

  // ── Join group socket room & listen for live expense updates ──
  useEffect(() => {
    if (!viewGroupId) return;
    socket.emit('join_group', viewGroupId);

    const handleExpenseAdded = ({ groupId: gid }) => {
      if (gid === viewGroupId) loadExpenses(viewGroupId);
    };
    socket.on('expense_added', handleExpenseAdded);
    return () => socket.off('expense_added', handleExpenseAdded);
  }, [viewGroupId]);

  const loadExpenses = useCallback(async (gid) => {
    if (!gid) return;
    setListLoading(true);
    const data = await expensesAPI.getForGroup(gid);
    setListLoading(false);
    if (data.success) setExpenses(data.data.expenses);
  }, []);

  async function addExpense() {
    setFormAlert(null);
    if (!groupId)                            return setFormAlert({ msg: 'Select a group',         type: 'error' });
    if (!desc.trim())                        return setFormAlert({ msg: 'Description required',   type: 'error' });
    if (!amount || parseFloat(amount) <= 0)  return setFormAlert({ msg: 'Enter a valid amount',   type: 'error' });

    const payload = {
      groupId,
      description: desc.trim(),
      totalAmount: parseFloat(amount),
      splitType,
      ...(currency && { currency }),
    };

    if (splitType === 'equal' && selectedIds.length > 0) payload.splitAmong = selectedIds;
    if (splitType === 'percentage') {
      const splits = members.map(m => ({ userId: m._id, percentage: parseFloat(pctMap[m._id]) || 0 })).filter(s => s.percentage > 0);
      if (Math.round(pctTotal) !== 100) return setFormAlert({ msg: `Percentages total ${pctTotal.toFixed(1)}%, must be 100%`, type: 'error' });
      payload.splits = splits;
    }

    setAdding(true);
    const data = await expensesAPI.add(payload);
    setAdding(false);

    if (!data.success) return setFormAlert({ msg: data.message, type: 'error' });

    setFormAlert({ msg: `"${desc.trim()}" added!`, type: 'success' });
    setDesc(''); setAmount(''); setCurrency('');
    if (viewGroupId === groupId) loadExpenses(viewGroupId);
    if (isMobile) setTimeout(() => setActiveTab('list'), 800);
  }

  // ── OCR receipt callback — auto-fills description + amount ──
  function handleOCRResult({ description, amount: parsedAmount }) {
    if (description) setDesc(description);
    if (parsedAmount) setAmount(String(parsedAmount));
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

  const AddForm = () => (
    <Card>
      <CardTitle>Add Expense</CardTitle>

      {/* ── OCR Scanner ── */}
      <ReceiptScanner onResult={handleOCRResult} />

      <FormGroup label="Group">
        <Select value={groupId} onChange={e => setGroupId(e.target.value)}>
          <option value="">Select group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.currency || 'INR'})</option>)}
        </Select>
      </FormGroup>

      <FormGroup label="Description">
        <Input placeholder="Hotel, Dinner, Cab..." value={desc} onChange={e => setDesc(e.target.value)} />
      </FormGroup>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <FormGroup label="Amount">
          <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </FormGroup>
        <FormGroup label="Currency">
          <Select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="">Same ({groupCurrency})</option>
            {CURRENCIES.filter(c => c !== groupCurrency).map(c => <option key={c} value={c}>{currencyFlag(c)} {c}</option>)}
          </Select>
        </FormGroup>
      </div>

      {isDiff && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)', fontSize: '12px', color: 'var(--yellow)' }}>
          💱 {amount || '0'} {currency} → {groupCurrency} auto-converted
        </div>
      )}

      <FormGroup label="Split Type">
        <Select value={splitType} onChange={e => setSplitType(e.target.value)}>
          <option value="equal">Equal</option>
          <option value="percentage">Percentage</option>
        </Select>
      </FormGroup>

      {splitType === 'equal' && members.length > 0 && (
        <FormGroup label="Split Among (none = everyone)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {members.map(m => (
              <div
                key={m._id}
                onClick={() => setSelectedIds(prev => prev.includes(m._id) ? prev.filter(x => x !== m._id) : [...prev, m._id])}
                style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', background: selectedIds.includes(m._id) ? 'rgba(0,212,170,0.12)' : 'var(--surface2)', border: `1px solid ${selectedIds.includes(m._id) ? 'var(--accent)' : 'var(--border2)'}`, color: selectedIds.includes(m._id) ? 'var(--accent)' : 'var(--text2)' }}
              >
                {m.name}
              </div>
            ))}
          </div>
        </FormGroup>
      )}

      {splitType === 'percentage' && members.length > 0 && (
        <FormGroup label="Percentages (must total 100%)">
          {members.map(m => (
            <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ flex: 1, fontSize: '13px' }}>{m.name}</span>
              <input type="number" placeholder="0" min="0" max="100" value={pctMap[m._id] || ''} onChange={e => setPctMap(prev => ({ ...prev, [m._id]: e.target.value }))}
                style={{ width: '70px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right', outline: 'none' }} />
              <span style={{ color: 'var(--text2)', fontSize: '13px' }}>%</span>
            </div>
          ))}
          <div style={{ textAlign: 'right', fontSize: '12px', color: Math.round(pctTotal) === 100 ? 'var(--green)' : 'var(--red)' }}>
            Total: {pctTotal.toFixed(1)}%
          </div>
        </FormGroup>
      )}

      <Alert message={formAlert?.msg} type={formAlert?.type} />
      <Button onClick={addExpense} disabled={adding}>{adding ? 'Adding...' : 'Add Expense'}</Button>
    </Card>
  );

  const ListView = () => (
    <Card>
      <CardTitle>Expense History</CardTitle>
      <FormGroup label="Filter by Group">
        <Select value={viewGroupId} onChange={e => { setViewGroupId(e.target.value); loadExpenses(e.target.value); }}>
          <option value="">Select group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </Select>
      </FormGroup>
      {listLoading ? <Loading /> : !viewGroupId ? (
        <Empty icon="💸" text="Select a group to view expenses" />
      ) : expenses.length === 0 ? (
        <Empty icon="💸" text="No expenses yet" />
      ) : expenses.map(e => <ExpenseCard key={e._id} expense={e} groupCurrency={viewGroup?.currency || 'INR'} />)}
    </Card>
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>Expenses</div>
        <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Add and track group expenses</div>
      </div>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '16px' }}>
            {tabBtn('list', 'History')}
            {tabBtn('add', '+ Add Expense')}
          </div>
          {activeTab === 'list' ? <ListView /> : <AddForm />}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 0 }}><AddForm /></div>
          <ListView />
        </div>
      )}
    </div>
  );
}