const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function authHarness({ fetchImpl, asyncValues = new Map(), secureValues = new Map(), platform = 'web' }) {
  const states = [];
  const effects = [];
  const requests = [];
  const alerts = [];
  let stateIndex = 0;
  const asyncStorage = {
    async getItem(key) { return asyncValues.get(key) ?? null; },
    async setItem(key, value) { asyncValues.set(key, value); },
    async removeItem(key) { asyncValues.delete(key); },
  };
  const secureStore = {
    async getItemAsync(key) { return secureValues.get(key) ?? null; },
    async setItemAsync(key, value) { secureValues.set(key, value); },
    async deleteItemAsync(key) { secureValues.delete(key); },
  };
  const react = {
    __esModule: true,
    default: { createElement: (type, props) => ({ type, props }) },
    createContext: () => ({ Provider: 'AuthProvider' }),
    useContext: context => context.value,
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => {
        states[index] = typeof value === 'function' ? value(states[index]) : value;
      }];
    },
    useEffect(callback) { effects.push(callback); },
    useCallback(callback) { return callback; },
    useMemo(callback) { return callback(); },
  };
  const mocks = {
    react,
    '@react-native-async-storage/async-storage': { __esModule: true, default: asyncStorage },
    'expo-secure-store': secureStore,
    'react-native': { Platform: { OS: platform }, Alert: { alert: (...args) => alerts.push(args) } },
    '@/lib/query-client': { makeApiUrl: pathValue => pathValue },
    '@/lib/push-service': { registerAndSaveToken: async () => {} },
  };
  const source = fs.readFileSync(path.join(root, 'contexts/AuthContext.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: 'contexts/AuthContext.tsx',
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    {
      fetch: async (url, options) => {
        requests.push({ url, options });
        return fetchImpl(url, options);
      },
      Date,
      JSON,
      Promise,
      Error,
    },
    { filename: 'contexts/AuthContext.tsx' },
  )(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Unexpected dependency: ${id}`);
  }, module, module.exports);
  const provider = module.exports.AuthProvider({ children: null });
  return {
    value: provider.props.value,
    states,
    effects,
    async runStartup() {
      effects[0]();
      for (let index = 0; index < 12; index++) await Promise.resolve();
    },
    requests,
    alerts,
    asyncValues,
    secureValues,
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

test('password login has no plaintext local credential fallback and preserves spaces', async () => {
  const screen = fs.readFileSync(path.join(root, 'app/login.tsx'), 'utf8');
  assert.doesNotMatch(screen, /adminPassword|parentPassword|emp\.password|students\.find|employees\.find/);
  assert.doesNotMatch(screen, /password\.trim\(\)/);
  const linkedUser = { id: 37, full_name: 'Parent', role: 'parent', linked_id: 'student-server-id' };
  const harness = authHarness({
    fetchImpl: async (url, options) => url.endsWith('/login')
      ? jsonResponse({ ok: true, user: linkedUser })
      : jsonResponse({ ok: true, user: { id: 37, full_name: 'Parent', role: 'parent', linked_id: 'student-server-id', disabled: false } }),
  });
  const result = await harness.value.apiLogin('parent', ' 555123 ', ' pass phrase ');
  assert.equal(result.ok, true);
  assert.equal(harness.requests[0].options.body, JSON.stringify({
    role: 'parent', credential: ' 555123 ', password: ' pass phrase ',
  }));
  await harness.value.login({
    id: String(result.user.id),
    name: result.user.full_name,
    role: result.user.role,
    studentId: result.user.linked_id,
  });
  assert.equal(harness.states[0].studentId, 'student-server-id');
  assert.equal(harness.requests[2].url, '/api/auth/me');
});

test('startup ignores cached AuthUser and restores only a validated server session', async () => {
  const asyncValues = new Map([['auth_user', JSON.stringify({ id: 'forged', name: 'Cached', role: 'admin' })]]);
  const harness = authHarness({
    asyncValues,
    fetchImpl: async () => jsonResponse({ ok: true, user: { id: 14, full_name: 'Server Admin', role: 'admin', disabled: false } }),
  });
  await harness.runStartup();
  assert.equal(harness.requests[0].url, '/api/auth/me');
  assert.equal(harness.states[0].id, '14');
  assert.equal(harness.states[0].name, 'Server Admin');
  assert.equal(asyncValues.has('auth_user'), false);
});

test('startup fails closed when /me rejects the cached identity', async () => {
  const asyncValues = new Map([['auth_user', JSON.stringify({ id: 'forged', name: 'Cached', role: 'admin' })]]);
  const harness = authHarness({
    asyncValues,
    fetchImpl: async () => jsonResponse({ ok: false }, 401),
  });
  await harness.runStartup();
  assert.equal(harness.states[0], null);
  assert.equal(harness.requests[0].url, '/api/auth/me');
});

test('login(AuthUser) and biometric restore require a matching server role', async () => {
  const secureValues = new Map([['biometric_user', JSON.stringify({ id: 'cached', name: 'Cached', role: 'admin' })]]);
  const harness = authHarness({
    secureValues,
    platform: 'native',
    fetchImpl: async () => jsonResponse({ ok: false }, 401),
  });
  await assert.rejects(harness.value.login({ id: 'forged', name: 'Forged', role: 'admin' }), /جلسة/);
  const biometricUser = await harness.value.getBiometricUser();
  assert.equal(biometricUser.id, 'cached');
  await assert.rejects(harness.value.login(biometricUser), /جلسة/);
  assert.equal(harness.states[0], null);
  assert.equal(harness.requests.length, 2);
  assert.ok(harness.requests.every(request => request.url === '/api/auth/me'));
});

test('login rejects a valid server session whose role differs from the supplied AuthUser', async () => {
  const harness = authHarness({
    fetchImpl: async () => jsonResponse({
      ok: true,
      user: { id: 19, full_name: 'Server Parent', role: 'parent', linked_id: 'server-student', disabled: false },
    }),
  });
  await assert.rejects(
    harness.value.login({ id: 'forged-admin', name: 'Forged Admin', role: 'admin' }),
    /دور الحساب/,
  );
  assert.equal(harness.states[0], null);
  assert.equal(harness.requests.length, 1);
});

test('API login rejects role mismatch and maps links only from the server response', async () => {
  const harness = authHarness({
    fetchImpl: async url => url.endsWith('/login')
      ? jsonResponse({ ok: true, user: { id: 3, full_name: 'Teacher', role: 'teacher', linked_id: 'server-class' } })
      : jsonResponse({ ok: true, user: { id: 3, full_name: 'Teacher', role: 'teacher', linked_id: 'server-class', disabled: false } }),
  });
  const result = await harness.value.apiLogin('parent', '555', 'secret');
  assert.equal(result.ok, false);
  assert.equal(harness.states[0], null);
});

test('teacher class is taken from server teacher_class, not linked employee ID', async () => {
  const serverUser = {
    id: 27,
    full_name: 'Server Teacher',
    role: 'teacher',
    linked_id: 'employee-record-27',
    teacher_class: 'KG-Level-2',
    disabled: false,
  };
  const harness = authHarness({
    fetchImpl: async () => jsonResponse({ ok: true, user: serverUser }),
  });
  const result = await harness.value.apiLogin('teacher', 'teacher@example.test', 'pass phrase');
  assert.equal(result.ok, true);
  assert.equal(result.user.linked_id, 'employee-record-27');
  assert.equal(result.user.teacher_class, 'KG-Level-2');
  await harness.value.login({
    id: String(result.user.id),
    name: result.user.full_name,
    role: result.user.role,
    teacherClass: result.user.teacher_class,
  });
  assert.equal(harness.states[0].teacherClass, 'KG-Level-2');
  assert.notEqual(harness.states[0].teacherClass, 'employee-record-27');
});

test('server-disabled or unlinked parent accounts are not published as logged in', async () => {
  for (const sessionUser of [
    { id: 5, full_name: 'Disabled Parent', role: 'parent', linked_id: 'server-student', disabled: true },
    { id: 5, full_name: 'Unlinked Parent', role: 'parent', linked_id: null, disabled: false },
  ]) {
    const harness = authHarness({
      fetchImpl: async url => url.endsWith('/login')
        ? jsonResponse({ ok: true, user: { id: 5, full_name: 'Parent', role: 'parent', linked_id: 'server-student' } })
        : jsonResponse({ ok: true, user: sessionUser }),
    });
    const result = await harness.value.apiLogin('parent', '555', 'secret');
    assert.equal(result.ok, false);
    assert.equal(harness.states[0], null);
  }
});

test('logout contacts the server, clears cached identity, reports failure, and does not reject navigation', async () => {
  const asyncValues = new Map([['auth_user', 'sensitive'], ['login_history', 'history']]);
  const secureValues = new Map([
    ['biometric_user', 'sensitive-user'],
    ['biometric_enabled', 'true'],
  ]);
  const harness = authHarness({
    asyncValues,
    secureValues,
    platform: 'native',
    fetchImpl: async () => jsonResponse({ ok: false, error: 'server logout failed' }, 500),
  });
  await assert.doesNotReject(harness.value.logout());
  assert.equal(harness.requests[0].url, '/api/auth/logout');
  assert.equal(harness.requests[0].options.method, 'POST');
  assert.equal(asyncValues.has('auth_user'), false);
  assert.equal(asyncValues.has('login_history'), true);
  assert.equal(secureValues.has('biometric_user'), false);
  assert.equal(secureValues.has('biometric_enabled'), false);
  assert.equal(harness.states[0], null);
  assert.match(harness.alerts[0][1], /server logout failed/);
});

test('Firebase school login cannot publish the Firebase-returned identity without /me', () => {
  const screen = fs.readFileSync(path.join(root, 'app/school-login.tsx'), 'utf8');
  assert.match(screen, /await login\(\{/);
  assert.match(screen, /لا توجد جلسة حساب صالحة على خادم التطبيق/);
  assert.ok(screen.indexOf('await login({') < screen.indexOf('router.replace'));
});
