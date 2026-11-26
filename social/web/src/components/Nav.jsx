import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Icon, Logo, Verified } from './Icons.jsx';
import { cx, compact } from '../lib.js';

export function Sidebar() {
  const { user, unread } = useApp();
  const items = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/explore', label: 'Explore', icon: 'compass' },
    { to: '/reels', label: 'Reels', icon: 'film' },
    { to: '/messages', label: 'Messages', icon: 'send' },
    { to: '/notifications', label: 'Activity', icon: 'bell', badge: unread },
  ];

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand" aria-label="Lumen home">
        <Logo size={32} />
      </Link>

      <nav className="side-nav" aria-label="Main">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cx('side-link', isActive && 'is-active')}
          >
            <Icon name={item.icon} size={23} />
            <span>{item.label}</span>
            {item.badge > 0 && <span className="badge">{item.badge > 9 ? '9+' : item.badge}</span>}
          </NavLink>
        ))}
        <NavLink to="/create" className={({ isActive }) => cx('side-link', isActive && 'is-active')}>
          <Icon name="plus" size={23} />
          <span>Create</span>
        </NavLink>
        <NavLink
          to={`/u/${user.username}`}
          className={({ isActive }) => cx('side-link', isActive && 'is-active')}
        >
          <Avatar user={user} size={24} />
          <span>Profile</span>
        </NavLink>
        {user.isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => cx('side-link', isActive && 'is-active')}>
            <Icon name="shield" size={23} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-foot">
        <NavLink to="/settings" className={({ isActive }) => cx('side-link', isActive && 'is-active')}>
          <Icon name="settings" size={22} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const { user, unread } = useApp();
  const tabs = [
    { to: '/', icon: 'home', label: 'Home' },
    { to: '/explore', icon: 'compass', label: 'Explore' },
    { to: '/create', icon: 'plus', label: 'Create', primary: true },
    { to: '/reels', icon: 'film', label: 'Reels' },
    { to: `/u/${user.username}`, icon: 'user', label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            cx('bottom-link', isActive && 'is-active', tab.primary && 'is-primary')
          }
          aria-label={tab.label}
        >
          <Icon name={tab.icon} size={tab.primary ? 26 : 24} strokeWidth={tab.primary ? 2.2 : 1.8} />
          {!tab.primary && <span>{tab.label}</span>}
          {tab.label === 'Activity' && unread > 0 && <span className="dot" />}
        </NavLink>
      ))}
    </nav>
  );
}

export function MobileTopBar() {
  const { unread } = useApp();
  return (
    <header className="mobile-top">
      <Link to="/" aria-label="Lumen home">
        <Logo size={26} />
      </Link>
      <div className="mobile-top-actions">
        <NavLink to="/messages" className="icon-btn" aria-label="Messages">
          <Icon name="send" size={22} />
        </NavLink>
        <NavLink to="/notifications" className="icon-btn" aria-label="Activity">
          <span className="bottom-bell">
            <Icon name="bell" size={22} />
            {unread > 0 && <span className="dot" />}
          </span>
        </NavLink>
      </div>
    </header>
  );
}

export function RightRail() {
  const { notifyToast } = useApp();
  const [suggested, setSuggested] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    let alive = true;
    api
      .get('/users/suggested')
      .then((d) => alive && setSuggested(d.users.slice(0, 4)))
      .catch(() => {});
    api
      .get('/explore')
      .then((d) => alive && setTrending(d.trending.slice(0, 5)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggleFollow = async (target) => {
    try {
      if (target.isFollowing) await api.del(`/users/${target.username}/follow`);
      else await api.post(`/users/${target.username}/follow`);
      setSuggested((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, isFollowing: !u.isFollowing } : u))
      );
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  return (
    <aside className="right-rail">
      <section className="rail-card">
        <header className="rail-head">
          <h3>Suggested for you</h3>
          <Link to="/explore" className="rail-more">
            See all
          </Link>
        </header>
        <ul className="suggest-list">
          {suggested.map((person) => (
            <li key={person.id} className="suggest-row">
              <Link to={`/u/${person.username}`} className="suggest-person">
                <Avatar user={person} size={38} />
                <span className="suggest-meta">
                  <span className="suggest-name">
                    {person.username} {person.isVerified && <Verified size={12} />}
                  </span>
                  <span className="suggest-sub">
                    {compact(person.counts?.followers || 0)} followers
                  </span>
                </span>
              </Link>
              <button type="button" className="link-btn" onClick={() => toggleFollow(person)}>
                {person.isFollowing ? 'Following' : 'Follow'}
              </button>
            </li>
          ))}
          {!suggested.length && <li className="rail-empty">You are following everyone already.</li>}
        </ul>
      </section>

      <section className="rail-card">
        <header className="rail-head">
          <h3>Trending</h3>
        </header>
        <ul className="trend-list">
          {trending.map((tag, index) => (
            <li key={tag.tag}>
              <Link to={`/explore?tag=${encodeURIComponent(tag.tag)}`} className="trend-row">
                <span className="trend-rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="trend-meta">
                  <span className="trend-tag">#{tag.tag}</span>
                  <span className="trend-count">{tag.c} posts</span>
                </span>
              </Link>
            </li>
          ))}
          {!trending.length && <li className="rail-empty">Trends will appear as people post.</li>}
        </ul>
      </section>

      <footer className="rail-foot">
        <span>Lumen</span>
        <span>·</span>
        <Link to="/settings">Settings</Link>
        <span>·</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </aside>
  );
}
