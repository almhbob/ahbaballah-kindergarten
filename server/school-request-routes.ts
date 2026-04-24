import { Router } from 'express';
import pool from './db';

const router = Router();

// POST /api/school-requests — Submit a new school registration request (public)
router.post('/', async (req, res) => {
  try {
    const {
      school_name, school_type, city, address, license_number,
      admin_name, admin_phone, admin_email,
      logo_url, primary_color, accent_color, slogan,
      principal_name, school_motto, letterhead_address, stamp_info,
      requested_tier, wants_trial,
    } = req.body;

    if (!school_name || !admin_name || !admin_phone || !admin_email) {
      return res.status(400).json({ ok: false, error: 'البيانات الأساسية مطلوبة' });
    }

    const existing = await pool.query(
      'SELECT id FROM school_requests WHERE admin_email = $1 AND status != $2',
      [admin_email.toLowerCase().trim(), 'rejected']
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ ok: false, error: 'يوجد طلب مسبق بهذا البريد الإلكتروني' });
    }

    const result = await pool.query(
      `INSERT INTO school_requests
        (school_name, school_type, city, address, license_number,
         admin_name, admin_phone, admin_email,
         logo_url, primary_color, accent_color, slogan,
         principal_name, school_motto, letterhead_address, stamp_info,
         requested_tier, wants_trial, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending')
       RETURNING id`,
      [
        school_name.trim(), school_type ?? 'أهلية', city?.trim(), address?.trim(), license_number?.trim(),
        admin_name.trim(), admin_phone.trim(), admin_email.toLowerCase().trim(),
        logo_url ?? null, primary_color ?? '#0c1155', accent_color ?? '#c9952a', slogan?.trim() ?? null,
        principal_name?.trim() ?? null, school_motto?.trim() ?? null,
        letterhead_address?.trim() ?? null, stamp_info?.trim() ?? null,
        requested_tier ?? 'trial', wants_trial ?? true,
      ]
    );

    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err: any) {
    console.error('[school-requests] POST error:', err?.message);
    return res.status(500).json({ ok: false, error: 'خطأ في الخادم' });
  }
});

// GET /api/school-requests — List all requests (dev only — caller verifies password)
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM school_requests ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'contacted' THEN 1 ELSE 2 END,
         created_at DESC`
    );
    return res.json({ ok: true, data: result.rows });
  } catch (err: any) {
    console.error('[school-requests] GET error:', err?.message);
    return res.status(500).json({ ok: false, error: 'خطأ في الخادم' });
  }
});

// PATCH /api/school-requests/:id — Update status/notes/provision data
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, notes, reviewed_by,
      subscription_start, subscription_end,
      approved_school_id, initial_password,
    } = req.body;
    const allowed = ['pending', 'contacted', 'approved', 'rejected'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ ok: false, error: 'حالة غير صالحة' });
    }

    await pool.query(
      `UPDATE school_requests
         SET status             = COALESCE($1, status),
             notes              = COALESCE($2, notes),
             reviewed_by        = COALESCE($3, reviewed_by),
             reviewed_at        = NOW(),
             subscription_start = COALESCE($4, subscription_start),
             subscription_end   = COALESCE($5, subscription_end),
             approved_school_id = COALESCE($6, approved_school_id),
             initial_password   = COALESCE($7, initial_password)
       WHERE id = $8`,
      [
        status ?? null, notes ?? null, reviewed_by ?? null,
        subscription_start ?? null, subscription_end ?? null,
        approved_school_id ?? null, initial_password ?? null,
        id,
      ]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[school-requests] PATCH error:', err?.message);
    return res.status(500).json({ ok: false, error: 'خطأ في الخادم' });
  }
});

// DELETE /api/school-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM school_requests WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[school-requests] DELETE error:', err?.message);
    return res.status(500).json({ ok: false, error: 'خطأ في الخادم' });
  }
});

export default router;
