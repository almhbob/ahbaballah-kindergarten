/**
 * End-to-end security tests for the API server.
 *
 * Requires a disposable PostgreSQL database:
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres npm run test:server
 *
 * The test seeds a *legacy* (pre-hardening) database containing plaintext
 * passwords, boots the real server, and verifies migration + access control.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { Pool } from 'pg';

const DB_URL = process.env.TEST_DATABASE_URL;
const PORT = 5000 + Math.floor(Math.random() * 2000) + 1000;
const BASE = `http://127.0.0.1:${PORT}`;
const skip = !DB_URL ? 'TEST_DATABASE_URL not set' : false;

let server: ChildProcess | undefined;
let pool: Pool;

async function api(route: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(BASE + route, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

const login = (role: string, credential: string, password: string, schoolId = 'ahbabullah') =>
  api('/api/auth/login', { method: 'POST', body: { role, credential, password, schoolId } });

before(async () => {
  if (skip) return;
  pool = new Pool({ connectionString: DB_URL });
  await pool.query(`
    DROP TABLE IF EXISTS app_state, school_state, credentials, schema_migrations, users, reviews, files, school_requests CASCADE;
    CREATE TABLE app_state (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT NOW());
    CREATE TABLE files (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, role TEXT NOT NULL, file_name TEXT NOT NULL,
      file_path TEXT NOT NULL, mime_type TEXT, size_bytes BIGINT, public_url TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW());
  `);
  const seed: Record<string, unknown> = {
    app_settings: { adminPassword: '1234', developerPassword: 'dev@2026', guestAccessEnabled: true },
    app_employees: [
      { id: 'e1', name: 'Noura', email: 'noura@x.edu', password: 'secret99', salary: 6500, daysPresent: 1 },
      { id: 'e2', name: 'Haya', email: 'haya@x.edu', password: '1234', salary: 6000, daysPresent: 2 },
    ],
    app_students: [
      { id: 's1', name: 'Kid1', parentName: 'P1', parentPhone: '+249 111', parentPassword: '1234', notes: '', attendance: 90 },
      { id: 's2', name: 'Kid2', parentName: 'P2', parentPhone: '+249222', parentPassword: 'pp5555x', notes: '', attendance: 80 },
    ],
    app_messages: [
      { id: 'm1', senderId: 'parent_s1', senderName: 'P1', receiverId: 'admin', body: 'private 1', date: 'd', read: false },
      { id: 'm2', senderId: 'parent_s2', senderName: 'P2', receiverId: 'admin', body: 'private 2', date: 'd', read: false },
    ],
    app_inbox: [{ id: 'i1', body: 'admin only' }],
    app_news: [{ id: 'n1', title: 'public news' }],
  };
  for (const [k, v] of Object.entries(seed)) {
    await pool.query('INSERT INTO app_state (key, value) VALUES ($1, $2::jsonb)', [k, JSON.stringify(v)]);
  }

  const root = path.resolve(__dirname, '..', '..');
  server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: root,
    env: {
      ...process.env, PORT: String(PORT), DATABASE_URL: DB_URL, NODE_ENV: 'test',
      SESSION_SECRET: 'x'.repeat(48), ADMIN_INITIAL_PASSWORD: '', DEVELOPER_PASSWORD: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout?.on('data', d => { output += d; });
  server.stderr?.on('data', d => { output += d; });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) return; } catch { /* starting */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('server did not start:\n' + output);
});

after(async () => {
  server?.kill();
  await pool?.end();
});

const PLAINTEXT = ['secret99', 'pp5555x', 'dev@2026'];

test('legacy plaintext passwords are migrated out of the state', { skip }, async () => {
  const { rows } = await pool.query('SELECT value::text AS v FROM school_state');
  const all = rows.map(r => r.v).join('\n');
  for (const p of PLAINTEXT) assert.ok(!all.includes(p), `school_state still contains ${p}`);
  assert.ok(!/"(parentPassword|adminPassword|developerPassword|password)"/.test(all), 'password fields remain');
  const legacy = await pool.query(`SELECT value::text AS v FROM app_state`);
  for (const p of PLAINTEXT) assert.ok(!legacy.rows.map(r => r.v).join().includes(p), `app_state still contains ${p}`);
  const creds = await pool.query('SELECT password_hash FROM credentials');
  assert.ok(creds.rowCount! >= 2);
  for (const c of creds.rows) assert.match(c.password_hash, /^\$2[aby]\$/);
});

