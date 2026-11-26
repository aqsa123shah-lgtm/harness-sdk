import { Router } from 'express';
import { db, ts } from '../db.js';
import { requireAuth } from '../auth.js';
import { publicUser, countsFor, isFollowing, hasBlocked, postDto, notify } from '../dto.js';

const router = Router();

const findUser = (username) =>
  db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(String(username || '').trim());

router.get('/suggested', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.* FROM users u
       WHERE u.id != ? AND u.is_banned = 0
         AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
         AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
         AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       ORDER BY (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) DESC, u.created_at DESC
       LIMIT 6`
    )
    .all(req.user.id, req.user.id, req.user.id, req.user.id);
  res.json({ users: rows.map((u) => ({ ...publicUser(u), counts: countsFor(u.id) })) });
});

router.get('/me/bookmarks', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM bookmarks b JOIN posts p ON p.id = b.post_id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`
    )
    .all(req.user.id);
  res.json({ posts: rows.map((r) => postDto(r, req.user.id)) });
});

router.patch('/me', requireAuth, (req, res) => {
  const body = req.body || {};
  const next = {};
  if (body.displayName !== undefined) {
    const value = String(body.displayName).trim();
    if (!value || value.length > 50) return res.status(400).json({ error: 'Display name must be 1-50 characters' });
    next.display_name = value;
  }
  if (body.username !== undefined) {
    const value = String(body.username).trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(value))
      return res.status(400).json({ error: 'Username must be 3-20 letters, numbers, dots or underscores' });
    const clash = db
      .prepare('SELECT id FROM users WHERE lower(username) = lower(?) AND id != ?')
      .get(value, req.user.id);
    if (clash) return res.status(409).json({ error: 'That username is already taken' });
    next.username = value;
  }
  if (body.bio !== undefined) next.bio = String(body.bio).slice(0, 160);
  if (body.website !== undefined) next.website = String(body.website).slice(0, 120);
  if (body.avatarUrl !== undefined) next.avatar_url = String(body.avatarUrl).slice(0, 500);
  if (body.coverUrl !== undefined) next.cover_url = String(body.coverUrl).slice(0, 500);
  if (body.isPrivate !== undefined) next.is_private = body.isPrivate ? 1 : 0;

  const keys = Object.keys(next);
  if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });
  db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(
    ...keys.map((k) => next[k]),
    req.user.id
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user, req.user.id), counts: countsFor(req.user.id) });
});

router.get('/:username', (req, res) => {
  const target = findUser(req.params.username);
  if (!target || target.is_banned) return res.status(404).json({ error: 'User not found' });

  const viewer = req.user;
  const me = viewer?.id === target.id;
  const following = isFollowing(viewer?.id, target.id);
  const blocked = viewer ? hasBlocked(viewer.id, target.id) || hasBlocked(target.id, viewer.id) : false;
  const canView = me || !target.is_private || following || !!viewer?.is_admin;

  const posts = canView && !blocked
    ? db
        .prepare('SELECT * FROM posts WHERE user_id = ? AND is_reel = 0 ORDER BY created_at DESC LIMIT 40')
        .all(target.id)
        .map((r) => postDto(r, viewer?.id))
    : [];
  const reels = canView && !blocked
    ? db
        .prepare('SELECT * FROM posts WHERE user_id = ? AND is_reel = 1 ORDER BY created_at DESC LIMIT 40')
        .all(target.id)
        .map((r) => postDto(r, viewer?.id))
    : [];

  res.json({
    user: { ...publicUser(target, viewer?.id), counts: countsFor(target.id) },
    isFollowing: following,
    isMe: me,
    isBlocked: blocked,
    canView,
    posts,
    reels,
  });
});

router.get('/:username/followers', (req, res) => {
  const target = findUser(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const rows = db
    .prepare(
      `SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT 100`
    )
    .all(target.id);
  res.json({
    users: rows.map((u) => ({
      ...publicUser(u),
      counts: countsFor(u.id),
      isFollowing: isFollowing(req.user?.id, u.id),
    })),
  });
});

router.get('/:username/following', (req, res) => {
  const target = findUser(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const rows = db
    .prepare(
      `SELECT u.* FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`
    )
    .all(target.id);
  res.json({
    users: rows.map((u) => ({
      ...publicUser(u),
      counts: countsFor(u.id),
      isFollowing: isFollowing(req.user?.id, u.id),
    })),
  });
});

router.post('/:username/follow', requireAuth, (req, res) => {
  const target = findUser(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot follow yourself' });
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)').run(
    req.user.id,
    target.id,
    ts()
  );
  notify({ userId: target.id, actorId: req.user.id, type: 'follow' });
  res.json({ following: true, followers: countsFor(target.id).followers });
});

router.delete('/:username/follow', requireAuth, (req, res) => {
  const target = findUser(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
  res.json({ following: false, followers: countsFor(target.id).followers });
});

router.post('/:username/block', requireAuth, (req, res) => {
  const target = findUser(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot block yourself' });
  db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').run(
    req.user.id,
    target.id,
    ts()
  );
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(target.id, req.user.id);
  res.json({ blocked: true });
});

router.delete('/:username/block', requireAuth, (req, res) => {
  const target = findUser(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(req.user.id, target.id);
  res.json({ blocked: false });
});

router.get('/me/blocked', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.* FROM blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = ? ORDER BY b.created_at DESC`
    )
    .all(req.user.id);
  res.json({ users: rows.map((u) => publicUser(u)) });
});

export default router;
