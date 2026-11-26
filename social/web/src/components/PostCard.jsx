import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from './Avatar.jsx';
import { CommentsSheet } from './CommentsSheet.jsx';
import { Icon, Verified } from './Icons.jsx';
import { cx, compact, timeAgo } from '../lib.js';

function Caption({ text }) {
  const parts = String(text || '').split(/(#[\p{L}\p{N}_]+)/gu);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('#') ? (
          <Link
            key={`${part}-${index}`}
            className="hashtag"
            to={`/explore?tag=${encodeURIComponent(part.slice(1).toLowerCase())}`}
          >
            {part}
          </Link>
        ) : (
          <span key={`text-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

export function PostCard({ post: initial, onRemoved }) {
  const { user, notifyToast } = useApp();
  const navigate = useNavigate();
  const [post, setPost] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => setPost(initial), [initial]);

  const isMine = post.author.id === user.id;

  const toggleLike = async (force) => {
    const next = typeof force === 'boolean' ? force : !post.liked;
    if (next === post.liked) return;
    setPost((prev) => ({ ...prev, liked: next, likes: prev.likes + (next ? 1 : -1) }));
    try {
      const data = next
        ? await api.post(`/posts/${post.id}/like`)
        : await api.del(`/posts/${post.id}/like`);
      setPost((prev) => ({ ...prev, liked: data.liked, likes: data.likes }));
    } catch (error) {
      setPost((prev) => ({ ...prev, liked: !next, likes: prev.likes + (next ? -1 : 1) }));
      notifyToast(error.message, 'error');
    }
  };

  const doubleTapLike = () => {
    if (!post.liked) toggleLike(true);
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  const toggleBookmark = async () => {
    const next = !post.bookmarked;
    setPost((prev) => ({ ...prev, bookmarked: next }));
    try {
      if (next) await api.post(`/posts/${post.id}/bookmark`);
      else await api.del(`/posts/${post.id}/bookmark`);
      notifyToast(next ? 'Saved to your collection' : 'Removed from saved', 'success');
    } catch (error) {
      setPost((prev) => ({ ...prev, bookmarked: !next }));
      notifyToast(error.message, 'error');
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      notifyToast('Link copied to clipboard', 'success');
    } catch {
      notifyToast('Could not copy the link', 'error');
    }
  };

  const removePost = async () => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.del(`/posts/${post.id}`);
      onRemoved?.(post.id);
      notifyToast('Post deleted', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const report = async () => {
    const reason = window.prompt('What is wrong with this post?');
    if (!reason) return;
    try {
      await api.post('/reports', { targetType: 'post', targetId: post.id, reason });
      notifyToast('Thanks — our team will review it', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const block = async () => {
    if (!window.confirm(`Block @${post.author.username}? You will no longer see their content.`)) return;
    try {
      await api.post(`/users/${post.author.username}/block`);
      onRemoved?.(post.id);
      notifyToast('User blocked', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const value = commentText.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await api.post(`/posts/${post.id}/comments`, { text: value });
      setPost((prev) => ({ ...prev, comments: prev.comments + 1 }));
      setCommentText('');
      notifyToast('Comment added', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <article className="post card">
      <header className="post-head">
        <Link to={`/u/${post.author.username}`} className="post-author">
          <Avatar user={post.author} size={40} ring={post.isReel} />
          <span className="post-author-meta">
            <span className="post-name">
              {post.author.username} {post.author.isVerified && <Verified size={13} />}
            </span>
            <span className="post-sub">
              {post.author.displayName} · {timeAgo(post.createdAt)}
            </span>
          </span>
        </Link>
        <div className="menu-wrap">
          <button
            type="button"
            className="icon-btn"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="more" size={20} />
          </button>
          {menuOpen && (
            <>
              <button type="button" className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
              <div className="menu" role="menu">
                <button type="button" onClick={() => { setMenuOpen(false); share(); }}>Copy link</button>
                {isMine ? (
                  <button type="button" className="danger" onClick={() => { setMenuOpen(false); removePost(); }}>
                    Delete post
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => { setMenuOpen(false); report(); }}>Report</button>
                    <button type="button" className="danger" onClick={() => { setMenuOpen(false); block(); }}>
                      Block @{post.author.username}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {post.type === 'text' ? (
        <p className="post-text">{post.caption}</p>
      ) : (
        <div className="post-media" onDoubleClick={doubleTapLike}>
          {post.type === 'image' ? (
            <img src={post.mediaUrl} alt={post.caption || 'Post image'} loading="lazy" draggable="false" />
          ) : (
            <video src={post.mediaUrl} controls playsInline preload="metadata" />
          )}
          {burst && (
            <span className="heart-burst" aria-hidden="true">
              <Icon name="heart-fill" size={96} filled />
            </span>
          )}
        </div>
      )}

      <div className="post-actions">
        <button
          type="button"
          className={cx('icon-btn', post.liked && 'is-liked')}
          onClick={() => toggleLike()}
          aria-label={post.liked ? 'Unlike' : 'Like'}
          aria-pressed={post.liked}
        >
          <Icon name={post.liked ? 'heart-fill' : 'heart'} size={24} filled={post.liked} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setCommentsOpen(true)}
          aria-label="Comments"
        >
          <Icon name="comment" size={24} />
        </button>
        <button type="button" className="icon-btn" onClick={share} aria-label="Share">
          <Icon name="send" size={23} />
        </button>
        <span className="spacer" />
        <button
          type="button"
          className={cx('icon-btn', post.bookmarked && 'is-saved')}
          onClick={toggleBookmark}
          aria-label={post.bookmarked ? 'Remove bookmark' : 'Bookmark'}
          aria-pressed={post.bookmarked}
        >
          <Icon name={post.bookmarked ? 'bookmark-fill' : 'bookmark'} size={23} filled={post.bookmarked} />
        </button>
      </div>

      <div className="post-body">
        <p className="post-likes">{compact(post.likes)} {post.likes === 1 ? 'like' : 'likes'}</p>
        {post.caption && (
          <p className="post-caption">
            <Link to={`/u/${post.author.username}`} className="post-caption-user">
              {post.author.username}
            </Link>{' '}
            <Caption text={post.caption} />
          </p>
        )}
        {post.comments > 0 && (
          <button type="button" className="post-comments-link" onClick={() => setCommentsOpen(true)}>
            View all {post.comments} {post.comments === 1 ? 'comment' : 'comments'}
          </button>
        )}
        <span className="post-time">{timeAgo(post.createdAt)} ago</span>
      </div>

      <form className="post-add-comment" onSubmit={submitComment}>
        <input
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Add a comment…"
          maxLength={500}
          aria-label="Add a comment"
        />
        <button type="submit" className="link-btn" disabled={!commentText.trim() || sending}>
          {sending ? 'Posting…' : 'Post'}
        </button>
      </form>

      <CommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        onCountChange={(delta) =>
          setPost((prev) => ({ ...prev, comments: Math.max(0, prev.comments + delta) }))
        }
      />
    </article>
  );
}
