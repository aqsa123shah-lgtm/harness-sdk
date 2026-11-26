import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { EditProfile } from '../components/EditProfile.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { Modal, Spinner } from '../components/Modal.jsx';
import { PostGrid } from '../components/PostGrid.jsx';
import { compact } from '../lib.js';

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: me, notifyToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [saved, setSaved] = useState([]);
  const [editing, setEditing] = useState(false);
  const [listModal, setListModal] = useState(null);
  const [listUsers, setListUsers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/${username}`);
      setData(response);
    } catch (error) {
      notifyToast(error.message, 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username, notifyToast]);

  useEffect(() => {
    setTab('posts');
    load();
  }, [load]);

  useEffect(() => {
    if (!data?.isMe) return;
    api
      .get('/users/me/bookmarks')
      .then((response) => setSaved(response.posts))
      .catch(() => {});
  }, [data?.isMe]);

  const toggleFollow = async () => {
    try {
      if (data.isFollowing) await api.del(`/users/${data.user.username}/follow`);
      else await api.post(`/users/${data.user.username}/follow`);
      await load();
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const openMessages = async () => {
    try {
      const conversation = await api.post(`/conversations/with/${data.user.username}`);
      navigate(`/messages/${conversation.id}`);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const openList = async (kind) => {
    setListModal(kind);
    try {
      const response = await api.get(`/users/${data.user.username}/${kind}`);
      setListUsers(response.users);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    if (!window.confirm(`${data.isBlocked ? 'Unblock' : 'Block'} @${data.user.username}?`)) return;
    try {
      if (data.isBlocked) await api.del(`/users/${data.user.username}/block`);
      else await api.post(`/users/${data.user.username}/block`);
      await load();
      notifyToast(data.isBlocked ? 'User unblocked' : 'User blocked', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const reportUser = async () => {
    setMenuOpen(false);
    const reason = window.prompt('Why are you reporting this account?');
    if (!reason) return;
    try {
      await api.post('/reports', { targetType: 'user', targetId: data.user.id, reason });
      notifyToast('Thanks — our team will review it', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const shareProfile = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${data.user.username}`);
      notifyToast('Profile link copied', 'success');
    } catch {
      notifyToast('Could not copy the link', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="center-pad">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="center-pad">
          <h2>User not found</h2>
          <Link to="/explore" className="btn btn-primary btn-sm">
            Explore people
          </Link>
        </div>
      </div>
    );
  }

  const { user, isMe, isFollowing, isBlocked, canView } = data;
  const counts = user.counts || { posts: 0, reels: 0, followers: 0, following: 0 };
  const tabs = [
    { key: 'posts', label: 'Posts', icon: 'grid' },
    { key: 'reels', label: 'Reels', icon: 'film' },
    ...(isMe ? [{ key: 'saved', label: 'Saved', icon: 'bookmark' }] : []),
  ];

  return (
    <div className="page profile-page">
      <header className="page-head">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="arrow-left" size={20} />
        </button>
        <h1>{user.username}</h1>
        <div className="menu-wrap">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen((open) => !open)} aria-label="More">
            <Icon name="more" size={20} />
          </button>
          {menuOpen && (
            <>
              <button type="button" className="menu-scrim" aria-label="Close" onClick={() => setMenuOpen(false)} />
              <div className="menu">
                <button type="button" onClick={shareProfile}>
                  Copy profile link
                </button>
                {!isMe && (
                  <>
                    <button type="button" onClick={reportUser}>
                      Report account
                    </button>
                    <button type="button" className="danger" onClick={toggleBlock}>
                      {isBlocked ? 'Unblock' : 'Block'} @{user.username}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      <section className="profile-head card">
        <div
          className="profile-cover"
          style={user.coverUrl ? { backgroundImage: `url(${user.coverUrl})` } : undefined}
        />
        <div className="profile-top">
          <Avatar user={user} size={96} className="profile-avatar" />
          <div className="profile-actions">
            {isMe ? (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                  Edit profile
                </button>
                <Link to="/settings" className="icon-btn" aria-label="Settings">
                  <Icon name="settings" size={20} />
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                  onClick={toggleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={openMessages}>
                  Message
                </button>
              </>
            )}
          </div>
        </div>

        <div className="profile-info">
          <h2 className="profile-name">
            {user.displayName} {user.isVerified && <Verified size={16} />}
          </h2>
          <p className="profile-username">@{user.username}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          {user.website && (
            <a
              className="profile-link"
              href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="globe" size={14} /> {user.website}
            </a>
          )}
          <div className="profile-stats">
            <span>
              <strong>{counts.posts}</strong> posts
            </span>
            <button type="button" onClick={() => openList('followers')}>
              <strong>{compact(counts.followers)}</strong> followers
            </button>
            <button type="button" onClick={() => openList('following')}>
              <strong>{compact(counts.following)}</strong> following
            </button>
          </div>
          {user.isPrivate && (
            <p className="profile-private">
              <Icon name="lock" size={14} /> Private account
            </p>
          )}
        </div>
      </section>

      <nav className="tabs" aria-label="Profile sections">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab ${tab === item.key ? 'is-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            <Icon name={item.icon} size={17} /> {item.label}
          </button>
        ))}
      </nav>

      {!canView && (
        <div className="locked card">
          <Icon name="lock" size={26} />
          <h3>This account is private</h3>
          <p>Follow @{user.username} to see their photos and reels.</p>
          {!isFollowing && (
            <button type="button" className="btn btn-primary btn-sm" onClick={toggleFollow}>
              Follow
            </button>
          )}
        </div>
      )}

      {canView && tab === 'posts' && <PostGrid posts={data.posts} empty="No posts yet." />}
      {canView && tab === 'reels' && <PostGrid posts={data.reels} empty="No reels yet." />}
      {canView && tab === 'saved' && <PostGrid posts={saved} empty="Nothing saved yet." />}

      <EditProfile open={editing} onClose={() => setEditing(false)} user={user} onSaved={load} />

      <Modal open={Boolean(listModal)} onClose={() => setListModal(null)} labelledBy="list-title">
        <h2 id="list-title" className="modal-title">
          {listModal === 'followers' ? 'Followers' : 'Following'}
        </h2>
        <ul className="person-list">
          {listUsers.map((person) => (
            <li key={person.id} className="person-row">
              <Link to={`/u/${person.username}`} onClick={() => setListModal(null)} className="person-link">
                <Avatar user={person} size={40} />
                <span className="person-meta">
                  <span className="person-name">{person.username}</span>
                  <span className="person-sub">{person.displayName}</span>
                </span>
              </Link>
            </li>
          ))}
          {!listUsers.length && <li className="rail-empty">Nobody here yet.</li>}
        </ul>
      </Modal>
    </div>
  );
}
