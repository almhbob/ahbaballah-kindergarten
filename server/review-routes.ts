import { Router } from 'express';
import pool from './db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, parent_name AS "parentName", child_name AS "childName",
              content, rating, created_at AS "createdAt"
       FROM reviews WHERE approved = true
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    res.status(500).json({ error: 'خطأ في جلب الآراء' });
  }
});

router.get('/all', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, parent_name AS "parentName", child_name AS "childName",
              content, rating, approved, created_at AS "createdAt"
       FROM reviews ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/reviews/all error:', err);
    res.status(500).json({ error: 'خطأ في جلب الآراء' });
  }
});

router.post('/', async (req, res) => {
  const { parentName, childName, content, rating } = req.body;
  if (!parentName?.trim() || !childName?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  const r = Math.min(5, Math.max(1, Number(rating) || 5));
  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (parent_name, child_name, content, rating, approved)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, parent_name AS "parentName", child_name AS "childName",
                 content, rating, approved, created_at AS "createdAt"`,
      [parentName.trim(), childName.trim(), content.trim(), r]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/reviews error:', err);
    res.status(500).json({ error: 'خطأ في إضافة الرأي' });
  }
});

router.patch('/:id/approve', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE reviews SET approved = true WHERE id = $1
       RETURNING id, parent_name AS "parentName", child_name AS "childName",
                 content, rating, approved, created_at AS "createdAt"`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الرأي غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/reviews/:id/approve error:', err);
    res.status(500).json({ error: 'خطأ في قبول الرأي' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'الرأي غير موجود' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/reviews/:id error:', err);
    res.status(500).json({ error: 'خطأ في حذف الرأي' });
  }
});

export default router;
