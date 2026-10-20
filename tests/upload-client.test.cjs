// Dependency-isolated upload client regressions. Run: node --test tests/upload-client.test.cjs
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
    { Blob, URL, console, ...globals },
    { filename: relative },
  )(requireMock, module, module.exports);
  return module.exports;
}

function createFormData() {
  return class MockFormData {
    entries = [];
    append(...entry) { this.entries.push(entry); }
  };
}

function response({ status = 200, body = {} } = {}) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

function client({ os = 'web', fetch = async () => response(), nativeFetch = fetch } = {}) {
  const requests = [];
  const apiFetch = async (...args) => {
    requests.push(args);
    return nativeFetch(...args);
  };
  const api = loadTS('lib/uploads.ts', {
    'react-native': { Platform: { OS: os }, Alert: { alert() {} } },
    'expo-image-picker': {},
    'expo/fetch': { fetch: apiFetch },
    '@/lib/query-client': {
      makeApiUrl: route => new URL(route, 'https://api.example.test').toString(),
      getApiOrigin: () => 'https://api.example.test',
    },
  }, {
    FormData: createFormData(),
    fetch,
    Blob,
    URL,
    Date,
  });
  return { api, requests };
}

test('web blob uploads use multipart data and return a validated same-origin serve URL', async () => {
  const { api, requests } = client({
    fetch: async () => ({ ok: true, status: 200, blob: async () => new Blob(['image'], { type: 'image/png' }) }),
    nativeFetch: async (url, options) => {
      assert.equal(url, 'https://api.example.test/api/files/upload');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'include');
      assert.equal(options.body.entries[0][0], 'file');
      assert.equal(options.body.entries[0][2], 'upload_123.png');
      return response({ body: { ok: true, file: { public_url: '/api/files/serve/public/1/logo.png' } } });
    },
  });
  const result = await api.uploadFile('blob:browser-image', { name: 'upload_123.png' });
  assert.equal(result, 'https://api.example.test/api/files/serve/public/1/logo.png');
  assert.equal(requests.length, 1);
});

test('native upload preserves React Native FormData file descriptors and sends branding purpose', async () => {
  let body;
  const { api, requests } = client({
    os: 'ios',
    nativeFetch: async (url, options) => {
      assert.equal(url, 'https://api.example.test/api/files/upload?purpose=branding');
      assert.equal(options.credentials, 'include');
      body = options.body;
      return response({ body: { ok: true, file: { public_url: '/api/files/serve/public/3/logo.webp' } } });
    },
  });
  const result = await api.uploadFile('ph://photo-id', {
    name: 'school-logo.webp',
    mime: 'image/webp',
    purpose: 'branding',
  });
  assert.equal(result, 'https://api.example.test/api/files/serve/public/3/logo.webp');
  assert.deepEqual(JSON.parse(JSON.stringify(body.entries[0])), ['file', {
    uri: 'ph://photo-id',
    name: 'school-logo.webp',
    type: 'image/webp',
  }]);
  assert.equal(requests.length, 1);
});

test('unsupported web URIs and failed source fetches reject rather than report success', async () => {
  const unsupported = client();
  await assert.rejects(unsupported.api.uploadFile('/local/path/image.png'), /غير مدعومة/);
  assert.equal(unsupported.requests.length, 0);

  const inaccessible = client({
    fetch: async () => ({ ok: false, status: 404 }),
  });
  await assert.rejects(inaccessible.api.uploadFile('https://cdn.example.test/image.png'), /HTTP 404/);
  assert.equal(inaccessible.requests.length, 0);

  const deniedDataUrl = client({
    fetch: async () => ({ ok: false, status: 400 }),
  });
  await assert.rejects(deniedDataUrl.api.uploadFile('data:image/png;base64,ZmFrZQ=='), /HTTP 400/);
  assert.equal(deniedDataUrl.requests.length, 0);

  const unsupportedNative = client({ os: 'android' });
  await assert.rejects(unsupportedNative.api.uploadFile('https://remote.example/image.png'), /غير مدعومة/);
  assert.equal(unsupportedNative.requests.length, 0);
});

test('API errors and malformed, foreign, or non-serve response URLs reject', async () => {
  const failingApi = client({
    nativeFetch: async () => response({ status: 413, body: { ok: false, error: 'الصورة أكبر من الحد المسموح' } }),
    os: 'android',
  });
  await assert.rejects(failingApi.api.uploadFile('file:///image.png'), /الصورة أكبر من الحد المسموح/);

  for (const public_url of [
    'https://attacker.example/file.png',
    '/uploads/file.png',
    '//attacker.example/api/files/serve/public/1/logo.png',
    'javascript:alert(1)',
  ]) {
    const badResponse = client({
      os: 'android',
      nativeFetch: async () => response({ body: { ok: true, file: { public_url } } }),
    });
    await assert.rejects(badResponse.api.uploadFile('file:///image.png'));
  }
});

test('school logo helper uses branding API; school assets use private API without Firebase', async () => {
  const calls = [];
  const { uploadSchoolLogo, uploadSchoolAsset } = loadTS('lib/firebase-storage.ts', {
    './uploads': {
      uploadFile: async (...args) => { calls.push(args); return 'https://api.example.test/result'; },
    },
  });
  await uploadSchoolLogo('school-7', 'file:///logo.heic', { mime: 'image/heic' });
  await uploadSchoolAsset('school-7', 'file:///classroom.png', 'classroom');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['file:///logo.heic', { mime: 'image/heic', purpose: 'branding' }],
    ['file:///classroom.png', { name: 'classroom' }],
  ]);
});

test('branding camera and gallery retain picker metadata and display upload errors', () => {
  const source = fs.readFileSync(path.join(root, 'app/(admin)/branding.tsx'), 'utf8');
  assert.equal((source.match(/uploadSchoolLogo\(activeSchoolId, asset\.uri/g) || []).length, 2);
  assert.equal((source.match(/asset\.mimeType \?\? undefined/g) || []).length, 2);
  assert.equal((source.match(/error instanceof Error \? error\.message/g) || []).length, 2);
});

test('gallery and student uploads stay private and their serve URLs require an admin session', () => {
  const gallery = fs.readFileSync(path.join(root, 'app/(admin)/gallery.tsx'), 'utf8');
  const management = fs.readFileSync(path.join(root, 'app/(admin)/management.tsx'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server/file-routes.ts'), 'utf8');

  assert.equal((gallery.match(/uploadFile\(/g) || []).length, 2);
  assert.equal((management.match(/uploadFile\(/g) || []).length, 2);
  assert.doesNotMatch(gallery, /purpose:\s*['"]branding['"]/);
  assert.doesNotMatch(management, /purpose:\s*['"]branding['"]/);
  assert.match(gallery, /gallery_\$\{Date\.now\(\)\}\.jpg/);
  assert.match(management, /student_photo_\$\{Date\.now\(\)\}\.jpg/);
  assert.match(management, /birth_cert_\$\{Date\.now\(\)\}\.jpg/);

  assert.match(server, /const purpose = req\.query\.purpose \|\| 'private'/);
  assert.match(server, /const role = purpose === 'branding' \? 'branding' : 'admin'/);
  assert.match(server, /if \(role !== 'branding'\) \{\s*if \(!req\.session\?\.user\) return res\.status\(401\)/);
  assert.match(server, /if \(req\.session\.user\.role !== 'admin'\) return res\.status\(403\)/);
});
