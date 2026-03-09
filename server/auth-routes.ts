import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from './db';

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
  try {
    const existing = await getUserByEmail('admin@ahbaballah.edu');
    if (!existing) {
      const password_hash = await bcrypt.hash('1234', 10);
      await pool.query(
        `INSERT INTO users (full_name, email, phone, role, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        ['أ. سلوى أحمد داموس', 'admin@ahbaballah.edu', '+249917545129', 'admin', password_hash]
      );
      console.log('[auth] Admin account seeded ✓');
    } else {
      console.log('[auth] Admin already exists, skipping seed');
    }
  } catch (err: any) {
    console.warn('[auth] seed skipped:', err?.message);
  }
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
    if (password.length < 4) {
      return res.status(400).json({ ok: false, error: 'كلمة المرور قصيرة جداً (4 أحرف كحد أدنى)' });
    }

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
      `INSERT INTO users (full_name, email, phone, role, password_hash, linked_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, phone, role, linked_id, created_at`,
      [full_name, email, phone, role, password_hash, linked_id]
    );
    const data = rows[0];

    req.session.user = {
      id: data.id,
      full_name: data.full_name,
      email: data.email || '',
      phone: data.phone || null,
      role: data.role,
    };

    return res.json({
      ok: true,
      user: { id: data.id, full_name: data.full_name, email: data.email, phone: data.phone, role: data.role, linked_id: data.linked_id },
    });
  } catch (err: any) {
    console.error('[auth/register]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'خطأ داخلي في الخادم' });
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

    let user: any = null;
    if (role === 'admin') {
      user = await getUserByEmail(rawCredential);
      if (!user) user = await getUserByEmail('admin@ahbaballah.edu');
    } else if (role === 'teacher') {
      user = await getUserByEmail(rawCredential);
    } else if (role === 'parent') {
      user = await getUserByPhone(rawCredential);
    }

    if (!user) return res.status(401).json({ ok: false, error: 'الحساب غير موجود في النظام' });
    if (user.role !== role) return res.status(401).json({ ok: false, error: 'نوع الحساب غير مطابق' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: 'كلمة المرور غير صحيحة' });

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email || '',
      phone: user.phone || null,
      role: user.role,
    };

    return res.json({
      ok: true,
      user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, linked_id: user.linked_id ?? null },
    });
  } catch (err: any) {
    console.error('[auth/login]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'خطأ داخلي في الخادم' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ ok: false, error: 'تعذّر تسجيل الخروج' });
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

router.get('/me', (req: Request, res: Response) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'غير مسجّل الدخول' });
  return res.json({ ok: true, user: req.session.user });
});

export default router;
