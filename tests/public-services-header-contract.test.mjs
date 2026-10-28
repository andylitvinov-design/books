import {removeAnonymousPortraitAdditions} from './helpers/anonymous-portrait-source-normalization.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getSiteNavigation } from '../lib/site-navigation-model.js';

// Retain the original header assertions; the full fixture-wrapped block is exercised separately.
const source = removeAnonymousPortraitAdditions(readFileSync(new URL('../scripts/verify-public-services-production.mjs', import.meta.url), 'utf8'));
const start = source.indexOf('      const header = page.locator("header.house-header--services");');
const end = source.indexOf('      await assertViewport', start);
assert.ok(start >= 0 && end > start, 'Extract the real public-header acceptance block');
const verify = new (Object.getPrototypeOf(async function () {}).constructor)('page', 'expect', 'visible', 'assert', 'locale', 'width', source.slice(start, end));

function fixture(locale, width, changes = {}) {
  let menuOpen = false, dialogOpen = false;
  const cabinet = { count: 1, visible: true, bounds: { x: 5, width: 90 },
    attributes: { 'aria-haspopup': 'dialog', 'aria-controls': 'home-personal-space-dialog' }, ...changes.cabinet,
    async click() { if (!changes.cannotOpenDialog) dialogOpen = true; },
    getAttribute: async name => name === 'aria-expanded' ? String(changes.staleExpanded ? false : dialogOpen) : cabinet.attributes[name],
  };
  const library = { count: 1, visible: true, href: `/${locale}/library`,
    text: { en: 'Library', ru: 'Библиотека', es: 'Biblioteca' }[locale],
    bounds: { x: 5, width: 120 }, ...changes.library, getAttribute: async () => library.href };
  for (const item of [cabinet, library]) item.boundingBox = async () => item.bounds;
  const trigger = { visible: true, bounds: { x: 230, width: 70 }, ...changes.trigger,
    async click() { menuOpen = !menuOpen; }, async boundingBox() { return this.bounds; } };
  const title = { visible: !changes.hiddenDialogTitle };
  const close = { first() { return this; }, async click() { if (!changes.cannotCloseDialog) dialogOpen = false; } };
  const dialog = {
    getAttribute: async name => { assert.equal(name, 'open'); return dialogOpen ? '' : null; },
    locator(selector) {
      if (selector === '#hh-my-space-title') return title;
      assert.equal(selector, 'header button[type="button"]'); return close;
    },
  };
  const menu = {
    getAttribute: async name => { assert.equal(name, 'open'); return menuOpen ? '' : null; },
    locator(selector) {
      if (selector === 'summary.site-main-menu-trigger') return trigger;
      assert.equal(selector, `.site-main-menu-panel a[href="/${locale}/library"]`); return library;
    },
  };
  const header = { locator(selector) {
    if (selector === 'button.site-cabinet-entry') return cabinet;
    assert.equal(selector, 'details.site-main-menu'); return menu;
  } };
  const page = { locator(selector) {
    if (selector === 'dialog#home-personal-space-dialog') return dialog;
    assert.equal(selector, 'header.house-header--services'); return header;
  } };
  const expect = item => ({
    toHaveCount: async n => assert.equal(item.count, n),
    toHaveText: async text => assert.equal(item.text, text),
    toHaveAttribute: async (name, value) => assert.equal(await item.getAttribute(name), value),
    not: { toHaveAttribute: async (name, value) => assert.notEqual(await item.getAttribute(name), value) },
  });
  const visible = async item => {
    assert.equal(item.visible, true);
    if (item === library) assert.equal(menuOpen, true);
    if (item === title) assert.equal(dialogOpen, true);
  };
  return async () => {
    await verify(page, expect, visible, assert, locale, width);
    assert.equal(dialogOpen, false, 'My Space closes before remaining layout checks');
    assert.equal(menuOpen, false, 'Menu closes before remaining layout checks');
  };
}

for (const locale of ['en', 'ru', 'es']) for (const width of [320, 360, 390, 1188]) {
  test(`canonical header retains My Space dialog and reachable Library ${locale}/${width}`, fixture(locale, width));
}
for (const [name, changes] of [
  ['hidden menu trigger', { trigger: { visible: false } }],
  ['overflowing menu trigger', { trigger: { bounds: { x: 300, width: 70 } } }],
  ['missing My Space', { cabinet: { count: 0 } }],
  ['wrong dialog target', { cabinet: { attributes: { 'aria-haspopup': 'dialog', 'aria-controls': 'wrong-dialog' } } }],
  ['hidden My Space', { cabinet: { visible: false } }],
  ['overflowing My Space', { cabinet: { bounds: { x: 300, width: 90 } } }],
  ['dialog cannot open', { cannotOpenDialog: true }],
  ['dialog cannot close', { cannotCloseDialog: true }],
  ['missing dialog title', { hiddenDialogTitle: true }],
  ['stale expanded state', { staleExpanded: true }],
  ['missing Library', { library: { count: 0 } }],
  ['hidden Library', { library: { visible: false } }],
  ['wrong Library route', { library: { href: '/en/app' } }],
  ['legacy Books alias instead of Library hub', { library: { href: '/en/books' } }],
  ['wrong Library label', { library: { text: 'Cabinet' } }],
  ['overflowing Library', { library: { bounds: { x: -20, width: 90 } } }],
]) test(`header acceptance rejects ${name}`, async () => {
  await fixture('en', 320)();
  await assert.rejects(fixture('en', 320, changes), { code: 'ERR_ASSERTION' });
});

test('header acceptance follows the canonical Library model without relaxing unrelated assertions', () => {
  for (const locale of ['en', 'ru', 'es']) {
    assert.equal(getSiteNavigation(locale).find(item => item.id === 'library')?.href, '/' + locale + '/library');
  }
  assert.ok(source.includes('button.site-cabinet-entry'));
  assert.ok(source.includes('await assertViewport(page, locale + "/services/" + width)'));
  assert.ok(source.includes('assert.deepEqual(diagnostics.pageErrors, []'));
  assert.ok(source.includes('"Unexpected browser console errors"'));
});
