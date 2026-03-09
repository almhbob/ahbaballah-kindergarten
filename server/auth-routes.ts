import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from './supabase-client';

const router = Router();

function sanitizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

async function getUserByEmail(email: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('email', sanitizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getUserByPhone(phone: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('phone', phone.replace(/\s/g, ''))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function seedAdminAccount() {
  try {
    const sb = getSupabaseClient();
    const existing = await getUserByEmail('admin@ahbaballah.edu');
    if (!existing) {
      const password_hash = await bcrypt.hash('1234', 10);
      const { error } = await sb.from('users').insert([{
        full_name: 'أ. سلوى أحمد داموس',
        email: 'admin@ahbaballah.edu',
        phone: '+249917545129',
        role: 'admin',
        password_hash,
      }]);
      if (error) {
        if (error.code === '42P01') {
          console.warn('[auth] users table not found — run the Supabase migration SQL first');
        } else {
          console.error('[auth] seed error:', error.message);
        }
      } else {
        console.log('[auth] Admin account seeded');
      }
    }
  } catch (err: any) {
    console.warn('[auth] seed skipped:', err?.message);
  }
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const sb = getSupabaseClient();
    const full_name = String(req.body.full_name || '').trim();
    const email = sanitizeEmail(req.body.email || '');
    const phone = String(req.body.phone || '').trim().replace(/\s/g, '') || null;
    const role = String(req.body.role || '') as 'admin' | 'teacher' | 'parent';
    const password = String(req.body.password || '');
    const linked_id = req.body.linked_id ? String(req.body.linked_id) : null;

    if (!full_name || !role || !password) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }
    if (!['teacher', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'نوع الحساب غير صالح' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'كلمة المرور قصيرة جداً (4 أحرف كحد أدنى)' });
    }

    const credential = role === 'parent' ? phone : email;
    if (!credential) {
      return res.status(400).json({ error: role === 'parent' ? 'رقم الهاتف مطلوب' : 'البريد الإلكتروني مطلوب' });
    }

    const existing = role === 'parent'
      ? await getUserByPhone(credential)
      : await getUserByEmail(credential);

    if (existing) {
      return res.status(409).json({ error: 'هذا الحساب مسجّل مسبقاً، سجّل الدخول مباشرة' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const insertData: Record<string, any> = {
      full_name,
      role,
      password_hash,
    };
    if (email) insertData.email = email;
    if (phone) insertData.phone = phone;
    if (linked_id) insertData.linked_id = linked_id;

    const { data, error } = await sb
      .from('users')
      .insert([insertData])
      .select('id, full_name, email, phone, role, linked_id, created_at')
      .single();

    if (error) throw error;

    req.session.user = {
      id: data.id,
      full_name: data.full_name,
      email: data.email || '',
      phone: data.phone || null,
      role: data.role,
    };

    return res.json({
      ok: true,
      user: {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        linked_id: data.linked_id,
      },
    });
  } catch (err: any) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: err?.message || 'خطأ داخلي في الخادم' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const role = String(req.body.role || '') as 'admin' | 'teacher' | 'parent';
    const password = String(req.body.password || '');
    const rawCredential = String(req.body.credential || '').trim();

    if (!rawCredential || !password || !role) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
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

    if (!user) {
      return res.status(401).json({ error: 'الحساب غير موجود في النظام' });
    }
    if (user.role !== role) {
      return res.status(401).json({ error: 'نوع الحساب غير مطابق' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email || '',
      phone: user.phone || null,
      role: user.role,
    };

    return res.json({
      ok: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        linked_id: user.linked_id ?? null,
      },
    });
  } catch (err: any) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: err?.message || 'خطأ داخلي في الخادم' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'تعذّر تسجيل الخروج' });
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

router.get('/me', (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'غير مسجّل الدخول' });
  }
  return res.json({ ok: true, user: req.session.user });
});

export default router;
