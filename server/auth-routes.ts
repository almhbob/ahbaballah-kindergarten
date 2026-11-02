import { Router, Request, Response } from 'express';
import {
  issueToken, requireAuth, requireRole, normalizeSchoolId, clientIp,
  hitRateLimit, resetRateLimit, serverError, DEFAULT_SCHOOL_ID, type AuthClaims,
} from './security';
import {
  verifyPassword, setCredential, getCredential, validateNewPassword,
  LEGACY_DEFAULTS, PLATFORM_SCOPE, dummyCompare, deleteCredential, type CredKind,
} from './credentials';
import { getValue } from './state-store';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const normPhone = (p: unknown) => String(p ?? '').replace(/[\s-]/g, '');
const normEmail = (e: unknown) => String(e ?? '').trim().toLowerCase();

interface ResolvedAccount {
  claims: Omit<AuthClaims, 'exp'>;
  kind: CredKind;
  refId: string;
  defaultRef?: 'teacher' | 'parent';
  legacyDefault?: string;
  disabled?: boolean;
}

/** Finds the account a credential refers to, from the school's own data. */
async function resolveAccount(schoolId: string, role: string, credential: string): Promise<ResolvedAccount | null> {
  if (role === 'admin') {
    const c = credential.trim().toLowerCase();
    if (c !== 'admin' && c !== 'administrator') return null;
    const info = await getValue(schoolId, 'app_school_info');
    return {
      claims: { uid: 'admin_1', role: 'admin', schoolId, name: info?.principalName || 'مدير الروضة' },
      kind: 'admin',
      refId: 'admin',
      // The legacy factory password is only honoured for the original school, and it must be changed on first use.
      legacyDefault: schoolId === DEFAULT_SCHOOL_ID ? (process.env.ADMIN_INITIAL_PASSWORD || LEGACY_DEFAULTS.admin) : undefined,
    };
  }

  if (role === 'teacher') {
    const employees = await getValue(schoolId, 'app_employees');
    const emp = (Array.isArray(employees) ? employees : []).find(e => e?.email && normEmail(e.email) === normEmail(credential));
    if (!emp) return null;
    return {
      claims: { uid: String(emp.id), role: 'teacher', schoolId, name: emp.name, teacherClass: emp.level },
      kind: 'teacher', refId: String(emp.id), defaultRef: 'teacher', legacyDefault: LEGACY_DEFAULTS.teacher,
      disabled: !!emp.disabled,
    };
  }

  if (role === 'parent') {
    const students = await getValue(schoolId, 'app_students');
    const stu = (Array.isArray(students) ? students : []).find(s => s?.parentPhone && normPhone(s.parentPhone) === normPhone(credential));
    if (!stu) return null;
    return {
      claims: { uid: `parent_${stu.id}`, role: 'parent', schoolId, name: stu.parentName, studentId: String(stu.id) },
      kind: 'parent', refId: String(stu.id), defaultRef: 'parent', legacyDefault: LEGACY_DEFAULTS.parent,
      disabled: !!stu.parentDisabled,
    };
  }

  return null;
}

function publicUser(c: Omit<AuthClaims, 'exp'>) {
  return {
    id: c.uid, name: c.name, role: c.role,
    ...(c.studentId ? { studentId: c.studentId } : {}),
    ...(c.teacherClass ? { teacherClass: c.teacherClass } : {}),
  };
}

const GENERIC_LOGIN_ERROR = 'بيانات الدخول غير صحيحة';

