import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { exercisePublicEnquiryUi, assertPublicEnquiryFixture } from '../scripts/helpers/public-enquiry-ui-verifier.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

for (const locale of ['en', 'ru', 'es']) {
  for (const kind of ['tantra-initiation', 'yggdrasil-initiation', 'academy-tantra']) {
    test(locale + ' actual ' + kind + ' follows strict held-response save gate without opening messenger', async () => {
      const mounted = mountPublicConversion(locale, kind);
      const { page, expect } = mounted;
      const choosers = page.locator('[data-contact-channel-chooser]');
      await expect(choosers).toHaveCount(kind === 'tantra-initiation' ? 5 : 1);
      for (const index of kind === 'tantra-initiation' ? [0, 4] : [0]) {
        await exercisePublicEnquiryUi(page, choosers.nth(index), expect, { locale, kind, scopeIsChooser: true });
      }
      if (kind === 'yggdrasil-initiation') {
        await page.locator('button[data-intent="personal"]').click();
        await exercisePublicEnquiryUi(page, choosers, expect, { locale, kind, scopeIsChooser: true,
          requiredMessage: [locale === 'ru' ? 'ЛИЧНУЮ' : 'PERSONAL', '€100', '60'] });
      }
      assert.equal(mounted.fetchCount(), kind === 'academy-tantra' ? 4 : 8);
      assert.equal(mounted.externalClicks(), 0);
      assert.equal(mounted.intercepted(), false);
    });
  }

}

test('actual Temple chooser retains its selected tradition, deity and initiation through save gate', async () => {
  const mounted = mountPublicConversion('en', 'temple-initiation');
  const { page, expect } = mounted;
  await expect(page.locator('[data-contact-channel-chooser]')).toHaveCount(0);
  for (const step of ['tradition', 'deity', 'initiation']) await page.locator('[data-temple-step="' + step + '"]').locator('button').first().click();
  await exercisePublicEnquiryUi(page, page.locator('[data-contact-channel-chooser]'), expect,
    { locale: 'en', kind: 'temple-initiation', scopeIsChooser: true, requiredMessage: ['Greek', 'Aphrodite', 'Meditation–initiation'] });
  assert.equal(mounted.fetchCount(), 4);
  assert.equal(mounted.externalClicks(), 0);
});

for (const kind of ['tantra-initiation', 'yggdrasil-initiation', 'academy-tantra', 'temple-initiation']) {
  test(kind + ' fixture refuses a wrong public route and any external origin', () => {
    for (const url of ['https://holistichouse.vercel.app/en/academy', 'http://127.0.0.1:3100/en/services/dao-health-profile']) {
      assert.throws(() => assertPublicEnquiryFixture({ url: () => url }, kind, 'en'));
    }
  });
}

test('chooser CLI rejects live, external or unapproved fixture execution before loading browser', () => {
  const source = read('scripts/verify-contact-channel-chooser-browser.mjs');
  const guard = source.slice(source.indexOf('if (process.argv.includes'), source.indexOf('const require ='));
  for (const [argv, env] of [
    [['--live'], { HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' }],
    [[], { HH_PUBLIC_QA_ORIGIN: 'https://holistichouse.vercel.app', HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' }],
    [[], {}],
  ]) assert.throws(() => runInNewContext(guard, { process: { argv, env } }));
  runInNewContext(guard, { process: { argv: [], env: { HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' } } });
  for (const gate of ['b.width >= 100 && b.height >= 44', 'document.elementFromPoint', 'page.keyboard.press("Enter")',
    'await link.scrollIntoViewIfNeeded()', '[320,390,1188]', '["en","ru","es"]', 'runEngine("webkit",webkit)', 'networkGuard.assertNoUnexpectedRequests()', 'backendPersistenceVerified:false']) assert.ok(source.includes(gate), gate);
  assert.doesNotMatch(source, /Where would you like to send your request/);
});

test('academy fixture rejects a wrong course title at its first request', async () => {
  const mounted = mountPublicConversion('en', 'academy-tantra', 'wrong academy service');
  await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-contact-channel-chooser]'), mounted.expect,
    { locale: 'en', kind: 'academy-tantra', scopeIsChooser: true }));
  assert.equal(mounted.fetchCount(), 1);
});

test('direct-chooser mode refuses a non-chooser scope instead of relaxing uniqueness', async () => {
  const mounted = mountPublicConversion('en', 'academy-tantra');
  await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-academy-course-capture]'), mounted.expect,
    { locale: 'en', kind: 'academy-tantra', scopeIsChooser: true }));
  assert.equal(mounted.fetchCount(), 0);
});

for (const kind of ['tantra-initiation', 'yggdrasil-initiation', 'academy-tantra', 'temple-initiation']) {
  test(kind + ' rejects an arbitrary submitted service title rather than authorizing an open-ended fixture', async () => {
    const mounted = mountPublicConversion('en', kind, 'wrong service title');
    if (kind === 'temple-initiation') {
      for (const step of ['tradition', 'deity', 'initiation']) await mounted.page.locator('[data-temple-step="' + step + '"]').locator('button').first().click();
    }
    await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-contact-channel-chooser]').first(), mounted.expect,
      { locale: 'en', kind, scopeIsChooser: true }));
    assert.equal(mounted.fetchCount(), 1);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}
