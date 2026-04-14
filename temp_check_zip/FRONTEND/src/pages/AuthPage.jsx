import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Input, Button, Alert, FormGroup } from '../components/UI';

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
              <Input type="password" placeholder="••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
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
              <Input type="password" placeholder="••••••" value={regPass} onChange={e => setRegPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </FormGroup>
            <Button onClick={handleRegister} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
          </>
        )}
      </div>
    </div>
  );
}
