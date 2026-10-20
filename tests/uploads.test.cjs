// Real Express/Multer/sharp/temporary-filesystem tests; PostgreSQL is mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');
const sharp = require('sharp');
const sourceRoot = path.resolve(__dirname, '..');
function loadTS(relative, mocks = {}) {
  const source = require('node:fs').readFileSync(path.join(sourceRoot, relative), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + output.outputText + '\n})', {
    process, Buffer, URL, console,
  }, { filename: relative })(id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), module, module.exports);
  return module.exports;
}
const access = loadTS('server/access-control.ts');
const { createFileRouter } = loadTS('server/file-routes.ts', {
  './db': { query: async () => { throw new Error('Unexpected real database query'); } },
  './access-control': access,
  './request-security': loadTS('server/request-security.ts'),
});
const png = () => sharp({ create: { width: 4, height: 4, channels: 4, background: '#abcdff80' } }).png().toBuffer();
async function fixture(t, options = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'kindergarten-images-'));
  const uploadsDir = path.join(tmp, 'storage');
  const state = { rows: [], insertError: false, selectError: false, queries: 0 };
  const db = { async query(sql, params) {
    state.queries++;
    if (sql.startsWith('INSERT')) {
      if (state.insertError) throw new Error('private-database-diagnostic');
      const row = { id: state.rows.length + 1, user_id: params[0], role: params[1], file_name: params[2],
        file_path: params[3], mime_type: params[4], size_bytes: params[5], public_url: params[6] };
      state.rows.push(row);
      return { rows: [row] };
    }
    if (state.selectError) throw new Error('private-select-diagnostic');
    if (sql.includes('COUNT(*)')) return { rows: [{ count: state.rows.length }] };
    if (sql.startsWith('DELETE')) {
      state.rows = state.rows.filter(row => !(String(row.id) === String(params[0]) && row.user_id === params[1]));
      return { rows: [] };
    }
    if (sql.includes('public_url =')) return { rows: state.rows.filter(row => row.public_url === params[0] && row.role === params[1]) };
    if (sql.includes('WHERE id =')) return { rows: state.rows.filter(row => String(row.id) === String(params[0]) && row.user_id === params[1]) };
    return { rows: state.rows.filter(row => row.user_id === params[0]) };
  } };
  const app = express();
  app.use((req, _res, next) => {
    const role = req.get('x-test-role');
    req.session = { user: role ? { id: Number(req.get('x-test-id') || 7), role } : undefined };
    next();
  });
  app.use('/api/files', createFileRouter(db, { uploadsDir, production: false, allowedOrigins: ['https://school.example'], ...options }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(tmp, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function upload(bytes, { role = 'admin', type = 'image/png', name = 'fixture.png', purpose, headers = {}, field = 'file' } = {}) {
    const form = new FormData();
    if (bytes !== undefined) form.append(field, new Blob([bytes], { type }), name);
    const r = await fetch(origin + '/api/files/upload' + (purpose ? '?purpose=' + purpose : ''), {
      method: 'POST', body: form, headers: { ...(role ? { 'x-test-role': role } : {}), ...headers },
    });
    return { status: r.status, body: await r.json() };
  }
  async function read(url, role) {
    const response = await fetch(origin + url, { headers: role ? { 'x-test-role': role } : {} });
    return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) };
  }
  return { tmp, uploadsDir, origin, state, upload, read };
}

