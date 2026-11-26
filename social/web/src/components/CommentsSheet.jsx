import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Icon, Verified } from './Icons.jsx';
import { Modal, Spinner } from './Modal.jsx';
import { cx, timeAgo } from '../lib.js';

export function CommentsSheet({ open, onClose, postId, onCountChange }) {
  const { user, notifyToast } = useApp();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !postId) return undefined;
    let alive = true;
    setLoading(true);
    api
      .get(`/posts/${postId}/comments`)
      .then((data) => alive && setComments(data.comments))
      .catch((error) => notifyToast(error.message, 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, postId, notifyToast]);

  useEffect(() => {
    if (!open) {
      setText('');
      setReplyTo(null);
    }
  }, [open]);

  const roots = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesOf = (id) => comments.filter((c) => c.parentId === id);

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const data = await api.post(`/posts/${postId}/comments`, {
        text: value,
        parentId: replyTo?.id || null,
      });
      setComments((prev) => [...prev, data.comment]);
      onCountChange?.(1);
      setText('');
      setReplyTo(null);
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.del(`/comments/${comment.id}`);
      setComments((prev) => prev.filter((c) => c.id !== comment.id && c.parentId !== comment.id));
      onCountChange?.(-1);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const renderComment = (comment, isReply) => (
    <div key={comment.id} className={cx('comment', isReply && 'comment-reply')}>
      <Avatar user={comment.author} size={isReply ? 26 : 32} />
      <div className="comment-body">
        <div className="comment-head">
          <Link to={`/u/${comment.author.username}`} onClick={onClose} className="comment-name">
            {comment.author.username} {comment.author.isVerified && <Verified size={12} />}
          </Link>
          <span className="comment-time">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="comment-text">{comment.text}</p>
        <div className="comment-actions">
          <button type="button" onClick={() => setReplyTo(comment)}>
            Reply
          </button>
          {comment.mine && (
            <button type="button" onClick={() => remove(comment)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} sheet className="comments-modal" labelledBy="comments-title">
      <header className="sheet-head">
        <h2 id="comments-title">Comments</h2>
        <span className="sheet-sub">{comments.length} total</span>
      </header>

      <div className="comments-list">
        {loading && (
          <div className="center-pad">
            <Spinner />
          </div>
        )}
        {!loading && !comments.length && (
          <p className="comments-empty">No comments yet. Start the conversation.</p>
        )}
        {roots.map((comment) => (
          <div key={comment.id} className="comment-thread">
            {renderComment(comment, false)}
            {repliesOf(comment.id).map((reply) => renderComment(reply, true))}
          </div>
        ))}
      </div>

      <form className="comments-composer" onSubmit={send}>
        {replyTo && (
          <div className="reply-chip">
            <span>Replying to @{replyTo.author.username}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        <div className="composer-row">
          <Avatar user={user} size={32} />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.author.username}…` : 'Add a comment…'}
            maxLength={500}
            aria-label="Comment text"
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>
            {sending ? 'Posting' : 'Post'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
