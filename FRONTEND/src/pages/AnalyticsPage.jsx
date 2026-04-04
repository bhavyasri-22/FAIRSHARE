import { useEffect, useState, useCallback } from 'react';
import { analyticsAPI } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import { Card, CardTitle, Loading, Empty } from '../components/UI';

// ── Currency symbol helper ──────────────────────────────────────────────────
const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
const sym = (code) => SYMBOLS[code] || code || '₹';

// ── Bar chart (pure CSS) ────────────────────────────────────────────────────
function BarChart({ data, currency }) {
  if (!data || data.length === 0) return <Empty icon="◎" text="No spending data yet" />;
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px', paddingTop: '28px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%' }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {d.amount > 0 ? `${sym(currency)}${d.amount >= 1000 ? (d.amount/1000).toFixed(1)+'k' : d.amount.toFixed(0)}` : ''}
          </div>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', background: 'var(--surface3)', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
            <div style={{
              width: '100%',
              height: `${Math.max((d.amount / max) * 100, d.amount > 0 ? 4 : 0)}%`,
              background: 'var(--accent)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              animationDelay: `${i * 50}ms`,
              opacity: 0.85,
            }} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal bar row ──────────────────────────────────────────────────────
function HorizBar({ label, value, max, color, prefix }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '100px', fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: '6px', background: 'var(--surface3)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
      <div style={{ width: '64px', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textAlign: 'right', flexShrink: 0 }}>
        {prefix}{value >= 1000 ? (value/1000).toFixed(1)+'k' : value.toFixed(0)}
      </div>
    </div>
  );
}

