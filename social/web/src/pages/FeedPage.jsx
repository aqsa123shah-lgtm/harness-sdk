import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Icon } from '../components/Icons.jsx';
import { EmptyState, Spinner } from '../components/Modal.jsx';
import { PostCard } from '../components/PostCard.jsx';
import { StoryBar } from '../components/StoryBar.jsx';
import { StoryViewer } from '../components/StoryViewer.jsx';

export default function FeedPage() {
  const { user, notifyToast } = useApp();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stories, setStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(null);
  const [pull, setPull] = useState(0);
  const sentinel = useRef(null);
  const pullRef = useRef(0);
  const startRef = useRef(null);

  const loadStories = useCallback(() => {
    api
      .get('/stories')
      .then((data) => setStories(data.groups))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      try {
        const data = await api.get('/feed');
        setPosts(data.posts);
        setCursor(data.nextCursor);
        loadStories();
      } catch (error) {
        notifyToast(error.message, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notifyToast, loadStories]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api.get(`/feed?cursor=${cursor}`);
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, notifyToast]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '700px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const onStart = (event) => {
      startRef.current = window.scrollY <= 0 ? event.touches[0].clientY : null;
    };
    const onMove = (event) => {
      if (startRef.current == null) return;
      const delta = event.touches[0].clientY - startRef.current;
      pullRef.current = delta > 0 ? Math.min(96, delta * 0.55) : 0;
      setPull(pullRef.current);
    };
    const onEnd = () => {
      const shouldRefresh = pullRef.current > 52;
      pullRef.current = 0;
      setPull(0);
      startRef.current = null;
      if (shouldRefresh) load(true);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [load]);

  return (
    <div className="page feed-page">
      <div
        className="pull-indicator"
        style={{ height: refreshing ? 46 : pull, opacity: refreshing || pull > 8 ? 1 : 0 }}
      >
        {refreshing ? <Spinner size={18} /> : <Icon name="refresh" size={18} />}
        <span>{refreshing ? 'Refreshing' : pull > 52 ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>

      <header className="page-head">
        <h1>Home</h1>
        <button
          type="button"
          className="icon-btn"
          onClick={() => load(true)}
          aria-label="Refresh feed"
          disabled={refreshing}
        >
          <Icon name="refresh" size={20} className={refreshing ? 'spin' : ''} />
        </button>
      </header>

      <StoryBar groups={stories} onOpen={(group) => setStoryIndex(stories.indexOf(group))} />

      <Link to="/create" className="composer-prompt card">
        <Avatar user={user} size={38} />
        <span>Share something beautiful…</span>
        <span className="composer-icon">
          <Icon name="image" size={18} />
        </span>
      </Link>

      {loading && (
        <div className="center-pad">
          <Spinner />
        </div>
      )}

      {!loading && !posts.length && (
        <EmptyState
          icon="sparkle"
          title="Your feed is quiet"
          body="Follow a few people, or share your first post to get things moving."
          action={
            <Link to="/explore" className="btn btn-primary btn-sm">
              Find people to follow
            </Link>
          }
        />
      )}

      <div className="feed-list">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onRemoved={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
      </div>

      <div ref={sentinel} className="feed-sentinel">
        {loadingMore && <Spinner size={20} />}
        {!cursor && posts.length > 0 && <p className="feed-end">You are all caught up ✨</p>}
      </div>

      {storyIndex !== null && (
        <StoryViewer
          groups={stories}
          startIndex={storyIndex}
          onClose={() => {
            setStoryIndex(null);
            loadStories();
          }}
        />
      )}
    </div>
  );
}
