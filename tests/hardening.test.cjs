// Focused, dependency-isolated regression tests. Run: node --test tests/hardening.test.cjs
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
  vm.runInNewContext(
    '(function(require,module,exports){' + output.outputText + '\n})',
    { Buffer, URL, console: { log() {}, warn() {}, error() {} }, ...globals },
    { filename: relative },
  )(requireMock, module, module.exports);
  return module.exports;
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function routerHarness() {
  const routes = {};
  const middleware = [];
  const router = { use: fn => middleware.push(fn) };
  for (const verb of ['get', 'post', 'put', 'delete']) {
    router[verb] = (route, handler) => { routes[`${verb} ${route}`] = handler; };
  }
  return {
    express: { Router: () => router },
    async dispatch(verb, route, req) {
      const res = response();
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

const { resolveApiOrigin } = loadTS('lib/api-origin.ts');
const { allowedWebOrigins, isAllowedWebOrigin } = loadTS('server/request-security.ts');
test('production CORS accepts exact configured HTTPS origins, never arbitrary localhost', () => {
  const env = { NODE_ENV: 'production', PUBLIC_WEB_ORIGINS: 'https://school.example,http://localhost:8081', REPLIT_DOMAINS: 'api.example' };
  assert.equal(isAllowedWebOrigin('https://school.example', env), true);
  assert.equal(isAllowedWebOrigin('https://api.example', env), true);
  assert.equal(isAllowedWebOrigin('http://localhost:8081', env), false);
  assert.equal(isAllowedWebOrigin('https://school.example.attacker.test', env), false);
});
test('malformed origins, URL paths and credentials never enter the browser allowlist', () => {
  const env = { NODE_ENV: 'production', PUBLIC_WEB_ORIGINS: 'https://school.example/path,https://user:pass@school.example,null,https://valid.example/' };
  assert.equal(allowedWebOrigins(env).size, 0);
  assert.equal(isAllowedWebOrigin('null', env), false);
});
test('development loopback support does not accept lookalike hostnames', () => {
  const env = { NODE_ENV: 'development' };
  assert.equal(isAllowedWebOrigin('http://localhost:8081', env), true);
  assert.equal(isAllowedWebOrigin('http://127.0.0.1:5000', env), true);
  assert.equal(isAllowedWebOrigin('http://localhost.attacker.test:8081', env), false);
  assert.equal(isAllowedWebOrigin('http://localhost:8081/path', env), false);
});
test('browser-write origin guard is installed and CI no longer masks lint or doctor failures', () => {
  const server = fs.readFileSync(path.join(root, 'server/index.ts'), 'utf8');
  assert.match(server, /\['POST', 'PUT', 'PATCH', 'DELETE'\]/);
  assert.match(server, /req\.get\('sec-fetch-site'\) === 'cross-site'/);
  assert.ok(server.indexOf("app.use(session(") < server.indexOf('// Multipart uploads'));
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
  assert.match(workflow, /expo export --platform web/);
});
test('API origin supports bare domains, full HTTPS URLs, trailing slash and loopback ports', () => {
  for (const [input, expected] of [
    ['school.example', 'https://school.example'],
    [' https://school.example/ ', 'https://school.example'],
    ['localhost:5000', 'http://localhost:5000'],
    ['http://127.0.0.1:5000', 'http://127.0.0.1:5000'],
    ['[::1]:5000', 'http://[::1]:5000'],
    ['localhost.attacker.example', 'https://localhost.attacker.example'],
  ]) assert.equal(resolveApiOrigin(input), expected);
});
test('API origin rejects missing config, insecure remote hosts and non-origin URLs', () => {
  for (const value of [
    '', undefined, 'http://school.example', 'ftp://school.example',
    'https://school.example/api', 'https://school.example/?x=1',
    'https://school.example/#section', 'https://user:example@school.example',
  ]) assert.throws(() => resolveApiOrigin(value));
});
test('legacy URL helper returns an origin and cloud requests include session credentials', () => {
  const helper = fs.readFileSync(path.join(root, 'lib/query-client.ts'), 'utf8');
  assert.match(helper, /function getApiUrl\(\): string\s*\{\s*\/\/[^\n]*\n\s*return getApiOrigin\(\)/);
  const source = fs.readFileSync(path.join(root, 'contexts/AppDataContext.tsx'), 'utf8');
  assert.match(source, /method: 'PUT',\s*credentials: 'include'/);
  assert.match(source, /fetch\(url, \{ credentials: 'include' \}\)/);
  assert.match(source, /method: 'DELETE', credentials: 'include'/);
  assert.match(source, /\}, \[user\?\.id, user\?\.role\]\)/);
  const login = fs.readFileSync(path.join(root, 'app/login.tsx'), 'utf8');
  assert.ok(login.indexOf('const apiResult = await apiLogin(') < login.indexOf('await login(authUser);'));
});

for (const [verb, route] of [['get', '/'], ['put', '/:key'], ['delete', '/:key']]) {
  test(`state ${verb}: anonymous and non-admin requests never reach the database`, async () => {
    const harness = routerHarness();
    let queries = 0;
    const access = loadTS('server/access-control.ts');
    loadTS('server/state-routes.ts', {
      express: harness.express,
      './access-control': access,
      './db': { default: { query: async () => { queries++; return { rows: [] }; } }, __esModule: true },
    });
    for (const [user, status] of [[undefined, 401], [{ role: 'parent' }, 403], [{ role: 'teacher' }, 403]]) {
      const res = await harness.dispatch(verb, route, { session: { user } });
      assert.equal(res.statusCode, status);
    }
    assert.equal(queries, 0);
  });
  test(`state ${verb}: admin reaches the handler`, async () => {
    const harness = routerHarness();
    let queries = 0;
    loadTS('server/state-routes.ts', {
      express: harness.express,
      './access-control': loadTS('server/access-control.ts'),
      './db': { default: { query: async () => { queries++; return { rows: [] }; } }, __esModule: true },
    });
    const res = await harness.dispatch(verb, route, {
      session: { user: { role: 'admin' } }, params: { key: 'app_students' }, body: { value: [] },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(queries, 1);
  });
}
test('state database failures do not leak exception details', async () => {
  const harness = routerHarness();
  loadTS('server/state-routes.ts', {
    express: harness.express,
    './access-control': loadTS('server/access-control.ts'),
    './db': { default: { query: async () => { throw new Error('internal database diagnostic'); } }, __esModule: true },
  });
  const res = await harness.dispatch('get', '/', { session: { user: { role: 'admin' } } });
  assert.equal(res.statusCode, 500);
  assert.equal(JSON.stringify(res.body).includes('internal database diagnostic'), false);
});

function authHarness({ env = {}, rows = [], compare = true } = {}) {
  const harness = routerHarness();
  const queries = [];
  const database = { query: async (sql, params) => { queries.push({ sql, params }); return { rows }; } };
  const identity = loadTS('server/session-identity.ts', {
    './db': { __esModule: true, default: database },
  });
  const auth = loadTS('server/auth-routes.ts', {
    './session-identity': identity,
    express: harness.express,
    bcryptjs: { __esModule: true, default: { hash: async () => 'test-hash', compare: async () => compare } },
    './db': {
      __esModule: true,
      default: database,
    },
  }, { process: { env } });
  return { ...harness, auth, queries };
}

test('bootstrap does not create a default admin without explicit configuration', async () => {
  const h = authHarness();
  await h.auth.seedAdminAccount();
  assert.equal(h.queries.length, 0);
});
test('bootstrap refuses a too-short or overlong password', async () => {
  for (const password of ['short', 'a'.repeat(73)]) {
    const h = authHarness({ env: { ADMIN_EMAIL: 'admin@example.test', ADMIN_INITIAL_PASSWORD: password } });
    await h.auth.seedAdminAccount();
    assert.equal(h.queries.length, 0);
  }
});
test('bootstrap inserts only an explicitly configured admin and preserves existing accounts', async () => {
  const env = { ADMIN_EMAIL: 'admin@example.test', ADMIN_INITIAL_PASSWORD: 'a'.repeat(24) };
  const h = authHarness({ env });
  await h.auth.seedAdminAccount();
  assert.equal(h.queries.length, 2);
  assert.equal(h.queries[1].params[1], env.ADMIN_EMAIL);
  const existing = authHarness({ env, rows: [{ id: 1 }] });
  await existing.auth.seedAdminAccount();
  assert.equal(existing.queries.length, 1);
});
test('unknown admin credential is not retried against a default account', async () => {
  const h = authHarness();
  const res = await h.dispatch('post', '/login', {
    body: { role: 'admin', credential: 'unknown@example.test', password: 'test-password' },
  });
  assert.equal(res.statusCode, 401);
  assert.equal(h.queries.length, 1);
  assert.equal(h.queries[0].params[0], 'unknown@example.test');
});
test('successful login rotates and saves the session before returning', async () => {
  const h = authHarness({ rows: [{ id: 1, full_name: 'Test', email: 'admin@example.test', role: 'admin', password_hash: 'hash' }] });
  const events = [];
  const req = {
    body: { role: 'admin', credential: 'admin@example.test', password: 'test-password' },
    session: {
      regenerate(cb) { events.push('regenerate'); req.session = { save(cb) { events.push('save'); cb(); } }; cb(); },
    },
  };
  const res = await h.dispatch('post', '/login', req);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.role, 'admin');
  assert.deepEqual(events, ['regenerate', 'save']);
});
test('session rotation failure does not return a successful login', async () => {
  const h = authHarness({ rows: [{ id: 1, role: 'admin', password_hash: 'hash' }] });
  const res = await h.dispatch('post', '/login', {
    body: { role: 'admin', credential: 'admin@example.test', password: 'test-password' },
    session: { regenerate(cb) { cb(new Error('session store unavailable')); } },
  });
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.ok, false);
});
test('new registration rejects short passwords and overlong UTF-8 passwords', async () => {
  for (const password of ['short', 'ب'.repeat(37)]) {
    const h = authHarness();
    const res = await h.dispatch('post', '/register', {
      body: { full_name: 'Test', role: 'parent', phone: '123', password },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(h.queries.length, 0);
  }
});
test('branding stays off the primary tab bar and Android respects bottom insets', () => {
  const source = fs.readFileSync(path.join(root, 'app/(admin)/_layout.tsx'), 'utf8');
  assert.match(source, /name="branding"\s+options=\{\{ href: null \}\}/);
  assert.match(source, /60 \+ Math\.max\(insets\.bottom, 6\)/);
});

test('platform operations reject ordinary admins and unconfigured platform identity', () => {
  for (const [env, user, expected] of [
    [{}, undefined, 401],
    [{}, { role: 'admin', email: 'owner@example.test' }, 403],
    [{ ADMIN_EMAIL: 'owner@example.test' }, { role: 'parent', email: 'owner@example.test' }, 403],
    [{ ADMIN_EMAIL: 'owner@example.test' }, { role: 'admin', email: 'other@example.test' }, 403],
  ]) {
    const { requirePlatformAdmin } = loadTS('server/access-control.ts', {}, { process: { env } });
    const res = response();
    let continued = false;
    requirePlatformAdmin({ session: { user } }, res, () => { continued = true; });
    assert.equal(continued, false);
    assert.equal(res.statusCode, expected);
  }
  const { requirePlatformAdmin } = loadTS('server/access-control.ts', {}, {
    process: { env: { ADMIN_EMAIL: ' Owner@Example.test ' } },
  });
  let continued = false;
  requirePlatformAdmin({ session: { user: { role: 'admin', email: 'owner@example.test' } } }, response(), () => { continued = true; });
  assert.equal(continued, true);
});
