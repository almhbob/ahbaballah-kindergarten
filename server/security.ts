/**
 * Security primitives for the API server:
 *  - signed, expiring bearer tokens (HMAC-SHA256)
 *  - authentication / role-based authorization middleware
 *  - a small in-memory rate limiter
 *  - baseline security headers
 */
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'teacher' | 'parent';

export interface AuthClaims {
  /** App-level user id (admin_1, employee id, parent_<studentId>) */
  uid: string;
  role: Role;
  schoolId: string;
  name: string;
  studentId?: string;
  teacherClass?: string;
  /** Developer (platform owner) elevation — granted only by /api/auth/developer-unlock */
  dev?: boolean;
  /** Password change required: the token only unlocks /api/auth/change-password and /api/auth/me. */
  pwc?: boolean;
  /** Expiry, seconds since epoch */
  exp: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthClaims;
  }
}

export const DEFAULT_SCHOOL_ID = 'ahbabullah';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const DEV_TOKEN_TTL_SECONDS = 60 * 60 * 2;   // developer elevation lasts 2 hours

function resolveSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[security] SESSION_SECRET must be set (32+ characters) in production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  console.warn('[security] SESSION_SECRET missing/short — using an ephemeral dev secret (tokens reset on restart)');
  return crypto.randomBytes(48).toString('hex');
}

const SECRET = resolveSecret();

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function issueToken(claims: Omit<AuthClaims, 'exp'>): string {
  const ttl = claims.dev ? DEV_TOKEN_TTL_SECONDS : TOKEN_TTL_SECONDS;
  const payload: AuthClaims = { ...claims, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string): AuthClaims | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthClaims;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (!['admin', 'teacher', 'parent'].includes(claims.role)) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Parses the bearer token if present. Never rejects — use requireAuth for that. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (m) {
    const claims = verifyToken(m[1].trim());
    const pwcAllowed = req.path === '/api/auth/change-password' || req.path === '/api/auth/me' || req.path === '/api/auth/logout';
    if (claims && (!claims.pwc || pwcAllowed)) req.auth = claims;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ ok: false, error: 'لا تملك صلاحية لهذا الإجراء' });
    next();
  };
}

export function requireDeveloper(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول أولاً' });
  if (!req.auth.dev) return res.status(403).json({ ok: false, error: 'هذا الإجراء يتطلب صلاحية المطوّر' });
  next();
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}, 60_000).unref();

export function clientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || 'unknown').toString();
}

/** Returns true if the action is allowed, false when the limit is exceeded. */
export function hitRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function rateLimit(name: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hitRateLimit(`${name}:${clientIp(req)}`, max, windowMs)) {
      return res.status(429).json({ ok: false, error: 'محاولات كثيرة، يرجى المحاولة لاحقاً' });
    }
    next();
  };
}

// ─── Headers ────────────────────────────────────────────────────────────────

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

/** Sanitises a school id coming from clients. */
export function normalizeSchoolId(raw: unknown): string {
  const s = String(raw ?? '').trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : DEFAULT_SCHOOL_ID;
}

/** Generic error response that never leaks internals in production. */
export function serverError(res: Response, label: string, err: unknown) {
  console.error(`[${label}]`, err);
  return res.status(500).json({ ok: false, error: 'خطأ داخلي في الخادم' });
}
