import { useEffect } from 'react';
import { cx } from '../lib.js';
import { Icon } from './Icons.jsx';

export function Modal({ open, onClose, children, className = '', sheet = false, labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cx('modal-backdrop', sheet && 'is-sheet')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={cx('modal', className)} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {onClose && (
          <button type="button" className="modal-close icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cx('toast', toast.tone === 'error' && 'toast-error', toast.tone === 'success' && 'toast-success')} role="status">
      {toast.tone === 'success' ? <Icon name="check" size={16} /> : null}
      {toast.tone === 'error' ? <Icon name="alert" size={16} /> : null}
      <span>{toast.message}</span>
    </div>
  );
}

export function Spinner({ size = 22, label = 'Loading' }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label={label} />;
}

export function EmptyState({ icon = 'sparkle', title, body, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
