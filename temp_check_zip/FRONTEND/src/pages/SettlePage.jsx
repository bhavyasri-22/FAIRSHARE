import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { expensesAPI, settlementsAPI } from '../api';
import { Card, CardTitle, FormGroup, Select, Input, Button, Alert, Loading, Empty } from '../components/UI';
import BalanceCard from '../components/BalanceCard';

const currencySymbol = (c) => ({
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ'
}[c] || c + ' ');

export default function SettlePage() {
  const { groups, user } = useAuth();
  const isMobile = useIsMobile();

  const [groupId,       setGroupId]       = useState('');
  const [balances,      setBalances]      = useState([]);
  const [settlements,   setSettlements]   = useState([]);
  const [history,       setHistory]       = useState([]);
  const [groupCurrency, setGroupCurrency] = useState('INR');
  const [loading,       setLoading]       = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [payNote,   setPayNote]   = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payAlert,  setPayAlert]  = useState(null);
  const [paying,    setPaying]    = useState(false);

  const load = useCallback(async (gid) => {
    if (!gid) return;
    setLoading(true);
    const [expData, settleData, histData] = await Promise.all([
      expensesAPI.getForGroup(gid),
      expensesAPI.getSettlements(gid),
      settlementsAPI.getHistory(gid)
    ]);
    if (expData.success) {
      setBalances(expData.data.balanceSummary);
      setGroupCurrency(expData.data.groupCurrency || 'INR');
    }
    if (settleData.success) setSettlements(settleData.data);
    if (histData.success)   setHistory(histData.data);
    setLoading(false);
  }, []);

  function openPayModal(s) {
    setModalData(s);
    setPayAmount(s.amount.toFixed(2));
    setPayNote('');
    setPayAlert(null);
    setShowModal(true);
  }

  async function markAsPaid() {
    setPayAlert(null);
    if (!payAmount || parseFloat(payAmount) <= 0)
      return setPayAlert({ msg: 'Enter a valid amount', type: 'error' });

    setPaying(true);
    const data = await settlementsAPI.record({
      groupId,
      paidTo: modalData.to.id,
      amount: parseFloat(payAmount),
      note: payNote
    });
    setPaying(false);

    if (!data.success) return setPayAlert({ msg: data.message, type: 'error' });
    setShowModal(false);
    load(groupId);
  }

  const sym = currencySymbol(groupCurrency);

  const isMe = (id) =>
    String(user?.id) === String(id) || String(user?._id) === String(id);

  return (
    <div className="fade-up">
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Settle Up
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
          Minimum transactions to clear all debts
        </div>
      </div>

      {/* Group selector */}
      <div style={{ marginBottom: '24px' }}>
        <Select value={groupId} onChange={e => { setGroupId(e.target.value); load(e.target.value); }}>
          <option value="">Select a group</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.currency || 'INR'})</option>)}
        </Select>
      </div>

      {loading ? <Loading /> : (
        <>
          {/* ── NET BALANCES ──────────────────────────────── */}
          <Card style={{ marginBottom: '16px' }}>
            <CardTitle>Net Balances</CardTitle>
            {!groupId ? (
              <Empty icon="⚖️" text="Select a group to see balances" />
            ) : balances.length === 0 ? (
              <Empty icon="⚖️" text="No balance data yet" />
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px'
              }}>
                {balances.map(b => <BalanceCard key={b.user.id} balance={b} />)}
              </div>
            )}
          </Card>

          {/* ── SETTLEMENT PLAN ───────────────────────────── */}
          <Card style={{ marginBottom: '16px' }}>
            <CardTitle>
              Settlement Plan
              <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: '11px', marginLeft: '4px' }}>
                min transactions
              </span>
            </CardTitle>

            {!groupId ? (
              <Empty icon="🤝" text="Select a group to see who pays whom" />
            ) : settlements.length === 0 ? (
              <Empty icon="✅" text="Everyone is settled up!" />
            ) : settlements.map((s, i) => (
              <div key={i} style={{
                padding: isMobile ? '14px' : '16px 20px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', marginBottom: '10px'
              }}>
                {/* Top row: from → to + amount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '5px 12px', borderRadius: '999px',
                    fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                    background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)',
                    color: 'var(--red)'
                  }}>{s.from.name}</span>

                  <span style={{ color: 'var(--text3)' }}>→</span>

                  <span style={{
                    padding: '5px 12px', borderRadius: '999px',
                    fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                    background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
                    color: 'var(--green)'
                  }}>{s.to.name}</span>

                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: isMobile ? '16px' : '18px',
                    fontWeight: 800, color: 'var(--accent)', marginLeft: 'auto'
                  }}>
                    {sym}{s.amount.toFixed(2)}
                  </span>
                </div>

                {/* Mark as Paid button — full width on mobile */}
                {isMe(s.from.id) && (
                  <button
                    onClick={() => openPayModal(s)}
                    style={{
                      marginTop: '12px',
                      width: isMobile ? '100%' : 'auto',
                      padding: '9px 18px',
                      background: 'rgba(0,212,170,0.1)',
                      border: '1px solid rgba(0,212,170,0.3)',
                      color: 'var(--accent)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    ✓ Mark as Paid
                  </button>
                )}
              </div>
            ))}
          </Card>

          {/* ── PAYMENT HISTORY ───────────────────────────── */}
          <Card>
            <CardTitle>Payment History</CardTitle>
            {!groupId ? (
              <Empty icon="📋" text="Select a group to see payment history" />
            ) : history.length === 0 ? (
              <Empty icon="📋" text="No payments recorded yet" />
            ) : history.map(h => (
              <div key={h._id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 16px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', marginBottom: '8px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0, marginTop: '5px', boxShadow: '0 0 6px var(--green)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                    <strong>{h.paidBy?.name}</strong>
                    <span style={{ color: 'var(--text2)' }}> paid </span>
                    <strong>{h.paidTo?.name}</strong>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {' '}{sym}{h.amount.toFixed(2)}
                    </span>
                  </div>
                  {h.note && (
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>"{h.note}"</div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>
                  {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ── MARK AS PAID MODAL ────────────────────────────── */}
      {showModal && modalData && (
        <div
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
            zIndex: 200, display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '20px'
          }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: isMobile ? '20px 20px 0 0' : 'var(--radius-lg)',
            padding: '28px',
            width: '100%', maxWidth: isMobile ? '100%' : '420px',
            position: 'relative', overflow: 'hidden',
            paddingBottom: isMobile ? 'max(28px, env(safe-area-inset-bottom))' : '28px'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent)' }} />

            {/* Drag handle on mobile */}
            {isMobile && (
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border2)', margin: '0 auto 20px' }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>Mark as Paid</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
            </div>

            {/* Summary pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              padding: '14px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '20px'
            }}>
              <span style={{ padding: '5px 12px', borderRadius: '999px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', color: 'var(--red)' }}>
                {modalData.from.name}
              </span>
              <span style={{ color: 'var(--text3)' }}>→</span>
              <span style={{ padding: '5px 12px', borderRadius: '999px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', color: 'var(--green)' }}>
                {modalData.to.name}
              </span>
            </div>

            <FormGroup label={`Amount (${groupCurrency})`}>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '5px' }}>
                Suggested: {sym}{modalData.amount.toFixed(2)} — adjust if paying partially
              </div>
            </FormGroup>

            <FormGroup label="Note (optional)">
              <Input placeholder="Paid via UPI, Cash, GPay..." value={payNote} onChange={e => setPayNote(e.target.value)} />
            </FormGroup>

            <Alert message={payAlert?.msg} type={payAlert?.type} />
            <Button onClick={markAsPaid} disabled={paying}>
              {paying ? 'Recording...' : `✓ Confirm ${sym}${parseFloat(payAmount || 0).toFixed(2)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}