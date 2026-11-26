import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Icon, Logo } from '../components/Icons.jsx';

const DEMO = { identifier: 'aria@lumen.app', password: 'lumen1234' };

export default function AuthPage({ initialMode = 'login' }) {
  const { user, setUser, refreshMe, notifyToast, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    confirm: '',
    displayName: '',
    username: '',
    email: '',
  });
  const [code, setCode] = useState('');
  const [devInfo, setDevInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setDevInfo(null);
    setStep('form');
  }, [initialMode]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const update = (name) => (event) => setForm((prev) => ({ ...prev, [name]: event.target.value }));

  const finish = async () => {
    await refreshMe();
    navigate('/', { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const data = await api.post('/auth/login', {
          identifier: form.identifier,
          password: form.password,
        });
        setUser(data.user);
        notifyToast(`Welcome back, ${data.user.displayName.split(' ')[0]}`, 'success');
        navigate('/', { replace: true });
      } else if (mode === 'signup') {
        if (form.password !== form.confirm) throw new Error('Passwords do not match');
        const data = await api.post('/auth/signup', {
          email: form.email,
          password: form.password,
          username: form.username,
          displayName: form.displayName,
        });
        setDevInfo({ verifyCode: data.devVerifyCode });
        setStep('verify');
      } else if (mode === 'forgot') {
        const data = await api.post('/auth/forgot', { email: form.email });
        setDevInfo({ resetCode: data.devResetCode });
        setMode('reset');
      } else if (mode === 'reset') {
        await api.post('/auth/reset', {
          email: form.email,
          code: form.confirm,
          password: form.password,
        });
        notifyToast('Password updated — log in with your new password', 'success');
        setMode('login');
        setForm({ ...form, password: '', confirm: '' });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/verify', { code });
      notifyToast('Email verified', 'success');
      await finish();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api.post('/auth/login', DEMO);
      setUser(data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const google = () => {
    notifyToast('Google sign-in needs OAuth credentials — add them to enable it');
  };

  if (step === 'verify') {
    return (
      <div className="auth">
        <div className="auth-hero">
          <Logo size={40} />
          <h1>One last step.</h1>
          <p>We sent a six-digit code to {form.email}. Enter it to verify your account.</p>
        </div>
        <div className="auth-panel">
          <div className="auth-card">
            <h2>Verify your email</h2>
            <p className="auth-sub">Verification keeps your account secure.</p>
            {devInfo?.verifyCode && (
              <div className="dev-code">
                <span>Development code</span>
                <strong>{devInfo.verifyCode}</strong>
              </div>
            )}
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={verify}>
              <label className="field">
                <span>Verification code</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.length < 6}>
                {busy ? 'Verifying…' : 'Verify email'}
              </button>
            </form>
            <button type="button" className="link-btn auth-skip" onClick={finish}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <Logo size={42} />
          <h1>Share your light.</h1>
          <p className="auth-tagline">
            A calm home for photos, reels and stories — built for people who care how things look.
          </p>
          <ul className="auth-points">
            <li>
              <Icon name="sparkle" size={18} /> A feed that feels designed, not assembled
            </li>
            <li>
              <Icon name="send" size={18} /> Real-time messages, typing and read receipts
            </li>
            <li>
              <Icon name="shield" size={18} /> Privacy controls, blocking and reporting
            </li>
          </ul>
          <div className="auth-demo">
            <span>Demo account</span>
            <code>{DEMO.identifier}</code>
            <code>{DEMO.password}</code>
          </div>
        </div>
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      <div className="auth-panel">
        <button type="button" className="icon-btn auth-theme" onClick={toggleTheme} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>

        <div className="auth-card">
          {mode === 'login' && (
            <form onSubmit={submit}>
              <h2>Welcome back</h2>
              <p className="auth-sub">Log in to keep sharing.</p>
              {error && <div className="form-error">{error}</div>}
              <label className="field">
                <span>Email or username</span>
                <input
                  value={form.identifier}
                  onChange={update('identifier')}
                  autoComplete="username"
                  placeholder="you@example.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Logging in…' : 'Log in'}
              </button>
              <div className="auth-links">
                <button type="button" className="link-btn" onClick={() => setMode('forgot')}>
                  Forgot password?
                </button>
                <button type="button" className="link-btn" onClick={() => setMode('signup')}>
                  Create account
                </button>
              </div>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <button type="button" className="btn btn-outline btn-block" onClick={google}>
                <Icon name="globe" size={18} /> Continue with Google
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={demoLogin} disabled={busy}>
                Try the demo account
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={submit}>
              <h2>Create your account</h2>
              <p className="auth-sub">Free, private by default.</p>
              {error && <div className="form-error">{error}</div>}
              <label className="field">
                <span>Display name</span>
                <input value={form.displayName} onChange={update('displayName')} placeholder="Aria Malik" />
              </label>
              <label className="field">
                <span>Username</span>
                <input
                  value={form.username}
                  onChange={update('username')}
                  placeholder="aria.malik"
                  autoComplete="username"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>
              <label className="field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
              <div className="auth-links">
                <span>Already have an account?</span>
                <button type="button" className="link-btn" onClick={() => setMode('login')}>
                  Log in
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={submit}>
              <h2>Reset your password</h2>
              <p className="auth-sub">Enter your email and we will send a reset code.</p>
              {error && <div className="form-error">{error}</div>}
              <label className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset code'}
              </button>
              <div className="auth-links">
                <button type="button" className="link-btn" onClick={() => setMode('login')}>
                  Back to log in
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={submit}>
              <h2>Choose a new password</h2>
              <p className="auth-sub">Enter the code we sent to {form.email}.</p>
              {devInfo?.resetCode && (
                <div className="dev-code">
                  <span>Development code</span>
                  <strong>{devInfo.resetCode}</strong>
                </div>
              )}
              {error && <div className="form-error">{error}</div>}
              <label className="field">
                <span>Reset code</span>
                <input
                  value={form.confirm}
                  onChange={update('confirm')}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                />
              </label>
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          <p className="auth-fine">
            By continuing you agree to the community guidelines. <Link to="/login">Privacy</Link> ·{' '}
            <Link to="/login">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