test('anonymous users only see public keys and cannot write', { skip }, async () => {
  const r = await api('/api/state?school=ahbabullah');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.data.app_news, [{ id: 'n1', title: 'public news' }]);
  for (const k of ['app_students', 'app_employees', 'app_messages', 'app_inbox']) assert.equal(r.json.data[k], undefined, k);
  for (const p of PLAINTEXT) assert.ok(!r.text.includes(p));
  assert.equal((await api('/api/state/app_students', { method: 'PUT', body: { value: [] } })).status, 401);
  assert.equal((await api('/api/state/app_students', { method: 'DELETE' })).status, 401);
  assert.equal((await api('/api/school-requests')).status, 401);
  assert.equal((await api('/api/reviews/all')).status, 401);
  assert.equal((await api('/api/push/broadcast', { method: 'POST', body: { tokens: [] } })).status, 401);
  assert.equal((await api('/api/setup/google-play-key', { method: 'POST', body: { key: '{}' } })).status, 404);
});

test('forged or tampered tokens are rejected', { skip }, async () => {
  const fake = Buffer.from(JSON.stringify({ uid: 'admin_1', role: 'admin', schoolId: 'ahbabullah', name: 'x', exp: 9e9 })).toString('base64url');
  assert.equal((await api('/api/auth/me', { token: `${fake}.invalidsig` })).status, 401);
});

