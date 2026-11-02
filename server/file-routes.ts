import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import pool from './db';
import { requireAuth, rateLimit } from './security';

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const user = req.auth!;
    const safeUid = String(user.uid).replace(/[^\w-]+/g, '_');
    const dir = path.join(UPLOADS_DIR, user.schoolId, safeUid);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80);
    // Unguessable names: served files are public by URL.
    cb(null, `${Date.now()}_${crypto.randomBytes(12).toString('hex')}_${safe}`);
  },
});

/** Files are owned per school + user. */
const ownerKey = (req: Request) => `${req.auth!.schoolId}:${req.auth!.uid}`;

const BLOCKED_EXT = /\.(html?|svg|xhtml|js|mjs|php|exe|sh|bat)$/i;

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Block types that a browser could execute when served from our origin.
    if (BLOCKED_EXT.test(file.originalname) || /html|svg|javascript/i.test(file.mimetype)) {
      return cb(new Error('نوع الملف غير مسموح'));
    }
    cb(null, true);
  },
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, file_name, file_path, mime_type, size_bytes, public_url, created_at
       FROM files WHERE user_id = $1 ORDER BY created_at DESC`,
      [ownerKey(req)]
    );
    return res.json({ ok: true, files: rows });
  } catch (err: any) {
    console.error('[files/list]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'خطأ في جلب الملفات' });
  }
});

router.post('/upload', requireAuth, rateLimit('upload', 60, 60 * 60 * 1000), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'لم يُرسَل أي ملف' });

    const user = req.auth!;
    const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
    const parts = relativePath.split('/');
    const scope = parts[1];
    const userIdSeg = parts[2];
    const filename = parts[3] || path.basename(req.file.path);
    const publicUrl = `/api/files/serve/${scope}/${userIdSeg}/${filename}`;

    const { rows } = await pool.query(
      `INSERT INTO files (user_id, role, file_name, file_path, mime_type, size_bytes, public_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, file_name, file_path, mime_type, size_bytes, public_url, created_at`,
      [ownerKey(req), user.role, req.file.originalname, relativePath, req.file.mimetype, req.file.size, publicUrl]
    );

    return res.json({ ok: true, file: rows[0] });
  } catch (err: any) {
    console.error('[files/upload]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'فشل رفع الملف' });
  }
});

router.get('/serve/:role/:userId/:filename', async (req: Request, res: Response) => {
  try {
    const role = String(req.params.role);
    const userId = String(req.params.userId);
    const filename = String(req.params.filename);
    const filePath = path.resolve(UPLOADS_DIR, role, userId, filename);
    if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return res.status(403).json({ ok: false, error: 'غير مسموح' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'الملف غير موجود' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
    return res.sendFile(filePath);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT file_path, user_id FROM files WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.id, ownerKey(req)]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'الملف غير موجود' });

    const fullPath = path.join(process.cwd(), rows[0].file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[files/delete]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'فشل حذف الملف' });
  }
});

router.get('/count', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM files WHERE user_id = $1', [ownerKey(req)]);
    return res.json({ ok: true, count: parseInt(rows[0].count, 10) });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

export default router;