/** POST /api/auth/login { role, credential, password, schoolId } */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const role = String(req.body?.role || '');
    const credential = String(req.body?.credential || '').trim();
    const password = String(req.body?.password || '');
    const schoolId = normalizeSchoolId(req.body?.schoolId);
    if (!credential || !password || !['admin', 'teacher', 'parent'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'بيانات ناقصة' });
    }

    const limiterKey = `login:${clientIp(req)}:${schoolId}:${role}:${credential.toLowerCase()}`;
    const ipKey = `login-ip:${clientIp(req)}`;
    if (!hitRateLimit(limiterKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS) || !hitRateLimit(ipKey, 60, LOGIN_WINDOW_MS)) {
      return res.status(429).json({ ok: false, error: 'محاولات كثيرة، يرجى المحاولة بعد 15 دقيقة' });
    }

    const acct = await resolveAccount(schoolId, role, credential);
    if (!acct) {
      await dummyCompare();
      return res.status(401).json({ ok: false, error: GENERIC_LOGIN_ERROR });
    }

    const result = await verifyPassword({
      schoolId, kind: acct.kind, refId: acct.refId, password,
      defaultRef: acct.defaultRef, legacyDefault: acct.legacyDefault,
    });
    if (!result.ok) return res.status(401).json({ ok: false, error: GENERIC_LOGIN_ERROR });
    if (acct.disabled) {
      return res.status(403).json({ ok: false, error: 'تم إيقاف هذا الحساب من قِبل الإدارة. يرجى التواصل مع الإدارة.' });
    }

    resetRateLimit(limiterKey);
    const token = issueToken({ ...acct.claims, ...(result.mustChange ? { pwc: true } : {}) });
    return res.json({ ok: true, token, user: publicUser(acct.claims), mustChangePassword: result.mustChange });
  } catch (err) {
    return serverError(res, 'auth/login', err);
  }
});

/**
 * POST /api/auth/activate { role, credential, tempPassword, newPassword, schoolId }
 * First-time account activation: the user proves possession of the temporary
 * password issued by the school, then chooses their own password.
 */
router.post('/activate', async (req: Request, res: Response) => {
  try {
    const role = String(req.body?.role || '');
    const credential = String(req.body?.credential || '').trim();
    const tempPassword = String(req.body?.tempPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const schoolId = normalizeSchoolId(req.body?.schoolId);
    if (!['teacher', 'parent'].includes(role) || !credential || !tempPassword) {
      return res.status(400).json({ ok: false, error: 'بيانات ناقصة' });
    }
    const weak = validateNewPassword(newPassword);
    if (weak) return res.status(400).json({ ok: false, error: weak });

    const limiterKey = `activate:${clientIp(req)}:${credential.toLowerCase()}`;
    if (!hitRateLimit(limiterKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
      return res.status(429).json({ ok: false, error: 'محاولات كثيرة، يرجى المحاولة لاحقاً' });
    }

    const acct = await resolveAccount(schoolId, role, credential);
    if (!acct) {
      return res.status(404).json({
        ok: false,
        error: role === 'parent'
          ? 'رقم الهاتف غير موجود في النظام، يرجى التواصل مع الإدارة'
          : 'البريد الإلكتروني غير موجود في النظام، يرجى التواصل مع الإدارة',
      });
    }
    if (acct.disabled) return res.status(403).json({ ok: false, error: 'هذا الحساب موقوف من قِبل الإدارة' });

    const result = await verifyPassword({
      schoolId, kind: acct.kind, refId: acct.refId, password: tempPassword,
      defaultRef: acct.defaultRef, legacyDefault: acct.legacyDefault,
    });
    if (!result.ok) return res.status(401).json({ ok: false, error: 'كلمة المرور المؤقتة غير صحيحة' });

    await setCredential(schoolId, acct.kind, acct.refId, newPassword, false);
    resetRateLimit(limiterKey);
    const token = issueToken(acct.claims);
    return res.json({ ok: true, token, user: publicUser(acct.claims), mustChangePassword: false });
  } catch (err) {
    return serverError(res, 'auth/activate', err);
  }
});

/** POST /api/auth/change-password { currentPassword, newPassword } — for the logged-in user. */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const auth = req.auth!;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const weak = validateNewPassword(newPassword);
    if (weak) return res.status(400).json({ ok: false, error: weak });
    if (currentPassword === newPassword) return res.status(400).json({ ok: false, error: 'اختر كلمة مرور مختلفة عن الحالية' });

    const limiterKey = `chpw:${auth.schoolId}:${auth.uid}`;
    if (!hitRateLimit(limiterKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
      return res.status(429).json({ ok: false, error: 'محاولات كثيرة، يرجى المحاولة لاحقاً' });
    }

    const kind: CredKind = auth.role;
    const refId = auth.role === 'admin' ? 'admin' : auth.role === 'teacher' ? auth.uid : String(auth.studentId);
    const existing = await getCredential(auth.schoolId, kind, refId);

    // Admins signed in through Firebase school login may have no app password yet.
    const firebaseAdminBootstrap = auth.role === 'admin' && !existing && auth.schoolId !== DEFAULT_SCHOOL_ID;
    if (!firebaseAdminBootstrap) {
      const result = await verifyPassword({
        schoolId: auth.schoolId, kind, refId, password: currentPassword,
        defaultRef: auth.role === 'admin' ? undefined : auth.role,
        legacyDefault: auth.role === 'admin'
          ? (auth.schoolId === DEFAULT_SCHOOL_ID ? (process.env.ADMIN_INITIAL_PASSWORD || LEGACY_DEFAULTS.admin) : undefined)
          : LEGACY_DEFAULTS[auth.role],
      });
      if (!result.ok) return res.status(401).json({ ok: false, error: 'كلمة المرور الحالية غير صحيحة' });
    }

    await setCredential(auth.schoolId, kind, refId, newPassword, false);
    resetRateLimit(limiterKey);
    // Issue a full-access token now that the password has been changed.
    const { exp: _exp, pwc: _pwc, ...claims } = auth;
    return res.json({ ok: true, token: issueToken(claims) });
  } catch (err) {
    return serverError(res, 'auth/change-password', err);
  }
});

