import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
const observer = source.match(/window\.navigation\?\.addEventListener\('navigate', event => \{[\s\S]*?\n          \}\);/)?.[0];
assert.ok(observer, 'Exercise the exact passive observer installed in the browser audit');

function fixture(navigationAvailable = true) {
  const records = [];
  let callback;
  const window = navigationAvailable ? { navigation: { addEventListener(type, handler) {
    assert.equal(type, 'navigate'); callback = handler;
  } } } : {};
  new Function('window', 'record', observer)(window, (type, detail) => records.push({ type, ...detail }));
  return { records, navigate: event => callback(event) };
}

const event = overrides => Object.freeze({
  destination: Object.freeze({ url: 'https://example.test/en/about', sameDocument: false }),
  navigationType: 'replace', cancelable: true, canIntercept: true,
  userInitiated: false, defaultPrevented: false, sourceElement: null,
  preventDefault() { throw new Error('Observer must not cancel navigation'); },
  intercept() { throw new Error('Observer must not intercept navigation'); },
  ...overrides,
});

test('captures both hard replacements and their synchronous caller stacks without changing either event', () => {
  const { records, navigate } = fixture();
  function boundaryReplace() { navigate(event({ destination: Object.freeze({ url: 'https://example.test/en/academy/reiki/tantra-reiki', sameDocument: false }) })); }
  function pendingRouterReplace() { navigate(event()); }
  boundaryReplace();
  pendingRouterReplace();
  assert.equal(records.length, 2);
  assert.match(records[0].initiatorStack, /boundaryReplace/);
  assert.match(records[1].initiatorStack, /pendingRouterReplace/);
  assert.notEqual(records[0].destination, records[1].destination);
  for (const record of records) {
    assert.equal(record.type, 'navigate');
    assert.equal(record.sameDocument, false);
    assert.equal(record.navigationType, 'replace');
    assert.equal(record.cancelable, true);
    assert.equal(record.canIntercept, true);
    assert.equal(record.defaultPrevented, false);
    assert.equal(record.userInitiated, false);
    assert.equal(record.sourceElementTag, null);
  }
});

test('retains same-document traversal, noncancelable navigation, and user-link evidence', () => {
  const { records, navigate } = fixture();
  navigate(event({ destination: Object.freeze({ url: 'https://example.test/', sameDocument: true }), navigationType: 'traverse', cancelable: false, canIntercept: false, userInitiated: true, sourceElement: Object.freeze({ tagName: 'A' }) }));
  assert.equal(records[0].sameDocument, true);
  assert.equal(records[0].navigationType, 'traverse');
  assert.equal(records[0].cancelable, false);
  assert.equal(records[0].canIntercept, false);
  assert.equal(records[0].userInitiated, true);
  assert.equal(records[0].sourceElementTag, 'A');
});

test('missing Navigation API preserves the existing optional-observer behavior', () => {
  assert.deepEqual(fixture(false).records, []);
});

test('initiator instrumentation leaves browser APIs and strict acceptance assertions untouched', () => {
  assert.doesNotMatch(observer, /preventDefault\(|intercept\(|stopImmediatePropagation\(|location\s*=|replaceState\s*=|pushState\s*=/);
  assert.match(source, /assert\.deepEqual\(cspErrors, \[\]/);
});
