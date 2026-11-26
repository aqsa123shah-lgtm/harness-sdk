import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { EditProfile } from '../components/EditProfile.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { compact } from '../lib.js';

export default function SettingsPage() {
  const { user, counts, theme, setTheme, logout, notifyToast, refreshMe } = useApp();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState([]);
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/users/me/blocked')
      .then((data) => setBlocked(data.users))
      .catch(() => {});
  }, []);

  const togglePrivate = async () => {
    try {
      await api.patch('/users/me', { isPrivate: !user.isPrivate });
      await refreshMe();
      notifyToast(user.isPrivate ? 'Account is now public' : 'Account is now private', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const unblock = async (person) => {
    try {
      await api.del(`/users/${person.username}/block`);
      setBlocked((prev) => prev.filter((item) => item.id !== person.id));
      notifyToast(`Unblocked @${person.username}`, 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const resendCode = async () => {
    try {
      const data = await api.post('/auth/resend-verification');
      setDevCode(data.devVerifyCode);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/verify', { code });
      await refreshMe();
      notifyToast('Email verified', 'success');
      setCode('');
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <section className="card pad settings-account">
        <Avatar user={user} size={64} />
        <div className="settings-identity">
          <h2>
            {user.displayName} {user.isVerified && <Verified size={15} />}
          </h2>
          <p className="muted">@{user.username}</p>
          <p className="muted small">
            {compact(counts?.followers || 0)} followers · {compact(counts?.following || 0)} following ·{' '}
            {counts?.posts || 0} posts
          </p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </section>

      {!user.emailVerified && (
        <section className="card pad">
          <h2 className="section-title">Verify your email</h2>
          <p className="muted small">Verify {user.email} to secure your account and unlock recovery.</p>
          <button type="button" className="link-btn" onClick={resendCode}>
            Send me a code
          </button>
          {devCode && (
            <div className="dev-code">
              <span>Development code</span>
              <strong>{devCode}</strong>
            </div>
          )}
          <form className="inline-form" onSubmit={verify}>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={6}
              aria-label="Verification code"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || code.length < 6}>
              Verify
            </button>
          </form>
        </section>
      )}

      <section className="card pad">
        <h2 className="section-title">Appearance</h2>
        <div className="theme-switch">
          <button
            type="button"
            className={`theme-option ${theme === 'dark' ? 'is-active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Icon name="moon" size={18} /> Dark
          </button>
          <button
            type="button"
            className={`theme-option ${theme === 'light' ? 'is-active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <Icon name="sun" size={18} /> Light
          </button>
        </div>
      </section>

      <section className="card pad">
        <h2 className="section-title">Privacy</h2>
        <label className="switch-row">
          <span>
            <strong>Private account</strong>
            <small>Only approved followers can see your posts and reels.</small>
          </span>
          <input type="checkbox" checked={Boolean(user.isPrivate)} onChange={togglePrivate} />
        </label>

        <h3 className="sub-title">Blocked accounts</h3>
        <ul className="person-list">
          {blocked.map((person) => (
            <li key={person.id} className="person-row">
              <Link to={`/u/${person.username}`} className="person-link">
                <Avatar user={person} size={36} />
                <span className="person-meta">
                  <span className="person-name">{person.username}</span>
                  <span className="person-sub">{person.displayName}</span>
                </span>
              </Link>
              <button type="button" className="link-btn" onClick={() => unblock(person)}>
                Unblock
              </button>
            </li>
          ))}
          {!blocked.length && <li className="rail-empty">You have not blocked anyone.</li>}
        </ul>
      </section>

      <section className="card pad">
        <h2 className="section-title">Account</h2>
        <div className="settings-links">
          <button type="button" className="settings-link" onClick={() => setEditing(true)}>
            <Icon name="edit" size={18} /> Edit profile <Icon name="chevron-right" size={16} />
          </button>
          <Link to="/notifications" className="settings-link">
            <Icon name="bell" size={18} /> Activity <Icon name="chevron-right" size={16} />
          </Link>
          {user.isAdmin && (
            <Link to="/admin" className="settings-link">
              <Icon name="shield" size={18} /> Admin dashboard <Icon name="chevron-right" size={16} />
            </Link>
          )}
          <button type="button" className="settings-link danger" onClick={signOut}>
            <Icon name="logout" size={18} /> Log out <span />
          </button>
        </div>
      </section>

      <p className="muted small center-pad">
        Lumen · version 1.0 · built with React, Express and SQLite. Signed in as {user.email}.
      </p>

      <EditProfile open={editing} onClose={() => setEditing(false)} user={user} />
    </div>
  );
}
