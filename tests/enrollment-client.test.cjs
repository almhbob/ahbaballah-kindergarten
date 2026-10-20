const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadEnrollment(fetchImpl) {
  const source = fs.readFileSync(path.join(root, 'lib/enrollment.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'lib/enrollment.ts',
    reportDiagnostics: true,
  });
  assert.equal((output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  const mocks = {
    'expo/fetch': { fetch: fetchImpl },
    './query-client': { makeApiUrl: route => `https://school.example${route}` },
  };
  vm.runInNewContext(
    '(function(require,module,exports){' + output.outputText + '\n})',
    { Date, Math, console },
    { filename: 'lib/enrollment.ts' },
  )(
    id => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
    module,
    module.exports,
  );
  return module.exports;
}

test('public enrollment screens await the server before showing success and retain retry keys', () => {
  const requestScreen = fs.readFileSync(path.join(root, 'app/enrollment-request.tsx'), 'utf8');
  const publicHome = fs.readFileSync(path.join(root, 'app/(guest)/index.tsx'), 'utf8');
  const requestSubmit = requestScreen.slice(requestScreen.indexOf('async function submitRequest()'), requestScreen.indexOf("\n  if (step === 'done')"));
  assert.ok(requestSubmit.indexOf('await addRegistrationRequest(') < requestSubmit.indexOf("setStep('done')"));
  assert.match(requestSubmit, /catch \(error\)/);
  assert.match(requestSubmit, /setSubmitError/);
  assert.match(requestSubmit, /id: requestKey/);
  assert.match(requestSubmit, /setRequestKey\(newEnrollmentKey\(\)\)/);

  const modalSubmit = publicHome.slice(publicHome.indexOf('onPress={async () => {'), publicHome.indexOf('</Pressable>', publicHome.indexOf('onPress={async () => {')));
  assert.ok(modalSubmit.indexOf('await onSubmit(form, requestKey)') < modalSubmit.indexOf('setSubmitted(true)'));
  assert.match(modalSubmit, /catch \(error\)/);
  assert.match(modalSubmit, /setSubmitError/);
  assert.match(publicHome, /id: requestKey/);
  assert.match(publicHome, /await addRegistrationRequest\(req\)/);
  assert.match(publicHome, /newEnrollmentKey/);
});

test('enrollment client sends the stable nonce as requestKey and returns the server receipt', async () => {
  let sent;
  const client = loadEnrollment(async (_url, options) => {
    sent = options;
    return { ok: true, json: async () => ({ ok: true, receipt: { id: 'server-id', createdAt: '2025-01-02T03:04:05Z' } }) };
  });
  const receipt = await client.submitEnrollment({
    id: 'retry-key-123',
    createdAt: 'client-time',
    status: 'pending',
    childName: 'Child',
    birthDate: '2020-01-01',
    gender: 'ذكر',
    requestedLevel: 'براعم',
    parentName: 'Parent',
    parentPhone: '123',
    parentRelation: 'ولي أمر',
    parentEmail: 'parent@example.test',
    notes: 'Notes',
  });
  assert.equal(receipt.id, 'server-id');
  assert.equal(receipt.createdAt, '2025-01-02T03:04:05Z');
  assert.equal(sent.credentials, 'include');
  assert.equal(JSON.parse(sent.body).requestKey, 'retry-key-123');
  assert.equal(JSON.parse(sent.body).parentEmail, 'parent@example.test');
});

test('enrollment backend failures reject and malformed responses cannot be mistaken for success', async () => {
  const failed = loadEnrollment(async () => ({
    ok: false,
    json: async () => ({ ok: false, error: 'تعذر حفظ الطلب' }),
  }));
  await assert.rejects(
    failed.submitEnrollment({ id: 'stable-key' }),
    /تعذر حفظ الطلب/,
  );

  const malformed = loadEnrollment(async () => ({
    ok: true,
    json: async () => ({ ok: true }),
  }));
  await assert.rejects(
    malformed.submitEnrollment({ id: 'stable-key' }),
    /لم يرجع الخادم إيصال تسجيل صالحًا/,
  );
});
