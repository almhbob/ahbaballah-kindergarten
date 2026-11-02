/**
 * Per-school application state, with role-based read filtering and
 * write policies. Passwords are extracted into the credential store on
 * write and are never persisted in (or returned from) the state.
 */
import pool from './db';
import type { AuthClaims } from './security';
import { DEFAULT_SCHOOL_ID } from './security';
import { LEGACY_DEFAULTS, PLATFORM_SCOPE, setCredential, deleteCredential, validateNewPassword } from './credentials';

export const STATE_KEYS = [
  'app_students', 'app_employees', 'app_news', 'app_inbox', 'app_messages', 'app_meetings',
  'app_schedule', 'app_welcome_msg', 'app_school_info', 'app_honor_weights', 'app_annual_plan',
  'app_grad_tasks', 'app_certificates', 'app_transport_routes', 'app_transport_subs', 'app_banners',
  'app_yearly_snapshots', 'app_settings', 'app_registration_requests', 'app_school_events',
  'app_gallery_photos',
] as const;
export type StateKey = typeof STATE_KEYS[number];

export function isStateKey(k: string): k is StateKey {
  return (STATE_KEYS as readonly string[]).includes(k);
}

/** Keys readable without logging in (guest screens, landing). */
const PUBLIC_KEYS: StateKey[] = [
  'app_news', 'app_banners', 'app_school_info', 'app_welcome_msg', 'app_school_events',
  'app_gallery_photos', 'app_settings',
];

/** Keys hidden from teachers and parents entirely. */
const ADMIN_ONLY_KEYS: StateKey[] = ['app_inbox', 'app_registration_requests', 'app_yearly_snapshots'];

const SETTINGS_SECRET_FIELDS = ['adminPassword', 'developerPassword', 'defaultTeacherPassword', 'defaultParentPassword'];
const TEACHER_STUDENT_FIELDS = ['attendance', 'behavior', 'homework', 'notes', 'grades', 'dailyReports', 'assessments'];
const TEACHER_SELF_FIELDS = ['daysPresent', 'daysAbsent', 'attendanceRecords'];
const PUBLIC_EMPLOYEE_FIELDS = ['id', 'name', 'role', 'level', 'phone'];

export class PolicyError extends Error {
  status: number;
  constructor(message: string, status = 403) { super(message); this.status = status; }
}

// ─── Schema & migration ─────────────────────────────────────────────────────

export async function ensureStateSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS school_state (
      school_id  TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (school_id, key)
    );
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const MIGRATION = '2026_11_secure_state_v1';
  const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [MIGRATION]);
  if (done.rowCount) return;

  // Move the legacy, global, unauthenticated `app_state` table into the default school
  // and pull every plaintext password out of it.
  const legacy = await pool.query(`SELECT to_regclass('public.app_state') AS t`);
  if (legacy.rows[0]?.t) {
    const { rows } = await pool.query('SELECT key, value FROM app_state');
    for (const row of rows) {
      if (!isStateKey(row.key)) continue;
      const clean = await extractSecrets(DEFAULT_SCHOOL_ID, row.key, row.value, { migration: true, dev: true });
      await putValue(DEFAULT_SCHOOL_ID, row.key, clean);
    }
    // Scrub plaintext secrets from the legacy table too (kept only as an emptied backup).
    await pool.query(`DELETE FROM app_state WHERE key IN ('app_settings','app_students','app_employees')`);
    console.log(`[state] migrated ${rows.length} legacy keys into school_state ✓`);
  }

  // Legacy `school_requests.initial_password` was stored in plaintext.
  await pool.query(`ALTER TABLE IF EXISTS school_requests ADD COLUMN IF NOT EXISTS initial_password TEXT`);

  await pool.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [MIGRATION]);
}

// ─── Raw storage ────────────────────────────────────────────────────────────

