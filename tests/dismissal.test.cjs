const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function loadTS(relative, mocks = {}, globals = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: relative,
    reportDiagnostics: true,
  });
  assert.equal((output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  const requireMock = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Unexpected dependency: ${id}`);
  };
  vm.runInNewContext('(function(require,module,exports){' + output.outputText + '\n})', {
    Buffer, URL, console: { log() {}, warn() {}, error() {} }, ...globals,
  }, { filename: relative })(requireMock, module, module.exports);
  return module.exports;
}

function harness() {
  const routes = {};
  const middleware = [];
  const router = { use: fn => middleware.push(fn) };
  for (const verb of ['get', 'post']) router[verb] = (route, handler) => { routes[`${verb} ${route}`] = handler; };
  return {
    express: { Router: () => router },
    async dispatch(verb, route, req) {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
      };
      for (const fn of middleware) {
        let continued = false;
        await fn(req, res, () => { continued = true; });
        if (!continued) return res;
      }
      await routes[`${verb} ${route}`](req, res);
      return res;
    },
  };
}

test('receiver validation requires bounded receiver and relationship values and explicit acknowledgement', () => {
  const { validateReceiverDetails } = loadTS('lib/dismissal.ts', {
    'expo/fetch': { fetch: global.fetch },
    './query-client': { makeApiUrl() {} },
  });
  assert.equal(validateReceiverDetails({ receiverName: 'أمينة', receiverRelationship: 'الأم', confirmedAuthorizedPickup: true }), null);
  for (const input of [
    { receiverName: '', receiverRelationship: 'الأم', confirmedAuthorizedPickup: true },
    { receiverName: 'أ', receiverRelationship: 'الأم', confirmedAuthorizedPickup: true },
    { receiverName: 'اسم'.repeat(50), receiverRelationship: 'الأم', confirmedAuthorizedPickup: true },
    { receiverName: 'أمينة', receiverRelationship: 'الأم', confirmedAuthorizedPickup: false },
    null,
  ]) assert.ok(validateReceiverDetails(input));
});

test('school date keys respect timezone date boundaries', () => {
  const { dateKeyAt } = loadTS('lib/dismissal.ts', {
    'expo/fetch': { fetch: global.fetch },
    './query-client': { makeApiUrl() {} },
  });
  assert.equal(dateKeyAt(new Date('2026-01-01T00:30:00.000Z'), 'Asia/Riyadh'), '2026-01-01');
  assert.equal(dateKeyAt(new Date('2026-01-01T21:30:00.000Z'), 'Asia/Riyadh'), '2026-01-02');
  assert.equal(dateKeyAt(new Date('2026-03-08T23:30:00.000Z'), 'America/Los_Angeles'), '2026-03-08');
});

test('dismissal endpoints are admin-only and require explicit legacy single-school opt-in', async () => {
  for (const [user, expected] of [[undefined, 401], [{ role: 'parent' }, 403], [{ role: 'teacher' }, 403]]) {
    const h = harness();
    loadTS('server/dismissal-routes.ts', {
      express: h.express,
      './db': { default: { query: async () => { throw new Error('must not query'); } }, __esModule: true },
    }, { process: { env: { DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true' } } });
    const res = await h.dispatch('get', '/students', { session: { user } });
    assert.equal(res.statusCode, expected);
  }
  const h = harness();
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': { default: { query: async () => { throw new Error('must not query'); } }, __esModule: true },
  }, { process: { env: {} } });
  const res = await h.dispatch('get', '/students', { session: { user: { role: 'admin' } } });
  assert.equal(res.statusCode, 503);
});

test('checkout validates acknowledgement and records actor from session, not request body', async () => {
  const h = harness();
  const calls = [];
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': {
      default: { query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('SELECT EXISTS')) return { rows: [{ exists: true }] };
        return { rows: [{
          id: 7, student_id: 's-1', school_date: '2026-02-10',
          dismissed_at: '2026-02-10T10:00:00Z', receiver_name: 'ولي', receiver_relationship: 'الأم', actor_name: 'مديرة',
        }] };
      } }, __esModule: true,
    },
  }, { process: { env: { DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true', DISMISSAL_TIME_ZONE: 'Asia/Riyadh' } } });
  const invalid = await h.dispatch('post', '/:studentId/checkout', {
    session: { user: { id: 9, full_name: 'مديرة', role: 'admin' } },
    params: { studentId: 's-1' },
    body: { receiverName: 'ولي', receiverRelationship: 'الأم', confirmedAuthorizedPickup: false },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const valid = await h.dispatch('post', '/:studentId/checkout', {
    session: { user: { id: 9, full_name: 'مديرة', role: 'admin' } },
    params: { studentId: 's-1' },
    body: { receiverName: 'ولي', receiverRelationship: 'الأم', confirmedAuthorizedPickup: true, actorId: 1, schoolId: 'other' },
  });
  assert.equal(valid.statusCode, 201);
  assert.equal(valid.body.dismissal.actorName, 'مديرة');
  assert.match(calls[1].sql, /ON CONFLICT \(school_id, student_id, school_date\) DO NOTHING/);
  assert.equal(calls[1].params[4], 9);
  assert.equal(calls[1].params[1], 'Asia/Riyadh');
  assert.equal(calls[1].params.includes('other'), false);
  assert.equal(calls[1].params[6], 'ahbabullah');
});

test('checkout returns conflict when atomic unique insert rejects a duplicate', async () => {
  const h = harness();
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': {
      default: { query: async sql => sql.includes('SELECT EXISTS') ? { rows: [{ exists: true }] } : { rows: [] } },
      __esModule: true,
    },
  }, { process: { env: { DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true' } } });
  const res = await h.dispatch('post', '/:studentId/checkout', {
    session: { user: { id: 1, full_name: 'مدير', role: 'admin' } },
    params: { studentId: 's-1' },
    body: { receiverName: 'ولي', receiverRelationship: 'الأم', confirmedAuthorizedPickup: true },
  });
  assert.equal(res.statusCode, 409);
});

test('checkout rejects identifiers absent from server-side student roster', async () => {
  const h = harness();
  let queries = 0;
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': { default: { query: async () => { queries++; return { rows: [{ exists: false }] }; } }, __esModule: true },
  }, { process: { env: { DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true' } } });
  const res = await h.dispatch('post', '/:studentId/checkout', {
    session: { user: { id: 1, full_name: 'مدير', role: 'admin' } },
    params: { studentId: 'forged' },
    body: { receiverName: 'ولي', receiverRelationship: 'الأم', confirmedAuthorizedPickup: true },
  });
  assert.equal(queries, 1);
  assert.equal(res.statusCode, 404);
});

test('roster API returns only a minimal student summary, never parent or health details', async () => {
  const h = harness();
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': {
      default: { query: async () => ({ rows: [{ value: [{
        id: 's-1', name: 'طفل', level: 'براعم', parentPhone: 'private', nationalId: 'private', notes: 'private',
      }] }] }) },
      __esModule: true,
    },
  }, { process: { env: { DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true' } } });
  const res = await h.dispatch('get', '/students', { session: { user: { id: 1, role: 'admin' } } });
  assert.deepEqual(JSON.parse(JSON.stringify(res.body.students)), [{ id: 's-1', name: 'طفل', level: 'براعم' }]);
});

test('database unique constraint persists one checkout per server-calculated school day', () => {
  const sql = fs.readFileSync(path.join(root, 'server/dismissal-schema.sql'), 'utf8');
  assert.match(sql, /UNIQUE \(school_id, student_id, school_date\)/);
  const route = fs.readFileSync(path.join(root, 'server/dismissal-routes.ts'), 'utf8');
  assert.match(route, /\(NOW\(\) AT TIME ZONE \$2\)::date/);
  assert.match(route, /SELECT NOW\(\) AS dismissed_at/);
  assert.match(route, /to_char\(c\.school_date, 'YYYY-MM-DD'\) AS current_school_date/);
});

test('today keeps the database school-date string without host timezone conversion', async () => {
  const h = harness();
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': { default: { query: async () => ({ rows: [{ current_school_date: '2026-01-02', id: null }] }) }, __esModule: true },
  }, { process: { env: { DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true', DISMISSAL_TIME_ZONE: 'Asia/Riyadh' } } });
  const res = await h.dispatch('get', '/today', { session: { user: { role: 'admin' } } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.today.schoolDate, '2026-01-02');
  assert.equal(res.body.today.dismissals.length, 0);
});

test('today scope comes from server instance configuration, not caller-selected school', async () => {
  const h = harness();
  let params;
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': { default: { query: async (_sql, values) => {
      params = values;
      return { rows: [{ current_school_date: '2026-01-02', id: null }] };
    } }, __esModule: true },
  }, { process: { env: {
    DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true',
    DISMISSAL_SCHOOL_ID: 'ahbabullah',
    DISMISSAL_TIME_ZONE: 'Africa/Khartoum',
  } } });
  const res = await h.dispatch('get', '/today', {
    session: { user: { role: 'admin' } },
    query: { schoolId: 'other' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(params[1], 'ahbabullah');
  assert.equal(params.includes('other'), false);
});

test('invalid server school identifier fails closed before any data query', async () => {
  const h = harness();
  let queried = false;
  loadTS('server/dismissal-routes.ts', {
    express: h.express,
    './db': { default: { query: async () => { queried = true; return { rows: [] }; } }, __esModule: true },
  }, { process: { env: {
    DISMISSAL_LEGACY_SINGLE_SCHOOL: 'true',
    DISMISSAL_SCHOOL_ID: '../unverified',
  } } });
  const res = await h.dispatch('get', '/students', { session: { user: { role: 'admin' } } });
  assert.equal(res.statusCode, 503);
  assert.equal(queried, false);
});
