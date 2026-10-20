import type { Request, Response, NextFunction } from 'express';
import pool from './db';

export async function readSessionIdentity(id: number, database: Pick<typeof pool, 'query'> = pool) {
  const { rows } = await database.query(
    `SELECT id, full_name, email, phone, role, linked_id, disabled, link_verified
     FROM users WHERE id = $1 LIMIT 1`, [id],
  );
  const user = rows[0];
  if (!user || user.disabled || !['admin', 'teacher', 'parent'].includes(user.role)) return null;
  let teacher_class: string | null = null;
  if (user.role !== 'admin') {
    // Previously self-claimed links are NOT silently promoted to trusted membership.
    if (!user.link_verified || !user.linked_id) return null;
    const key = user.role === 'teacher' ? 'app_employees' : 'app_students';
    const roster = await database.query(
      `SELECT entry FROM app_state, jsonb_array_elements(
         CASE WHEN jsonb_typeof(value) = 'array' THEN value ELSE '[]'::jsonb END
       ) AS entry WHERE key = $1 AND entry->>'id' = $2 LIMIT 1`,
      [key, user.linked_id],
    );
    const linked = roster.rows[0]?.entry;
    if (!linked || (user.role === 'teacher' ? linked.disabled : linked.parentDisabled)) return null;
    if (user.role === 'teacher') teacher_class = typeof linked.level === 'string' ? linked.level : null;
    if (user.role === 'teacher' && !teacher_class) return null;
  }
  return {
    id: user.id, full_name: user.full_name, email: user.email || '', phone: user.phone || null,
    role: user.role, linked_id: user.linked_id || null, teacher_class, disabled: false,
  };
}

/** Recheck revocation/role/linkage from the database, not stale cookie contents. */
export async function refreshSessionIdentity(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) return next();
  try {
    const identity = await readSessionIdentity(req.session.user.id);
    if (!identity) {
      return req.session.destroy(() => {
        res.clearCookie('school.sid');
        res.status(401).json({ ok: false, error: 'انتهت الجلسة أو أُوقف الحساب أو لم يُعتمد ربطه' });
      });
    }
    req.session.user = identity;
    return next();
  } catch {
    return res.status(503).json({ ok: false, error: 'تعذر التحقق من الجلسة؛ حاول لاحقًا' });
  }
}
