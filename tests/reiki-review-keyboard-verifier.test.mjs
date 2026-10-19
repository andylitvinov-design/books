import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReviewKeyboardAccess } from '../scripts/helpers/reiki-review-keyboard-verifier.mjs';

function fixture(locale, options = {}) {
  const text = 'Original review';
  const element = { textContent: text, scrollTop: 7, clientHeight: options.uncapped ? 10000 : 85,
    get scrollHeight() { return options.long ? 500 : this.textContent.length; } };
  const attributes = { role: 'region', 'aria-label': locale === 'ru' ? 'Отзыв участника' : 'Learner review', tabindex: '0', ...options.attributes };
  let focused = false;
  const presses = [];
  const paragraph = {
    evaluate: async (fn, arg) => fn(element, arg),
    focus: async () => { focused = !options.unfocusable; },
  };
  const keyboard = { press: async key => {
    presses.push(key);
    if (key === 'Shift+Tab') { if (!options.trappedFocus) focused = false; return; }
    if (key === 'Tab') { if (!options.skippedFocus) focused = true; return; }
    if (options.throwPress) throw new Error('keyboard failed');
    if (!options.noScroll) element.scrollTop = 50;
  },
  };
  const expect = () => ({
    toHaveAttribute: async (key, value) => assert.equal(attributes[key], value),
    toBeFocused: async () => assert.equal(focused, true),
    not: { toBeFocused: async () => assert.equal(focused, false) },
  });
  expect.poll = fn => ({ toBeGreaterThan: async min => assert.ok(await fn() > min) });
  return { element, paragraph, keyboard, expect, presses, text };
}
for (const locale of ['en', 'ru']) {
  for (const long of [true, false]) test(`${locale}: ${long ? 'real' : 'synthetic'} overflow proves keyboard scrolling and restores content`, async () => {
    const f = fixture(locale, { long });
    assert.deepEqual(await assertReviewKeyboardAccess(f.paragraph, locale, f.expect, f.keyboard), { originalOverflow: long, syntheticOverflow: !long });
    assert.deepEqual(f.presses, ['Shift+Tab', 'Tab', 'PageDown']);
    assert.equal(f.element.textContent, f.text); assert.equal(f.element.scrollTop, 7);
  });
  for (const [name, options] of Object.entries({ trappedFocus: { trappedFocus: true }, skippedFocus: { skippedFocus: true }, missingRole: { attributes: { role: undefined } }, wrongLocale: { attributes: { 'aria-label': 'wrong' } }, missingFocus: { attributes: { tabindex: undefined } }, unfocusable: { unfocusable: true }, noScroll: { noScroll: true }, noOverflow: { uncapped: true }, keyboardError: { throwPress: true } })) {
    test(`${locale}: rejects ${name}`, async () => {
      const f = fixture(locale, options);
      await assert.rejects(assertReviewKeyboardAccess(f.paragraph, locale, f.expect, f.keyboard));
      assert.equal(f.element.textContent, f.text); assert.equal(f.element.scrollTop, 7);
    });
  }
}

test('hosted journey invokes proof before carousel navigation and retains loopback/error gates', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../scripts/verify-reiki-all-slides-browser.mjs', import.meta.url), 'utf8');
  assert.match(source, /assertReviewKeyboardAccess\(carousel\.locator\("blockquote p"\), locale, expect, page\.keyboard\)/);
  assert.ok(source.indexOf('const keyboardProof') < source.indexOf('const first = await carousel'));
  assert.match(source, /Never browse a real account or production site/);
  assert.match(source, /assert\.deepEqual\(pageErrors,\[\],"No unexpected browser JavaScript exceptions"\)/);
});
