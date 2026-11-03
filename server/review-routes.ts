import { Router } from 'express';
import pool from './db';
import { requireRole, rateLimit, normalizeSchoolId } from './security';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const schoolId = req.auth?.schoolId ?? normalizeSchoolId(req.query.school);
    const { rows } = await pool.query(
      `SELECT id, parent_name AS "parentName", child_name AS "childName",
              content, rating, created_at AS "createdAt"
       FROM reviews WHERE approved = true AND school_id = $1
       ORDER BY created_at DESC LIMIT 200`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    res.status(500).json({ error: 'خطأ في جلب الآراء' });
  }
});

router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, parent_name AS "parentName", child_name AS "childName",
              content, rating, approved, created_at AS "createdAt"
       FROM reviews WHERE school_id = $1 ORDER BY created_at DESC`,
      [req.auth!.schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/reviews/all error:', err);
    res.status(500).json({ error: 'خطأ في جلب الآراء' });
  }
});

router.post('/', rateLimit('review', 5, 60 * 60 * 1000), async (req, res) => {
  const { parentName, childName, content, rating } = req.body ?? {};
  if (typeof parentName !== 'string' || typeof childName !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  if (parentName.length > 200 || childName.length > 200 || content.length > 2000) {
    return res.status(400).json({ error: 'النص طويل جداً' });
  }
  if (!parentName?.trim() || !childName?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  const r = Math.min(5, Math.max(1, Number(rating) || 5));
  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (parent_name, child_name, content, rating, approved, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, parent_name AS "parentName", child_name AS "childName",
                 content, rating, approved, created_at AS "createdAt"`,
      [parentName.trim(), childName.trim(), content.trim(), r, req.auth?.role === 'parent' || req.auth?.role === 'admin',
       req.auth?.schoolId ?? normalizeSchoolId(req.query.school)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/reviews error:', err);
    res.status(500).json({ error: 'خطأ في إضافة الرأي' });
  }
});

router.patch('/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE reviews SET approved = true WHERE id = $1 AND school_id = $2
       RETURNING id, parent_name AS "parentName", child_name AS "childName",
                 content, rating, approved, created_at AS "createdAt"`,
      [req.params.id, req.auth!.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'الرأي غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/reviews/:id/approve error:', err);
    res.status(500).json({ error: 'خطأ في قبول الرأي' });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1 AND school_id = $2', [req.params.id, req.auth!.schoolId]);
    if (!rowCount) return res.status(404).json({ error: 'الرأي غير موجود' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/reviews/:id error:', err);
    res.status(500).json({ error: 'خطأ في حذف الرأي' });
  }
});

export default router;
