import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyHomeInlineAnalysis } from '../scripts/helpers/home-inline-analysis-verifier.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('scripts/verify-home-locale-switch.mjs');

function fixture(locale, fault = '') {
  const start = 'http://localhost/' + (locale === 'ru' ? 'ru' : '');
  const state = { selected: 'selfTest', open: false, url: start, clicks: [] };
  const kinds = {
    '[data-home-contact-capture] [data-home-free-capture]': 'capture',
    'button[data-home-free-option="analysis"]': 'option',
    '[data-contact-channel-chooser][data-compact-phone-trigger="true"]': 'chooser',
    'button[data-contact-order]': 'trigger',
    '[id="analysis-panel"]': 'panel',
    'input[type="tel"]': 'phone',
    'input[type="checkbox"]': 'consent',
    'a[data-contact-channel]': 'channels',
    '[data-home-featured-workspace] a[data-home-offer-primary="review"]': 'review',
  };
  const count = key => key === 'status' || key === 'channels'
    ? Number(fault === 'premature-' + key)
    : fault === 'missing-' + key ? 0 : fault === 'duplicate-' + key ? 2 : 1;
  const loc = key => ({ key, locator: selector => locate(selector),
    getByRole: role => { assert.equal(role, 'status'); return loc('status'); },
    getAttribute: async attr => {
      assert.equal(key, 'trigger'); assert.equal(attr, 'aria-controls');
      return fault === 'missing-controls' ? null : 'analysis-panel';
    },
    click: async () => {
      state.clicks.push(key);
      if (key === 'option') state.selected = 'analysis';
      else {
        assert.equal(key, 'trigger', 'No submit or provider link may be clicked');
        if (fault !== 'no-toggle' && !(fault === 'no-close' && state.open)) state.open = !state.open;
        if (fault === 'navigating-open') state.url = 'https://example.invalid/unwanted';
        if (!state.open && fault === 'navigating-close') state.url = start + '#unexpected-close';
        if (!state.open && fault === 'delayed-close') queueMicrotask(() => { state.url = start + '#delayed-close'; });
      }
    },
  });
  function locate(selector) { assert.ok(Object.hasOwn(kinds, selector), 'Known current selector: ' + selector); return loc(kinds[selector]); }
  const page = { locator: locate, url: () => state.url };
  const expect = actual => ({
    toHaveCount: async expected => assert.equal(count(actual.key), expected),
    toHaveAttribute: async (attr, expected) => {
      const value = attr === 'lang' ? fault === 'wrong-locale' ? 'en' : locale
        : attr === 'aria-pressed' ? String(state.selected === 'analysis')
          : attr === 'aria-expanded' ? String(state.open)
            : attr === 'href' ? '/' + (fault === 'wrong-route' ? 'es' : locale) + '/services/free-situation-review' : undefined;
      assert.notEqual(value, undefined); assert.equal(value, expected);
    },
    toBeVisible: async () => { assert.equal(count(actual.key), 1); assert.notEqual(fault, 'hidden-' + actual.key); if (['panel', 'phone'].includes(actual.key)) assert.equal(state.open, true); },
    toBeHidden: async () => { assert.equal(actual.key, 'panel'); assert.equal(state.open, false); },
    toHaveText: async expected => assert.equal(fault === 'wrong-label' ? 'Other' : locale === 'ru' ? 'Получить бесплатный личный разбор' : 'Get my free personal analysis', expected),
    toHaveValue: async expected => assert.equal(fault === 'prefilled-phone' ? '+14165550123' : '', expected),
    toHaveURL: async expected => { assert.equal(actual, page); assert.equal(state.url, expected); },
    not: { toBeChecked: async () => assert.equal(fault === 'prechecked-consent', false) },
  });
  return { page, expect, state };
}
for (const locale of ['en', 'ru']) test(locale + ' actual helper opens and closes only the inline action and retains the separate review route', async () => {
  const f = fixture(locale); const result = await verifyHomeInlineAnalysis(f.page, f.expect, locale);
  assert.deepEqual(f.state.clicks, ['option', 'trigger', 'trigger']);
  assert.equal(f.state.open, false); assert.equal(result.review.key, 'review');
});
for (const fault of ['missing-capture', 'duplicate-chooser', 'missing-trigger', 'missing-controls', 'wrong-locale', 'wrong-label', 'no-toggle', 'no-close', 'missing-phone', 'prefilled-phone', 'prechecked-consent', 'premature-status', 'premature-channels', 'navigating-open', 'navigating-close', 'delayed-close', 'missing-review', 'duplicate-review', 'hidden-review', 'wrong-route']) {
  test('actual inline helper rejects ' + fault, async () => {
    const f = fixture('ru', fault);
    await assert.rejects(verifyHomeInlineAnalysis(f.page, f.expect, 'ru'), { code: 'ERR_ASSERTION' });
  });
}

test('actual browser enquiry fence blocks a spontaneous pre-consent write in memory', async () => {
  const start = source.indexOf("    await page.route('**/api/service-enquiries**'");
  const end = source.indexOf("    for (const [from, to]", start);
  assert.ok(start > 0 && end > start);
  let handler; const forbiddenEnquiries = [];
  const page = { route: async (pattern, fn) => { assert.equal(pattern, '**/api/service-enquiries**'); handler = fn; } };
  await new Function('page', 'forbiddenEnquiries', 'return (async () => {' + source.slice(start, end) + '})()')(page, forbiddenEnquiries);
  const responses = [];
  await handler({ request: () => ({ method: () => 'POST' }), fulfill: value => responses.push(value) });
  assert.deepEqual(forbiddenEnquiries, [{ method: 'POST' }]);
  assert.equal(responses.length, 1); assert.equal(responses[0].status, 503);
  assert.equal(JSON.parse(responses[0].body).error, 'UNEXPECTED_ENTRY_SUBMISSION');
  const check = source.match(/assert\.deepEqual\(forbiddenEnquiries, \[\], "Opening analysis[^\n]+/);
  assert.ok(check);
  const verify = new Function('assert', 'forbiddenEnquiries', check[0]);
  verify(assert, []); assert.throws(() => verify(assert, forbiddenEnquiries), { code: 'ERR_ASSERTION' });
});

test('all three current analysis call sites use the tested helper without removing route journeys or first-click checks', () => {
  assert.equal((source.match(/await verifyHomeInlineAnalysis\(/g) || []).length, 3);
  assert.match(source, /\(\{ review: cta \} = await verifyHomeInlineAnalysis\(page, expect, locale\)\)/);
  assert.match(source, /Entry choices and navigation never submit an enquiry/);
  assert.match(source, /First-click YouTube iframe was discarded/);
  assert.match(source, /results\.filter\(result => result\.freeJourney\)\.length, widths\.length \* 12/);
  const workflow = read('.github/workflows/home-locale-switch.yml');
  assert.equal((workflow.match(/'scripts\/helpers\/home-inline-analysis-verifier\.mjs'/g) || []).length, 2);
  assert.match(workflow, /node --test tests\/home-inline-analysis-verifier\.test\.mjs tests\/home-locale-canonical-navigation\.test\.mjs/);
});
