import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { CommentsSheet } from '../components/CommentsSheet.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { EmptyState, Spinner } from '../components/Modal.jsx';
import { compact } from '../lib.js';

function ReelCaption({ text }) {
  const parts = String(text || '').split(/(#[\p{L}\p{N}_]+)/gu);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('#') ? (
          <Link key={index} className="hashtag" to={`/explore?tag=${encodeURIComponent(part.slice(1).toLowerCase())}`}>
            {part}
          </Link>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export default function ReelsPage() {
  const { notifyToast } = useApp();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [commentsFor, setCommentsFor] = useState(null);
  const containerRef = useRef(null);
  const videoRefs = useRef([]);

  useEffect(() => {
    api
      .get('/reels')
      .then((data) => setReels(data.reels))
      .catch((error) => notifyToast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [notifyToast]);

  useEffect(() => {
    videoRefs.current.filter(Boolean).forEach((video, index) => {
      if (index === active) {
        video.muted = muted;
        video.play().then(() => setPaused(false)).catch(() => setPaused(true));
      } else {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          /* video may not be loaded yet */
        }
      }
    });
  }, [active, reels.length, muted]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
            setActive(Number(entry.target.dataset.index));
          }
        });
      },
      { root: container, threshold: [0.55] }
    );
    container.querySelectorAll('.reel').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [reels]);

  const togglePlay = (index) => {
    const video = videoRefs.current[index];
    if (!video) return;
    if (index !== active) {
      setActive(index);
      return;
    }
    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const toggleLike = async (reel) => {
    const next = !reel.liked;
    setReels((prev) =>
      prev.map((item) => (item.id === reel.id ? { ...item, liked: next, likes: item.likes + (next ? 1 : -1) } : item))
    );
    try {
      const data = next ? await api.post(`/posts/${reel.id}/like`) : await api.del(`/posts/${reel.id}/like`);
      setReels((prev) => prev.map((item) => (item.id === reel.id ? { ...item, liked: data.liked, likes: data.likes } : item)));
    } catch (error) {
      setReels((prev) =>
        prev.map((item) =>
          item.id === reel.id ? { ...item, liked: !next, likes: item.likes + (next ? -1 : 1) } : item
        )
      );
      notifyToast(error.message, 'error');
    }
  };

  const share = async (reel) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${reel.id}`);
      notifyToast('Link copied to clipboard', 'success');
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

  if (!reels.length) {
    return (
      <div className="page">
        <EmptyState
          icon="film"
          title="No reels yet"
          body="Be the first to post a short video."
          action={
            <Link to="/create?tab=reel" className="btn btn-primary btn-sm">
              Upload a reel
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="reels-page">
      <div className="reels" ref={containerRef}>
        {reels.map((reel, index) => (
          <section key={reel.id} className="reel" data-index={index}>
            <video
              ref={(node) => {
                videoRefs.current[index] = node;
              }}
              src={reel.mediaUrl}
              loop
              muted={muted}
              playsInline
              preload={Math.abs(index - active) <= 1 ? 'auto' : 'metadata'}
              onClick={() => togglePlay(index)}
            />

            {paused && index === active && (
              <button type="button" className="reel-play" onClick={() => togglePlay(index)} aria-label="Play">
                <Icon name="play" size={40} filled />
              </button>
            )}

            <div className="reel-gradient" />

            <div className="reel-overlay">
              <Link to={`/u/${reel.author.username}`} className="reel-author">
                <Avatar user={reel.author} size={38} ring />
                <span className="reel-author-name">
                  {reel.author.username} {reel.author.isVerified && <Verified size={13} />}
                </span>
              </Link>
              {reel.caption && (
                <p className="reel-caption">
                  <ReelCaption text={reel.caption} />
                </p>
              )}
              <span className="reel-sound">
                <Icon name="sparkle" size={14} /> Original audio · {reel.author.username}
              </span>
            </div>

            <div className="reel-actions">
              <button
                type="button"
                className={`reel-action ${reel.liked ? 'is-liked' : ''}`}
                onClick={() => toggleLike(reel)}
                aria-label={reel.liked ? 'Unlike reel' : 'Like reel'}
              >
                <Icon name={reel.liked ? 'heart-fill' : 'heart'} size={26} filled={reel.liked} />
                <span>{compact(reel.likes)}</span>
              </button>
              <button
                type="button"
                className="reel-action"
                onClick={() => setCommentsFor(reel)}
                aria-label="Comments"
              >
                <Icon name="comment" size={26} />
                <span>{compact(reel.comments)}</span>
              </button>
              <button type="button" className="reel-action" onClick={() => share(reel)} aria-label="Share">
                <Icon name="send" size={25} />
                <span>Share</span>
              </button>
              <button
                type="button"
                className="reel-action"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <Icon name={muted ? 'volume-off' : 'volume'} size={24} />
                <span>{muted ? 'Muted' : 'Sound'}</span>
              </button>
            </div>
          </section>
        ))}
      </div>

      <CommentsSheet
        open={Boolean(commentsFor)}
        onClose={() => setCommentsFor(null)}
        postId={commentsFor?.id}
        onCountChange={(delta) =>
          setReels((prev) =>
            prev.map((item) =>
              item.id === commentsFor?.id ? { ...item, comments: Math.max(0, item.comments + delta) } : item
            )
          )
        }
      />
    </div>
  );
}
