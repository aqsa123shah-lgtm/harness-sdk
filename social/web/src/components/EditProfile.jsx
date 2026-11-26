import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Icon } from './Icons.jsx';
import { Modal } from './Modal.jsx';

export function EditProfile({ open, onClose, user, onSaved }) {
  const { notifyToast, refreshMe } = useApp();
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    website: '',
    avatarUrl: '',
    coverUrl: '',
    isPrivate: false,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      displayName: user.displayName || '',
      username: user.username || '',
      bio: user.bio || '',
      website: user.website || '',
      avatarUrl: user.avatarUrl || '',
      coverUrl: user.coverUrl || '',
      isPrivate: Boolean(user.isPrivate),
    });
  }, [open, user]);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const upload = async (event, key) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(key);
    try {
      const data = await api.upload(file);
      setForm((prev) => ({ ...prev, [key]: data.url }));
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setUploading('');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api.patch('/users/me', form);
      await refreshMe();
      onSaved?.(data.user);
      notifyToast('Profile updated', 'success');
      onClose?.();
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="edit-profile-modal" labelledBy="edit-profile-title">
      <h2 id="edit-profile-title">Edit profile</h2>
      <form onSubmit={save} className="stack-sm">
        <div className="cover-editor">
          <div
            className="cover-preview"
            style={form.coverUrl ? { backgroundImage: `url(${form.coverUrl})` } : undefined}
          >
            <label className="cover-upload">
              <Icon name="image" size={16} />
              {uploading === 'coverUrl' ? 'Uploading…' : 'Change cover'}
              <input type="file" accept="image/*" onChange={(event) => upload(event, 'coverUrl')} hidden />
            </label>
          </div>
          <div className="avatar-editor">
            <Avatar user={{ ...user, avatarUrl: form.avatarUrl }} size={72} />
            <label className="avatar-upload">
              <Icon name="camera" size={16} />
              <input type="file" accept="image/*" onChange={(event) => upload(event, 'avatarUrl')} hidden />
            </label>
          </div>
        </div>

        <label className="field">
          <span>Display name</span>
          <input value={form.displayName} onChange={update('displayName')} maxLength={50} />
        </label>
        <label className="field">
          <span>Username</span>
          <input value={form.username} onChange={update('username')} maxLength={20} />
        </label>
        <label className="field">
          <span>Bio</span>
          <textarea value={form.bio} onChange={update('bio')} rows={3} maxLength={160} />
        </label>
        <label className="field">
          <span>Website</span>
          <input value={form.website} onChange={update('website')} placeholder="yoursite.com" maxLength={120} />
        </label>
        <label className="switch-row">
          <span>
            <strong>Private account</strong>
            <small>Only approved followers can see your posts.</small>
          </span>
          <input type="checkbox" checked={form.isPrivate} onChange={update('isPrivate')} />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
