import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Input, Button, Alert, FormGroup } from '../components/UI';

const EyeIcon = ({ show }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {show ? (
      <>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" x2="22" y1="2" y2="22" />
      </>
    )}
  </svg>
);

export default function AuthPage() {
  const [tab, setTab]         = useState('login');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]     = useState(null);

  // Login fields
  const [loginEmail, setLoginEmail]     = useState('');
  const [loginPass,  setLoginPass]      = useState('');

  // Register fields
  const [regName,  setRegName]  = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');

  // Password visibility
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass]   = useState(false);



  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin() {
    setAlert(null);
    if (!loginEmail || !loginPass) return setAlert({ msg: 'All fields required', type: 'error' });
    setLoading(true);
    const data = await authAPI.login(loginEmail, loginPass);
    setLoading(false);
    if (!data.success) return setAlert({ msg: data.message, type: 'error' });
    login(data.data);
    navigate('/dashboard');
  }

  async function handleRegister() {
    setAlert(null);
    if (!regName || !regEmail || !regPass) return setAlert({ msg: 'All fields required', type: 'error' });
    setLoading(true);
    const data = await authAPI.register(regName, regEmail, regPass);
    setLoading(false);
    if (!data.success) return setAlert({ msg: data.message, type: 'error' });
    setAlert({ msg: `Welcome, ${data.data.name}! Signing you in...`, type: 'success' });
    setTimeout(() => { login(data.data); navigate('/dashboard'); }, 800);
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '9px', border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#000' : 'var(--text2)',
    fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
    borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: '20px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>
            Fair<span style={{ color: 'var(--accent)' }}>Share</span>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '6px' }}>Split expenses. Stay friends.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface2)', padding: '4px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
          <button style={tabStyle(tab === 'login')}    onClick={() => { setTab('login');    setAlert(null); }}>Sign In</button>
          <button style={tabStyle(tab === 'register')} onClick={() => { setTab('register'); setAlert(null); }}>Register</button>
        </div>

        <Alert message={alert?.msg} type={alert?.type} />

        {tab === 'login' ? (
          <>
            <FormGroup label="Email">
              <Input type="email" placeholder="alice@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </FormGroup>
            <FormGroup label="Password">
              <Input 
                type={showLoginPass ? "text" : "password"} 
                placeholder="Enter password..." 
                value={loginPass} 
                onChange={e => setLoginPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                rightIcon={<EyeIcon show={showLoginPass} />}
                onRightIconClick={() => setShowLoginPass(!showLoginPass)}
              />
            </FormGroup>
            <Button onClick={handleLogin} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
          </>
        ) : (
          <>
            <FormGroup label="Full Name">
              <Input placeholder="Alice" value={regName} onChange={e => setRegName(e.target.value)} />
            </FormGroup>
            <FormGroup label="Email">
              <Input type="email" placeholder="alice@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            </FormGroup>
            <FormGroup label="Password">
              <Input 
                type={showRegPass ? "text" : "password"} 
                placeholder="Secure password..." 
                value={regPass} 
                onChange={e => setRegPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                rightIcon={<EyeIcon show={showRegPass} />}
                onRightIconClick={() => setShowRegPass(!showRegPass)}
              />
            </FormGroup>
            <Button onClick={handleRegister} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
          </>
        )}
      </div>
    </div>
  );
}
