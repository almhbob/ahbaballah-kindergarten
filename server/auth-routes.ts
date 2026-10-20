import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from './db';
import { readSessionIdentity } from './session-identity';

const router = Router();

function sanitizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

async function getUserByEmail(email: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [sanitizeEmail(email)]);
  return rows[0] || null;
}

async function getUserByPhone(phone: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [phone.replace(/\s/g, '')]);
  return rows[0] || null;
}

export async function seedAdminAccount() {
  const email = sanitizeEmail(process.env.ADMIN_EMAIL || '');
  const password = process.env.ADMIN_INITIAL_PASSWORD || '';
  // Never create a privileged account with a public, built-in password.
  if (!email || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    console.warn('[auth] Bootstrap skipped: configure ADMIN_EMAIL and a 12+ character ADMIN_INITIAL_PASSWORD (at most 72 UTF-8 bytes)');
    return;
  }
  try {
    const existing = await getUserByEmail(email);
    if (!existing) {
      const password_hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO users (full_name, email, phone, role, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        ['مدير النظام', email, null, 'admin', password_hash]
      );
      console.log('[auth] Admin account seeded ✓');
    } else {
      console.log('[auth] Admin already exists, skipping seed');
    }
  } catch (err: any) {
    console.warn('[auth] seed skipped:', err?.message);
  }
}

async function establishSession(req: Request, user: NonNullable<Request['session']['user']>) {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err: unknown) => err ? reject(err) : resolve());
  });
  req.session.user = user;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err: unknown) => err ? reject(err) : resolve());
  });
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const full_name = String(req.body.full_name || '').trim();
    const email = sanitizeEmail(req.body.email || '') || null;
    const phone = String(req.body.phone || '').trim().replace(/\s/g, '') || null;
    const role = String(req.body.role || '') as 'admin' | 'teacher' | 'parent';
    const password = String(req.body.password || '');
    const linked_id = req.body.linked_id ? String(req.body.linked_id) : null;

    if (!full_name || !role || !password) {
      return res.status(400).json({ ok: false, error: 'بيانات ناقصة' });
    }
    if (!['teacher', 'parent'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'نوع الحساب غير صالح' });
    }
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ ok: false, error: 'كلمة المرور يجب أن تكون 12 حرفًا على الأقل ولا تتجاوز 72 بايت' });
    }
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'إنشاء الحساب وربطه متاح للإدارة فقط؛ اطلب حسابًا من الروضة' });
    }
    if (!linked_id || linked_id.length > 100) {
      return res.status(400).json({ ok: false, error: 'يجب اختيار ملف صالح للموظف أو الطالب' });
    }
    const link = await pool.query(
      `SELECT entry FROM app_state, jsonb_array_elements(
         CASE WHEN jsonb_typeof(value) = 'array' THEN value ELSE '[]'::jsonb END
       ) AS entry WHERE key = $1 AND entry->>'id' = $2 LIMIT 1`,
      [role === 'teacher' ? 'app_employees' : 'app_students', linked_id],
    );
    if (!link.rows[0]) return res.status(400).json({ ok: false, error: 'الملف المرتبط غير موجود' });

    const credential = role === 'parent' ? phone : email;
    if (!credential) {
      return res.status(400).json({ ok: false, error: role === 'parent' ? 'رقم الهاتف مطلوب' : 'البريد الإلكتروني مطلوب' });
    }

    const existing = role === 'parent' ? await getUserByPhone(credential) : await getUserByEmail(credential);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'هذا الحساب مسجّل مسبقاً، سجّل الدخول مباشرة' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, role, password_hash, linked_id, link_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, full_name, email, phone, role, linked_id, created_at`,
      [full_name, email, phone, role, password_hash, linked_id]
    );
    const data = rows[0];

    // Provisioning a parent/teacher must never replace the administrator's session.
    return res.json({
      ok: true,
      user: { id: data.id, full_name: data.full_name, email: data.email, phone: data.phone, role: data.role, linked_id: data.linked_id },
    });
  } catch (err: any) {
    console.error('[auth/register]', err);
    return res.status(500).json({ ok: false, error: 'خطأ داخلي في الخادم' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const role = String(req.body.role || '') as 'admin' | 'teacher' | 'parent';
    const password = String(req.body.password || '');
    const rawCredential = String(req.body.credential || '').trim();

    if (!rawCredential || !password || !role) {
      return res.status(400).json({ ok: false, error: 'بيانات ناقصة' });
    }
    if (!['admin', 'teacher', 'parent'].includes(role) || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ ok: false, error: 'بيانات الدخول غير صالحة' });
    }

    let user: any = null;
    if (role === 'admin') {
      const alias = ['admin', 'administrator'].includes(rawCredential.toLowerCase());
      const email = alias ? process.env.ADMIN_EMAIL : rawCredential;
      if (email) user = await getUserByEmail(email);
    } else if (role === 'teacher') {
      user = await getUserByEmail(rawCredential);
    } else if (role === 'parent') {
      user = await getUserByPhone(rawCredential);
    }

    if (!user || user.role !== role) {
      return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة' });
    const identity = await readSessionIdentity(user.id);
    if (!identity) return res.status(403).json({ ok: false, error: 'الحساب موقوف أو لم تعتمد الإدارة ربطه بملف صالح' });

    await establishSession(req, identity);

    return res.json({
      ok: true,
      user: identity,
    });
  } catch (err: any) {
    console.error('[auth/login]', err);
    return res.status(500).json({ ok: false, error: 'خطأ داخلي في الخادم' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err: unknown) => {
    if (err) return res.status(500).json({ ok: false, error: 'تعذّر تسجيل الخروج' });
    res.clearCookie('school.sid');
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

router.get('/me', async (req: Request, res: Response) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'غير مسجّل الدخول' });
  try {
    const user = await readSessionIdentity(req.session.user.id);
    if (!user) return res.status(401).json({ ok: false, error: 'الجلسة أو ربط الحساب غير صالح' });
    return res.json({ ok: true, user });
  } catch {
    return res.status(503).json({ ok: false, error: 'تعذر التحقق من الجلسة' });
  }
});

export default router;
