# Lumen

A complete, working social app — feed, reels, stories, messaging, notifications, search, profiles and a moderator dashboard — built as an installable web app (PWA) so it can be run and tested here.

> **Why a web app and not a Kotlin/Android project?** This repository is the Strands Agents monorepo and its sandbox has no Android SDK, emulator or Gradle toolchain, so a Jetpack Compose app could not be compiled or tested. This build delivers the same feature set as a running app you can use today. It ships a web manifest, so it installs to an Android home screen as a standalone app, and it can be wrapped with Capacitor or Trusted Web Activity when a native shell is needed.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 18, Vite 6, hand-written design system (light + dark) |
| API | Express 4 (REST, JSON) |
| Database | SQLite via `better-sqlite3` (WAL mode, foreign keys on) |
| Auth | Email + password, `scrypt` hashing, httpOnly session cookies |
| Media | `multer` uploads (images + video, 25 MB cap) |

Both services run with hot reload (`vite` and `node --watch`).

## Run locally

```bash
# API on http://localhost:4000
cd social/server && npm install && npm run dev

# Web on http://localhost:3000 (proxies /api, /uploads, /seed to the API)
cd social/web && npm install && npm run dev
```

The preview environment runs both services in Compose with the repository bind-mounted; the database and uploads live in a Docker volume, so `social/server/data/` stays out of git.

## Demo accounts

| Account | Password | Role |
| --- | --- | --- |
| `aria@lumen.app` | `lumen1234` | Member (or tap **Try the demo account**) |
| `admin@lumen.app` | `admin1234` | Moderator — unlocks `/admin` |

Every seeded member (`kai@lumen.app`, `nova@lumen.app`, `mira@lumen.app`, `theo@lumen.app`, `zayn@lumen.app`) uses `lumen1234`.

## Features

- **Auth** — sign up, log in/out, email verification codes, password reset, session cookies, profile creation.
- **Feed** — following-first feed with a global fallback, text/image/video posts, likes (double-tap too), comments with replies, bookmarks, share links, infinite scroll, pull-to-refresh on touch.
- **Profiles** — avatar, cover, bio, website, follower/following counts, follow/unfollow, edit profile with media upload, post and reel grids, saved posts, private accounts.
- **Reels** — full-screen vertical snap feed, autoplay on view, mute, like/comment/share, creator profile, upload.
- **Stories** — 24-hour expiry, progress bars, tap-through, text overlays, viewer list.
- **Messaging** — one-to-one conversations, polling every 2.5 s, typing indicator, read receipts, online status, image/video attachments.
- **Notifications** — likes, comments, replies, follows, messages, unread badge in the nav.
- **Discover** — search people/tags/posts, trending hashtags, categories, suggested accounts, popular reels.
- **Moderation** — report posts/comments/accounts, block users, and an admin dashboard with stats, signup chart, user suspension/verification and a report queue.
- **Design** — light and dark themes, gradients, rounded cards, motion, mobile bottom navigation, responsive from 360 px to desktop, installable PWA.

## Data model

`users` · `sessions` · `follows` · `blocks` · `posts` · `post_tags` · `likes` · `bookmarks` · `comments` · `stories` · `story_views` · `conversations` · `messages` · `notifications` · `reports`

Posts carry `type` (`text` / `image` / `video`) and `is_reel`; hashtags are extracted into `post_tags` for search and trending. Conversations are stored once per pair (`user_a` < `user_b`) with messages referencing it. Notifications reference the actor plus the post/comment/story that triggered them.

## API sketch

```
POST /api/auth/signup|login|logout      GET /api/auth/me
POST /api/auth/verify|forgot|reset|onboarded
GET  /api/feed?cursor=                  POST /api/posts          DELETE /api/posts/:id
POST /api/posts/:id/like|bookmark       GET  /api/posts/:id/comments
POST /api/posts/:id/comments            DELETE /api/comments/:id
GET  /api/reels                         GET  /api/users/:username
PATCH/api/users/me                      POST /api/users/:username/follow|block
GET  /api/stories                       POST /api/stories        POST /api/stories/:id/view
GET  /api/conversations                 POST /api/conversations/:id/messages
GET  /api/conversations/:id/poll        POST /api/conversations/:id/typing|read
GET  /api/notifications                 POST /api/notifications/read
GET  /api/search?q=                     GET  /api/explore
GET  /api/admin/stats|users|reports     POST /api/admin/users/:id/ban|verify
POST /api/upload
```

## Security notes

- Passwords hashed with `scrypt` and a per-user salt; comparisons are timing-safe.
- Sessions are random 32-byte tokens in an `httpOnly`, `sameSite=lax` cookie; every request re-checks the session server-side, and suspended accounts lose their sessions.
- Every write validates input; deletes check ownership (or admin); `/api/admin/*` is gated by `requireAdmin` on the server.
- Private accounts are enforced in the API, not the UI — content is withheld before it is serialised.
- Uploads are limited to an image/video MIME allowlist, 25 MB, random filenames, and served read-only.
- Before production: add HTTPS, rate limiting on auth and writes, a real email provider for verification/reset codes (codes are returned in the response only while `NODE_ENV !== 'production'`), CSP headers and database backups.

## Verifying the app

Signed-in flows were exercised end to end in the running app: sign-in, feed render, like/unlike, comment create + delete, story viewer navigation, text post publish + delete, follow/unfollow, conversation send, admin stats/users/reports, theme switch, and the mobile breakpoint. Unauthenticated checks cover the login screen and the admin route guard.

Not covered automatically: Google sign-in (needs OAuth credentials — the button explains this), email delivery, and real-time push (messaging uses polling).

## Next steps

- Connect a real email provider to deliver verification and reset codes.
- Wrap the PWA with Capacitor (or a TWA) to publish on Google Play; `public/manifest.webmanifest` is already in place.
- Add Web Push (service worker + VAPID) if push notifications are required.
