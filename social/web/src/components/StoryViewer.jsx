import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Icon, Verified } from './Icons.jsx';
import { cx, timeAgo } from '../lib.js';

const DURATION = 5200;

export function StoryViewer({ groups, startIndex = 0, onClose }) {
  const { user, notifyToast } = useApp();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [viewers, setViewers] = useState(null);
  const timerRef = useRef(null);

  const group = groups[groupIndex];
  const story = group?.stories?.[storyIndex];
  const mine = story?.mine || group?.user?.id === user?.id;

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIndex + 1 < group.stories.length) {
      setStoryIndex((index) => index + 1);
      return;
    }
    if (groupIndex + 1 < groups.length) {
      setGroupIndex((index) => index + 1);
      setStoryIndex(0);
      return;
    }
    onClose?.();
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((index) => index - 1);
      return;
    }
    if (groupIndex > 0) {
      const previous = groups[groupIndex - 1];
      setGroupIndex((index) => index - 1);
      setStoryIndex(Math.max(0, previous.stories.length - 1));
    }
  };

  useEffect(() => {
    if (!story) return undefined;
    api.post(`/stories/${story.id}/view`).catch(() => {});
    setViewers(null);
    if (story.mediaType === 'video') return undefined;
    timerRef.current = setTimeout(goNext, DURATION);
    return () => clearTimeout(timerRef.current);
  }, [story?.id, goNext]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goNext, onClose]);

  const showViewers = async () => {
    if (!story) return;
    try {
      const data = await api.get(`/stories/${story.id}/views`);
      setViewers(data.viewers);
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const deleteStory = async () => {
    if (!story || !window.confirm('Delete this story?')) return;
    try {
      await api.del(`/stories/${story.id}`);
      onClose?.();
      notifyToast('Story deleted', 'success');
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  if (!story) return null;

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label="Story viewer">
      <div className="story-stage">
        <div className="story-progress">
          {group.stories.map((item, index) => (
            <span key={item.id} className="story-progress-track">
              <span
                key={`${item.id}-${index === storyIndex}`}
                className={cx(
                  'story-progress-fill',
                  index < storyIndex && 'is-done',
                  index === storyIndex && 'is-current'
                )}
              />
            </span>
          ))}
        </div>

        <header className="story-top">
          <Link to={`/u/${group.user.username}`} onClick={onClose} className="story-author">
            <Avatar user={group.user} size={34} />
            <span>
              {group.user.username} {group.user.isVerified && <Verified size={12} />}
            </span>
            <span className="story-time">{timeAgo(story.createdAt)}</span>
          </Link>
          <div className="story-top-actions">
            {mine && (
              <button type="button" className="icon-btn" onClick={deleteStory} aria-label="Delete story">
                <Icon name="trash" size={18} />
              </button>
            )}
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close stories">
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>

        <div className="story-media">
          {story.mediaType === 'video' ? (
            <video
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              controls={false}
              onEnded={goNext}
            />
          ) : (
            <img key={story.id} src={story.mediaUrl} alt="" />
          )}
          {story.text && <p className="story-text">{story.text}</p>}
        </div>

        <button type="button" className="story-nav is-prev" onClick={goPrev} aria-label="Previous story" />
        <button type="button" className="story-nav is-next" onClick={goNext} aria-label="Next story" />

        <footer className="story-foot">
          {mine ? (
            <button type="button" className="story-viewers-btn" onClick={showViewers}>
              <Icon name="eye" size={18} /> Viewers
            </button>
          ) : (
            <Link to={`/u/${group.user.username}`} onClick={onClose} className="story-viewers-btn">
              <Icon name="user" size={18} /> {group.user.username}
            </Link>
          )}
        </footer>

        {viewers && (
          <div className="story-viewers">
            <div className="story-viewers-head">
              <strong>{viewers.length} viewers</strong>
              <button type="button" className="icon-btn" onClick={() => setViewers(null)} aria-label="Close viewers">
                <Icon name="close" size={16} />
              </button>
            </div>
            <ul>
              {viewers.map((viewer) => (
                <li key={viewer.id}>
                  <Avatar user={viewer} size={30} />
                  <span>{viewer.username}</span>
                  <span className="story-viewer-time">{timeAgo(viewer.viewedAt)}</span>
                </li>
              ))}
              {!viewers.length && <li className="rail-empty">No views yet.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
