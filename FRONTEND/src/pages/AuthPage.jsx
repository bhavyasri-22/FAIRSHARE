import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Input, Button, Alert, FormGroup } from '../components/UI';

const EyeIcon = ({ show }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {show ? (<><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></>) : (<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>)}
  </svg>
);

export default function AuthPage() {
  const [tab,     setTab]     = useState('login');
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass,  setLoginPass]  = useState('');
  const [regName,    setRegName]    = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPass,    setRegPass]    = useState('');
  const [showLP, setShowLP] = useState(false);
  const [showRP, setShowRP] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin() {
    setAlert(null);
    if (!loginEmail || !loginPass) return setAlert({ msg: 'All fields required', type: 'error' });
    setLoading(true);
    const data = await authAPI.login(loginEmail, loginPass);
    setLoading(false);
    if (!data.success) return setAlert({ msg: data.message, type: 'error' });
    login(data.data); navigate('/dashboard');
  }

  async function handleRegister() {
    setAlert(null);
    if (!regName || !regEmail || !regPass) return setAlert({ msg: 'All fields required', type: 'error' });
    setLoading(true);
    const data = await authAPI.register(regName, regEmail, regPass);
    setLoading(false);
    if (!data.success) return setAlert({ msg: data.message, type: 'error' });
    setAlert({ msg: `Welcome, ${data.data.name}!`, type: 'success' });
    setTimeout(() => { login(data.data); navigate('/dashboard'); }, 700);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Left decorative panel */}
      <div style={{ display: 'none', flex: 1, background: 'linear-gradient(145deg, #6d5beb, #4f3dca)', padding: '60px', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }} className="auth-panel">
        <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>FairShare</div>
        <div>
          <div style={{ fontSize: '44px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.15, marginBottom: '16px' }}>Split smarter.<br />Stay friends.</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1.7 }}>Track expenses, split bills fairly, and settle up with zero friction.</div>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Built for groups that adventure together.</div>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 1 }}>
        {/* Background blobs */}
        <div style={{ position: 'fixed', top: '10%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,91,235,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', marginBottom: '16px', boxShadow: '0 8px 24px rgba(109,91,235,0.3)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>
              Fair<span style={{ color: 'var(--accent)' }}>Share</span>
            </div>
            <div style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>Split expenses. Stay friends.</div>
          </div>

          {/* Card */}
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', background: 'var(--surface2)', padding: '4px', borderRadius: 'var(--radius-sm)', marginBottom: '28px', border: '1px solid var(--border)' }}>
              {['login','register'].map(t => (
                <button key={t} onClick={() => { setTab(t); setAlert(null); }} style={{
                  flex: 1, padding: '10px', border: 'none',
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--text2)',
                  fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                  borderRadius: '7px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: tab === t ? '0 2px 8px rgba(109,91,235,0.3)' : 'none',
                }}>
                  {t === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <Alert message={alert?.msg} type={alert?.type} />

            {tab === 'login' ? (
              <>
                <FormGroup label="Email">
                  <Input type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </FormGroup>
                <FormGroup label="Password">
                  <Input type={showLP ? 'text' : 'password'} placeholder="Your password" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} rightIcon={<EyeIcon show={showLP}/>} onRightIconClick={() => setShowLP(s=>!s)} />
                </FormGroup>
                <Button onClick={handleLogin} disabled={loading} style={{ marginTop: '4px' }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </>
            ) : (
              <>
                <FormGroup label="Full Name">
                  <Input placeholder="Alex Smith" value={regName} onChange={e => setRegName(e.target.value)} />
                </FormGroup>
                <FormGroup label="Email">
                  <Input type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </FormGroup>
                <FormGroup label="Password">
                  <Input type={showRP ? 'text' : 'password'} placeholder="Min. 6 characters" value={regPass} onChange={e => setRegPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} rightIcon={<EyeIcon show={showRP}/>} onRightIconClick={() => setShowRP(s=>!s)} />
                </FormGroup>
                <Button onClick={handleRegister} disabled={loading} style={{ marginTop: '4px' }}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}