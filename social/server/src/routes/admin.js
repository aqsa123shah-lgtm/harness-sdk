import { Router } from 'express';
import { db, ts } from '../db.js';
import { requireAdmin } from '../auth.js';
import { publicUser, countsFor } from '../dto.js';

const router = Router();
router.use(requireAdmin);

const count = (sql, ...params) => db.prepare(sql).get(...params).c;

router.get('/stats', (req, res) => {
  const day = 24 * 60 * 60 * 1000;
  const signups = [];
  for (let i = 6; i >= 0; i -= 1) {
    const start = ts() - i * day;
    signups.push({
      day: new Date(start).toISOString().slice(5, 10),
      count: count('SELECT COUNT(*) c FROM users WHERE created_at > ? AND created_at <= ?', start - day, start),
    });
  }
  res.json({
    stats: {
      users: count('SELECT COUNT(*) c FROM users'),
      posts: count('SELECT COUNT(*) c FROM posts WHERE is_reel = 0'),
      reels: count('SELECT COUNT(*) c FROM posts WHERE is_reel = 1'),
      comments: count('SELECT COUNT(*) c FROM comments'),
      messages: count('SELECT COUNT(*) c FROM messages'),
      stories: count('SELECT COUNT(*) c FROM stories WHERE expires_at > ?', ts()),
      openReports: count("SELECT COUNT(*) c FROM reports WHERE status = 'open'"),
      banned: count('SELECT COUNT(*) c FROM users WHERE is_banned = 1'),
      activeToday: count('SELECT COUNT(*) c FROM users WHERE last_seen > ?', ts() - day),
      newUsers7d: count('SELECT COUNT(*) c FROM users WHERE created_at > ?', ts() - 7 * day),
    },
    signups,
  });
});

router.get('/users', (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  const rows = db
    .prepare(
      `SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
       ORDER BY created_at DESC LIMIT 100`
    )
    .all(q, q, q);
  res.json({
    users: rows.map((u) => ({
      ...publicUser(u, u.id),
      counts: countsFor(u.id),
      createdAt: u.created_at,
      lastSeen: u.last_seen,
    })),
  });
});

router.post('/users/:id/ban', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_admin) return res.status(400).json({ error: 'Admin accounts cannot be suspended' });
  const banned = req.body?.banned !== false;
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, user.id);
  if (banned) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  res.json({ ok: true, banned });
});

router.post('/users/:id/verify', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const verified = req.body?.verified !== false;
  db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(verified ? 1 : 0, user.id);
  res.json({ ok: true, verified });
});

router.get('/reports', (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, u.username AS reporter_username, u.display_name AS reporter_name
       FROM reports r JOIN users u ON u.id = r.reporter_id
       ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 100`
    )
    .all();

  const reports = rows.map((r) => {
    let target = null;
    if (r.target_type === 'post') {
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(r.target_id);
      if (post) {
        const author = db.prepare('SELECT * FROM users WHERE id = ?').get(post.user_id);
        target = { id: post.id, caption: post.caption, mediaUrl: post.media_url, type: post.type, author: publicUser(author) };
      }
    } else if (r.target_type === 'comment') {
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(r.target_id);
      if (comment) {
        const author = db.prepare('SELECT * FROM users WHERE id = ?').get(comment.user_id);
        target = { id: comment.id, text: comment.text, postId: comment.post_id, author: publicUser(author) };
      }
    } else if (r.target_type === 'user') {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.target_id);
      if (user) target = { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url };
    }
    return {
      id: r.id,
      type: r.target_type,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      reporter: { username: r.reporter_username, displayName: r.reporter_name },
      target,
    };
  });

  res.json({ reports });
});

router.post('/reports/:id/resolve', (req, res) => {
  const status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true, status });
});

router.delete('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  db.prepare(
    "UPDATE reports SET status = 'resolved' WHERE target_type = 'post' AND target_id = ?"
  ).run(post.id);
  res.json({ ok: true });
});

router.delete('/comments/:id', (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  db.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').run(comment.id, comment.id);
  db.prepare(
    "UPDATE reports SET status = 'resolved' WHERE target_type = 'comment' AND target_id = ?"
  ).run(comment.id);
  res.json({ ok: true });
});

export default router;
