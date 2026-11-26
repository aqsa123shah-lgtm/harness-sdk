import { Router } from 'express';
import { db, uid, ts } from '../db.js';
import { requireAuth } from '../auth.js';
import { publicUser, notify } from '../dto.js';

const router = Router();
const typing = new Map();
const TYPING_TTL = 5000;

const findUser = (username) =>
  db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(String(username || '').trim());

function conversationFor(userId, otherId) {
  const [a, b] = [userId, otherId].sort();
  let conv = db.prepare('SELECT * FROM conversations WHERE user_a = ? AND user_b = ?').get(a, b);
  if (!conv) {
    const id = uid();
    db.prepare('INSERT INTO conversations (id, user_a, user_b, last_message_at, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      a,
      b,
      0,
      ts()
    );
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  }
  return conv;
}

function isParticipant(conv, userId) {
  return !!conv && (conv.user_a === userId || conv.user_b === userId);
}

function partnerOf(conv, userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(conv.user_a === userId ? conv.user_b : conv.user_a);
}

const messageDto = (m) => ({
  id: m.id,
  conversationId: m.conversation_id,
  senderId: m.sender_id,
  text: m.text,
  mediaUrl: m.media_url,
  mediaType: m.media_type,
  createdAt: m.created_at,
  readAt: m.read_at,
});

function loadConversation(req, res) {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!conv || !isParticipant(conv, req.user.id)) {
    res.status(404).json({ error: 'Conversation not found' });
    return null;
  }
  return conv;
}

router.get('/conversations', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.* FROM conversations c
       WHERE c.user_a = ? OR c.user_b = ?
       ORDER BY c.last_message_at DESC, c.created_at DESC LIMIT 60`
    )
    .all(req.user.id, req.user.id);

  const list = rows.map((conv) => {
    const partner = partnerOf(conv, req.user.id);
    const last = db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(conv.id);
    const unread = db
      .prepare('SELECT COUNT(*) c FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL')
      .get(conv.id, req.user.id).c;
    return {
      id: conv.id,
      partner: publicUser(partner),
      lastMessage: last ? messageDto(last) : null,
      unread,
      lastMessageAt: conv.last_message_at,
    };
  });
  res.json({ conversations: list });
});

router.post('/conversations/with/:username', requireAuth, (req, res) => {
  const partner = findUser(req.params.username);
  if (!partner || partner.is_banned) return res.status(404).json({ error: 'User not found' });
  if (partner.id === req.user.id) return res.status(400).json({ error: 'You cannot message yourself' });
  const conv = conversationFor(req.user.id, partner.id);
  res.json({ id: conv.id, partner: publicUser(partner) });
});

router.get('/conversations/:id', requireAuth, (req, res) => {
  const conv = loadConversation(req, res);
  if (!conv) return;
  const partner = partnerOf(conv, req.user.id);
  const partnerTyping = (typing.get(`${conv.id}:${partner.id}`) || 0) > Date.now() - TYPING_TTL;
  res.json({ id: conv.id, partner: publicUser(partner), partnerTyping });
});

router.get('/conversations/:id/messages', requireAuth, (req, res) => {
  const conv = loadConversation(req, res);
  if (!conv) return;
  const after = Number(req.query.after) || 0;
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? AND created_at > ?
       ORDER BY created_at ASC LIMIT 200`
    )
    .all(conv.id, after);
  res.json({ messages: rows.map(messageDto) });
});

router.post('/conversations/:id/messages', requireAuth, (req, res) => {
  const conv = loadConversation(req, res);
  if (!conv) return;
  const text = String(req.body?.text || '').trim().slice(0, 2000);
  const mediaUrl = req.body?.mediaUrl ? String(req.body.mediaUrl) : null;
  const mediaType = req.body?.mediaType ? String(req.body.mediaType) : null;
  if (!text && !mediaUrl) return res.status(400).json({ error: 'Type a message first' });
  if (mediaUrl && !/^(\/uploads\/|\/seed\/|https?:\/\/)/.test(mediaUrl))
    return res.status(400).json({ error: 'Invalid attachment' });

  const id = uid();
  const createdAt = ts();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, text, media_url, media_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, conv.id, req.user.id, text, mediaUrl, mediaType, createdAt);
  db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').run(createdAt, conv.id);
  typing.delete(`${conv.id}:${req.user.id}`);

  const partner = partnerOf(conv, req.user.id);
  notify({
    userId: partner.id,
    actorId: req.user.id,
    type: 'message',
    text: text || 'Sent an attachment',
  });

  res.status(201).json({ message: messageDto(db.prepare('SELECT * FROM messages WHERE id = ?').get(id)) });
});

router.post('/conversations/:id/typing', requireAuth, (req, res) => {
  const conv = loadConversation(req, res);
  if (!conv) return;
  typing.set(`${conv.id}:${req.user.id}`, Date.now());
  res.json({ ok: true });
});

router.post('/conversations/:id/read', requireAuth, (req, res) => {
  const conv = loadConversation(req, res);
  if (!conv) return;
  db.prepare(
    'UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL'
  ).run(ts(), conv.id, req.user.id);
  res.json({ ok: true });
});

router.get('/conversations/:id/poll', requireAuth, (req, res) => {
  const conv = loadConversation(req, res);
  if (!conv) return;
  const after = Number(req.query.after) || 0;
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? AND created_at > ?
       ORDER BY created_at ASC LIMIT 200`
    )
    .all(conv.id, after);
  const partner = partnerOf(conv, req.user.id);
  const partnerTyping = (typing.get(`${conv.id}:${partner.id}`) || 0) > Date.now() - TYPING_TTL;
  res.json({
    messages: rows.map(messageDto),
    partnerTyping,
    partner: publicUser(partner),
  });
});

export default router;
