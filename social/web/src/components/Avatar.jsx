import { cx, initials } from '../lib.js';

export function Avatar({ user, size = 40, ring = false, className = '', onClick, title }) {
  const name = user?.displayName || user?.username || '';
  return (
    <span
      className={cx('avatar', ring && 'avatar-ring', onClick && 'is-clickable', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      onClick={onClick}
      title={title || name}
    >
      <span className="avatar-inner">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt={name} loading="lazy" draggable="false" />
        ) : (
          <span className="avatar-fallback">{initials(name)}</span>
        )}
      </span>
      {user?.online && <span className="avatar-online" aria-label="Online" />}
    </span>
  );
}