/**
 * POST /api/auth/developer-unlock { password } — admin-only elevation to the
 * platform developer role. Returns a short-lived token carrying `dev: true`.
 */
router.post('/developer-unlock', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const password = String(req.body?.password || '');
    const limiterKey = `dev:${clientIp(req)}`;
    if (!hitRateLimit(limiterKey, 5, LOGIN_WINDOW_MS)) {
      return res.status(429).json({ ok: false, error: 'محاولات كثيرة، يرجى المحاولة بعد 15 دقيقة' });
    }
    const envPassword = process.env.DEVELOPER_PASSWORD;
    const stored = await getCredential(PLATFORM_SCOPE, 'developer', 'developer');
    let ok = false;
    let mustChange = false;
    if (stored) {
      ok = await bcrypt.compare(password, stored.password_hash);
    } else if (envPassword) {
      ok = password === envPassword;
    } else {
      // No developer password configured yet: accept the legacy one once, and force a change.
      ok = password === LEGACY_DEFAULTS.developer;
      mustChange = ok;
    }
    if (!ok) return res.status(401).json({ ok: false, error: 'كلمة مرور المطوّر غير صحيحة' });
    resetRateLimit(limiterKey);
    const { exp: _exp, ...claims } = req.auth!;
    return res.json({ ok: true, token: issueToken({ ...claims, dev: true }), mustChangePassword: mustChange });
  } catch (err) {
    return serverError(res, 'auth/developer-unlock', err);
  }
});

/** POST /api/auth/developer-password { newPassword } — requires developer elevation. */
router.post('/developer-password', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.auth?.dev) return res.status(403).json({ ok: false, error: 'يتطلب صلاحية المطوّر' });
    const newPassword = String(req.body?.newPassword || '');
    const weak = validateNewPassword(newPassword);
    if (weak) return res.status(400).json({ ok: false, error: weak });
    await setCredential(PLATFORM_SCOPE, 'developer', 'developer', newPassword, false);
    return res.json({ ok: true });
  } catch (err) {
    return serverError(res, 'auth/developer-password', err);
  }
});