// ── 12-week heatmap ─────────────────────────────────────────────────────────
function Heatmap({ data }) {
  if (!data || data.length === 0) return <Empty icon="◎" text="No activity data" />;
  const max = Math.max(...data.map(d => d.count), 1);
  const DAY_LABELS = ['S','M','T','W','T','F','S'];

  // Group into weeks of 7
  const weeks = [];
  for (let w = 0; w < 12; w++) weeks.push(data.slice(w * 7, w * 7 + 7));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: '6px', minWidth: 'fit-content' }}>
        {/* Day labels column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '0px' }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ height: '14px', width: '12px', fontSize: '9px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', lineHeight: '14px', textAlign: 'right' }}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} expense${cell.count !== 1 ? 's' : ''}`}
                style={{
                  width: '14px', height: '14px', borderRadius: '3px',
                  background: 'var(--accent)',
                  opacity: cell.count === 0 ? 0.07 : 0.12 + 0.88 * (cell.count / max),
                  cursor: 'default',
                  transition: 'opacity 0.2s',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Less</span>
        {[0.07, 0.25, 0.5, 0.75, 1].map((o, i) => (
          <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--accent)', opacity: o }} />
        ))}
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>More</span>
      </div>
    </div>
  );
}

// ── Gauge (SVG semi-circle) ─────────────────────────────────────────────────
function Gauge({ pct }) {
  const r = 60, cx = 80, cy = 72;
  const toRad = a => (a * Math.PI) / 180;
  const angle = (pct / 100) * 180;
  const x2 = cx + r * Math.cos(toRad(180 + angle));
  const y2 = cy + r * Math.sin(toRad(180 + angle));
  const large = angle > 180 ? 1 : 0;
  return (
    <svg viewBox="0 0 160 90" style={{ width: '160px' }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--surface3)" strokeWidth="10" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--accent)"
        fontSize="20" fontFamily="var(--font-mono)" fontWeight="700">{pct}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text3)"
        fontSize="8" fontFamily="var(--font-display)" letterSpacing="1.5">SETTLED</text>
    </svg>
  );
}

// ── Stat card (matches Dashboard style exactly) ────────────────────────────
function StatCard({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accentColor }} />
      <div style={{ fontSize: '10px', color: 'var(--text2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: accentColor, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>{sub}</div>}
    </div>
  );
}

// ── Period tab button ───────────────────────────────────────────────────────
function PeriodBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--accent)' : 'var(--surface2)',
      color: active ? '#000' : 'var(--text2)',
      fontFamily: 'var(--font-mono)', fontSize: '12px',
      fontWeight: active ? 700 : 400,
      cursor: 'pointer', transition: 'all 0.18s',
    }}>{label}</button>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, tag, children }) {
  return (
    <Card style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>{title}</span>
        {tag && (
          <span style={{
            fontSize: '10px', padding: '2px 9px', borderRadius: '99px',
            background: 'rgba(0,212,170,0.1)', color: 'var(--accent)',
            border: '1px solid rgba(0,212,170,0.2)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.5px',
          }}>{tag}</span>
        )}
      </div>
      {children}
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const isMobile = useIsMobile();
  const [period, setPeriod]   = useState('6m');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await analyticsAPI.get(period);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.message || 'Failed to load analytics');
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const PERIOD_OPTIONS = [
    { key: '3m', label: '3 Mo' },
    { key: '6m', label: '6 Mo' },
    { key: '1y', label: '1 Year' },
  ];

  const BAR_COLORS = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', '#3b82f6', '#8b5cf6'];

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '22px' : '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Analytics
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Your spending at a glance</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
          {PERIOD_OPTIONS.map(p => (
            <PeriodBtn key={p.key} label={p.label} active={period === p.key} onClick={() => setPeriod(p.key)} />
          ))}
        </div>
      </div>

      {loading && <Loading />}

      {error && !loading && (
        <div style={{ padding: '14px 18px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span>⚠ {error}</span>
          <button onClick={load} style={{ background: 'transparent', border: '1px solid rgba(255,107,107,0.3)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Stat cards ─────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <StatCard
              label="Total Spent"
              value={`${sym(data.primaryCurrency)}${data.totalSpent >= 1000 ? (data.totalSpent/1000).toFixed(1)+'k' : data.totalSpent.toFixed(0)}`}
              sub={`${data.expenseCount} expense${data.expenseCount !== 1 ? 's' : ''}`}
              accentColor="var(--accent)"
            />
            <StatCard
              label="You Paid"
              value={`${sym(data.primaryCurrency)}${data.youPaid >= 1000 ? (data.youPaid/1000).toFixed(1)+'k' : data.youPaid.toFixed(0)}`}
              sub="as payer"
              accentColor="var(--accent)"
            />
            <StatCard
              label="You Owe"
              value={`${sym(data.primaryCurrency)}${data.youOwe >= 1000 ? (data.youOwe/1000).toFixed(1)+'k' : data.youOwe.toFixed(0)}`}
              sub="net balance due"
              accentColor={data.youOwe > 0 ? 'var(--red)' : 'var(--text2)'}
            />
            <StatCard
              label="Groups"
              value={data.groupCount}
              sub={`${data.settlementCount} settlement${data.settlementCount !== 1 ? 's' : ''}`}
              accentColor="var(--accent3)"
            />
          </div>

          {/* ── Spending over time ──────────────────────────────────── */}
          <Section title="Spending Over Time" tag={data.primaryCurrency}>
            <BarChart data={data.spendingByMonth} currency={data.primaryCurrency} />
          </Section>

          {/* ── Top spenders + By group ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Card>
              <CardTitle>Top Spenders</CardTitle>
              {data.topSpenders.length === 0 ? (
                <Empty icon="◎" text="No data yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.topSpenders.map((s, i) => (
                    <HorizBar
                      key={i}
                      label={s.name}
                      value={s.amount}
                      max={data.topSpenders[0].amount}
                      color={BAR_COLORS[i % BAR_COLORS.length]}
                      prefix={sym(data.primaryCurrency)}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>By Group</CardTitle>
              {data.byGroup.length === 0 ? (
                <Empty icon="◈" text="No group data yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.byGroup.map((g, i) => (
                    <HorizBar
                      key={i}
                      label={g.name}
                      value={g.amount}
                      max={data.byGroup[0].amount}
                      color={BAR_COLORS[i % BAR_COLORS.length]}
                      prefix={sym(g.currency)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Activity heatmap ────────────────────────────────────── */}
          <Section title="Activity Heatmap" tag="Last 12 weeks">
            <Heatmap data={data.heatmap} />
          </Section>

          {/* ── Settlement rate ─────────────────────────────────────── */}
          <Section title="Settlement Rate">
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
              <Gauge pct={data.settlementRate} />
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Expenses',  value: data.expenseCount,    color: 'var(--text)' },
                  { label: 'Settlements Made', value: data.settlementCount, color: 'var(--accent)' },
                  { label: 'Amount Settled',   value: `${sym(data.primaryCurrency)}${data.settledAmount.toFixed(0)}`, color: 'var(--accent3)' },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Split type breakdown ─────────────────────────────────── */}
          {data.splitTypes && (data.splitTypes.equal + data.splitTypes.percentage) > 0 && (
            <Section title="Split Methods">
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Equal Split',      value: data.splitTypes.equal || 0,      color: 'var(--accent)' },
                  { label: 'Percentage Split',  value: data.splitTypes.percentage || 0, color: 'var(--accent3)' },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1, minWidth: '120px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '16px 20px',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: s.color }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
