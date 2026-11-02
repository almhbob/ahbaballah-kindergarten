/**
 * Credential store — every password is kept ONLY here, as a bcrypt hash.
 * Passwords never live inside the shared school state any more.
 *
 * kind/ref_id pairs:
 *   admin/admin             school admin password
 *   teacher/<employeeId>    teacher password
 *   parent/<studentId>      parent password (per child, as before)
 *   default/teacher         school default teacher password (temporary)
 *   default/parent          school default parent password (temporary)
 *   developer/developer     platform developer password (school_id = __platform__)
 */
import bcrypt from 'bcryptjs';
import pool from './db';

export const PLATFORM_SCOPE = '__platform__';
/** Legacy factory defaults — accepted only as *temporary* passwords that must be changed. */
export const LEGACY_DEFAULTS = { admin: '1234', teacher: '1234', parent: '1234', developer: 'dev@2026' } as const;
export const MIN_PASSWORD_LENGTH = 6;

export type CredKind = 'admin' | 'teacher' | 'parent' | 'default' | 'developer';

export interface CredentialRow {
  password_hash: string;
  must_change: boolean;
}

export async function ensureCredentialSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      school_id     TEXT NOT NULL,
      kind          TEXT NOT NULL,
      ref_id        TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      must_change   BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (school_id, kind, ref_id)
    );
  `);
}

export async function getCredential(schoolId: string, kind: CredKind, refId: string): Promise<CredentialRow | null> {
  const { rows } = await pool.query(
    'SELECT password_hash, must_change FROM credentials WHERE school_id = $1 AND kind = $2 AND ref_id = $3',
    [schoolId, kind, refId],
  );
  return rows[0] ?? null;
}

export async function setCredential(
  schoolId: string, kind: CredKind, refId: string, password: string, mustChange: boolean,
) {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO credentials (school_id, kind, ref_id, password_hash, must_change, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (school_id, kind, ref_id)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, must_change = EXCLUDED.must_change, updated_at = NOW()`,
    [schoolId, kind, refId, hash, mustChange],
  );
}

export async function deleteCredential(schoolId: string, kind: CredKind, refId: string) {
  await pool.query('DELETE FROM credentials WHERE school_id = $1 AND kind = $2 AND ref_id = $3', [schoolId, kind, refId]);
}

// Constant-ish time dummy compare so unknown accounts cost the same as known ones.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);
export async function dummyCompare() {
  await bcrypt.compare('x', DUMMY_HASH);
}

export interface VerifyResult { ok: boolean; mustChange: boolean }

/**
 * Verifies a password for an account, falling back (in order) to:
 *  1. the account's own credential
 *  2. the school's stored default for that role (teacher/parent only) — temporary
 *  3. the legacy factory default — temporary, only where `allowLegacy` is true
 */
export async function verifyPassword(opts: {
  schoolId: string;
  kind: CredKind;
  refId: string;
  password: string;
  defaultRef?: 'teacher' | 'parent';
  legacyDefault?: string;
}): Promise<VerifyResult> {
  const own = await getCredential(opts.schoolId, opts.kind, opts.refId);
  if (own) {
    const ok = await bcrypt.compare(opts.password, own.password_hash);
    return { ok, mustChange: ok && own.must_change };
  }
  if (opts.defaultRef) {
    const def = await getCredential(opts.schoolId, 'default', opts.defaultRef);
    if (def) {
      const ok = await bcrypt.compare(opts.password, def.password_hash);
      return { ok, mustChange: ok };
    }
  }
  if (opts.legacyDefault !== undefined) {
    await dummyCompare();
    const ok = opts.password === opts.legacyDefault;
    return { ok, mustChange: ok };
  }
  await dummyCompare();
  return { ok: false, mustChange: false };
}

export function validateNewPassword(pw: unknown): string | null {
  const s = typeof pw === 'string' ? pw : '';
  if (s.length < MIN_PASSWORD_LENGTH) return `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`;
  if (s.length > 128) return 'كلمة المرور طويلة جداً';
  if (Object.values(LEGACY_DEFAULTS).includes(s as any)) return 'لا يمكن استخدام كلمة المرور الافتراضية';
  if (/^(\d)\1+$/.test(s) || s === '123456' || s === '12345678') return 'كلمة المرور ضعيفة جداً';
  return null;
}
