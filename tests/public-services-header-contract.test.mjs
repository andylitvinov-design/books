import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../scripts/verify-public-services-production.mjs', import.meta.url), 'utf8');
const start = source.indexOf('      // Canonical header:');
const end = source.indexOf('      await assertViewport', start);
assert.ok(start >= 0 && end > start);
const verify = new (Object.getPrototypeOf(async function () {}).constructor)('page', 'expect', 'visible', 'assert', 'locale', 'width', source.slice(start, end));

function fixture(locale, width, changes = {}) {
  let open = false;
  const cabinet = { count: 1, visible: true, href: `/${locale}/app`, bounds: { x: 5, width: 90 }, ...changes.cabinet };
  const books = { count: 1, visible: true, href: `/${locale}/library?view=books`, text: locale === 'ru' ? 'Книги' : 'Books', bounds: { x: 5, width: 120 }, ...changes.books };
  for (const item of [cabinet, books]) {
    item.getAttribute = async () => item.href;
    item.boundingBox = async () => item.bounds;
  }
  const trigger = { visible: true, bounds: { x: 230, width: 70 }, ...changes.trigger, async click() { open = !open; }, async boundingBox() { return this.bounds; } };
  const menu = { locator(selector) {
    if (selector === 'summary.site-main-menu-trigger') return trigger;
    assert.equal(selector, `.site-main-menu-panel a[href="/${locale}/library?view=books"]`);
    return books;
  } };
  const header = { locator(selector) {
    if (selector === 'a.site-cabinet-entry') return cabinet;
    assert.equal(selector, 'details.site-main-menu'); return menu;
  } };
  const page = { locator(selector) { assert.equal(selector, 'header.house-header--services'); return header; } };
  const expect = item => ({
    toHaveCount: async n => assert.equal(item.count, n),
    toHaveText: async text => assert.equal(item.text, text),
    toHaveAttribute: async (name, value) => { assert.equal(name, 'open'); assert.equal(value, ''); assert.equal(open, true); },
    not: { toHaveAttribute: async () => assert.equal(open, false) },
  });
  const visible = async item => { assert.equal(item.visible, true); if (item === books) assert.equal(open, true); };
  return async () => { await verify(page, expect, visible, assert, locale, width); assert.equal(open, false, 'Menu closes before remaining layout checks'); };
}

for (const locale of ['en', 'ru']) for (const width of [320, 360, 390, 1188]) {
  test(`canonical header retains Cabinet and reachable Books ${locale}/${width}`, fixture(locale, width));
}
for (const [name, changes] of [
  ['hidden menu trigger', { trigger: { visible: false } }],
  ['overflowing menu trigger', { trigger: { bounds: { x: 300, width: 70 } } }],
  ['missing Cabinet', { cabinet: { count: 0 } }],
  ['wrong Cabinet locale', { cabinet: { href: '/ru/app' } }],
  ['hidden Cabinet', { cabinet: { visible: false } }],
  ['overflowing Cabinet', { cabinet: { bounds: { x: 300, width: 90 } } }],
  ['missing Books', { books: { count: 0 } }],
  ['hidden Books', { books: { visible: false } }],
  ['wrong Books route', { books: { href: '/en/app' } }],
  ['wrong Books label', { books: { text: 'Cabinet' } }],
  ['overflowing Books', { books: { bounds: { x: -20, width: 90 } } }],
]) test(`header acceptance rejects ${name}`, async () => { await assert.rejects(fixture('en', 320, changes)); });

test('Cabinet shortcut is verified without relaxing unrelated assertions', () => {
  assert.ok(source.includes('a.site-cabinet-entry'));
  assert.ok(source.includes('await assertViewport(page, locale + "/services/" + width)'));
  assert.ok(source.includes('assert.deepEqual(diagnostics.pageErrors, []'));
  assert.ok(source.includes('"Unexpected browser console errors"'));
});
