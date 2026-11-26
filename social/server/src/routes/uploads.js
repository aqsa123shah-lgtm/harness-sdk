import { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { UPLOAD_DIR } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const EXT_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = EXT_BY_TYPE[file.mimetype] || path.extname(file.originalname || '').slice(0, 8) || '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_TYPE[file.mimetype]) return cb(new Error('Only images and videos are supported'));
    cb(null, true);
  },
});

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
  });
});

export default router;