test('valid PNG upload is normalized, private, canonical and preserved on authorized retrieval', async t => {
  const f = await fixture(t);
  const input = Buffer.concat([await png(), Buffer.from('<script>QA_ONLY</script>')]);
  const result = await f.upload(input, { name: '../misleading.html' });
  assert.equal(result.status, 201);
  assert.match(result.body.file.public_url, /^\/api\/files\/serve\/admin\/7\/[a-f0-9-]+\.png$/);
  assert.equal(result.body.file.file_path, undefined, 'do not disclose server paths');
  const read = await f.read(result.body.file.public_url, 'admin');
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('content-type'), 'image/png');
  assert.equal(read.headers.get('cache-control'), 'private, no-store');
  assert.equal(read.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(read.bytes.includes(Buffer.from('QA_ONLY')), false);
  const meta = await sharp(read.bytes).metadata();
  assert.equal(meta.width, 4);
  assert.equal(meta.exif, undefined);
});
test('anonymous and non-admin upload denied before parsing or disk/database writes', async t => {
  const f = await fixture(t);
  for (const [role, status] of [[null, 401], ['parent', 403], ['teacher', 403]]) {
    const r = await f.upload(await png(), { role });
    assert.equal(r.status, status);
  }
  assert.equal(f.state.queries, 0);
  assert.equal(await fs.stat(f.uploadsDir).then(() => true, () => false), false);
});
test('student and document URLs require admin session; branding alone is public', async t => {
  const f = await fixture(t);
  const privateFile = await f.upload(await png());
  assert.equal((await f.read(privateFile.body.file.public_url)).status, 401);
  assert.equal((await f.read(privateFile.body.file.public_url, 'parent')).status, 403);
  const branding = await f.upload(await png(), { purpose: 'branding' });
  assert.equal(branding.status, 201);
  assert.match(branding.body.file.public_url, /\/branding\//);
  const read = await f.read(branding.body.file.public_url);
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('cross-origin-resource-policy'), 'cross-origin');
});
test('empty, missing, spoofed HTML/SVG, invalid MIME and unexpected field rejected', async t => {
  const f = await fixture(t);
  const cases = [
    ['', {}, 400], [undefined, {}, 400], ['not-image', {}, 415],
    ['<!doctype html><p>QA</p>', { type: 'image/jpeg', name: 'photo.jpg' }, 415],
    ['<svg xmlns="http://www.w3.org/2000/svg"/>', { type: 'image/png' }, 415],
    [await png(), { type: 'application/octet-stream' }, 415],
    [await png(), { field: 'unexpected' }, 400],
  ];
  for (const [bytes, options, expected] of cases) assert.equal((await f.upload(bytes, options)).status, expected);
  assert.equal(f.state.rows.length, 0);
});
test('10 MiB upload limit returns 413 without writing files', async t => {
  const f = await fixture(t);
  assert.equal((await f.upload(Buffer.alloc(10 * 1024 * 1024 + 1))).status, 413);
  assert.equal(f.state.rows.length, 0);
});
test('compressed image over 20M pixels is rejected before full decoding', async t => {
  const f = await fixture(t);
  const bomb = await sharp({ create: { width: 5000, height: 4001, channels: 3, background: 'white' } }).png().toBuffer();
  assert.ok(bomb.length < 10 * 1024 * 1024);
  assert.equal((await f.upload(bomb)).status, 415);
});
test('JPEG/WebP accepted by actual decoder and GPS/EXIF removed', async t => {
  const f = await fixture(t);
  for (const format of ['jpeg', 'webp']) {
    const input = await sharp({ create: { width: 3, height: 2, channels: 3, background: 'blue' } })
      .withMetadata({ orientation: 6 }).toFormat(format).toBuffer();
    const result = await f.upload(input, { type: `image/${format}` });
    assert.equal(result.status, 201);
    const read = await f.read(result.body.file.public_url, 'admin');
    const meta = await sharp(read.bytes).metadata();
    assert.equal(meta.format, format);
    assert.equal(meta.exif, undefined);
    assert.equal(meta.orientation, undefined);
    assert.equal(meta.width, 2);
    assert.equal(meta.height, 3);
  }
});
test('database failure removes written image and returns no internal diagnostics', async t => {
  const f = await fixture(t);
  f.state.insertError = true;
  const result = await f.upload(await png());
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(result.body).includes('private-database'), false);
  const paths = await fs.readdir(f.uploadsDir, { recursive: true });
  for (const relative of paths) assert.equal((await fs.stat(path.join(f.uploadsDir, relative))).isFile(), false);
});
test('cross-site upload and delete blocked; explicitly allowed browser origin works', async t => {
  const f = await fixture(t);
  assert.equal((await f.upload(await png(), { headers: { Origin: 'https://evil.example' } })).status, 403);
  const allowed = await f.upload(await png(), { headers: { Origin: 'https://school.example' } });
  assert.equal(allowed.status, 201);
  const denied = await fetch(f.origin + '/api/files/' + allowed.body.file.id, {
    method: 'DELETE', headers: { 'x-test-role': 'admin', Origin: 'https://evil.example' },
  });
  assert.equal(denied.status, 403);
  assert.equal(f.state.rows.length, 1);
});
test('production uploads fail closed without confirmed persistent storage', async t => {
  const f = await fixture(t, { production: true, persistent: false });
  assert.equal((await f.upload(await png())).status, 503);
  assert.equal(f.state.queries, 0);
});
test('unknown purpose cannot publish a private image', async t => {
  const f = await fixture(t);
  assert.equal((await f.upload(await png(), { purpose: 'public' })).status, 400);
  assert.equal(f.state.rows.length, 0);
});
test('legacy photos are normalized safely while legacy HTML cannot execute', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.uploadsDir, 'public', 'guest'), { recursive: true });
  for (const [filename, bytes, expected] of [
    ['old_photo.jpg', await png(), 200],
    ['old_html.png', Buffer.from('<html>private-legacy-html</html>'), 415],
  ]) {
    const filePath = path.join(f.uploadsDir, 'public', 'guest', filename);
    await fs.writeFile(filePath, bytes);
    const url = `/api/files/serve/public/guest/${filename}`;
    f.state.rows.push({ file_path: filePath, mime_type: 'image/jpeg', public_url: url, role: 'public' });
    assert.equal((await f.read(url)).status, 401);
    const read = await f.read(url, 'admin');
    assert.equal(read.status, expected);
    if (expected === 200) assert.equal(read.headers.get('content-type'), 'image/png');
    assert.equal(read.bytes.includes(Buffer.from('private-legacy-html')), false);
  }
});
test('database path escape and filesystem symlinks cannot expose outside files', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.uploadsDir, 'admin', '7'), { recursive: true });
  const outside = path.join(f.tmp, 'private.txt');
  await fs.writeFile(outside, 'private-outside-storage');
  const link = path.join(f.uploadsDir, 'admin', '7', 'link.png');
  await fs.symlink(outside, link);
  for (const [filename, filePath] of [['outside.png', outside], ['link.png', link]]) {
    const url = `/api/files/serve/admin/7/${filename}`;
    f.state.rows.push({ file_path: filePath, mime_type: 'image/png', public_url: url, role: 'admin' });
    const read = await f.read(url, 'admin');
    assert.notEqual(read.status, 200);
    assert.equal(read.bytes.includes(Buffer.from('private-outside-storage')), false);
  }
});
test('listing hides filesystem paths and deleting another uploader file is denied', async t => {
  const f = await fixture(t);
  const created = await f.upload(await png());
  const listed = await fetch(f.origin + '/api/files', { headers: { 'x-test-role': 'admin' } });
  const listing = await listed.json();
  assert.equal(listing.files[0].file_path, undefined);
  const other = await fetch(f.origin + '/api/files/' + created.body.file.id, {
    method: 'DELETE', headers: { 'x-test-role': 'admin', 'x-test-id': '8' },
  });
  assert.equal(other.status, 404);
  const deleted = await fetch(f.origin + '/api/files/' + created.body.file.id, {
    method: 'DELETE', headers: { 'x-test-role': 'admin' },
  });
  assert.equal(deleted.status, 200);
  assert.equal((await f.read(created.body.file.public_url, 'admin')).status, 404);
});
