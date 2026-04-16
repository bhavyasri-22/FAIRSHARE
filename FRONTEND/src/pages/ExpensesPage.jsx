import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { expensesAPI } from '../api';
import { Card, CardTitle, FormGroup, Input, Select, Button, Alert, Loading, Empty } from '../components/UI';
import ExpenseCard    from '../components/ExpenseCard';
import ReceiptScanner from '../components/ReceiptScanner';
import { socket }     from '../socket';

const CURRENCIES = ['INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED'];

export default function ExpensesPage() {
  const { groups } = useAuth();
  const isMobile   = useIsMobile();
  const [activeTab, setActiveTab] = useState('list');

  const [groupId,     setGroupId]     = useState('');
  const [desc,        setDesc]        = useState('');
  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState('');
  const [splitType,   setSplitType]   = useState('equal');
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
  const isDiff        = currency && currency !== groupCurrency;
  const pctTotal      = members.reduce((s,m) => s + (parseFloat(pctMap[m._id])||0), 0);
  const viewGroup     = groups.find(g => g._id === viewGroupId);

  useEffect(() => { setSelectedIds([]); setPctMap({}); setCurrency(''); }, [groupId]);

  useEffect(() => {
    if (!viewGroupId) return;
    socket.emit('join_group', viewGroupId);
    const h = ({groupId:gid}) => { if (gid===viewGroupId) loadExpenses(viewGroupId); };
    socket.on('expense_added', h);
    return () => socket.off('expense_added', h);
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
    if (!groupId)                          return setFormAlert({ msg:'Select a group', type:'error' });
    if (!desc.trim())                      return setFormAlert({ msg:'Description required', type:'error' });
    if (!amount||parseFloat(amount)<=0)    return setFormAlert({ msg:'Enter a valid amount', type:'error' });

    const payload = { groupId, description:desc.trim(), totalAmount:parseFloat(amount), splitType, ...(currency&&{currency}), ...(billImage&&{billImage}) };
    if (splitType==='equal'&&selectedIds.length>0) payload.splitAmong = selectedIds;
    if (splitType==='percentage') {
      const splits = members.map(m=>({userId:m._id,percentage:parseFloat(pctMap[m._id])||0})).filter(s=>s.percentage>0);
      if (Math.round(pctTotal)!==100) return setFormAlert({ msg:`Total is ${pctTotal.toFixed(1)}%, must be 100%`, type:'error' });
      payload.splits = splits;
    }

    setAdding(true);
    const data = await expensesAPI.add(payload);
    setAdding(false);
    if (!data.success) return setFormAlert({ msg:data.message, type:'error' });

    setFormAlert({ msg:`"${desc.trim()}" added!`, type:'success' });
    setDesc(''); setAmount(''); setCurrency(''); setBillImage(null);
    if (viewGroupId===groupId) loadExpenses(viewGroupId);
    if (isMobile) setTimeout(()=>setActiveTab('list'), 800);
  }

  function handleOCRResult({ description, amount:a, billImage:b }) {
    if (description) setDesc(description);
    if (a) setAmount(String(a));
    if (b) setBillImage(b);
  }

  const TAB = (id, label) => (
    <button onClick={()=>setActiveTab(id)} style={{flex:1,padding:'10px',border:'none',background:activeTab===id?'var(--accent)':'transparent',color:activeTab===id?'#fff':'var(--text2)',fontFamily:'var(--font-display)',fontSize:'13px',fontWeight:700,borderRadius:'8px',cursor:'pointer',transition:'all 0.18s',boxShadow:activeTab===id?'0 2px 8px rgba(109,91,235,0.3)':'none'}}>{label}</button>
  );

  const MEMBER_CHIP = (m) => {
    const sel = selectedIds.includes(m._id);
    return (
      <div key={m._id} onClick={()=>setSelectedIds(p=>p.includes(m._id)?p.filter(x=>x!==m._id):[...p,m._id])}
        style={{padding:'7px 14px',borderRadius:'999px',fontSize:'13px',cursor:'pointer',userSelect:'none',background:sel?'rgba(109,91,235,0.12)':'var(--surface2)',border:`1.5px solid ${sel?'var(--accent)':'var(--border)'}`,color:sel?'var(--accent)':'var(--text2)',fontWeight:sel?600:400,transition:'all 0.15s'}}>
        {m.name}
      </div>
    );
  };

  const AddForm = () => (
    <Card>
      <CardTitle>Add Expense</CardTitle>
      <ReceiptScanner onResult={handleOCRResult} />

      <FormGroup label="Group">
        <Select value={groupId} onChange={e=>setGroupId(e.target.value)}>
          <option value="">Select a group</option>
          {groups.map(g=><option key={g._id} value={g._id}>{g.name} ({g.currency||'INR'})</option>)}
        </Select>
      </FormGroup>

      <FormGroup label="Description">
        <Input placeholder="Hotel, Dinner, Cab ride..." value={desc} onChange={e=>setDesc(e.target.value)} />
      </FormGroup>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <FormGroup label="Amount">
          <Input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} />
        </FormGroup>
        <FormGroup label="Currency">
          <Select value={currency} onChange={e=>setCurrency(e.target.value)}>
            <option value="">Same ({groupCurrency})</option>
            {CURRENCIES.filter(c=>c!==groupCurrency).map(c=><option key={c} value={c}>{c}</option>)}
          </Select>
        </FormGroup>
      </div>

      {isDiff && (
        <div style={{padding:'10px 14px',borderRadius:'var(--radius-sm)',marginBottom:'14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:'12px',color:'var(--yellow)',display:'flex',alignItems:'center',gap:'6px'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          {amount||'0'} {currency} will be auto-converted to {groupCurrency}
        </div>
      )}

      <FormGroup label="Split Method">
        <Select value={splitType} onChange={e=>setSplitType(e.target.value)}>
          <option value="equal">Equal split</option>
          <option value="percentage">By percentage</option>
        </Select>
      </FormGroup>

      {splitType==='equal' && members.length>0 && (
        <FormGroup label="Split Among (empty = everyone)">
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'4px'}}>{members.map(MEMBER_CHIP)}</div>
        </FormGroup>
      )}

      {splitType==='percentage' && members.length>0 && (
        <FormGroup label={`Percentages (total: ${pctTotal.toFixed(1)}%)`}>
          {members.map(m=>(
            <div key={m._id} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
              <span style={{flex:1,fontSize:'13px',fontWeight:500}}>{m.name}</span>
              <input type="number" placeholder="0" min="0" max="100" value={pctMap[m._id]||''} onChange={e=>setPctMap(p=>({...p,[m._id]:e.target.value}))}
                style={{width:'72px',background:'var(--surface2)',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'8px 10px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'13px',textAlign:'right',outline:'none'}}/>
              <span style={{color:'var(--text3)',fontSize:'13px',width:'14px'}}>%</span>
            </div>
          ))}
          <div style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:Math.round(pctTotal)===100?'var(--green)':'var(--red)'}}>
            {Math.round(pctTotal)===100 ? '✓ Perfect' : `${pctTotal.toFixed(1)}% / 100%`}
          </div>
        </FormGroup>
      )}

      <Alert message={formAlert?.msg} type={formAlert?.type} />
      <Button onClick={addExpense} disabled={adding}>{adding?'Adding…':'Add Expense'}</Button>
    </Card>
  );

  const ListView = () => (
    <Card>
      <CardTitle>Expense History</CardTitle>
      <FormGroup label="Filter by Group">
        <Select value={viewGroupId} onChange={e=>{setViewGroupId(e.target.value);loadExpenses(e.target.value);}}>
          <option value="">Select a group</option>
          {groups.map(g=><option key={g._id} value={g._id}>{g.name}</option>)}
        </Select>
      </FormGroup>
      {listLoading ? <Loading /> : !viewGroupId ? (
        <Empty text="Select a group to view expenses" />
      ) : expenses.length===0 ? (
        <Empty text="No expenses yet — add the first one!" />
      ) : expenses.map(e=><ExpenseCard key={e._id} expense={e} groupCurrency={viewGroup?.currency||'INR'}/>)}
    </Card>
  );

  return (
    <div className="fade-up">
      <div style={{marginBottom:'24px'}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:isMobile?'22px':'28px',fontWeight:800,letterSpacing:'-0.5px'}}>Expenses</div>
        <div style={{color:'var(--text2)',fontSize:'14px',marginTop:'4px',fontWeight:500}}>Add and track group expenses</div>
      </div>

      {isMobile ? (
        <>
          <div style={{display:'flex',gap:'4px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'4px',marginBottom:'16px',boxShadow:'var(--shadow)'}}>
            {TAB('list','History')}
            {TAB('add','+ Add Expense')}
          </div>
          {activeTab==='list' ? <ListView/> : <AddForm/>}
        </>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:'24px',alignItems:'start'}}>
          <div style={{position:'sticky',top:0}}><AddForm/></div>
          <ListView/>
        </div>
      )}
    </div>
  );
}