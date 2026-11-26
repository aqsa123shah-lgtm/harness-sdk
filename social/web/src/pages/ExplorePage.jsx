import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { Spinner } from '../components/Modal.jsx';
import { PostGrid } from '../components/PostGrid.jsx';
import { compact } from '../lib.js';

export default function ExplorePage() {
  const { notifyToast } = useApp();
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') || '';
  const [query, setQuery] = useState(tag);
  const [results, setResults] = useState(null);
  const [explore, setExplore] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api
      .get('/explore')
      .then(setExplore)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuery(tag);
  }, [tag]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch (error) {
        notifyToast(error.message, 'error');
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [query, notifyToast]);

  const onType = (value) => {
    setQuery(value);
    if (!value.trim()) setParams({});
    else setParams({ tag: value.trim() }, { replace: true });
  };

  const toggleFollow = async (person) => {
    try {
      if (person.isFollowing) await api.del(`/users/${person.username}/follow`);
      else await api.post(`/users/${person.username}/follow`);
      const flip = (list) =>
        list.map((u) => (u.id === person.id ? { ...u, isFollowing: !u.isFollowing } : u));
      if (results) setResults({ ...results, users: flip(results.users) });
      if (explore) setExplore({ ...explore, suggested: flip(explore.suggested) });
    } catch (error) {
      notifyToast(error.message, 'error');
    }
  };

  const renderPerson = (person) => (
    <li key={person.id} className="person-row">
      <Link to={`/u/${person.username}`} className="person-link">
        <Avatar user={person} size={44} />
        <span className="person-meta">
          <span className="person-name">
            {person.username} {person.isVerified && <Verified size={13} />}
          </span>
          <span className="person-sub">
            {person.displayName} · {compact(person.counts?.followers || 0)} followers
          </span>
        </span>
      </Link>
      <button type="button" className="btn btn-outline btn-xs" onClick={() => toggleFollow(person)}>
        {person.isFollowing ? 'Following' : 'Follow'}
      </button>
    </li>
  );

  return (
    <div className="page">
      <header className="page-head">
        <h1>Explore</h1>
      </header>

      <div className="search-box">
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={(event) => onType(event.target.value)}
          placeholder="Search people, #tags and posts"
          aria-label="Search"
        />
        {query && (
          <button type="button" className="icon-btn" onClick={() => onType('')} aria-label="Clear search">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {searching && (
        <div className="center-pad">
          <Spinner size={20} />
        </div>
      )}

      {results && !searching && (
        <div className="stack">
          {results.tags?.length > 0 && (
            <section className="card pad">
              <h2 className="section-title">Tags</h2>
              <div className="chip-row">
                {results.tags.map((tagItem) => (
                  <button
                    key={tagItem.tag}
                    type="button"
                    className="chip"
                    onClick={() => onType(tagItem.tag)}
                  >
                    #{tagItem.tag} <span>{tagItem.c}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.users?.length > 0 && (
            <section className="card pad">
              <h2 className="section-title">People</h2>
              <ul className="person-list">{results.users.map(renderPerson)}</ul>
            </section>
          )}

          {results.posts?.length > 0 && (
            <section className="card pad">
              <h2 className="section-title">Posts</h2>
              <PostGrid posts={results.posts} />
            </section>
          )}

          {!results.tags?.length && !results.users?.length && !results.posts?.length && (
            <p className="muted center-pad">No results for “{query}”.</p>
          )}
        </div>
      )}

      {!results && !searching && (
        <div className="stack">
          <section>
            <h2 className="section-title">Browse categories</h2>
            <div className="category-grid">
              {(explore?.categories || []).map((category) => (
                <button
                  key={category.tag}
                  type="button"
                  className="category-card"
                  onClick={() => onType(category.tag)}
                  style={
                    category.cover
                      ? {
                          backgroundImage: `linear-gradient(160deg, rgba(11,11,18,.15), rgba(11,11,18,.75)), url(${category.cover})`,
                        }
                      : undefined
                  }
                >
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card pad">
            <h2 className="section-title">Trending hashtags</h2>
            <ul className="trend-list">
              {(explore?.trending || []).map((tagItem, index) => (
                <li key={tagItem.tag}>
                  <button type="button" className="trend-row" onClick={() => onType(tagItem.tag)}>
                    <span className="trend-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="trend-meta">
                      <span className="trend-tag">#{tagItem.tag}</span>
                      <span className="trend-count">{tagItem.c} posts</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card pad">
            <h2 className="section-title">Suggested accounts</h2>
            <ul className="person-list">{(explore?.suggested || []).map(renderPerson)}</ul>
          </section>

          <section>
            <h2 className="section-title">Popular reels</h2>
            <PostGrid posts={explore?.reels || []} empty="No reels yet." />
          </section>

          <section>
            <h2 className="section-title">Fresh posts</h2>
            <PostGrid posts={(explore?.posts || []).slice(0, 18)} empty="No posts yet." />
          </section>
        </div>
      )}
    </div>
  );
}
