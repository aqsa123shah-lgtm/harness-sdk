import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { EmptyState, Spinner } from '../components/Modal.jsx';
import { timeAgo } from '../lib.js';

const META = {
  like: { icon: 'heart-fill', verb: 'liked your post' },
  comment: { icon: 'comment', verb: 'commented' },
  reply: { icon: 'comment', verb: 'replied to your comment' },
  follow: { icon: 'user', verb: 'started following you' },
  message: { icon: 'send', verb: 'sent you a message' },
  story: { icon: 'sparkle', verb: 'reacted to your story' },
  mention: { icon: 'sparkle', verb: 'mentioned you' },
};

export default function NotificationsPage() {
  const { notifyToast, setUnread } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get('/notifications')
      .then((data) => {
        if (!alive) return;
        setItems(data.notifications);
        setUnread(0);
        api.post('/notifications/read').catch(() => {});
      })
      .catch((error) => notifyToast(error.message, 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [notifyToast, setUnread]);

  const open = (item) => {
    if (item.type === 'follow') navigate(`/u/${item.actor?.username}`);
    else if (item.type === 'message') navigate('/messages');
    else if (item.post?.id) navigate(`/p/${item.post.id}`);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Activity</h1>
      </header>

      {loading && (
        <div className="center-pad">
          <Spinner />
        </div>
      )}

      {!loading && !items.length && (
        <EmptyState icon="bell" title="Nothing yet" body="Likes, comments, follows and messages will show up here." />
      )}

      <ul className="notif-list">
        {items.map((item) => {
          const meta = META[item.type] || META.like;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`notif ${item.isRead ? '' : 'is-unread'}`}
                onClick={() => open(item)}
              >
                <span className={`notif-icon notif-${item.type}`}>
                  <Icon name={meta.icon} size={17} filled={item.type === 'like'} />
                </span>
                <Avatar user={item.actor} size={40} />
                <span className="notif-body">
                  <span className="notif-text">
                    <strong>
                      {item.actor?.username}
                      {item.actor?.isVerified && <Verified size={12} />}
                    </strong>{' '}
                    {meta.verb}
                    {item.text && item.type !== 'message' ? `: ${item.text}` : ''}
                  </span>
                  <span className="notif-time">{timeAgo(item.createdAt)} ago</span>
                </span>
                {item.post?.mediaUrl && (
                  <span className="notif-thumb">
                    <img src={item.post.mediaUrl} alt="" loading="lazy" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {items.length > 0 && (
        <p className="muted small center-pad">
          Showing your latest {items.length} notifications ·{' '}
          <Link to="/settings" className="hashtag">
            notification settings
          </Link>
        </p>
      )}
    </div>
  );
}
