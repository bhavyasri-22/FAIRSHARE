import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { groupsAPI, expensesAPI } from '../api';
import { Card, CardTitle, Loading, Empty } from '../components/UI';

export default function Dashboard() {
  const { user, setGroups } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ groups: 0, owed: 0, owe: 0 });
  const [recent,  setRecent]  = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const gData = await groupsAPI.getAll();
    if (!gData.success) { setLoading(false); return; }

    const groups = gData.data;
    setGroups(groups);

    let owed = 0, owe = 0, allExpenses = [];

    for (const g of groups) {
      const eData = await expensesAPI.getForGroup(g._id);
      if (!eData.success) continue;
      const { expenses, balanceSummary } = eData.data;
      allExpenses.push(...expenses.map(e => ({ ...e, groupName: g.name })));
      const me = balanceSummary.find(b => b.user.id === user._id || b.user.id === user.id);
      if (me) {
        if (me.balance > 0) owed += me.balance;
        if (me.balance < 0) owe  += Math.abs(me.balance);
      }
    }

    allExpenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setStats({ groups: groups.length, owed, owe });
    setRecent(allExpenses.slice(0, 6));
    setLoading(false);
  }

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Dashboard
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Your financial overview</div>
      </div>

      {loading ? <Loading /> : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {/* Groups — hidden on mobile to save space, show in 2-col */}
            {!isMobile && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--accent)' }} />
                <div style={{ fontSize: '10px', color: 'var(--text2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Groups</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: 'var(--accent)' }}>{stats.groups}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>active groups</div>
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: isMobile ? '16px' : '20px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--green)' }} />
              <div style={{ fontSize: '10px', color: 'var(--text2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>You are owed</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: 'var(--green)' }}>₹{stats.owed.toFixed(0)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>across all groups</div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: isMobile ? '16px' : '20px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--red)' }} />
              <div style={{ fontSize: '10px', color: 'var(--text2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>You owe</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: 'var(--red)' }}>₹{stats.owe.toFixed(0)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>across all groups</div>
            </div>
          </div>

          {/* Recent activity */}
          <Card>
            <CardTitle>Recent Activity</CardTitle>
            {recent.length === 0 ? (
              <Empty icon="📭" text="No activity yet — add your first expense" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recent.map(e => (
                  <div key={e._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '5px' }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: '13px', lineHeight: 1.5 }}>
                      <strong>{e.paidBy?.name}</strong>
                      <span style={{ color: 'var(--text2)' }}> paid </span>
                      <strong>₹{e.totalAmount}</strong>
                      <span style={{ color: 'var(--text2)' }}> for </span>
                      <em>{e.description}</em>
                      <span style={{ color: 'var(--text3)' }}> · {e.groupName}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>
                      {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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