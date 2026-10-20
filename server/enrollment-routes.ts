import { Router } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import pool from './db';
import { requireStateAdmin } from './access-control';

const short = (max: number) => z.string().trim().max(max);
const enrollmentInput = z.object({
  requestKey: z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  childName: short(120).min(2),
  birthDate: short(40).default(''),
  gender: z.enum(['ذكر', 'أنثى']),
  requestedLevel: z.enum(['براعم', 'مستوى أول', 'مستوى ثاني']),
  parentName: short(120).min(2),
  parentPhone: short(30).min(6).regex(/^[+\d\s()-]+$/),
  parentRelation: short(60).min(2),
  parentEmail: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  nationality: short(100).optional(),
  notes: short(1500).optional(),
}).strict();
const statusInput = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: short(500).optional(),
}).strict();

export function createEnrollmentRouter(database: Pick<typeof pool, 'query'> = pool) {
  const router = Router();
  // This instance has exactly one school. A client cannot select another one.
  const schoolId = process.env.DISMISSAL_SCHOOL_ID?.trim() || 'ahbabullah';
  router.use((_req, res, next) => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(schoolId)) {
      return res.status(503).json({ ok: false, error: 'إعداد الروضة على الخادم غير صالح' });
    }
    return next();
  });
  router.post('/', async (req, res) => {
    const parsed = enrollmentInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'بيانات التسجيل غير صالحة أو تحتوي على حقول غير مسموحة' });
    const { requestKey, ...fields } = parsed.data;
    const hash = createHash('sha256').update(JSON.stringify(fields)).digest('hex');
    const data = { ...fields, id: randomUUID(), status: 'pending', createdAt: new Date().toISOString() };
    try {
      const { rows } = await database.query(
        `INSERT INTO enrollment_requests (id, school_id, data, request_key, request_hash)
         VALUES ($1, $2, $3::jsonb, $4, $5)
         ON CONFLICT (school_id, request_key) DO UPDATE SET request_key = EXCLUDED.request_key
         WHERE enrollment_requests.request_hash = EXCLUDED.request_hash
         RETURNING id, created_at`,
        [data.id, schoolId, JSON.stringify(data), requestKey, hash],
      );
      if (!rows[0]) return res.status(409).json({ ok: false, error: 'مرجع الطلب مستخدم لبيانات مختلفة؛ افتح طلبًا جديدًا' });
      return res.status(201).json({ ok: true, receipt: { id: rows[0].id, createdAt: rows[0].created_at } });
    } catch {
      return res.status(503).json({ ok: false, error: 'لم يصل طلب التسجيل إلى الخادم؛ احتفظ بالبيانات وحاول لاحقًا' });
    }
  });
  router.get('/', requireStateAdmin, async (req, res) => {
    let before: { time: string; id: string } | null = null;
    if (req.query.cursor !== undefined) {
      try {
        if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 300) throw new Error('BAD_CURSOR');
        const cursor = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString('utf8'));
        if (typeof cursor.time !== 'string' || !Number.isFinite(Date.parse(cursor.time)) ||
            typeof cursor.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(cursor.id)) throw new Error('BAD_CURSOR');
        before = cursor;
      } catch { return res.status(400).json({ ok: false, error: 'مؤشر الصفحة غير صالح' }); }
    }
    try {
      const { rows } = await database.query(
        `SELECT id, data, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time
         FROM enrollment_requests WHERE school_id = $1
         AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::text))
         ORDER BY created_at DESC, id DESC LIMIT 201`,
        [schoolId, before?.time || null, before?.id || null],
      );
      return res.json({
        ok: true, requests: rows.slice(0, 200).map(row => row.data),
        nextCursor: rows.length > 200
          ? Buffer.from(JSON.stringify({ time: rows[199].cursor_time, id: rows[199].id })).toString('base64url') : null,
      });
    } catch { return res.status(503).json({ ok: false, error: 'تعذر جلب طلبات التسجيل' }); }
  });
  router.patch('/:id', requireStateAdmin, async (req, res) => {
    const parsed = statusInput.safeParse(req.body);
    const id = String(req.params.id);
    if (!parsed.success || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      return res.status(400).json({ ok: false, error: 'تعديل طلب التسجيل غير صالح' });
    }
    const patch = {
      status: parsed.data.status,
      rejectionReason: parsed.data.status === 'rejected' ? parsed.data.rejectionReason || '' : '',
      approvedAt: parsed.data.status === 'approved' ? new Date().toISOString() : null,
    };
    try {
      const { rows } = await database.query(
        `UPDATE enrollment_requests SET data = data || $3::jsonb, updated_at = NOW()
         WHERE id = $1 AND school_id = $2 RETURNING data`,
        [id, schoolId, JSON.stringify(patch)],
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'الطلب غير موجود' });
      return res.json({ ok: true, request: rows[0].data });
    } catch { return res.status(503).json({ ok: false, error: 'لم يُحفظ تعديل الطلب' }); }
  });
  router.delete('/:id', requireStateAdmin, async (req, res) => {
    try {
      const { rows } = await database.query(
        'DELETE FROM enrollment_requests WHERE id = $1 AND school_id = $2 RETURNING id',
        [String(req.params.id), schoolId],
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'الطلب غير موجود' });
      return res.json({ ok: true });
    } catch { return res.status(503).json({ ok: false, error: 'لم يُحذف الطلب' }); }
  });
  return router;
}

export default createEnrollmentRouter();
