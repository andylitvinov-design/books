import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { isolatedServiceVideoFixture } from '../scripts/helpers/public-service-methods-verifier.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-public-services-production.mjs');
const guard = source.slice(source.indexOf('const origin ='), source.indexOf('const require ='));
function accept(env) { runInNewContext(guard, { process: { env: { CI: 'true', ...env } }, isolatedServiceVideoFixture }); }

test('public-service origin and explicit fixture opt-in fail closed before Playwright or browser launch', () => {
  assert.ok(source.indexOf('const origin =') < source.indexOf('const require ='));
  assert.ok(source.indexOf('HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1"') < source.indexOf('chromium.launch'));
  for (const origin of ['https://holistichouse.vercel.app', 'https://127.0.0.1:3100', 'http://localhost.evil:3100', 'http://127.0.0.2:3100', 'http://localhost:3100/path', 'http://user@localhost:3100', 'http://localhost:3100?fixture=1']) {
    assert.throws(() => accept({ HH_PUBLIC_QA_ORIGIN: origin, HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' }), /isolated loopback/);
  }
  for (const flag of [undefined, '', 'true', '0', 'yes']) {
    assert.throws(() => accept({ HH_PUBLIC_QA_ORIGIN: 'http://127.0.0.1:3100', HH_PUBLIC_QA_ENQUIRY_FIXTURE: flag }), /HH_PUBLIC_QA_ENQUIRY_FIXTURE=1/);
  }
  for (const origin of ['http://127.0.0.1:3100', 'http://localhost:3100']) accept({ HH_PUBLIC_QA_ORIGIN: origin, HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' });
});

test('each former prepared-link call uses the save-gated explicit UI fixture, not production submission', () => {
  assert.doesNotMatch(source, /openContactChannelChooser|assertPreparedContactChannels/);
  for (const kind of ['service', '"business"', '"alchemy"', '"hypnotherapy"', 'kind', '"drawing"']) {
    assert.ok(source.includes(kind === 'kind' ? '{ locale, kind }' : 'kind: ' + kind), kind);
  }
  assert.match(source, /backendPersistenceVerified: false/);
  assert.match(source, /serviceWorkers: "block"/);
  assert.match(source, /backend persistence and messenger delivery NOT verified/);
  assert.match(source, /privateValues: \[markerA, markerB\]/);
  assert.doesNotMatch(source, /whatsappUrl[^\n]*\.click|telegramUrl[^\n]*\.click/);
});

test('only deliberate enquiry 503 console output is recorded as expected', () => {
  assert.match(source, /entry\.path === "\/api\/service-enquiries"/);
  assert.match(source, /entry\.origin === origin && entry\.hasSearch === false/);
  assert.match(source, /status of 503/);
  assert.match(source, /expected\.length <= 1/);
  assert.match(source, /diagnostics\.expectedFixtureErrors\.push/);
  assert.match(source, /diagnostics\.console\.filter\(\(entry\) => entry\.type === "error"\)/);
});

test('existing isolated CI command explicitly opts in, without changing its target or permissions', () => {
  const workflow = read('.github/workflows/hh-public-services-production.yml');
  // The executed-source contract harness imports dev TypeScript under this production job.
  assert.match(workflow, /^\s+- run: npm ci --include=dev --no-audit --no-fund$/m);
  assert.match(workflow, /^\s+NODE_ENV: production$/m);
  assert.match(workflow, /HH_PUBLIC_QA_ORIGIN: http:\/\/127\.0\.0\.1:3100/);
  assert.match(workflow, /HH_PUBLIC_QA_ENQUIRY_FIXTURE='1' node scripts\/verify-public-services-production\.mjs/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /SUPABASE_.*(?:KEY|SECRET)|contents: write|id-token: write/);
});


test('expected-503 predicate rejects other origins, query variants, statuses and endpoints', () => {
  const predicate = source.match(/const expected = diagnostics\.console\.slice\(start\)\.filter\((entry => [\s\S]*?)\);/);
  assert.ok(predicate, 'Execute the actual narrowly scoped filter, not a test-side copy');
  const classify = runInNewContext('(' + predicate[1] + ')', { origin: 'http://127.0.0.1:3100' });
  const expected = { type: 'error', origin: 'http://127.0.0.1:3100', path: '/api/service-enquiries', hasSearch: false,
    text: 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)' };
  assert.equal(classify(expected), true);
  for (const mutation of [
    { origin: 'https://holistichouse.vercel.app' }, { origin: 'http://localhost:3100' },
    { origin: '' }, { hasSearch: true }, { path: '/api/service-enquiries/' },
    { path: '/api/other' }, { type: 'warning' },
    { text: 'Failed to load resource: the server responded with a status of 500 (Server Error)' },
    { text: 'A different error mentioning status of 503' },
  ]) assert.equal(classify({ ...expected, ...mutation }), false);
});


test('CRM single-entry production checks do not resurrect duplicate optional fields', () => {
  assert.doesNotMatch(source, /freeLanding\.text\.(?:name|question)|Copy my details/);
  assert.match(read('scripts/helpers/dao-request-ui-verifier.mjs'), /assertSingleEntryEnquiryUi\(enquiry, expect\)/);
  assert.match(read('scripts/helpers/free-situation-ui-verifier.mjs'), /assertSingleEntryEnquiryUi\(enquiry, expect\)/);
  const helper = read('scripts/helpers/public-enquiry-ui-verifier.mjs');
  for (const field of ['contact, contactConsent: true, website:', 'name, email, phone, consent', 'Object.values(contact)']) {
    assert.ok(helper.includes(field), field);
  }
});
