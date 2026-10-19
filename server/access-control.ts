import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
  }
  return next();
}

/** Platform operations are not ordinary school-admin operations. Fail closed. */
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || req.session.user.role !== 'admin' ||
      req.session.user.email?.trim().toLowerCase() !== email) {
    return res.status(403).json({ ok: false, error: 'هذه العملية متاحة لمسؤول المنصة فقط' });
  }
  return next();
}

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
