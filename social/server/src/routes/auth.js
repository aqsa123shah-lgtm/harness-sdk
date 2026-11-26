import { Router } from 'express';
import crypto from 'node:crypto';
import { db, uid, ts } from '../db.js';
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth } from '../auth.js';
import { publicUser, countsFor } from '../dto.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;
const isDev = process.env.NODE_ENV !== 'production';

const code = () => String(crypto.randomInt(100000, 1000000));

router.post('/signup', (req, res) => {
  const { email, password, username, displayName } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUsername = String(username || '').trim().replace(/^@/, '');

  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (String(password || '').length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!USERNAME_RE.test(cleanUsername))
    return res.status(400).json({ error: 'Username must be 3-20 letters, numbers, dots or underscores' });

  const taken = db
    .prepare('SELECT id FROM users WHERE email = ? OR lower(username) = lower(?)')
    .get(cleanEmail, cleanUsername);
  if (taken) return res.status(409).json({ error: 'That email or username is already taken' });

  const id = uid();
  const verifyCode = code();
  db.prepare(
    `INSERT INTO users (id, username, display_name, email, password_hash, bio, website, verify_code, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, '', '', ?, ?, ?)`
  ).run(
    id,
    cleanUsername,
    String(displayName || cleanUsername).trim().slice(0, 50) || cleanUsername,
    cleanEmail,
    hashPassword(String(password)),
    verifyCode,
    ts(),
    ts()
  );

  createSession(res, id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ user: publicUser(user, id), devVerifyCode: isDev ? verifyCode : undefined });
});

router.post('/login', (req, res) => {
  const { identifier, password } = req.body || {};
  const key = String(identifier || '').trim().replace(/^@/, '');
  if (!key || !password) return res.status(400).json({ error: 'Enter your email and password' });

  const user = db
    .prepare('SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)')
    .get(key, key);
  if (!user || !verifyPassword(String(password), user.password_hash))
    return res.status(401).json({ error: 'Incorrect email or password' });
  if (user.is_banned)
    return res.status(403).json({ error: 'This account has been suspended. Contact support.' });

  createSession(res, user.id);
  res.json({ user: publicUser(user, user.id) });
});

router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: publicUser(req.user, req.user.id), counts: countsFor(req.user.id) });
});

router.post('/verify', requireAuth, (req, res) => {
  const submitted = String(req.body?.code || '').trim();
  if (!submitted) return res.status(400).json({ error: 'Enter the verification code' });
  if (submitted !== req.user.verify_code)
    return res.status(400).json({ error: 'That code is not correct' });
  db.prepare('UPDATE users SET email_verified = 1, verify_code = NULL WHERE id = ?').run(req.user.id);
  res.json({ user: publicUser({ ...req.user, email_verified: 1 }, req.user.id) });
});

router.post('/onboarded', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET onboarded = 1 WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.post('/resend-verification', requireAuth, (req, res) => {
  const next = code();
  db.prepare('UPDATE users SET verify_code = ? WHERE id = ?').run(next, req.user.id);
  res.json({ devVerifyCode: isDev ? next : undefined });
});

router.post('/forgot', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No account uses that email' });
  const resetCode = code();
  db.prepare('UPDATE users SET reset_code = ? WHERE id = ?').run(resetCode, user.id);
  res.json({ ok: true, devResetCode: isDev ? resetCode : undefined });
});

router.post('/reset', (req, res) => {
  const { email, code: submitted, password } = req.body || {};
  if (String(password || '').length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(String(email || '').trim().toLowerCase());
  if (!user || !user.reset_code || user.reset_code !== String(submitted || '').trim())
    return res.status(400).json({ error: 'That reset code is not valid' });
  db.prepare('UPDATE users SET password_hash = ?, reset_code = NULL WHERE id = ?').run(
    hashPassword(String(password)),
    user.id
  );
  res.json({ ok: true });
});

export default router;
