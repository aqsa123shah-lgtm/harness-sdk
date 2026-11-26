import { db, uid, ts } from './db.js';

export function publicUser(row, viewerId = null) {
  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    bio: row.bio,
    website: row.website,
    isPrivate: !!row.is_private,
    isAdmin: !!row.is_admin,
    isVerified: !!row.is_verified,
    isBanned: !!row.is_banned,
    emailVerified: !!row.email_verified,
    onboarded: !!row.onboarded,
    online: Date.now() - row.last_seen < 60_000,
  };
  if (viewerId && viewerId === row.id) user.email = row.email;
  return user;
}

export function countsFor(userId) {
  const one = (sql) => db.prepare(sql).get(userId).c;
  return {
    posts: one('SELECT COUNT(*) c FROM posts WHERE user_id = ? AND is_reel = 0'),
    reels: one('SELECT COUNT(*) c FROM posts WHERE user_id = ? AND is_reel = 1'),
    followers: one('SELECT COUNT(*) c FROM follows WHERE following_id = ?'),
    following: one('SELECT COUNT(*) c FROM follows WHERE follower_id = ?'),
  };
}

export function isFollowing(followerId, followingId) {
  if (!followerId || !followingId) return false;
  return !!db
    .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(followerId, followingId);
}

export function hasBlocked(blockerId, blockedId) {
  if (!blockerId || !blockedId) return false;
  return !!db
    .prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
    .get(blockerId, blockedId);
}

export function postDto(row, viewerId = null) {
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  const count = (sql) => db.prepare(sql).get(row.id).c;
  return {
    id: row.id,
    type: row.type,
    mediaUrl: row.media_url,
    caption: row.caption,
    isReel: !!row.is_reel,
    createdAt: row.created_at,
    author: publicUser(author),
    likes: count('SELECT COUNT(*) c FROM likes WHERE post_id = ?'),
    comments: count('SELECT COUNT(*) c FROM comments WHERE post_id = ?'),
    liked: viewerId
      ? !!db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(row.id, viewerId)
      : false,
    bookmarked: viewerId
      ? !!db.prepare('SELECT 1 FROM bookmarks WHERE post_id = ? AND user_id = ?').get(row.id, viewerId)
      : false,
    tags: db.prepare('SELECT tag FROM post_tags WHERE post_id = ?').all(row.id).map((r) => r.tag),
  };
}

export function commentDto(row, viewerId = null) {
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    text: row.text,
    createdAt: row.created_at,
    author: publicUser(author),
    mine: viewerId === row.user_id,
  };
}

export function notify({ userId, actorId, type, postId = null, commentId = null, storyId = null, text = '' }) {
  if (!userId || userId === actorId) return;
  db.prepare(
    `INSERT INTO notifications (id, user_id, actor_id, type, post_id, comment_id, story_id, text, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(uid(), userId, actorId, type, postId, commentId, storyId, text, ts());
}

export function extractTags(caption = '') {
  const found = caption.match(/#([\p{L}\p{N}_]{1,40})/gu) || [];
  return [...new Set(found.map((t) => t.slice(1).toLowerCase()))].slice(0, 12);
}

export function saveTags(postId, tags) {
  const insert = db.prepare('INSERT INTO post_tags (post_id, tag) VALUES (?, ?)');
  for (const tag of tags) insert.run(postId, tag);
}

/** Ids of users the viewer follows, plus the viewer. */
export function audienceIds(userId) {
  const rows = db.prepare('SELECT following_id FROM follows WHERE follower_id = ?').all(userId);
  return [userId, ...rows.map((r) => r.following_id)];
}

export function blockedIds(userId) {
  const rows = db
    .prepare('SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?')
    .all(userId, userId);
  return [...new Set(rows.flatMap((r) => [r.blocker_id, r.blocked_id]))];
}