export async function getAll(schoolId: string): Promise<Record<string, any>> {
  const { rows } = await pool.query('SELECT key, value FROM school_state WHERE school_id = $1', [schoolId]);
  const out: Record<string, any> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function getValue(schoolId: string, key: StateKey): Promise<any> {
  const { rows } = await pool.query('SELECT value FROM school_state WHERE school_id = $1 AND key = $2', [schoolId, key]);
  return rows[0]?.value;
}

export async function putValue(schoolId: string, key: StateKey, value: unknown) {
  await pool.query(
    `INSERT INTO school_state (school_id, key, value, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (school_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [schoolId, key, JSON.stringify(value)],
  );
}

export async function deleteValue(schoolId: string, key: StateKey) {
  await pool.query('DELETE FROM school_state WHERE school_id = $1 AND key = $2', [schoolId, key]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

function pick(obj: Record<string, any>, fields: string[]) {
  const out: Record<string, any> = {};
  for (const f of fields) if (f in obj) out[f] = obj[f];
  return out;
}

function omit(obj: Record<string, any>, fields: string[]) {
  const out = { ...obj };
  for (const f of fields) delete out[f];
  return out;
}

/** A password value worth storing (not empty, not a legacy factory default). */
function meaningfulPassword(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && !Object.values(LEGACY_DEFAULTS).includes(v.trim() as any);
}

// ─── Secret extraction (write path) ─────────────────────────────────────────

/**
 * Removes every password field from a state value. When the writer is an
 * admin (or this is the one-time migration), meaningful passwords are
 * hashed into the credential store.
 */
export async function extractSecrets(
  schoolId: string,
  key: StateKey,
  value: any,
  writer: { role?: string; dev?: boolean; migration?: boolean },
): Promise<any> {
  const canStore = writer.migration || writer.role === 'admin';
  // Passwords set by an admin for someone else are temporary; migrated ones are kept as-is.
  const temporary = !writer.migration;

  if (key === 'app_employees') {
    const out = [];
    for (const e of asArray(value)) {
      if (!isObj(e)) continue;
      if (canStore && e.id && meaningfulPassword(e.password)) {
        await setCredential(schoolId, 'teacher', String(e.id), e.password.trim(), temporary);
      }
      out.push(omit(e, ['password']));
    }
    return out;
  }

  if (key === 'app_students') {
    const out = [];
    for (const s of asArray(value)) {
      if (!isObj(s)) continue;
      if (canStore && s.id && meaningfulPassword(s.parentPassword)) {
        await setCredential(schoolId, 'parent', String(s.id), s.parentPassword.trim(), temporary);
      }
      out.push(omit(s, ['parentPassword']));
    }
    return out;
  }

  if (key === 'app_settings' && isObj(value)) {
    if (canStore) {
      if (meaningfulPassword(value.adminPassword)) {
        const pw = value.adminPassword.trim();
        if (!writer.migration) {
          const err = validateNewPassword(pw);
          if (err) throw new PolicyError(`كلمة مرور المدير: ${err}`, 400);
        }
        await setCredential(schoolId, 'admin', 'admin', pw, false);
      }
      if (meaningfulPassword(value.defaultTeacherPassword)) {
        await setCredential(schoolId, 'default', 'teacher', value.defaultTeacherPassword.trim(), true);
      }
      if (meaningfulPassword(value.defaultParentPassword)) {
        await setCredential(schoolId, 'default', 'parent', value.defaultParentPassword.trim(), true);
      }
      if (meaningfulPassword(value.developerPassword) && (writer.dev || writer.migration)) {
        const pw = value.developerPassword.trim();
        if (!writer.migration) {
          const err = validateNewPassword(pw);
          if (err) throw new PolicyError(`كلمة مرور المطوّر: ${err}`, 400);
        }
        await setCredential(PLATFORM_SCOPE, 'developer', 'developer', pw, false);
      }
    }
    return omit(value, SETTINGS_SECRET_FIELDS);
  }

  return value;
}

/** Always-on stripping for the read path (defence in depth). */
function stripSecrets(key: StateKey, value: any): any {
  if (key === 'app_employees') return asArray(value).map(e => (isObj(e) ? omit(e, ['password']) : e));
  if (key === 'app_students') return asArray(value).map(s => (isObj(s) ? omit(s, ['parentPassword']) : s));
  if (key === 'app_settings' && isObj(value)) return omit(value, SETTINGS_SECRET_FIELDS);
  return value;
}

// ─── Read policy ────────────────────────────────────────────────────────────

const involves = (m: any, uid: string) => isObj(m) && (m.senderId === uid || m.receiverId === uid);

export function filterForReader(key: StateKey, raw: any, auth: AuthClaims | undefined): { include: boolean; value?: any } {
  const value = stripSecrets(key, raw);

  if (!auth) return PUBLIC_KEYS.includes(key) ? { include: true, value } : { include: false };
  if (auth.role === 'admin') return { include: true, value };
  if (ADMIN_ONLY_KEYS.includes(key)) return { include: false };

  if (auth.role === 'teacher') {
    switch (key) {
      case 'app_employees':
        return { include: true, value: asArray(value).map(e => (e?.id === auth.uid ? e : pick(e, PUBLIC_EMPLOYEE_FIELDS))) };
      case 'app_messages':
        return { include: true, value: asArray(value).filter(m => involves(m, auth.uid)) };
      default:
        return { include: true, value };
    }
  }

  // parent
  switch (key) {
    case 'app_students':
      return { include: true, value: asArray(value).filter(s => s?.id === auth.studentId) };
    case 'app_employees':
      return { include: true, value: asArray(value).map(e => pick(e, PUBLIC_EMPLOYEE_FIELDS)) };
    case 'app_messages':
      return { include: true, value: asArray(value).filter(m => involves(m, auth.uid)) };
    case 'app_transport_subs':
      return { include: true, value: asArray(value).filter(t => t?.studentId === auth.studentId) };
    case 'app_certificates':
      return {
        include: true,
        value: asArray(value).filter(c => c?.recipientId === auth.studentId || c?.recipientId === auth.uid),
      };
    case 'app_honor_weights':
    case 'app_grad_tasks':
    case 'app_annual_plan':
      return { include: false };
    default:
      return { include: true, value };
  }
}

// ─── Write policy ───────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 5000;

function mergeMessages(existing: any[], incoming: any[], uid: string): any[] {
  const known = new Map(existing.filter(isObj).map(m => [String(m.id), m]));
  const result = existing.map(m => {
    if (!isObj(m) || m.receiverId !== uid) return m;
    const inc = incoming.find(i => isObj(i) && String(i.id) === String(m.id));
    return inc && inc.read === true ? { ...m, read: true } : m;
  });
  for (const m of incoming) {
    if (!isObj(m) || !m.id || known.has(String(m.id))) continue;
    if (m.senderId !== uid) throw new PolicyError('لا يمكنك إرسال رسالة باسم مستخدم آخر');
    if (typeof m.body !== 'string' || m.body.length > MAX_MESSAGE_LENGTH) throw new PolicyError('نص الرسالة غير صالح', 400);
    result.push({
      id: String(m.id),
      senderId: uid,
      senderName: String(m.senderName ?? '').slice(0, 200),
      receiverId: String(m.receiverId ?? ''),
      body: m.body,
      date: String(m.date ?? new Date().toISOString()),
      read: false,
    });
  }
  return result;
}

/** Keeps other people's items untouched; replaces the writer's own items with the incoming ones. */
function mergeOwned(existing: any[], incoming: any[], owns: (item: any) => boolean): any[] {
  const others = existing.filter(i => !owns(i));
  const mine = incoming.filter(i => isObj(i) && owns(i));
  return [...others, ...mine];
}

/**
 * Computes the value to persist for a write, enforcing what each role may change.
 * `incoming` has already had its secrets extracted.
 */
export async function applyWritePolicy(
  schoolId: string, key: StateKey, incoming: any, auth: AuthClaims,
): Promise<any> {
  if (auth.role === 'admin') return incoming;

  const existing = asArray(await getValue(schoolId, key));

  if (auth.role === 'teacher') {
    switch (key) {
      case 'app_students': {
        const inc = asArray(incoming);
        return existing.map(old => {
          const upd = inc.find(s => isObj(s) && s.id === old?.id);
          return upd ? { ...old, ...pick(upd, TEACHER_STUDENT_FIELDS) } : old;
        });
      }
      case 'app_employees': {
        const mine = asArray(incoming).find(e => isObj(e) && e.id === auth.uid);
        return existing.map(old => (old?.id === auth.uid && mine ? { ...old, ...pick(mine, TEACHER_SELF_FIELDS) } : old));
      }
      case 'app_messages':
        return mergeMessages(existing, asArray(incoming), auth.uid);
      case 'app_certificates':
        return mergeOwned(existing, asArray(incoming), c => isObj(c) && c.issuedById === auth.uid);
      case 'app_schedule':
        return incoming;
      default:
        throw new PolicyError('لا تملك صلاحية تعديل هذه البيانات');
    }
  }

  // parent
  switch (key) {
    case 'app_messages':
      return mergeMessages(existing, asArray(incoming), auth.uid);
    case 'app_transport_subs':
      return mergeOwned(existing, asArray(incoming), t => isObj(t) && t.studentId === auth.studentId);
    default:
      throw new PolicyError('لا تملك صلاحية تعديل هذه البيانات');
  }
}

/** Removes credentials for employees/students deleted by an admin. */
export async function cleanupRemovedAccounts(schoolId: string, key: StateKey, before: any, after: any) {
  if (key !== 'app_employees' && key !== 'app_students') return;
  const keep = new Set(asArray(after).map(i => String(i?.id)));
  for (const i of asArray(before)) {
    const id = String(i?.id);
    if (!keep.has(id)) await deleteCredential(schoolId, key === 'app_employees' ? 'teacher' : 'parent', id);
  }
}
