import { Router } from 'express';
import { db, uid, ts } from '../db.js';
import { requireAuth } from '../auth.js';
import { postDto, commentDto, notify, extractTags, saveTags, audienceIds, blockedIds } from '../dto.js';

const router = Router();
const MEDIA_RE = /^(\/uploads\/|\/seed\/|https?:\/\/)/;

function feedQuery(userId, cursor, limit, scope) {
  const audience = audienceIds(userId);
  const blocked = blockedIds(userId);
  const audienceSql = scope === 'following' ? `AND p.user_id IN (${audience.map(() => '?').join(',')})` : '';
  const blockedSql = blocked.length ? `AND p.user_id NOT IN (${blocked.map(() => '?').join(',')})` : '';
  return db
    .prepare(
      `SELECT p.* FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.is_reel = 0 AND p.created_at < ? AND u.is_banned = 0
       ${audienceSql} ${blockedSql}
       ORDER BY p.created_at DESC LIMIT ?`
    )
    .all(...[cursor, ...(scope === 'following' ? audience : []), ...blocked, limit + 1]);
}

router.get('/feed', requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 20);
  const first = !req.query.cursor;
  const cursor = Number(req.query.cursor) || Date.now() + 1000;

  let rows = feedQuery(req.user.id, cursor, limit, 'following');
  if (!rows.length && first) rows = feedQuery(req.user.id, cursor, limit, 'global');

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  res.json({
    posts: page.map((r) => postDto(r, req.user.id)),
    nextCursor: hasMore ? page[page.length - 1].created_at : null,
  });
});

router.get('/reels', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.is_reel = 1 AND u.is_banned = 0
       ORDER BY p.created_at DESC LIMIT 40`
    )
    .all();
  res.json({ reels: rows.map((r) => postDto(r, req.user?.id)) });
});

router.get('/posts/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  res.json({ post: postDto(row, req.user?.id) });
});

router.post('/posts', requireAuth, (req, res) => {
  const { type = 'text', mediaUrl = null, caption = '', isReel = false } = req.body || {};
  if (!['text', 'image', 'video'].includes(type))
    return res.status(400).json({ error: 'Unsupported post type' });
  const text = String(caption || '').trim().slice(0, 2200);
  if (type === 'text' && !text) return res.status(400).json({ error: 'Write something to post' });
  if (type !== 'text' && !MEDIA_RE.test(String(mediaUrl || '')))
    return res.status(400).json({ error: 'Upload an image or video first' });

  const id = uid();
  db.prepare(
    'INSERT INTO posts (id, user_id, type, media_url, caption, is_reel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, type, type === 'text' ? null : String(mediaUrl), text, isReel ? 1 : 0, ts());
  saveTags(id, extractTags(text));

  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  res.status(201).json({ post: postDto(row, req.user.id) });
});

router.delete('/posts/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  if (row.user_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'You can only delete your own posts' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

router.post('/posts/:id/like', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)').run(
    req.user.id,
    row.id,
    ts()
  );
  notify({ userId: row.user_id, actorId: req.user.id, type: 'like', postId: row.id });
  const likes = db.prepare('SELECT COUNT(*) c FROM likes WHERE post_id = ?').get(row.id).c;
  res.json({ liked: true, likes });
});

router.delete('/posts/:id/like', requireAuth, (req, res) => {
  db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
  const likes = db.prepare('SELECT COUNT(*) c FROM likes WHERE post_id = ?').get(req.params.id).c;
  res.json({ liked: false, likes });
});

router.post('/posts/:id/bookmark', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, post_id, created_at) VALUES (?, ?, ?)').run(
    req.user.id,
    row.id,
    ts()
  );
  res.json({ bookmarked: true });
});

router.delete('/posts/:id/bookmark', requireAuth, (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
  res.json({ bookmarked: false });
});

router.get('/posts/:id/comments', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC LIMIT 300')
    .all(req.params.id);
  res.json({ comments: rows.map((r) => commentDto(r, req.user?.id)) });
});

router.post('/posts/:id/comments', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const text = String(req.body?.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'Write a comment first' });

  let parentId = req.body?.parentId || null;
  let parent = null;
  if (parentId) {
    parent = db.prepare('SELECT * FROM comments WHERE id = ? AND post_id = ?').get(parentId, post.id);
    if (!parent) parentId = null;
  }

  const id = uid();
  db.prepare(
    'INSERT INTO comments (id, post_id, user_id, parent_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, post.id, req.user.id, parentId, text, ts());

  notify({ userId: post.user_id, actorId: req.user.id, type: 'comment', postId: post.id, commentId: id, text });
  if (parent) {
    notify({
      userId: parent.user_id,
      actorId: req.user.id,
      type: 'reply',
      postId: post.id,
      commentId: id,
      text,
    });
  }

  const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  res.status(201).json({ comment: commentDto(row, req.user.id) });
});

router.delete('/comments/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Comment not found' });
  if (row.user_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'You can only delete your own comments' });
  db.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').run(row.id, row.id);
  res.json({ ok: true });
});

router.post('/reports', requireAuth, (req, res) => {
  const { targetType, targetId, reason } = req.body || {};
  if (!['post', 'comment', 'user', 'story'].includes(targetType))
    return res.status(400).json({ error: 'Unknown report type' });
  if (!targetId || !String(reason || '').trim())
    return res.status(400).json({ error: 'Tell us what is wrong' });
  db.prepare(
    'INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(uid(), req.user.id, targetType, String(targetId), String(reason).slice(0, 500), 'open', ts());
  res.status(201).json({ ok: true });
});

export default router;
