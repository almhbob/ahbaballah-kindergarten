import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  isStateKey, getAll, getValue, putValue, deleteValue,
  extractSecrets, filterForReader, applyWritePolicy, cleanupRemovedAccounts, PolicyError,
} from './state-store';
import { requireAuth, requireRole, normalizeSchoolId, rateLimit, serverError } from './security';

const router = Router();

/**
 * GET /api/state?school=<id>
 * Authenticated users get their school's state filtered for their role.
 * Anonymous callers (guest mode) get only the public keys of the requested school.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const schoolId = req.auth ? req.auth.schoolId : normalizeSchoolId(req.query.school);
    const all = await getAll(schoolId);
    const data: Record<string, any> = {};
    for (const [key, value] of Object.entries(all)) {
      if (!isStateKey(key)) continue;
      const r = filterForReader(key, value, req.auth);
      if (r.include) data[key] = r.value;
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, schoolId, role: req.auth?.role ?? null, data });
  } catch (err) {
    return serverError(res, 'state/get', err);
  }
});

/**
 * POST /api/state/registration-request?school=<id>
 * Public enrolment form (guest screen). Appends one validated, pending request.
 */
router.post('/registration-request', rateLimit('enrol', 5, 60 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const schoolId = normalizeSchoolId(req.query.school);
    const b = req.body?.request ?? req.body ?? {};
    const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const childName = str(b.childName);
    const parentName = str(b.parentName);
    const parentPhone = str(b.parentPhone, 40);
    if (!childName || !parentName || !parentPhone) {
      return res.status(400).json({ ok: false, error: 'اسم الطفل وولي الأمر ورقم الهاتف مطلوبة' });
    }
    const request = {
      id: `reg_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      childName,
      birthDate: str(b.birthDate, 40),
      gender: b.gender === 'أنثى' ? 'أنثى' : 'ذكر',
      requestedLevel: ['براعم', 'مستوى أول', 'مستوى ثاني'].includes(b.requestedLevel) ? b.requestedLevel : 'براعم',
      parentName,
      parentPhone,
      parentRelation: str(b.parentRelation, 60),
      parentEmail: str(b.parentEmail, 200) || undefined,
      notes: str(b.notes, 2000) || undefined,
      nationality: str(b.nationality, 100) || undefined,
    };
    const existing = await getValue(schoolId, 'app_registration_requests');
    const list = Array.isArray(existing) ? existing : [];
    if (list.length >= 5000) return res.status(429).json({ ok: false, error: 'تم بلوغ الحد الأقصى للطلبات' });
    await putValue(schoolId, 'app_registration_requests', [request, ...list]);
    return res.json({ ok: true, request });
  } catch (err) {
    return serverError(res, 'state/registration-request', err);
  }
});

/** PUT /api/state/:key — write one key for the caller's school, enforcing role policy. */
router.put('/:key', requireAuth, async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    if (!isStateKey(key)) return res.status(400).json({ ok: false, error: 'مفتاح غير معروف' });
    const { value } = req.body ?? {};
    if (value === undefined) return res.status(400).json({ ok: false, error: 'value مطلوب' });

    const auth = req.auth!;
    const before = auth.role === 'admin' ? await getValue(auth.schoolId, key) : undefined;
    const clean = await extractSecrets(auth.schoolId, key, value, auth);
    const toStore = await applyWritePolicy(auth.schoolId, key, clean, auth);
    await putValue(auth.schoolId, key, toStore);
    if (auth.role === 'admin') await cleanupRemovedAccounts(auth.schoolId, key, before, toStore);

    const view = filterForReader(key, toStore, auth);
    return res.json({ ok: true, value: view.include ? view.value : undefined });
  } catch (err) {
    if (err instanceof PolicyError) return res.status(err.status).json({ ok: false, error: err.message });
    return serverError(res, 'state/put', err);
  }
});

/** DELETE /api/state/:key — admin only (used by "reset all data"). */
router.delete('/:key', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key);
    if (!isStateKey(key)) return res.status(400).json({ ok: false, error: 'مفتاح غير معروف' });
    await deleteValue(req.auth!.schoolId, key);
    return res.json({ ok: true });
  } catch (err) {
    return serverError(res, 'state/delete', err);
  }
});

export default router;
