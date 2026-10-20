const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const developer = fs.readFileSync(path.join(root, 'app/(admin)/developer.tsx'), 'utf8');
const pushService = fs.readFileSync(path.join(root, 'lib/push-service.ts'), 'utf8');

test('developer and push API callers use the configured full-origin URL helper', () => {
  assert.match(developer, /import \{ makeApiUrl \} from '@\/lib\/query-client'/);
  assert.equal((developer.match(/makeApiUrl\(/g) || []).length, 4);
  assert.doesNotMatch(developer, /https:\/\/\$\{base\}/);
  assert.match(pushService, /import \{ makeApiUrl \} from '@\/lib\/query-client'/);
  assert.match(pushService, /makeApiUrl\(`\/api\/push\/\$\{endpoint\}`\)/);
  assert.doesNotMatch(pushService, /https:\/\/\$\{apiUrl\}/);
});

test('protected school-request calls include session credentials and check API failures', () => {
  const requests = developer.slice(developer.indexOf('const fetchSchoolRequests'), developer.indexOf('// ── Provisioning state'));
  assert.match(requests, /fetch\(url, \{ credentials: 'include' \}\)/);
  assert.match(requests, /method: 'PATCH',\s*credentials: 'include'/);
  assert.match(requests, /method: 'DELETE', credentials: 'include'/);
  assert.match(requests, /if \(!res\.ok\)/);
  assert.match(requests, /if \(!json\.ok\)/);

  const provisioning = developer.slice(developer.indexOf('// 6. Persist provisioning data in DB'), developer.indexOf('// 7. Refresh requests list'));
  assert.match(provisioning, /credentials: 'include'/);
  assert.match(provisioning, /if \(!res\.ok\)/);
  assert.match(provisioning, /if \(!json\.ok\)/);
});

test('failed PATCH responses are rejected before success feedback', () => {
  const update = developer.slice(developer.indexOf('const updateRequestStatus'), developer.indexOf('const deleteRequest'));
  const httpFailure = update.indexOf('if (!res.ok)');
  const bodyFailure = update.indexOf('if (!json.ok)');
  const successHaptic = update.indexOf('Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)');
  assert.ok(httpFailure >= 0 && bodyFailure >= 0);
  assert.ok(httpFailure < successHaptic);
  assert.ok(bodyFailure < successHaptic);

  const provision = developer.slice(developer.indexOf('// 6. Persist provisioning data in DB'), developer.indexOf('} catch (e) {', developer.indexOf('// 6. Persist provisioning data in DB')));
  assert.ok(provision.indexOf('if (!res.ok)') < provision.indexOf('setShowCredsModal(true)'));
  assert.ok(provision.indexOf('if (!json.ok)') < provision.indexOf('setShowCredsModal(true)'));
});
