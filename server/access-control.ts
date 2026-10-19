import type { Request, Response, NextFunction } from 'express';

/** Legacy app_state contains whole-school records, not role-filtered documents. */
export function requireStateAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'هذه البيانات متاحة للإدارة فقط' });
  }
  return next();
}
