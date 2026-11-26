import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { publicUser } from '../dto.js';

const router = Router();

router.get('/notifications', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
    .all(req.user.id);

  const list = rows.map((n) => {
    const actor = n.actor_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(n.actor_id) : null;
    const post = n.post_id ? db.prepare('SELECT * FROM posts WHERE id = ?').get(n.post_id) : null;
    return {
      id: n.id,
      type: n.type,
      text: n.text,
      isRead: !!n.is_read,
      createdAt: n.created_at,
      actor: publicUser(actor),
      post: post ? { id: post.id, mediaUrl: post.media_url, type: post.type, caption: post.caption } : null,
      storyId: n.story_id,
    };
  });

  const unread = list.filter((n) => !n.isRead).length;
  res.json({ notifications: list, unread });
});

router.get('/notifications/count', requireAuth, (req, res) => {
  const unread = db
    .prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id).c;
  res.json({ unread });
});

router.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

export default router;
