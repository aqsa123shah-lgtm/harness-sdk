import express from 'express';
import cookieParser from 'cookie-parser';
import { UPLOAD_DIR, SEED_DIR } from './db.js';
import { attachUser } from './auth.js';
import { seedIfEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import storyRoutes from './routes/stories.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import discoverRoutes from './routes/discover.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h', fallthrough: true }));
app.use('/seed', express.static(SEED_DIR, { maxAge: '1h', fallthrough: true }));

app.use('/api', attachUser);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', postRoutes);
app.use('/api', storyRoutes);
app.use('/api', messageRoutes);
app.use('/api', notificationRoutes);
app.use('/api', discoverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large (max 25MB)' });
  console.error('[api]', err?.message || err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

seedIfEmpty();

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, '0.0.0.0', () => console.log(`Lumen API listening on 0.0.0.0:${PORT}`));
