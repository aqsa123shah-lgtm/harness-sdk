import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Icon } from '../components/Icons.jsx';

const KINDS = [
  { key: 'post', label: 'Post', icon: 'image', hint: 'A photo, a video or a thought' },
  { key: 'reel', label: 'Reel', icon: 'film', hint: 'A short vertical video' },
  { key: 'story', label: 'Story', icon: 'sparkle', hint: 'Disappears after 24 hours' },
];

export default function CreatePage() {
  const { user, notifyToast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get('tab');
  const [kind, setKind] = useState(initial === 'reel' || initial === 'story' ? initial : 'post');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [storyText, setStoryText] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview]
  );

  const pick = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith('image') && !selected.type.startsWith('video')) {
      notifyToast('Only images and videos are supported', 'error');
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      notifyToast('Keep files under 25MB', 'error');
      return;
    }
    setFile(selected);
    setPreview({
      url: URL.createObjectURL(selected),
      type: selected.type.startsWith('video') ? 'video' : 'image',
      name: selected.name,
    });
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    setStoryText('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      let media = null;
      if (file) media = await api.upload(file);

      if (kind === 'story') {
        if (!media) throw new Error('Add a photo or video for your story');
        await api.post('/stories', { mediaUrl: media.url, mediaType: media.type, text: storyText });
        notifyToast('Story shared — visible for 24 hours', 'success');
        reset();
        navigate('/');
        return;
      }

      if (kind === 'reel') {
        if (!media || media.type !== 'video') throw new Error('Reels need a video file');
        await api.post('/posts', { type: 'video', mediaUrl: media.url, caption, isReel: true });
        notifyToast('Reel published', 'success');
        reset();
        navigate('/reels');
        return;
      }

      if (!media && !caption.trim()) throw new Error('Write something or add a photo or video');
      await api.post('/posts', {
        type: media ? media.type : 'text',
        mediaUrl: media?.url || null,
        caption,
        isReel: false,
      });
      notifyToast('Post published', 'success');
      reset();
      navigate('/');
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Create</h1>
      </header>

      <div className="kind-tabs">
        {KINDS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`kind-tab ${kind === item.key ? 'is-active' : ''}`}
            onClick={() => {
              setKind(item.key);
              if (item.key === 'reel') setPreview((prev) => (prev?.type === 'image' ? null : prev));
            }}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>

      <form className="create-layout" onSubmit={submit}>
        <section className="card pad">
          <div
            className={`dropzone ${drag ? 'is-drag' : ''} ${preview ? 'has-preview' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              pick(event.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
          >
            {preview ? (
              preview.type === 'video' ? (
                <video src={preview.url} controls playsInline />
              ) : (
                <img src={preview.url} alt="Selected preview" />
              )
            ) : (
              <div className="dropzone-empty">
                <span className="dropzone-icon">
                  <Icon name={kind === 'story' ? 'camera' : 'image'} size={26} />
                </span>
                <strong>Drag a file here, or click to browse</strong>
                <small>JPG, PNG, WEBP, MP4 or MOV · up to 25MB</small>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={kind === 'reel' ? 'video/*' : 'image/*,video/*'}
              onChange={(event) => pick(event.target.files?.[0])}
              hidden
            />
          </div>
          {preview && (
            <div className="dropzone-foot">
              <span className="muted">{preview.name}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                }}
              >
                Remove
              </button>
            </div>
          )}

          {kind === 'story' ? (
            <label className="field">
              <span>Text on your story</span>
              <input
                value={storyText}
                onChange={(event) => setStoryText(event.target.value)}
                placeholder="Add a caption…"
                maxLength={120}
              />
            </label>
          ) : (
            <label className="field">
              <span>Caption</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={4}
                maxLength={2200}
                placeholder={
                  kind === 'reel' ? 'Describe your reel — hashtags help people find it' : 'Write a caption… #hashtags'
                }
              />
              <small className="field-hint">{caption.length}/2200</small>
            </label>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Publishing…' : kind === 'story' ? 'Share story' : kind === 'reel' ? 'Publish reel' : 'Share post'}
          </button>
        </section>

        <aside className="card pad create-preview">
          <h2 className="section-title">Preview</h2>
          <article className="post preview-card">
            <header className="post-head">
              <div className="post-author">
                <Avatar user={user} size={38} ring={kind === 'reel'} />
                <span className="post-author-meta">
                  <span className="post-name">{user.username}</span>
                  <span className="post-sub">{user.displayName} · now</span>
                </span>
              </div>
            </header>
            {preview ? (
              <div className="post-media">
                {preview.type === 'video' ? <video src={preview.url} muted loop autoPlay playsInline /> : <img src={preview.url} alt="" />}
              </div>
            ) : (
              <div className="preview-placeholder">
                <Icon name={kind === 'story' ? 'camera' : 'image'} size={22} />
                <span>Your media appears here</span>
              </div>
            )}
            <div className="post-body">
              <p className="post-caption">
                <span className="post-caption-user">{user.username}</span>{' '}
                {kind === 'story' ? storyText || 'Your story text' : caption || 'Your caption will appear here.'}
              </p>
            </div>
          </article>
          <p className="muted small">
            {kind === 'story'
              ? 'Stories are visible to your followers for 24 hours.'
              : kind === 'reel'
                ? 'Reels appear in the full-screen vertical feed.'
                : 'Posts appear in the home feed of your followers.'}
          </p>
        </aside>
      </form>
    </div>
  );
}