test('admin: legacy default password forces a password change', { skip }, async () => {
  assert.equal((await login('admin', 'someone@else.com', '1234')).status, 401, 'arbitrary credential must not map to admin');
  assert.equal((await login('admin', 'admin', 'wrong')).status, 401);
  const r = await login('admin', 'admin', '1234');
  assert.equal(r.status, 200);
  assert.equal(r.json.mustChangePassword, true);
  // The restricted token can't read private data…
  const st = await api('/api/state', { token: r.json.token });
  assert.equal(st.json.data.app_students, undefined);
  // …and must pick a strong password.
  const weak = await api('/api/auth/change-password', { method: 'POST', token: r.json.token, body: { currentPassword: '1234', newPassword: '123456' } });
  assert.equal(weak.status, 400);
  const ok = await api('/api/auth/change-password', { method: 'POST', token: r.json.token, body: { currentPassword: '1234', newPassword: 'Str0ng-Admin!' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  // Old default no longer works.
  assert.equal((await login('admin', 'admin', '1234')).status, 401);
  const full = await login('admin', 'admin', 'Str0ng-Admin!');
  assert.equal(full.json.mustChangePassword, false);
  const data = await api('/api/state', { token: full.json.token });
  assert.equal(data.json.data.app_students.length, 2);
  assert.equal(data.json.data.app_inbox.length, 1);
  for (const p of PLAINTEXT) assert.ok(!data.text.includes(p));
  assert.ok(!data.text.includes('parentPassword'));
});

test('admin-issued passwords are hashed, stripped and temporary', { skip }, async () => {
  const { json } = await login('admin', 'admin', 'Str0ng-Admin!');
  const token = json.token;
  const st = await api('/api/state', { token });
  const employees = st.json.data.app_employees.map((e: any) => (e.id === 'e2' ? { ...e, password: 'TempPass77' } : e));
  const put = await api('/api/state/app_employees', { method: 'PUT', token, body: { value: employees } });
  assert.equal(put.status, 200);
  assert.ok(!put.text.includes('TempPass77'));
  const raw = await pool.query(`SELECT value::text AS v FROM school_state WHERE key = 'app_employees'`);
  assert.ok(!raw.rows[0].v.includes('TempPass77'));
  const t = await login('teacher', 'haya@x.edu', 'TempPass77');
  assert.equal(t.status, 200);
  assert.equal(t.json.mustChangePassword, true);
});

test('teacher: limited view and limited writes', { skip }, async () => {
  const r = await login('teacher', 'NOURA@x.edu', 'secret99');
  assert.equal(r.status, 200);
  assert.equal(r.json.mustChangePassword, false);
  const token = r.json.token;
  const st = await api('/api/state', { token });
  assert.equal(st.json.data.app_inbox, undefined, 'inbox is admin-only');
  const other = st.json.data.app_employees.find((e: any) => e.id === 'e2');
  assert.equal(other.salary, undefined, 'colleague salary hidden');
  assert.equal(st.json.data.app_messages.length, 0, 'other people\'s messages hidden');

  // Tries to give a colleague a raise and change a parent's phone: ignored.
  const emps = st.json.data.app_employees.map((e: any) => ({ ...e, salary: 99999, daysPresent: 5 }));
  await api('/api/state/app_employees', { method: 'PUT', token, body: { value: emps } });
  const studs = st.json.data.app_students.map((s: any) => ({ ...s, parentPhone: '+000', attendance: 50 }));
  await api('/api/state/app_students', { method: 'PUT', token, body: { value: studs } });
  const raw = await pool.query(`SELECT key, value FROM school_state WHERE key IN ('app_employees','app_students')`);
  const byKey = Object.fromEntries(raw.rows.map(x => [x.key, x.value]));
  assert.equal(byKey.app_employees.find((e: any) => e.id === 'e2').salary, 6000);
  assert.equal(byKey.app_employees.find((e: any) => e.id === 'e1').daysPresent, 5, 'own attendance is writable');
  assert.equal(byKey.app_students[0].parentPhone, '+249 111');
  assert.equal(byKey.app_students[0].attendance, 50, 'teacher can record attendance');

  assert.equal((await api('/api/state/app_settings', { method: 'PUT', token, body: { value: {} } })).status, 403);
  assert.equal((await api('/api/state/app_news', { method: 'DELETE', token })).status, 403);
});

test('parent: sees only own child and messages, cannot impersonate', { skip }, async () => {
  const r = await login('parent', '+249222', 'pp5555x');
  assert.equal(r.status, 200);
  const token = r.json.token;
  const st = await api('/api/state', { token });
  assert.deepEqual(st.json.data.app_students.map((s: any) => s.id), ['s2']);
  assert.deepEqual(st.json.data.app_messages.map((m: any) => m.id), ['m2']);
  assert.ok(!st.text.includes('private 1'));
  assert.equal(st.json.data.app_employees[0].salary, undefined);

  assert.equal((await api('/api/state/app_students', { method: 'PUT', token, body: { value: [] } })).status, 403);
  const spoof = await api('/api/state/app_messages', {
    method: 'PUT', token,
    body: { value: [{ id: 'm9', senderId: 'parent_s1', receiverId: 'admin', body: 'spoof' }] },
  });
  assert.equal(spoof.status, 403);
  // Sending its own message keeps everybody else's messages intact.
  const send = await api('/api/state/app_messages', {
    method: 'PUT', token,
    body: { value: [{ id: 'm10', senderId: 'parent_s2', senderName: 'P2', receiverId: 'admin', body: 'hello' }] },
  });
  assert.equal(send.status, 200);
  const raw = await pool.query(`SELECT value FROM school_state WHERE key = 'app_messages'`);
  assert.deepEqual(raw.rows[0].value.map((m: any) => m.id).sort(), ['m1', 'm10', 'm2']);
});

test('parent activation requires the temporary password', { skip }, async () => {
  const bad = await api('/api/auth/activate', { method: 'POST', body: { role: 'parent', credential: '+249111', tempPassword: 'guess', newPassword: 'MyNewPass1' } });
  assert.equal(bad.status, 401);
  const ok = await api('/api/auth/activate', { method: 'POST', body: { role: 'parent', credential: '+249111', tempPassword: '1234', newPassword: 'MyNewPass1' } });
  assert.equal(ok.status, 200);
  assert.equal((await login('parent', '+249111', '1234')).status, 401);
  assert.equal((await login('parent', '+249111', 'MyNewPass1')).status, 200);
});

test('developer panel requires server-side developer elevation', { skip }, async () => {
  const { json } = await login('admin', 'admin', 'Str0ng-Admin!');
  assert.equal((await api('/api/school-requests', { token: json.token })).status, 403);
  assert.equal((await api('/api/auth/developer-unlock', { method: 'POST', token: json.token, body: { password: 'nope' } })).status, 401);
  const dev = await api('/api/auth/developer-unlock', { method: 'POST', token: json.token, body: { password: 'dev@2026' } });
  assert.equal(dev.status, 200);
  assert.equal(dev.json.mustChangePassword, true);
  assert.equal((await api('/api/school-requests', { token: dev.json.token })).status, 200);
  const set = await api('/api/auth/developer-password', { method: 'POST', token: dev.json.token, body: { newPassword: 'Dev-Strong-2026' } });
  assert.equal(set.status, 200);
  const old = await api('/api/auth/developer-unlock', { method: 'POST', token: json.token, body: { password: 'dev@2026' } });
  assert.equal(old.status, 401);
});

test('schools are isolated from each other', { skip }, async () => {
  // The legacy admin default is never accepted for other schools.
  assert.equal((await login('admin', 'admin', '1234', 'school_other')).status, 401);
  assert.equal((await login('parent', '+249222', 'pp5555x', 'school_other')).status, 401);
  const anon = await api('/api/state?school=school_other');
  assert.deepEqual(anon.json.data, {});
});

test('brute-force login attempts are rate limited', { skip }, async () => {
  let last = 0;
  for (let i = 0; i < 10; i++) last = (await login('teacher', 'noura@x.edu', `wrong${i}`)).status;
  assert.equal(last, 429);
});
