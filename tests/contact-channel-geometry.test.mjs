import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { collectContactChannelGeometry } from '../scripts/helpers/contact-channel-geometry.mjs';

function fixture({ top = 700, bottom = 748, overlay = false, navVisible = false, missing = false, wrongAnchor = false } = {}) {
  const rect = (top, bottom, width = 220) => ({ top, bottom, left: 50, right: 50 + width, width, height: bottom - top,
    toJSON() { const { toJSON, ...value } = this; return value; } });
  const element = (tag, id, bounds, attributes = {}) => ({
    tagName: tag.toUpperCase(), id, className: 'fixture-' + id,
    getAttribute(name) { return attributes[name] ?? null; },
    getBoundingClientRect() { return bounds; },
    scrollTop: 0, scrollHeight: bounds.height, clientHeight: bounds.height,
    value: 'PRIVATE-CONTACT-MUST-NOT-APPEAR',
    outerHTML: '<input value="PRIVATE-CONTACT-MUST-NOT-APPEAR">',
    textContent: 'PRIVATE-CONTACT-MUST-NOT-APPEAR',
  });
  const panel = element('div', 'panel-fixture', rect(500, 850));
  const anchor = element('a', 'telegram-fixture', rect(top, bottom), { 'data-contact-channel': 'telegram' });
  anchor.parentElement = panel;
  const other = element('a', 'other-telegram', rect(top, bottom), { 'data-contact-channel': 'telegram' });
  const blocker = element('header', 'sticky-header', rect(0, 90));
  const nav = element('nav', 'mobile-nav', rect(781, 844, 320));
  panel.querySelector = selector => {
    assert.equal(selector, 'a[data-contact-channel="telegram"]');
    return missing ? null : anchor;
  };
  const hit = overlay ? blocker : wrongAnchor ? other : anchor;
  hit.closest = selector => {
    assert.equal(selector, 'a[data-contact-channel="telegram"]');
    return overlay ? null : hit;
  };
  const calls = [];
  const document = {
    getElementById(id) { assert.equal(id, 'panel-fixture'); return panel; },
    querySelector(selector) { assert.equal(selector, '.mobile-bottom-navigation'); return nav; },
    elementFromPoint(x, y) { calls.push({ x, y }); return hit; },
    elementsFromPoint() { return [hit, panel]; },
    scrollingElement: { scrollHeight: 9000 },
  };
  const context = {
    document, window: { visualViewport: { width: 320, height: 844, offsetTop: 0, offsetLeft: 0, scale: 1 } },
    innerWidth: 320, innerHeight: 844, scrollX: 0, scrollY: 7963,
    getComputedStyle(node) { return {
      display: 'block', visibility: node === nav && !navVisible ? 'hidden' : 'visible',
      pointerEvents: node === nav && !navVisible ? 'none' : 'auto',
      position: node === blocker ? 'sticky' : node === nav ? 'fixed' : 'static',
      zIndex: node === nav ? '50' : 'auto', overflowX: 'visible', overflowY: 'visible',
      contain: 'none', transform: 'none', scrollMarginTop: '0px', scrollMarginBottom: '87px',
    }; },
  };
  // No DOM mutator or network API is available to the serialized diagnostic.
  const result = runInNewContext('(' + collectContactChannelGeometry.toString() + ')({channel:"telegram",panelId:"panel-fixture"})', context);
  return { result: JSON.parse(JSON.stringify(result)), calls };
}

test('hidden bottom nav geometry is not misreported as the hit obstruction', () => {
  const { result, calls } = fixture();
  assert.equal(result.reason, 'reachable');
  assert.equal(result.nav.rect.top, 781);
  assert.equal(result.nav.style.visibility, 'hidden');
  assert.equal(result.nav.style.pointerEvents, 'none');
  assert.equal(result.hitIsIntendedAnchor, true);
  assert.deepEqual(calls, [{ x: 160, y: 742 }]);
  assert.equal(result.ancestors[0].element.className, 'fixture-panel-fixture');
  assert.equal(result.viewport.scrollY, 7963);
  assert.match(result.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(Object.keys(result.hit).sort(), ['className', 'tag']);
});

test('offscreen links and a genuine blocking hit target remain distinct', () => {
  assert.equal(fixture({ top: -30, bottom: 18 }).result.reason, 'outside-viewport');
  assert.equal(fixture({ top: 810, bottom: 858 }).result.reason, 'outside-viewport');
  const { result } = fixture({ overlay: true });
  assert.equal(result.reason, 'hit-target-obstructed');
  assert.equal(result.hit.className, 'fixture-sticky-header');
  assert.equal(result.closestChannel, null);
  assert.equal(result.hitStack[0].className, 'fixture-sticky-header');
});

test('a missing link or the same channel in a different panel cannot impersonate the target', () => {
  const { result, calls } = fixture({ missing: true });
  assert.equal(result.reason, 'missing-anchor');
  assert.equal(result.anchor, null);
  assert.equal(result.point, null);
  assert.deepEqual(calls, []);
  assert.equal(fixture({ wrongAnchor: true }).result.reason, 'different-channel-target');
});

test('failure evidence omits contact values, HTML, text and messenger URLs', () => {
  const serialized = JSON.stringify(fixture().result);
  assert.doesNotMatch(serialized, /PRIVATE-CONTACT|outerHTML|textContent|href|https:/);
});

test('strict mobile reachability stays in place; diagnostics run only after failure', () => {
  const source = readFileSync(new URL('../scripts/verify-contact-channel-chooser-browser.mjs', import.meta.url), 'utf8');
  assert.match(source, /if \(r\.top < 0 \|\| r\.bottom > innerHeight\) return false;/);
  assert.match(source, /document\.elementFromPoint\(r\.left \+ r\.width \/ 2, r\.bottom - 6\)/);
  assert.match(source, /\.catch\(async error => \{\s+const diagnostic = await page\.evaluate\(collectContactChannelGeometry, \{ channel, panelId \}\);/);
  assert.match(source, /throw new Error\("Messenger channel obstructed: "/);
});