/**
 * POST /api/auth/firebase-login { idToken }
 * School admins sign in with Firebase Auth on the device; the server verifies
 * the ID token with Google and reads the account's school from Firestore.
 */
router.post('/firebase-login', async (req: Request, res: Response) => {
  try {
    const idToken = String(req.body?.idToken || '');
    if (!idToken) return res.status(400).json({ ok: false, error: 'idToken مطلوب' });
    if (!hitRateLimit(`fblogin:${clientIp(req)}`, 20, LOGIN_WINDOW_MS)) {
      return res.status(429).json({ ok: false, error: 'محاولات كثيرة، يرجى المحاولة لاحقاً' });
    }
    const apiKey = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    if (!apiKey || !projectId) return res.status(503).json({ ok: false, error: 'Firebase غير مُهيّأ على الخادم' });

    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!lookup.ok) return res.status(401).json({ ok: false, error: 'جلسة Firebase غير صالحة' });
    const lookupJson = (await lookup.json()) as { users?: { localId: string; email?: string; displayName?: string }[] };
    const fbUser = lookupJson.users?.[0];
    if (!fbUser?.localId) return res.status(401).json({ ok: false, error: 'جلسة Firebase غير صالحة' });

    const docRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/schoolAccounts/${encodeURIComponent(fbUser.localId)}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!docRes.ok) return res.status(403).json({ ok: false, error: 'الحساب غير مرتبط بأي روضة' });
    const docJson = (await docRes.json()) as { fields?: Record<string, { stringValue?: string }> };
    const schoolIdRaw = docJson.fields?.schoolId?.stringValue;
    if (!schoolIdRaw) return res.status(403).json({ ok: false, error: 'الحساب غير مرتبط بأي روضة' });
    const schoolId = normalizeSchoolId(schoolIdRaw);

    const claims = {
      uid: 'admin_1', role: 'admin' as const, schoolId,
      name: fbUser.displayName || fbUser.email || 'مدير الروضة',
    };
    return res.json({ ok: true, token: issueToken(claims), user: publicUser(claims), schoolId, mustChangePassword: false });
  } catch (err) {
    return serverError(res, 'auth/firebase-login', err);
  }
});

/**
 * POST /api/auth/reset-password { role: 'teacher'|'parent', refId, revoke? } — admin only.
 * Issues a random temporary password (must be changed at next login), or revokes
 * the account's password entirely (falls back to the school default).
 */
router.post('/reset-password', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const role = String(req.body?.role || '');
    const refId = String(req.body?.refId || '').trim();
    if (!['teacher', 'parent'].includes(role) || !refId) return res.status(400).json({ ok: false, error: 'بيانات ناقصة' });
    const schoolId = req.auth!.schoolId;
    const list = await getValue(schoolId, role === 'teacher' ? 'app_employees' : 'app_students');
    if (!(Array.isArray(list) ? list : []).some((i: any) => String(i?.id) === refId)) {
      return res.status(404).json({ ok: false, error: 'الحساب غير موجود' });
    }
    if (req.body?.revoke) {
      await deleteCredential(schoolId, role as CredKind, refId);
      return res.json({ ok: true });
    }
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(10);
    const tempPassword = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
    await setCredential(schoolId, role as CredKind, refId, tempPassword, true);
    return res.json({ ok: true, tempPassword });
  } catch (err) {
    return serverError(res, 'auth/reset-password', err);
  }
});

/** GET /api/auth/me — validates the current token. */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const { exp, ...claims } = req.auth!;
  return res.json({ ok: true, user: publicUser(claims), schoolId: claims.schoolId, dev: !!claims.dev, exp });
});

/** POST /api/auth/logout — tokens are stateless; the client discards its token. */
router.post('/logout', (_req: Request, res: Response) => res.json({ ok: true }));

export default router;
