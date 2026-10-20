import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import pool from './db';
import { requireStateAdmin } from './access-control';
import { allowedWebOrigins } from './request-security';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ROLES = new Set(['admin', 'teacher', 'parent', 'public', 'branding']);
type Database = Pick<typeof pool, 'query'>;
type FileOptions = {
  uploadsDir?: string;
  production?: boolean;
  persistent?: boolean;
  allowedOrigins?: string[];
};

async function normalizeImage(buffer: Buffer) {
  const source = sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'warning' });
  const meta = await source.metadata();
  if (!['png', 'jpeg', 'webp', 'gif'].includes(meta.format || '') || (meta.pages || 1) > 1) {
    throw new Error('UNSUPPORTED_IMAGE');
  }
  const format = meta.format === 'jpeg' ? 'jpeg' : meta.format === 'webp' ? 'webp' : 'png';
  // Decode/re-encode, apply orientation and discard EXIF/GPS and appended payloads.
  const image = await source.rotate().toFormat(format).toBuffer();
  if (image.length > MAX_BYTES) throw new Error('OUTPUT_TOO_LARGE');
  return { image, format };
}

function fileView(row: Record<string, unknown>) {
  return {
    id: row.id, file_name: row.file_name, mime_type: row.mime_type,
    size_bytes: row.size_bytes, public_url: row.public_url, created_at: row.created_at,
  };
}

