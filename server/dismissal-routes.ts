import { Router, Request, Response, NextFunction } from 'express';
import pool from './db';

const router = Router();
const LEGACY_SINGLE_SCHOOL_ENABLED = process.env.DISMISSAL_LEGACY_SINGLE_SCHOOL === 'true';
const DEFAULT_TIME_ZONE = 'UTC';

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'خدمة الانصراف متاحة للإدارة فقط في وضع المدرسة الواحدة' });
  }
  if (!LEGACY_SINGLE_SCHOOL_ENABLED) {
    return res.status(503).json({
      ok: false,
      error: 'خدمة الانصراف غير مفعّلة: يلزم إعداد وضع المدرسة الواحدة بعد التحقق من نطاق بيانات الطلاب',
    });
  }
  return next();
}

function configuredTimeZone(): string {
  const timeZone = process.env.DISMISSAL_TIME_ZONE || DEFAULT_TIME_ZONE;
  // Reject invalid configuration instead of silently using a different school day.
  new Intl.DateTimeFormat('en', { timeZone });
  return timeZone;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function studentSummary(value: unknown): { id: string; name: string; level: string } | null {
  if (!value || typeof value !== 'object') return null;
  const student = value as Record<string, unknown>;
  const id = cleanText(student.id);
  const name = cleanText(student.name);
  const level = cleanText(student.level);
  if (!id || !name || id.length > 200 || name.length > 200) return null;
  return { id, name, level: level.slice(0, 120) };
}

function validatedBody(body: unknown): { receiverName: string; receiverRelationship: string } | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Record<string, unknown>;
  const receiverName = cleanText(input.receiverName);
  const receiverRelationship = cleanText(input.receiverRelationship);
  if (receiverName.length < 2 || receiverName.length > 120 ||
      receiverRelationship.length < 2 || receiverRelationship.length > 80 ||
      input.confirmedAuthorizedPickup !== true) return null;
  return { receiverName, receiverRelationship };
}

router.use(requireAdmin);

router.get('/students', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT value FROM app_state WHERE key = 'app_students' LIMIT 1");
    const roster = rows[0]?.value;
    if (!Array.isArray(roster)) {
      return res.status(503).json({ ok: false, error: 'قائمة الطلاب المعتمدة غير متاحة على الخادم' });
    }
    return res.json({ ok: true, students: roster.map(studentSummary).filter(Boolean) });
  } catch {
    return res.status(500).json({ ok: false, error: 'تعذّر تحميل قائمة الطلاب من الخادم' });
  }
});

router.get('/today', async (_req: Request, res: Response) => {
  try {
    const timeZone = configuredTimeZone();
    const { rows } = await pool.query(
      `WITH school_clock AS (
         SELECT (NOW() AT TIME ZONE $1)::date AS school_date
       )
       SELECT d.id, d.student_id, to_char(d.school_date, 'YYYY-MM-DD') AS school_date, d.dismissed_at,
              d.receiver_name, d.receiver_relationship, d.actor_name,
              to_char(c.school_date, 'YYYY-MM-DD') AS current_school_date
       FROM school_clock c
       LEFT JOIN student_dismissals d ON d.school_date = c.school_date
       ORDER BY d.dismissed_at`,
      [timeZone],
    );
    const schoolDate = rows[0]?.current_school_date
      ? String(rows[0].current_school_date).slice(0, 10)
      : '';
    const dismissals = rows.filter((row: any) => row.id != null).map((row: any) => ({
      id: Number(row.id),
      studentId: String(row.student_id),
      schoolDate: row.school_date instanceof Date ? row.school_date.toISOString().slice(0, 10) : String(row.school_date).slice(0, 10),
      dismissedAt: new Date(row.dismissed_at).toISOString(),
      receiverName: row.receiver_name,
      receiverRelationship: row.receiver_relationship,
      actorName: row.actor_name,
    }));
    return res.json({ ok: true, today: { schoolDate, dismissals } });
  } catch (error: any) {
    if (error?.code === '42P01') {
      return res.status(503).json({ ok: false, error: 'سجل الانصراف غير مهيأ؛ يرجى تطبيق ترحيل قاعدة البيانات' });
    }
    return res.status(500).json({ ok: false, error: 'تعذّر تحميل سجل انصراف اليوم' });
  }
});

router.post('/:studentId/checkout', async (req: Request, res: Response) => {
  const studentId = cleanText(req.params.studentId);
  const details = validatedBody(req.body);
  if (!studentId || studentId.length > 200 || !details) {
    return res.status(400).json({
      ok: false,
      error: 'بيانات الانصراف غير مكتملة أو غير صالحة، ويجب تأكيد التحقق من المستلم المخوّل',
    });
  }
  try {
    const { rows: rosterRows } = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM app_state s
         CROSS JOIN LATERAL jsonb_array_elements(
           CASE WHEN jsonb_typeof(s.value) = 'array' THEN s.value ELSE '[]'::jsonb END
         ) AS student
         WHERE s.key = 'app_students' AND student->>'id' = $1
       ) AS exists`,
      [studentId],
    );
    if (!rosterRows[0]?.exists) {
      return res.status(404).json({ ok: false, error: 'الطالب غير موجود في قائمة الطلاب المعتمدة على الخادم' });
    }

    const timeZone = configuredTimeZone();
    const actor = req.session!.user!;
    const { rows } = await pool.query(
      `WITH school_clock AS (
         SELECT NOW() AS dismissed_at, (NOW() AT TIME ZONE $2)::date AS school_date
       )
       INSERT INTO student_dismissals
         (student_id, school_date, dismissed_at, receiver_name, receiver_relationship,
          authorized_pickup_confirmed, actor_user_id, actor_name)
       SELECT $1, c.school_date, c.dismissed_at, $3, $4, TRUE, $5, $6
       FROM school_clock c
       ON CONFLICT (student_id, school_date) DO NOTHING
       RETURNING id, student_id, to_char(school_date, 'YYYY-MM-DD') AS school_date, dismissed_at, receiver_name,
                 receiver_relationship, actor_name`,
      [studentId, timeZone, details.receiverName, details.receiverRelationship, actor.id, actor.full_name],
    );
    if (rows.length === 0) {
      return res.status(409).json({ ok: false, error: 'تم تسجيل انصراف هذا الطالب اليوم مسبقاً' });
    }
    const row = rows[0];
    return res.status(201).json({
      ok: true,
      dismissal: {
        id: Number(row.id),
        studentId: String(row.student_id),
        schoolDate: row.school_date instanceof Date ? row.school_date.toISOString().slice(0, 10) : String(row.school_date).slice(0, 10),
        dismissedAt: new Date(row.dismissed_at).toISOString(),
        receiverName: row.receiver_name,
        receiverRelationship: row.receiver_relationship,
        actorName: row.actor_name,
      },
    });
  } catch (error: any) {
    if (error?.code === '42P01') {
      return res.status(503).json({ ok: false, error: 'سجل الانصراف غير مهيأ؛ يرجى تطبيق ترحيل قاعدة البيانات' });
    }
    return res.status(500).json({ ok: false, error: 'تعذّر حفظ انصراف الطالب' });
  }
});

export default router;
