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
      assert.equal(target.selector, 'body'); assert.equal(name, 'data-csp-class'); assert.equal(value, 'private'); assert.notEqual(fault, 'public CSP');
    },
    async toHaveCount(value) {
      assert.equal(value, 0);
      assert.ok(['.mobile-bottom-navigation', '[data-profile-domains], [data-my-tests-dashboard]'].includes(target.selector));
      assert.notEqual(fault, target.selector === '.mobile-bottom-navigation' ? 'public bar on private account' : 'authenticated records');
      calls.push(['absent', target.selector]);
    },
  });
  // The shared source-bound guest helper owns its DOM, h1, exact exit links,
  // availability and absence checks; this test verifies the real caller binding.
  const assertCabinetGuestEntry = async (target, actualExpect) => {
    assert.equal(target, page); assert.equal(actualExpect, expect);
    assert.notEqual(fault, 'wrong exit'); assert.notEqual(fault, 'missing anonymous entry');
    calls.push(['guest-entry']);
  };
  await new Function('assert', 'expect', 'origin', 'assertCabinetGuestEntry', helper + '; return assertAnonymousPrivateNavigation;')(assert, expect, origin, assertCabinetGuestEntry)(page);
  assert.deepEqual(calls, [
    ['goto', origin + '/en/app/portrait', { waitUntil: 'networkidle' }],
    ['guest-entry'],
    ['absent', '.mobile-bottom-navigation'], ['absent', '[data-profile-domains], [data-my-tests-dashboard]'],
  ]);
}
test('actual separate private-account verifier requires signed-out entry and hidden public navigation', () => scenario());
for (const fault of ['failed response', 'wrong route', 'public CSP', 'wrong exit', 'missing anonymous entry', 'public bar on private account', 'authenticated records']) test('private-account verifier rejects ' + fault, () => assert.rejects(scenario(fault)));

test('real CSP journey uses public Tests while retaining media, private absence and history assertions', () => {
  assert.match(source, /import \{ assertCabinetGuestEntry \} from '\.\/helpers\/cabinet-guest-entry-verifier\.mjs';/);
  assert.equal(helper.split('await assertCabinetGuestEntry(page, expect);').length - 1, 1);
  assert.doesNotMatch(helper, /\.hh-entry|\.hh-text-link/);
  assert.match(source, /mobile-bottom-navigation a\[href="\/en\/client\/tests"\]/);
  assert.doesNotMatch(source, /mobile-bottom-navigation a\[href="\/en\/client"\]/);
  assert.equal(source.split("toHaveURL(origin + '/en/client/tests')").length - 1, 2, 'initial entry and history return');
  assert.match(source, /discoveryBottom\.locator\('\[data-nav-item="tests"\]'\)\)\.toHaveAttribute\('aria-current', 'page'\)/);
  assert.match(source, /discoveryBottom\.locator\('\[data-nav-item="house"\]'\)\)\.toHaveAttribute\('href', '\/en\/app'\)/);
  assert.match(source, /const privatePage = await cspContext\.newPage\(\);[\s\S]*?await assertAnonymousPrivateNavigation\(privatePage\);[\s\S]*?finally \{ await privatePage\.close\(\); \}/);
  const privateCatch = source.slice(source.indexOf('const privatePage = await'), source.indexOf('// Leave discovery through'));
  assert.match(privateCatch, /privatePage\.evaluate\(\(\) => \(\{ path: location\.pathname, documentClass: document\.body\?\.dataset\.cspClass \}\)\)/);
  assert.match(privateCatch, /Anonymous portrait entry failed; privateDocument=/);
  assert.doesNotMatch(privateCatch, /location\.(?:href|search|hash)|cspPage\.evaluate/);
  assert.match(source, /privatePage\.on\('pageerror', error => cspErrors\.push/);
  assert.match(source, /const privateWordmark = cspPage\.locator\('\.house-header--services \.house-wordmark'\);\s+await expect\(privateWordmark\)\.toHaveCount\(1\)/);
  assert.match(source, /window\.__cspViolations\.includes\('frame-src'\)/);
  assert.match(source, /privateBottomNavigationAbsent: true, publicTestsNavigationVerified: true/);
  assert.match(source, /assert\.deepEqual\(cspErrors, \[\]/);
  assert.match(source, /assert\.deepEqual\(unexpectedErrors, \[\]/);
  for (const phase of ['back-to-private', 'forward-to-public-home', 'forward-to-public', 'forward-to-tantra']) assert.ok(source.includes("historyPhase = '" + phase + "'"));
});
