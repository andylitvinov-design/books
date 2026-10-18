import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('async function assertAnonymousPrivateNavigation('), source.indexOf('async function verifyCspBfcache('));
const origin = 'https://example.test';
async function scenario(fault) {
  const calls = [];
  const page = {
    async goto(url, options) { calls.push(['goto', url, options]); return { status: () => fault === 'failed response' ? 404 : 200 }; },
    locator(selector) { return { selector }; },
  };
  const expect = target => ({
    async toHaveURL(url) { assert.equal(target, page); assert.equal(url, origin + '/en/app/portrait'); assert.notEqual(fault, 'wrong route'); },
    async toHaveAttribute(name, value) {
      if (target.selector === 'body') { assert.equal(name, 'data-csp-class'); assert.equal(value, 'private'); assert.notEqual(fault, 'public CSP'); }
      else { assert.equal(target.selector, '.hh-app .hh-entry a.hh-text-link'); assert.equal(name, 'href'); assert.equal(value, '/en/client'); assert.notEqual(fault, 'wrong exit'); }
    },
    async toBeVisible() { assert.equal(target.selector, '.hh-app .hh-entry'); assert.notEqual(fault, 'missing anonymous entry'); },
    async toHaveCount(value) {
      assert.equal(value, 0);
      assert.ok(['.mobile-bottom-navigation', '[data-profile-domains], [data-my-tests-dashboard]'].includes(target.selector));
      assert.notEqual(fault, target.selector === '.mobile-bottom-navigation' ? 'public bar on private account' : 'authenticated records');
      calls.push(['absent', target.selector]);
    },
  });
  await new Function('assert', 'expect', 'origin', helper + '; return assertAnonymousPrivateNavigation;')(assert, expect, origin)(page);
  assert.deepEqual(calls, [
    ['goto', origin + '/en/app/portrait', { waitUntil: 'networkidle' }],
    ['absent', '.mobile-bottom-navigation'], ['absent', '[data-profile-domains], [data-my-tests-dashboard]'],
  ]);
}
test('actual separate private-account verifier requires signed-out entry and hidden public navigation', () => scenario());
for (const fault of ['failed response', 'wrong route', 'public CSP', 'wrong exit', 'missing anonymous entry', 'public bar on private account', 'authenticated records']) test('private-account verifier rejects ' + fault, () => assert.rejects(scenario(fault)));

test('real CSP journey uses public Tests while retaining media, private absence and history assertions', () => {
  assert.match(source, /mobile-bottom-navigation a\[href="\/en\/client\/tests"\]/);
  assert.doesNotMatch(source, /mobile-bottom-navigation a\[href="\/en\/client"\]/);
  assert.equal(source.split("toHaveURL(origin + '/en/client/tests')").length - 1, 2, 'initial entry and history return');
  assert.match(source, /discoveryBottom\.locator\('\[data-nav-item="tests"\]'\)\)\.toHaveAttribute\('aria-current', 'page'\)/);
  assert.match(source, /discoveryBottom\.locator\('\[data-nav-item="house"\]'\)\)\.toHaveAttribute\('href', '\/en\/app'\)/);
  assert.match(source, /const privatePage = await cspContext\.newPage\(\);[\s\S]*?await assertAnonymousPrivateNavigation\(privatePage\);[\s\S]*?finally \{ await privatePage\.close\(\); \}/);
  assert.match(source, /privatePage\.on\('pageerror', error => cspErrors\.push/);
  assert.match(source, /const privateWordmark = cspPage\.locator\('\.house-header--services \.house-wordmark'\);\s+await expect\(privateWordmark\)\.toHaveCount\(1\)/);
  assert.match(source, /window\.__cspViolations\.includes\('frame-src'\)/);
  assert.match(source, /privateBottomNavigationAbsent: true, publicTestsNavigationVerified: true/);
  assert.match(source, /assert\.deepEqual\(cspErrors, \[\]/);
  assert.match(source, /assert\.deepEqual\(unexpectedErrors, \[\]/);
  for (const phase of ['back-to-private', 'forward-to-public-home', 'forward-to-public', 'forward-to-tantra']) assert.ok(source.includes("historyPhase = '" + phase + "'"));
});
