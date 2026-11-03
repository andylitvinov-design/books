import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
const helper = source.match(/async function assertCspPublicHome\(page\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(helper, 'Exercise the actual browser verifier readiness helper');
const origin = 'https://example.test';
const homeSelector = 'main[data-home-design="approved-v2"]';

function harness(overrides = {}) {
  const state = { url: origin + '/', cspClass: 'public-video', count: 1, visible: true, hydrated: false, loaded: false, ...overrides };
  const calls = [];
  const page = {
    locator(selector) { calls.push(selector); return { selector }; },
    waitForLoadState() { throw new Error('Rapid history must not wait for load'); },
    evaluate() { throw new Error('Rapid history must not wait for hydration'); },
  };
  const expect = target => ({
    async toHaveURL(value) { assert.equal(target, page); assert.equal(state.url, value); },
    async toHaveAttribute(name, value) {
      assert.equal(target.selector, 'body'); assert.equal(name, 'data-csp-class'); assert.equal(state.cspClass, value);
    },
    async toHaveCount(value) {
      assert.equal(target.selector, homeSelector);
      if (state.destinationReady) await state.destinationReady;
      assert.equal(state.count, value);
    },
    async toBeVisible() { assert.equal(target.selector, homeSelector); assert.equal(state.visible, true); },
  });
  const check = new Function('expect', 'origin', `${helper}; return assertCspPublicHome;`)(expect, origin);
  return { state, calls, check: () => check(page) };
}

test('visible SSR home is sufficient before full hydration or load', async () => {
  const fixture = harness();
  await fixture.check();
  assert.equal(fixture.state.hydrated, false);
  assert.equal(fixture.state.loaded, false);
  assert.deepEqual(fixture.calls, ['body', homeSelector]);
  const homeSource = readFileSync(new URL('../components/holistic-house-home.tsx', import.meta.url), 'utf8');
  assert.match(homeSource, /<main\b[^>]*data-home-design="approved-v2"/);
});

for (const [name, state] of [
  ['stale About DOM despite root URL and public CSP class', { count: 0 }],
  ['hidden home marker', { visible: false }],
  ['ambiguous duplicate home markers', { count: 2 }],
  ['wrong route', { url: origin + '/en/about' }],
  ['wrong CSP class', { cspClass: 'private' }],
]) {
  test(`rejects ${name}`, async () => { await assert.rejects(harness(state).check()); });
}

test('next history action cannot begin until destination DOM is available', async () => {
  let arrive;
  const destinationReady = new Promise(resolve => { arrive = resolve; });
  const fixture = harness({ count: 0, destinationReady });
  let traversed = false;
  const next = fixture.check().then(() => { traversed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(traversed, false);
  fixture.state.count = 1;
  arrive();
  await next;
  assert.equal(traversed, true);
});

test('all home arrivals use semantic readiness while preserving rapid traversal', () => {
  assert.equal(source.match(/await assertCspPublicHome\(cspPage\);/g)?.length, 3);
  for (const [phase, nextPhase] of [
    ['back-to-public-home', 'back-to-private'],
    ['forward-to-public-home', 'forward-to-public'],
  ]) {
    const block = source.slice(source.indexOf(`historyPhase = '${phase}'`), source.indexOf(`historyPhase = '${nextPhase}'`));
    assert.match(block, /await cspPage\.go(?:Back|Forward)\(\{ waitUntil: 'domcontentloaded' \}\);\s+await assertCspPublicHome\(cspPage\);\s+await waitForDocument\(\);/);
    assert.doesNotMatch(block, /catch|retry|waitForTimeout/);
  }
  assert.match(source, /const waitForDocument = async \(\) => \{\s+if \(readiness !== 'loaded-history'\) return;/);
  assert.doesNotMatch(helper, /waitForLoadState|waitForTimeout|networkidle|\.evaluate\(/);
});
