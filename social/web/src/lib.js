export const cx = (...args) => args.filter(Boolean).join(' ');

export function timeAgo(value) {
  const diff = Math.max(0, Date.now() - Number(value || 0));
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(Number(value)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function clockTime(value) {
  return new Date(Number(value)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function compact(n) {
  const value = Number(n) || 0;
  if (value < 1000) return `${value}`;
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace('.0', '')}K`;
  return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function relativeDay(value) {
  const date = new Date(Number(value));
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function isImage(url = '') {
  return /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(url) || url.startsWith('/seed/');
}
