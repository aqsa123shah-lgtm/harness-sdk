import { cx } from '../lib.js';

const ICONS = {
  home: <path d="M3.5 10.6 12 3.5l8.5 7.1V20a1 1 0 0 1-1 1h-5v-6.2H9.5V21h-5a1 1 0 0 1-1-1z" />,
  'home-fill': (
    <path d="M11.3 2.9a1.1 1.1 0 0 1 1.4 0l8 6.7a1 1 0 0 1 .4.8V20a1.4 1.4 0 0 1-1.4 1.4h-4.6v-6.2a1 1 0 0 0-1-1H9.9a1 1 0 0 0-1 1v6.2H4.3A1.4 1.4 0 0 1 2.9 20v-9.6a1 1 0 0 1 .4-.8z" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.6 8.4-2.2 5-5 2.2 2.2-5z" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7.5 4v16M16.5 4v16M3 9.5h4.5M16.5 9.5H21M3 14.5h4.5M16.5 14.5H21" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
  'user-fill': (
    <>
      <circle cx="12" cy="8" r="4.2" />
      <path d="M3.8 21c.9-4 4.2-6.2 8.2-6.2s7.3 2.2 8.2 6.2z" />
    </>
  ),
  heart: (
    <path d="M12 20.3s-7.2-4.4-8.9-8.7C1.7 8 3.7 5 6.9 5c2 0 3.4 1 4.3 2.4L12 8.6l.8-1.2C13.7 6 15.1 5 17.1 5c3.2 0 5.2 3 3.8 6.6-1.7 4.3-8.9 8.7-8.9 8.7z" />
  ),
  'heart-fill': (
    <path d="M12 20.8s-7.4-4.5-9.1-8.9C1.5 8.3 3.6 5.2 6.9 5.2c2 0 3.5 1 4.4 2.5l.7 1 .7-1c.9-1.5 2.4-2.5 4.4-2.5 3.3 0 5.4 3.1 4 6.7-1.7 4.4-9.1 8.9-9.1 8.9z" />
  ),
  comment: (
    <path d="M21 11.7c0 4.4-4 7.9-9 7.9-1.1 0-2.2-.2-3.2-.5L4 21l1.4-3.7C3.9 16 3 13.9 3 11.7c0-4.4 4-7.9 9-7.9s9 3.5 9 7.9z" />
  ),
  send: (
    <path d="M21.5 3.2 2.8 10.4c-.8.3-.8 1.4 0 1.7l6.6 2.3 2.3 6.6c.3.8 1.4.8 1.7 0l7.2-18.7c.3-.8-.5-1.4-1.1-1.1zM9.8 14.2 19 5.3" />
  ),
  bookmark: <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-3.9L5.5 21V4.5a1 1 0 0 1 1-1z" />,
  'bookmark-fill': <path d="M6.5 3h11a1.3 1.3 0 0 1 1.3 1.3V21l-6.8-4.1L5.2 21V4.3A1.3 1.3 0 0 1 6.5 3z" />,
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 4-1.8 5.2-1.8 5.2h15.6S18 12.5 18 8.5z" />
      <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-left': <path d="m14.5 5-7 7 7 7" />,
  'chevron-right': <path d="m9.5 5 7 7-7 7" />,
  'chevron-down': <path d="m5 9.5 7 7 7-7" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4.5h-9a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h9" />
      <path d="m17 8 4 4-4 4M21 12H9.5" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="3" />
      <path d="m15.5 11 6-3.5v9l-6-3.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.3 3.8 8.5S14.5 18.1 12 20.5c-2.5-2.4-3.8-5.3-3.8-8.5S9.5 5.9 12 3.5z" />
    </>
  ),
  trash: (
    <path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7M6.5 6.5 7.4 20a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1l.9-13.5" />
  ),
  flag: <path d="M5.5 21V4.2c4-2 8 2 13 0v10c-5 2-9-2-13 0" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  volume: (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.8-3.3 3.3-5.2 6.5-5.2s5.7 1.9 6.5 5.2" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 20c-.3-1.6-1-3-2-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 19.5H3z" />
      <path d="M12 9.5v4.2M12 16.6v.2" />
    </>
  ),
  edit: (
    <>
      <path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="6.5" width="18" height="13" rx="3" />
      <path d="M8.5 6.5 10 4h4l1.5 2.5" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  sparkle: <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" />,
  'arrow-left': <path d="M20 12H4.5M10 5.5 3.5 12l6.5 6.5" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4.5V11h-6.5" />
    </>
  ),
};

export function Icon({ name, size = 24, className = '', strokeWidth = 1.8, filled = false }) {
  const glyph = ICONS[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cx('icon', className)}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}

export function Verified({ size = 14, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cx('verified', className)} role="img" aria-label="Verified">
      <path
        fill="url(#lumen-verified)"
        d="M12 1.8l2.5 2 3.1-.4 1.3 2.9 2.9 1.3-.4 3.1 2 2.5-2 2.5.4 3.1-2.9 1.3-1.3 2.9-3.1-.4-2.5 2-2.5-2-3.1.4-1.3-2.9-2.9-1.3.4-3.1-2-2.5 2-2.5-.4-3.1 2.9-1.3L6.4 3.4l3.1.4z"
      />
      <path d="m8 12.4 2.6 2.6 5.4-5.6" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="lumen-verified" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ size = 28, withText = true }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="lumen-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="0.55" stopColor="#ec4899" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#lumen-logo)" />
        <circle cx="32" cy="32" r="11" fill="none" stroke="#fff" strokeWidth="4.5" />
      </svg>
      {withText && <span className="logo-text">Lumen</span>}
    </span>
  );
}