/** One school per deployment. No client-selected school/role grants access. */
export function createFileRouter(database: Database = pool, options: FileOptions = {}) {
  const router = Router();
  const uploadsDir = path.resolve(options.uploadsDir || process.env.UPLOADS_DIR || 'uploads');
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const persistent = options.persistent ?? process.env.FILE_STORAGE_PERSISTENT === 'true';
  const origins = new Set(options.allowedOrigins ?? allowedWebOrigins());
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 0, parts: 1 },
    fileFilter: (_req, file, cb) => {
      if (!MIME_TYPES.has(file.mimetype)) return cb(new Error('UNSUPPORTED_IMAGE'));
      return cb(null, true);
    },
  }).single('file');
  // Bound simultaneous parsing/decoding; always release even on client disconnect.
  let activeUploads = 0;
  function capacity(_req: Request, res: Response, next: NextFunction) {
    if (production && (!(options.uploadsDir || process.env.UPLOADS_DIR) || !persistent)) {
      return res.status(503).json({ ok: false, error: 'رفع الصور متوقف حتى إعداد مساحة تخزين دائمة' });
    }
    if (activeUploads >= 2) {
      res.setHeader('Retry-After', '5');
      return res.status(429).json({ ok: false, error: 'الرفع مشغول، حاول بعد لحظات' });
    }
    activeUploads++;
    let released = false;
    const release = () => { if (!released) { activeUploads--; released = true; } };
    res.locals.releaseUpload = release;
    res.once('finish', release);
    res.once('close', () => { if (!res.locals.uploadProcessing) release(); });
    next();
  }
  function verifyOrigin(req: Request, res: Response, next: NextFunction) {
    const origin = req.get('origin');
    if (origin) {
      let devLoopback = false;
      try {
        const url = new URL(origin);
        devLoopback = !production && url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.origin === origin;
      } catch { /* Reject malformed origins. */ }
      if (!origins.has(origin) && !devLoopback) {
        return res.status(403).json({ ok: false, error: 'مصدر الطلب غير مسموح' });
      }
    } else if (req.get('sec-fetch-site') === 'cross-site') {
      return res.status(403).json({ ok: false, error: 'مصدر الطلب غير مسموح' });
    }
    next();
  }
  function parseUpload(req: Request, res: Response, next: NextFunction) {
    upload(req, res, err => {
      if (!err) return next();
      const tooLarge = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
      const unsupported = err.message === 'UNSUPPORTED_IMAGE';
      return res.status(tooLarge ? 413 : unsupported ? 415 : 400).json({
        ok: false,
        error: tooLarge ? 'حجم الصورة يتجاوز 10 ميغابايت' :
          unsupported ? 'الأنواع المدعومة: JPEG وPNG وWebP وGIF ثابتة' : 'طلب رفع الصورة غير صالح',
      });
    });
  }
  const fail = (res: Response, message: string) => res.status(500).json({ ok: false, error: message });
  function checkedPath(relative: string) {
    const result = path.resolve(uploadsDir, relative);
    if (result === uploadsDir || !result.startsWith(uploadsDir + path.sep)) throw new Error('OUTSIDE_STORAGE');
    return result;
  }
  async function readRegularFile(relative: string) {
    const candidate = checkedPath(relative);
    const realRoot = await fs.realpath(uploadsDir);
    const realFile = await fs.realpath(candidate);
    if (!realFile.startsWith(realRoot + path.sep)) throw new Error('OUTSIDE_STORAGE');
    const stat = await fs.stat(realFile);
    if (!stat.isFile()) throw new Error('NOT_A_FILE');
    return { realFile, stat };
  }

  router.get('/', requireStateAdmin, async (req, res) => {
    try {
      const { rows } = await database.query(
        `SELECT id, file_name, mime_type, size_bytes, public_url, created_at
         FROM files WHERE user_id = $1 ORDER BY created_at DESC`, [req.session.user!.id],
      );
      return res.json({ ok: true, files: rows.map(fileView) });
    } catch { return fail(res, 'تعذر جلب الملفات'); }
  });
  router.get('/count', requireStateAdmin, async (req, res) => {
    try {
      const { rows } = await database.query('SELECT COUNT(*) as count FROM files WHERE user_id = $1', [req.session.user!.id]);
      return res.json({ ok: true, count: Number(rows[0].count) });
    } catch { return fail(res, 'تعذر جلب عدد الملفات'); }
  });

  router.post('/upload', requireStateAdmin, verifyOrigin, capacity, parseUpload, async (req, res) => {
    res.locals.uploadProcessing = true;
    try {
    if (!req.file?.buffer.length) {
      return res.status(400).json({ ok: false, error: 'لم تُرسل صورة صالحة' });
    }
    const purpose = req.query.purpose || 'private';
    if (!['private', 'branding'].includes(String(purpose)) || typeof purpose !== 'string') {
      return res.status(400).json({ ok: false, error: 'غرض الرفع غير صالح' });
    }
    let image: Buffer;
    let format: string;
    try {
      ({ image, format } = await normalizeImage(req.file.buffer));
    } catch (err) {
      if ((err as Error).message === 'OUTPUT_TOO_LARGE') {
        return res.status(413).json({ ok: false, error: 'الصورة بعد المعالجة تتجاوز 10 ميغابايت' });
      }
      if ((err as Error).message === 'UNSUPPORTED_IMAGE') {
        return res.status(415).json({ ok: false, error: 'اختر صورة ثابتة بصيغة JPEG أو PNG أو WebP أو GIF' });
      }
      return res.status(415).json({ ok: false, error: 'الصورة تالفة أو أبعادها كبيرة جدًا؛ الحد 20 مليون بكسل' });
    }
    const user = req.session.user!;
    // "branding" is a server-controlled namespace: the ONLY public file category.
    const role = purpose === 'branding' ? 'branding' : 'admin';
    const filename = `${randomUUID()}.${format === 'jpeg' ? 'jpg' : format}`;
    const relative = path.join(role, String(user.id), filename);
    const filePath = checkedPath(relative);
    const publicUrl = `/api/files/serve/${role}/${user.id}/${filename}`;
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
      // Refuse a symlinked destination that escapes the configured storage root.
      const realRoot = await fs.realpath(uploadsDir);
      const realParent = await fs.realpath(path.dirname(filePath));
      if (!realParent.startsWith(realRoot + path.sep)) throw new Error('OUTSIDE_STORAGE');
      await fs.writeFile(filePath, image, { flag: 'wx', mode: 0o600 });
      let row;
      try {
        const { rows } = await database.query(
          `INSERT INTO files (user_id, role, file_name, file_path, mime_type, size_bytes, public_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, file_name, mime_type, size_bytes, public_url, created_at`,
          [user.id, role, filename, filePath, `image/${format}`, image.length, publicUrl],
        );
        row = rows[0];
        if (!row) throw new Error('MISSING_INSERT_RESULT');
      } catch {
        await fs.unlink(filePath);
        return fail(res, 'تعذر حفظ الصورة؛ لم تكتمل عملية الرفع');
      }
      return res.status(201).json({ ok: true, file: fileView(row) });
    } catch {
      return fail(res, 'تعذر تخزين الصورة؛ تحقق من إعداد مساحة التخزين');
    }
    } finally {
      res.locals.uploadProcessing = false;
      res.locals.releaseUpload();
    }
  });

  router.get('/serve/:role/:userId/:filename', async (req, res) => {
    const role = String(req.params.role);
    const userId = String(req.params.userId);
    const filename = String(req.params.filename);
    const validUserSegment = /^\d{1,12}$/.test(userId) || (role === 'public' && userId === 'guest');
    if (!ROLES.has(role) || !validUserSegment ||
        filename.length > 180 || !/^[\w.-]+$/.test(filename) || filename === '.' || filename === '..') {
      return res.status(404).json({ ok: false, error: 'الملف غير موجود' });
    }
    // Protect legacy public/guest records too. Never trust the URL alone.
    if (role !== 'branding') {
      if (!req.session?.user) return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول لعرض الملف' });
      if (req.session.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'الملف متاح للإدارة فقط' });
    }
    const publicUrl = `/api/files/serve/${role}/${userId}/${filename}`;
    try {
      const { rows } = await database.query(
        'SELECT file_path, mime_type, role FROM files WHERE public_url = $1 AND role = $2 LIMIT 1',
        [publicUrl, role],
      );
      const row = rows[0];
      if (!row) return res.status(404).json({ ok: false, error: 'الملف غير موجود' });
      // New records store absolute paths; legacy records stored uploads/... under cwd.
      const storedPath = path.isAbsolute(row.file_path) ? row.file_path : path.resolve(row.file_path);
      const relative = path.relative(uploadsDir, storedPath);
      const { realFile, stat } = await readRegularFile(relative);
      const legacy = !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename);
      // Legacy files were never inspected. Normalize real images on read;
      // don't silently break all existing student photos, or render HTML as images.
      let normalized;
      if (legacy) {
        if (stat.size > MAX_BYTES) return res.status(413).json({ ok: false, error: 'يجب إعادة رفع هذه الصورة بحجم أصغر' });
        try { normalized = await normalizeImage(await fs.readFile(realFile)); }
        catch { return res.status(415).json({ ok: false, error: 'هذا الملف قديم أو غير صالح؛ يرجى إعادة رفع صورة صالحة' }); }
      }
      const mime = normalized ? `image/${normalized.format}` : row.mime_type;
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', role === 'branding' ? 'cross-origin' : 'same-site');
      res.setHeader('Cache-Control', role === 'branding' ? 'public, max-age=3600' : 'private, no-store');
      res.setHeader('Content-Type', mime || 'application/octet-stream');
      if (normalized) return res.send(normalized.image);
      return res.sendFile(realFile, { cacheControl: false, lastModified: false, acceptRanges: false });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return res.status(404).json({ ok: false, error: 'الملف غير موجود' });
      return fail(res, 'تعذر عرض الملف');
    }
  });

  router.delete('/:id', requireStateAdmin, verifyOrigin, async (req, res) => {
    if (!/^\d+$/.test(String(req.params.id))) return res.status(400).json({ ok: false, error: 'معرف الملف غير صالح' });
    try {
      const { rows } = await database.query(
        'SELECT file_path FROM files WHERE id = $1 AND user_id = $2 LIMIT 1',
        [req.params.id, req.session.user!.id],
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'الملف غير موجود' });
      const storedPath = path.isAbsolute(rows[0].file_path) ? rows[0].file_path : path.resolve(rows[0].file_path);
      try {
        const { realFile } = await readRegularFile(path.relative(uploadsDir, storedPath));
        await fs.unlink(realFile);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
      await database.query('DELETE FROM files WHERE id = $1 AND user_id = $2', [req.params.id, req.session.user!.id]);
      return res.json({ ok: true });
    } catch { return fail(res, 'تعذر حذف الملف'); }
  });
  return router;
}

export default createFileRouter();
