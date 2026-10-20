const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const ts = require('typescript');
const express = require('express');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

test('real PostgreSQL: sessions, revocation, enrollment receipts and shared abuse limits', {
  skip: process.env.RUN_PG_TESTS !== 'true' ? 'Set RUN_PG_TESTS=true with a dedicated local *_test database' : false,
}, async t => {
  const host = process.env.TEST_PG_HOST;
  const database = process.env.TEST_PG_DATABASE;
  assert.ok(host && (host.startsWith('/') || ['127.0.0.1', 'localhost'].includes(host)), 'Test database must be local');
  assert.match(database || '', /^[a-z0-9_]+_test$/, 'Refuse non-test database');
  const config = {
    host, database,
    port: Number(process.env.TEST_PG_PORT || 5432),
    user: process.env.TEST_PG_USER,
    password: process.env.TEST_PG_PASSWORD,
  };
  const schema = 'qa_' + randomUUID().replaceAll('-', '');
  const control = new Pool(config);
  await control.query(`CREATE SCHEMA "${schema}"`);
  const pool = new Pool({ ...config, options: `-c search_path=${schema}` });
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const requireModule = id => {
      if (id === './db') return { __esModule: true, default: pool };
      if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id + '.ts')));
      return require(id);
    };
    vm.runInNewContext('(function(require,module,exports){' + output + '\n})', {
      Buffer, URL, Date, setTimeout, clearTimeout, setInterval, clearInterval,
      process: { env: { NODE_ENV: 'test', ADMIN_EMAIL: 'qa@example.test', DISMISSAL_SCHOOL_ID: 'qa_school',
        DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true', DISMISSAL_TIME_ZONE: 'Africa/Khartoum' } },
      console: { log() {}, warn() {}, error() {} },
    }, { filename })(requireModule, module, module.exports);
    return module.exports;
  }
  const instances = [];
  const password = randomUUID() + randomUUID();
  let cookie;
  async function start() {
    const PgStore = connectPgSimple(session);
    const store = new PgStore({ pool, schemaName: schema, tableName: 'app_sessions', pruneSessionInterval: false });
    const app = express();
    app.use(express.json({ limit: '64kb' }));
    app.use(session({ store, name: 'school.sid', secret: 'test-session-' + schema,
      resave: false, saveUninitialized: false, cookie: { httpOnly: true, maxAge: 60_000 } }));
    app.use('/api', load('server/session-identity.ts').refreshSessionIdentity);
    app.use('/api/auth', load('server/auth-routes.ts').default);
    app.use('/api/enrollment-requests', load('server/enrollment-routes.ts').createEnrollmentRouter(pool));
    app.use('/api/dismissal', load('server/dismissal-routes.ts').default);
    app.use('/api/reviews', load('server/review-routes.ts').default);
    app.get('/api/qa-limit', load('server/abuse-limits.ts').createAbuseLimiter('qa-http', 2, 60_000, pool),
      (_req, res) => res.json({ ok: true }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const instance = {
      async request(route, method = 'GET', body, useCookie = true) {
        const res = await fetch(base + route, { method,
          headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(useCookie && cookie ? { Cookie: cookie } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie') };
      },
      async close() {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        store.close();
      },
    };
    instances.push(instance);
    return instance;
  }
  try {
    await pool.query(`CREATE TABLE users (
      id SERIAL PRIMARY KEY, full_name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT UNIQUE,
      role TEXT NOT NULL, password_hash TEXT NOT NULL, linked_id TEXT, created_at TIMESTAMP DEFAULT NOW()
    ); CREATE TABLE app_state (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(load('server/production-schema.ts').productionSchema);
    await pool.query(fs.readFileSync(path.resolve(__dirname, '../server/dismissal-schema.sql'), 'utf8'));
    await pool.query(`CREATE TABLE reviews(id SERIAL PRIMARY KEY, parent_name TEXT, child_name TEXT,
      content TEXT, rating INTEGER, approved BOOLEAN, created_at TIMESTAMPTZ DEFAULT NOW())`);
    // Re-running the additive migration must preserve existing records.
    await pool.query(load('server/production-schema.ts').productionSchema);
    const hash = await bcrypt.hash(password, 4);
    const inserted = await pool.query(
      'INSERT INTO users(full_name,email,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id',
      ['QA Admin', 'qa@example.test', 'admin', hash],
    );
    const adminId = inserted.rows[0].id;
    const one = await start();
    const input = {
      requestKey: 'qa_request_' + randomUUID().replaceAll('-', ''),
      childName: 'طفل اختباري', birthDate: '2021-03-15', gender: 'ذكر', requestedLevel: 'براعم',
      parentName: 'ولي أمر اختباري', parentPhone: '+249000000000', parentRelation: 'الأب',
    };
    await t.test('public registration cannot claim a child/teacher identity', async () => {
      const result = await one.request('/api/auth/register', 'POST', {
        full_name: 'QA Parent', role: 'parent', phone: '+249000000000', password, linked_id: 'student_other',
      }, false);
      assert.equal(result.status, 403);
      assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count, 1);
    });
    await t.test('server login persists rotated session and exposes no password hash', async () => {
      const result = await one.request('/api/auth/login', 'POST', {
        role: 'admin', credential: 'qa@example.test', password,
      }, false);
      assert.equal(result.status, 200);
      assert.equal(result.body.user.disabled, false);
      assert.equal(result.body.user.password_hash, undefined);
      assert.match(result.cookie, /^school\.sid=/);
      cookie = result.cookie.split(';')[0];
      assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM app_sessions')).rows[0].count, 1);
    });
    let two;
    await t.test('a second app instance accepts the same persistent database session', async () => {
      two = await start();
      const result = await two.request('/api/auth/me');
      assert.equal(result.status, 200);
      assert.equal(result.body.user.id, adminId);
    });
    await t.test('server-approved accounts retain the admin session and derive teacher class from its linked roster', async () => {
      await pool.query('INSERT INTO app_state(key,value) VALUES ($1,$2::jsonb),($3,$4::jsonb)', [
        'app_students', JSON.stringify([{ id: 'qa_student', name: 'QA Child', level: 'براعم' }]),
        'app_employees', JSON.stringify([{ id: 'qa_teacher', name: 'QA Teacher', level: 'براعم' }]),
      ]);
      const created = await one.request('/api/auth/register', 'POST', {
        full_name: 'QA Teacher', email: 'teacher@example.test', role: 'teacher', password, linked_id: 'qa_teacher',
      });
      assert.equal(created.status, 200);
      assert.equal((await one.request('/api/auth/me')).body.user.role, 'admin');
      const logged = await one.request('/api/auth/login', 'POST', {
        role: 'teacher', credential: 'teacher@example.test', password,
      }, false);
      assert.equal(logged.status, 200);
      assert.equal(logged.body.user.linked_id, 'qa_teacher');
      assert.equal(logged.body.user.teacher_class, 'براعم');
      assert.equal(logged.body.user.disabled, false);
    });
    await t.test('real dismissal concurrency records exactly one checkout with server actor and school scope', async () => {
      const attempts = await Promise.all(Array.from({ length: 10 }, () => one.request(
        '/api/dismissal/qa_student/checkout', 'POST', {
          receiverName: 'مستلم اختباري', receiverRelationship: 'الأب', confirmedAuthorizedPickup: true,
          actorId: 'forged', schoolId: 'forged',
        })));
      assert.equal(attempts.filter(result => result.status === 201).length, 1);
      assert.equal(attempts.filter(result => result.status === 409).length, 9);
      const row = (await pool.query('SELECT * FROM student_dismissals')).rows[0];
      assert.equal(row.school_id, 'qa_school');
      assert.equal(Number(row.actor_user_id), adminId);
      assert.equal(row.authorized_pickup_confirmed, true);
      assert.equal((await one.request('/api/dismissal/students', 'GET', undefined, false)).status, 401);
    });
    await t.test('HTTP rate limiting returns 429 consistently across separate app instances', async () => {
      assert.equal((await one.request('/api/qa-limit')).status, 200);
      assert.equal((await two.request('/api/qa-limit')).status, 200);
      const limited = await one.request('/api/qa-limit');
      assert.equal(limited.status, 429);
      assert.equal(limited.body.ok, false);
    });
    await t.test('public reviews remain pending and moderation requires a server admin session', async () => {
      const submitted = await one.request('/api/reviews', 'POST', {
        parentName: 'QA Parent', childName: 'QA Child', content: 'رأي اختباري للمراجعة', rating: 5,
      }, false);
      assert.equal(submitted.status, 201);
      assert.equal(submitted.body.approved, false);
      assert.equal((await one.request('/api/reviews', 'GET', undefined, false)).body.length, 0);
      assert.equal((await one.request('/api/reviews/all', 'GET', undefined, false)).status, 401);
      assert.equal((await one.request('/api/reviews/' + submitted.body.id + '/approve', 'PATCH', {}, false)).status, 401);
      assert.equal((await one.request('/api/reviews/' + submitted.body.id, 'DELETE', undefined, false)).status, 401);
    });
    await t.test('anonymous list/update/delete cannot read or mutate private enrollment data', async () => {
      assert.equal((await one.request('/api/enrollment-requests', 'GET', undefined, false)).status, 401);
      assert.equal((await one.request('/api/enrollment-requests/missing', 'PATCH', { status: 'approved' }, false)).status, 401);
      assert.equal((await one.request('/api/enrollment-requests/missing', 'DELETE', undefined, false)).status, 401);
    });
    let receiptId;
    await t.test('concurrent retries return one durable receipt and one row', async () => {
      const results = await Promise.all(Array.from({ length: 12 }, () =>
        one.request('/api/enrollment-requests', 'POST', input, false)));
      for (const result of results) {
        assert.equal(result.status, 201);
        assert.ok(result.body.receipt.id);
        assert.ok(result.body.receipt.createdAt);
        assert.equal(result.body.requests, undefined);
      }
      receiptId = results[0].body.receipt.id;
      assert.equal(new Set(results.map(r => r.body.receipt.id)).size, 1);
      assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM enrollment_requests')).rows[0].count, 1);
      assert.equal((await two.request('/api/enrollment-requests')).body.requests[0].id, receiptId);
    });
    await t.test('changing data on an existing retry key returns conflict without overwriting', async () => {
      const result = await one.request('/api/enrollment-requests', 'POST', { ...input, childName: 'اسم آخر' }, false);
      assert.equal(result.status, 409);
      const row = (await pool.query('SELECT school_id, data FROM enrollment_requests WHERE id=$1', [receiptId])).rows[0];
      assert.equal(row.school_id, 'qa_school');
      assert.equal(row.data.childName, input.childName);
      assert.equal(row.data.status, 'pending');
    });
    await t.test('public body cannot supply status, actor, school, receipt ID or document URLs', async () => {
      for (const extra of [
        { school_id: 'another_school' }, { status: 'approved' }, { id: 'chosen' },
        { actor: 'admin' }, { documents: { birth: 'https://example.test/private.png' } },
      ]) {
        assert.equal((await one.request('/api/enrollment-requests', 'POST', { ...input, ...extra }, false)).status, 400);
      }
    });
    await t.test('approved status is durably saved and rejection clears approval metadata', async () => {
      const approved = await one.request('/api/enrollment-requests/' + receiptId, 'PATCH', { status: 'approved' });
      assert.equal(approved.status, 200);
      assert.equal(approved.body.request.status, 'approved');
      assert.ok(approved.body.request.approvedAt);
      const rejected = await two.request('/api/enrollment-requests/' + receiptId, 'PATCH',
        { status: 'rejected', rejectionReason: 'QA' });
      assert.equal(rejected.body.request.approvedAt, null);
      assert.equal(rejected.body.request.rejectionReason, 'QA');
    });
    await t.test('keyset pagination loses no rows with identical timestamps or microseconds', async () => {
      await pool.query('DELETE FROM enrollment_requests');
      await pool.query(`INSERT INTO enrollment_requests (id,school_id,request_key,request_hash,data,created_at)
        SELECT 'page_' || n, 'qa_school', 'page_key_' || n, 'hash', jsonb_build_object('id','page_' || n),
        TIMESTAMPTZ '2026-01-01T00:00:00.123456Z' FROM generate_series(1,205) AS n`);
      const first = await one.request('/api/enrollment-requests');
      assert.equal(first.body.requests.length, 200);
      assert.ok(first.body.nextCursor);
      const second = await one.request('/api/enrollment-requests?cursor=' + encodeURIComponent(first.body.nextCursor));
      assert.equal(second.body.requests.length, 5);
      assert.equal(second.body.nextCursor, null);
      assert.equal(new Set([...first.body.requests, ...second.body.requests].map(r => r.id)).size, 205);
      assert.equal((await one.request('/api/enrollment-requests?cursor=bad')).status, 400);
    });
    await t.test('atomic rate counters are shared across stores and restart correctly after expiry', async () => {
      const { PostgresLimitStore } = load('server/abuse-limits.ts');
      const a = new PostgresLimitStore('qa-limit', pool);
      const b = new PostgresLimitStore('qa-limit', pool);
      a.init({ windowMs: 60_000 }); b.init({ windowMs: 60_000 });
      const counts = await Promise.all(Array.from({ length: 20 }, (_, n) => (n % 2 ? a : b).increment('qa-ip')));
      assert.deepEqual(counts.map(r => r.totalHits).sort((x, y) => x - y), Array.from({ length: 20 }, (_, n) => n + 1));
      assert.equal((await b.increment('qa-ip')).totalHits, 21);
      const keys = await pool.query('SELECT key FROM request_limits');
      assert.ok(keys.rows.every(row => !row.key.includes('qa-ip')));
      await pool.query("UPDATE request_limits SET reset_at=NOW()-INTERVAL '1 second'");
      assert.equal((await a.increment('qa-ip')).totalHits, 1);
    });
    await t.test('legacy enrollment migration defaults to dry-run, is idempotent and never removes its source', async () => {
      const { migrateEnrollment } = require('../scripts/migrate-enrollment.cjs');
      const legacy = { ...input, id: 'legacy_qa', status: 'pending', createdAt: new Date().toISOString() };
      delete legacy.requestKey;
      await pool.query("INSERT INTO app_state(key,value) VALUES ('app_registration_requests',$1::jsonb)", [JSON.stringify([legacy])]);
      const dry = await migrateEnrollment(pool, { schoolId: 'qa_school' });
      assert.equal(dry.wouldImport, 1); assert.equal(dry.imported, 0);
      const first = await migrateEnrollment(pool, { schoolId: 'qa_school', apply: true });
      assert.equal(first.imported, 1);
      const repeated = await migrateEnrollment(pool, { schoolId: 'qa_school', apply: true });
      assert.equal(repeated.imported, 0); assert.equal(repeated.existing, 1);
      assert.equal((await pool.query("SELECT value FROM app_state WHERE key='app_registration_requests'")).rows[0].value.length, 1);
      assert.equal((await pool.query("SELECT data FROM enrollment_requests WHERE id='legacy_qa'")).rows[0].data.status, 'pending');
    });
    await t.test('unverified legacy links and disabled accounts cannot be restored', async () => {
      await pool.query("INSERT INTO users(full_name,phone,role,password_hash,linked_id) VALUES ('QA Parent','0000000000','parent',$1,'student_other')", [hash]);
      assert.equal((await one.request('/api/auth/login', 'POST', {
        role: 'parent', credential: '0000000000', password,
      }, false)).status, 403);
      await pool.query('UPDATE users SET disabled=TRUE WHERE id=$1', [adminId]);
      assert.equal((await two.request('/api/auth/me')).status, 401);
      await pool.query('UPDATE users SET disabled=FALSE WHERE id=$1', [adminId]);
      assert.equal((await one.request('/api/auth/me')).status, 401, 'revoked persistent session stays revoked');
    });
    await t.test('storage errors never produce a public success receipt or expose database details', async () => {
      const router = load('server/enrollment-routes.ts').createEnrollmentRouter({
        query: async () => { throw new Error('private-db-diagnostic'); },
      });
      const app = express(); app.use(express.json()); app.use(router);
      const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
      try {
        const res = await fetch('http://127.0.0.1:' + server.address().port, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
        });
        const body = await res.json();
        assert.equal(res.status, 503); assert.equal(body.ok, false); assert.equal(body.receipt, undefined);
        assert.ok(!JSON.stringify(body).includes('private-db-diagnostic'));
      } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    });
  } finally {
    for (const instance of instances) await instance.close();
    await pool.end();
    await control.query(`DROP SCHEMA "${schema}" CASCADE`);
    await control.end();
  }
});
