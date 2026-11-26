import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { EmptyState, Spinner } from '../components/Modal.jsx';
import { compact, timeAgo } from '../lib.js';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'chart' },
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'reports', label: 'Reports', icon: 'flag' },
];

export default function AdminPage() {
  const { user, notifyToast } = useApp();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [signups, setSignups] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get('/admin/stats');
      setStats(data.stats);
      setSignups(data.signups);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  }, [notifyToast]);

  const loadUsers = useCallback(
    async (search = '') => {
      setLoading(true);
      try {
        const data = await api.get(`/admin/users?q=${encodeURIComponent(search)}`);
        setUsers(data.users);
      } catch (error) {
        notifyToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [notifyToast]
  );

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/reports');
      setReports(data.reports);
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notifyToast]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadStats();
    loadUsers('');
    loadReports();
  }, [user?.isAdmin, loadStats, loadUsers, loadReports]);

  if (!user?.isAdmin) {
    return (
      <div className="page">
        <EmptyState
          icon="shield"
          title="Admin access required"
          body="This area is restricted to moderators. Sign in with an admin account to continue."
          action={
            <Link to="/" className="btn btn-primary btn-sm">
              Back to feed
            </Link>
          }
        />
      </div>
    );
  }

  const banUser = async (target) => {
    const action = target.isBanned ? 'Restore' : 'Suspend';
    if (!window.confirm(`${action} @${target.username}?`)) return;
    try {
      await api.post(`/admin/users/${target.id}/ban`, { banned: !target.isBanned });
      notifyToast(`${action} complete`, 'success');
      loadUsers(query);
      loadStats();
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const verifyUser = async (target) => {
    try {
      await api.post(`/admin/users/${target.id}/verify`, { verified: !target.isVerified });
      loadUsers(query);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const resolveReport = async (report, status) => {
    try {
      await api.post(`/admin/reports/${report.id}/resolve`, { status });
      setReports((prev) => prev.map((item) => (item.id === report.id ? { ...item, status } : item)));
      loadStats();
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const removeContent = async (report) => {
    if (!window.confirm('Remove this content permanently?')) return;
    try {
      if (report.type === 'post') await api.del(`/admin/posts/${report.target?.id}`);
      else if (report.type === 'comment') await api.del(`/admin/comments/${report.target?.id}`);
      notifyToast('Content removed', 'success');
      loadReports();
      loadStats();
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const maxSignups = Math.max(1, ...signups.map((day) => day.count));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Admin</h1>
        <span className="pill">
          <Icon name="shield" size={14} /> Moderator
        </span>
      </header>

      <nav className="tabs" aria-label="Admin sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab ${tab === item.key ? 'is-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            <Icon name={item.icon} size={16} /> {item.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="stack">
          <div className="stat-grid">
            {[
              { label: 'Users', value: stats?.users, icon: 'users' },
              { label: 'Posts', value: stats?.posts, icon: 'grid' },
              { label: 'Reels', value: stats?.reels, icon: 'film' },
              { label: 'Comments', value: stats?.comments, icon: 'comment' },
              { label: 'Messages', value: stats?.messages, icon: 'send' },
              { label: 'Open reports', value: stats?.openReports, icon: 'flag', tone: 'warn' },
              { label: 'Suspended', value: stats?.banned, icon: 'lock', tone: 'warn' },
              { label: 'Active today', value: stats?.activeToday, icon: 'sparkle' },
            ].map((card) => (
              <div key={card.label} className={`stat-card ${card.tone === 'warn' ? 'is-warn' : ''}`}>
                <span className="stat-icon">
                  <Icon name={card.icon} size={18} />
                </span>
                <strong>{card.value ?? '—'}</strong>
                <span>{card.label}</span>
              </div>
            ))}
          </div>

          <section className="card pad">
            <h2 className="section-title">Signups · last 7 days</h2>
            <div className="bar-chart">
              {signups.map((day) => (
                <div key={day.day} className="bar-col">
                  <span className="bar" style={{ height: `${Math.max(6, (day.count / maxSignups) * 100)}%` }} />
                  <span className="bar-label">{day.day}</span>
                  <span className="bar-value">{day.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card pad">
            <h2 className="section-title">Recent open reports</h2>
            <ul className="report-mini">
              {reports
                .filter((report) => report.status === 'open')
                .slice(0, 4)
                .map((report) => (
                  <li key={report.id}>
                    <Icon name="flag" size={15} />
                    <span>
                      <strong>@{report.reporter.username}</strong> reported a {report.type}: “{report.reason}”
                    </span>
                    <button type="button" className="link-btn" onClick={() => setTab('reports')}>
                      Review
                    </button>
                  </li>
                ))}
              {!reports.some((report) => report.status === 'open') && <li className="rail-empty">No open reports.</li>}
            </ul>
          </section>
        </div>
      )}

      {tab === 'users' && (
        <div className="stack">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                loadUsers(event.target.value);
              }}
              placeholder="Search by name, username or email"
              aria-label="Search users"
            />
          </div>

          {loading && (
            <div className="center-pad">
              <Spinner size={20} />
            </div>
          )}

          <ul className="admin-list">
            {users.map((person) => (
              <li key={person.id} className={`admin-row ${person.isBanned ? 'is-banned' : ''}`}>
                <Link to={`/u/${person.username}`} className="person-link">
                  <Avatar user={person} size={40} />
                  <span className="person-meta">
                    <span className="person-name">
                      {person.username} {person.isVerified && <Verified size={12} />}
                      {person.isAdmin && <span className="pill tiny">admin</span>}
                      {person.isBanned && <span className="pill tiny danger">suspended</span>}
                    </span>
                    <span className="person-sub">
                      {person.email} · {compact(person.counts?.followers || 0)} followers · joined{' '}
                      {timeAgo(person.createdAt)} ago
                    </span>
                  </span>
                </Link>
                <div className="admin-actions">
                  <button type="button" className="btn btn-outline btn-xs" onClick={() => verifyUser(person)}>
                    {person.isVerified ? 'Unverify' : 'Verify'}
                  </button>
                  {!person.isAdmin && (
                    <button
                      type="button"
                      className={`btn btn-xs ${person.isBanned ? 'btn-primary' : 'btn-danger'}`}
                      onClick={() => banUser(person)}
                    >
                      {person.isBanned ? 'Restore' : 'Suspend'}
                    </button>
                  )}
                </div>
              </li>
            ))}
            {!users.length && !loading && <li className="rail-empty">No users match that search.</li>}
          </ul>
        </div>
      )}

      {tab === 'reports' && (
        <div className="stack">
          {loading && (
            <div className="center-pad">
              <Spinner size={20} />
            </div>
          )}

          <ul className="admin-list">
            {reports.map((report) => (
              <li key={report.id} className="report-card card">
                <div className="report-head">
                  <span className={`pill tiny ${report.status === 'open' ? 'danger' : ''}`}>{report.status}</span>
                  <span className="muted small">
                    {report.type} · reported by @{report.reporter.username} · {timeAgo(report.createdAt)} ago
                  </span>
                </div>
                <p className="report-reason">“{report.reason}”</p>

                {report.target ? (
                  <div className="report-target">
                    {report.target.mediaUrl && <img src={report.target.mediaUrl} alt="" />}
                    <div>
                      {report.target.author && (
                        <span className="person-name">
                          @{report.target.author.username}
                          {report.target.author.isVerified && <Verified size={12} />}
                        </span>
                      )}
                      {report.target.username && <span className="person-name">@{report.target.username}</span>}
                      <p className="muted small">
                        {report.target.caption || report.target.text || report.target.displayName || 'No preview'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="muted small">This content has already been deleted.</p>
                )}

                <div className="admin-actions">
                  {report.status === 'open' ? (
                    <>
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => resolveReport(report, 'dismissed')}>
                        Dismiss
                      </button>
                      {(report.type === 'post' || report.type === 'comment') && report.target && (
                        <button type="button" className="btn btn-danger btn-xs" onClick={() => removeContent(report)}>
                          Remove content
                        </button>
                      )}
                      <button type="button" className="btn btn-primary btn-xs" onClick={() => resolveReport(report, 'resolved')}>
                        Mark resolved
                      </button>
                    </>
                  ) : (
                    <span className="muted small">Handled</span>
                  )}
                </div>
              </li>
            ))}
            {!reports.length && !loading && <li className="rail-empty">No reports. The community is calm.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
