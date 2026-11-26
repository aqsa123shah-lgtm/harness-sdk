import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from '../components/Icons.jsx';
import { EmptyState, Spinner } from '../components/Modal.jsx';
import { PostCard } from '../components/PostCard.jsx';

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notifyToast } = useApp();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/posts/${id}`)
      .then((data) => alive && setPost(data.post))
      .catch((error) => notifyToast(error.message, 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, notifyToast]);

  return (
    <div className="page">
      <header className="page-head">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="arrow-left" size={20} />
        </button>
        <h1>Post</h1>
      </header>

      {loading && (
        <div className="center-pad">
          <Spinner />
        </div>
      )}

      {!loading && !post && (
        <EmptyState
          icon="alert"
          title="Post not found"
          body="It may have been removed by its author or by moderation."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
              Back to feed
            </button>
          }
        />
      )}

      {post && (
        <PostCard
          post={post}
          onRemoved={() => {
            navigate('/', { replace: true });
            notifyToast('Post deleted', 'success');
          }}
        />
      )}
    </div>
  );
}
