import { Router } from 'express';
import { db, ts } from '../db.js';
import { publicUser, countsFor, postDto, isFollowing } from '../dto.js';

const router = Router();

router.get('/search', (req, res) => {
  const raw = String(req.query.q || '').trim().replace(/^#/, '');
  if (!raw) return res.json({ users: [], posts: [], tags: [] });
  const like = `%${raw}%`;

  const users = db
    .prepare(
      `SELECT * FROM users WHERE is_banned = 0 AND (username LIKE ? OR display_name LIKE ?)
       ORDER BY (SELECT COUNT(*) FROM follows f WHERE f.following_id = users.id) DESC LIMIT 12`
    )
    .all(like, like)
    .map((u) => ({
      ...publicUser(u),
      counts: countsFor(u.id),
      isFollowing: isFollowing(req.user?.id, u.id),
    }));

  const posts = db
    .prepare(
      `SELECT DISTINCT p.* FROM posts p
       LEFT JOIN post_tags t ON t.post_id = p.id
       WHERE p.caption LIKE ? OR t.tag LIKE ?
       ORDER BY p.created_at DESC LIMIT 24`
    )
    .all(like, like)
    .map((p) => postDto(p, req.user?.id));

  const tags = db
    .prepare(
      `SELECT t.tag, COUNT(*) c FROM post_tags t GROUP BY t.tag
       HAVING t.tag LIKE ? ORDER BY c DESC LIMIT 12`
    )
    .all(like);

  res.json({ users, posts, tags });
});

router.get('/explore', (req, res) => {
  const since = ts() - 30 * 24 * 60 * 60 * 1000;
  const trending = db
    .prepare(
      `SELECT t.tag, COUNT(*) c FROM post_tags t JOIN posts p ON p.id = t.post_id
       WHERE p.created_at > ? GROUP BY t.tag ORDER BY c DESC LIMIT 8`
    )
    .all(since);

  const popularReels = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) likes
       FROM posts p WHERE p.is_reel = 1
       ORDER BY likes DESC, p.created_at DESC LIMIT 6`
    )
    .all()
    .map((p) => postDto(p, req.user?.id));

  const recent = db
    .prepare('SELECT * FROM posts WHERE is_reel = 0 ORDER BY created_at DESC LIMIT 30')
    .all()
    .map((p) => postDto(p, req.user?.id));

  const suggested = db
    .prepare(
      `SELECT u.* FROM users u WHERE u.is_banned = 0 AND u.id != ?
       ORDER BY (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) DESC LIMIT 5`
    )
    .all(req.user?.id || '')
    .map((u) => ({
      ...publicUser(u),
      counts: countsFor(u.id),
      isFollowing: isFollowing(req.user?.id, u.id),
    }));

  const categories = [
    { name: 'Photography', tag: 'photography' },
    { name: 'Travel', tag: 'travel' },
    { name: 'Design', tag: 'design' },
    { name: 'Food', tag: 'food' },
    { name: 'Fitness', tag: 'fitness' },
    { name: 'Music', tag: 'music' },
  ].map((cat) => {
    const post = db
      .prepare(
        `SELECT p.* FROM post_tags t JOIN posts p ON p.id = t.post_id
         WHERE t.tag = ? AND p.media_url IS NOT NULL ORDER BY p.created_at DESC LIMIT 1`
      )
      .get(cat.tag);
    return { ...cat, cover: post?.media_url || null };
  });

  res.json({ trending, reels: popularReels, posts: recent, suggested, categories });
});

export default router;
