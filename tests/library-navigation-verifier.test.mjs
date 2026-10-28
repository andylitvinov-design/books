import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { activeNavigationId, getSiteNavigation } from '../lib/site-navigation-model.js';

const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8');
function libraryVerifier(currentSource = source) {
  const marker = '          const current = nav.locator(\'.site-main-menu-panel a[aria-current="page"]\')';
  const start = currentSource.indexOf(marker);
  const end = currentSource.indexOf('\n        } else {', start);
  assert.ok(start >= 0 && end > start, 'Extract the real library audit active-link assertions');
  return new (Object.getPrototypeOf(async function () {}).constructor)('nav', 'expect', 'locale', currentSource.slice(start, end));
}
async function verify(locale, { href = getSiteNavigation(locale).find(item => item.id === 'library')?.href, count = 1, currentSource = source } = {}) {
  const link = { href, count };
  const nav = { locator(selector) { assert.equal(selector, '.site-main-menu-panel a[aria-current="page"]'); return link; } };
  const expect = item => ({
    toHaveCount: async expected => assert.equal(item.count, expected, 'one active expanded-menu destination'),
    toHaveAttribute: async (name, expected) => { assert.equal(name, 'href'); assert.equal(item.href, expected, 'active destination follows the canonical Library hub'); },
  });
  await libraryVerifier(currentSource)(nav, expect, locale);
}

for (const locale of ['en', 'ru', 'es']) test(locale + ': library audit accepts the canonical hub without deleting the Books alias', async () => {
  assert.equal(getSiteNavigation(locale).find(item => item.id === 'library')?.href, '/' + locale + '/library');
  assert.equal(activeNavigationId('/' + locale + '/library'), 'library');
  assert.equal(activeNavigationId('/' + locale + '/books'), 'library');
  await verify(locale);
});
for (const [name, changes] of [
  ['Books alias replacing active hub', { href: '/en/books' }],
  ['wrong locale', { href: '/ru/library' }],
  ['missing active entry', { count: 0 }],
  ['duplicate active entry', { count: 2 }],
]) test('library audit rejects ' + name, async () => {
  await verify('en');
  await assert.rejects(verify('en', changes), { code: 'ERR_ASSERTION' });
});
test('library audit regression to the legacy Books expectation rejects the unchanged real model', async () => {
  await verify('en');
  const broken = source.replace("await expect(current).toHaveAttribute('href', '/' + locale + '/library')", "await expect(current).toHaveAttribute('href', '/' + locale + '/books')");
  assert.notEqual(broken, source, 'the actual assertion must be mutated');
  await assert.rejects(verify('en', { currentSource: broken }), { code: 'ERR_ASSERTION' });
});
