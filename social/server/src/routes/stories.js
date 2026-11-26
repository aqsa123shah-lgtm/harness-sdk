import { Router } from 'express';
import { db, uid, ts } from '../db.js';
import { requireAuth } from '../auth.js';
import { publicUser, audienceIds, blockedIds } from '../dto.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;

router.get('/stories', requireAuth, (req, res) => {
  const audience = audienceIds(req.user.id);
  const blocked = blockedIds(req.user.id);
  const blockedSql = blocked.length ? `AND s.user_id NOT IN (${blocked.map(() => '?').join(',')})` : '';
  const rows = db
    .prepare(
      `SELECT s.* FROM stories s JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > ? AND u.is_banned = 0
         AND s.user_id IN (${audience.map(() => '?').join(',')}) ${blockedSql}
       ORDER BY s.created_at ASC`
    )
    .all(ts(), ...audience, ...blocked);

  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.user_id)) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
      groups.set(row.user_id, { user: publicUser(user), stories: [], seen: true });
    }
    const viewed = !!db
      .prepare('SELECT 1 FROM story_views WHERE story_id = ? AND user_id = ?')
      .get(row.id, req.user.id);
    const group = groups.get(row.user_id);
    group.stories.push({
      id: row.id,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      text: row.text,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      viewed,
      mine: row.user_id === req.user.id,
    });
    if (!viewed) group.seen = false;
  }

  const list = [...groups.values()].sort((a, b) => Number(a.seen) - Number(b.seen));
  res.json({ groups: list });
});

router.post('/stories', requireAuth, (req, res) => {
  const { mediaUrl, mediaType = 'image', text = '' } = req.body || {};
  if (!/^(\/uploads\/|\/seed\/|https?:\/\/)/.test(String(mediaUrl || '')))
    return res.status(400).json({ error: 'Upload a photo or video first' });
  if (!['image', 'video'].includes(mediaType)) return res.status(400).json({ error: 'Unsupported story type' });

  const id = uid();
  const createdAt = ts();
  db.prepare(
    `INSERT INTO stories (id, user_id, media_url, media_type, text, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, String(mediaUrl), mediaType, String(text).slice(0, 120), createdAt, createdAt + DAY);
  res.status(201).json({ story: { id, mediaUrl, mediaType, text: String(text).slice(0, 120), createdAt } });
});

router.post('/stories/:id/view', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  db.prepare('INSERT OR IGNORE INTO story_views (story_id, user_id, viewed_at) VALUES (?, ?, ?)').run(
    story.id,
    req.user.id,
    ts()
  );
  res.json({ ok: true });
});

router.get('/stories/:id/views', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.user_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'Only the creator can see who viewed a story' });
  const rows = db
    .prepare(
      `SELECT u.*, v.viewed_at FROM story_views v JOIN users u ON u.id = v.user_id
       WHERE v.story_id = ? ORDER BY v.viewed_at DESC LIMIT 100`
    )
    .all(story.id);
  res.json({ viewers: rows.map((u) => ({ ...publicUser(u), viewedAt: u.viewed_at })) });
});

router.delete('/stories/:id', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.user_id !== req.user.id && !req.user.is_admin)
    return res.status(403).json({ error: 'You can only delete your own story' });
  db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
  res.json({ ok: true });
});

export default router;
