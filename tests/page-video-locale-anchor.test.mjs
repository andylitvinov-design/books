import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/verify-page-video-release.mjs', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('async function chooseRussianHome('), source.indexOf('async function exercise('));
assert.ok(helper.includes('toHaveCount(1)'));
async function run({ menus = 1, links = 1, href = '/ru', destination = '/ru', blocked = false } = {}) {
  const origin = 'https://example.test';
  let url = origin + '/', opened = false, clicked = false;
  const link = { kind: 'link', count: links, async click() { assert.ok(opened); clicked = true; if (!blocked) url = origin + destination; } };
  const menu = { kind: 'menu', count: menus, locator(selector) {
    if (selector === '.site-language-menu-trigger') return { async click() { opened = true; } };
    assert.equal(selector, 'a[lang="ru"]'); return link;
  } };
  const page = { locator(selector) { assert.equal(selector, '.site-language-menu'); return menu; } };
  const expect = actual => ({
    async toHaveCount(expected) { assert.equal(actual.count, expected); },
    async toHaveAttribute(name, expected) { assert.equal(actual, link); assert.equal(name, 'href'); assert.equal(href, expected); },
    async toHaveURL(expected) { assert.equal(actual, page); assert.equal(url, expected); },
  });
  await new Function('expect', 'origin', `${helper}; return chooseRussianHome;`)(expect, origin)(page);
  assert.equal(clicked, true);
}
test('actual video verifier switches through a unique canonical Russian home anchor', async () => { await run(); });
for (const [name, input] of Object.entries({
  'missing menu': { menus: 0 }, 'duplicate menu': { menus: 2 },
  'missing link': { links: 0 }, 'duplicate link': { links: 2 },
  'legacy query href': { href: '/?lang=ru' }, 'wrong language href': { href: '/es' },
  'wrong destination': { destination: '/es' }, 'legacy query destination': { destination: '/?lang=ru' },
  'blocked click': { blocked: true },
})) test(`actual video locale helper rejects ${name}`, async () => { await assert.rejects(run(input)); });
test('video identity, reset, hydration, geometry and runtime-error assertions remain intact', () => {
  assert.match(source, /await expect\(russian\.locator\('iframe'\)\)\.toHaveCount\(0\)/);
  assert.match(source, /await russian\.locator\('\.site-video-play'\)\.click\(\)/);
  assert.match(source, /cases\[5\]\[3\]/);
  assert.match(source, /assert\.deepEqual\(pageErrors, \[\], 'Unexpected page JavaScript errors'\)/);
  assert.match(source, /await expect\(play\)\.toBeDisabled\(\)/);
  assert.match(source, /Responsive 16:9/);
  assert.match(source, /results\.filter\(item => item\.compact\)\.length, 32/);
});
