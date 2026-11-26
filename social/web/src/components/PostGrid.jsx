import { Link } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { compact } from '../lib.js';

export function PostGrid({ posts = [], empty = 'Nothing here yet.' }) {
  if (!posts.length) return <p className="grid-empty">{empty}</p>;

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <Link key={post.id} to={`/p/${post.id}`} className="grid-tile" aria-label={post.caption || 'Post'}>
          {post.mediaUrl ? (
            <img src={post.mediaUrl} alt={post.caption || ''} loading="lazy" />
          ) : (
            <span className="grid-text">{post.caption}</span>
          )}
          {post.type === 'video' && (
            <span className="grid-play" aria-hidden="true">
              <Icon name="play" size={16} filled />
            </span>
          )}
          <span className="grid-overlay">
            <span>
              <Icon name="heart-fill" size={14} filled /> {compact(post.likes)}
            </span>
            <span>
              <Icon name="comment" size={14} /> {compact(post.comments)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
