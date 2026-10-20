import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertDaoLandingReady, exerciseDaoRequestUi } from '../scripts/helpers/dao-request-ui-verifier.mjs';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const mountDao = (locale, fault = '', origin) => mountPublicConversion(locale, 'dao', fault, origin);

for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' actual DAO landing and save-gated request UI pass without real persistence or messenger clicks', async () => {
    const mounted = mountDao(locale);
    assert.equal(mounted.page.locator('main[data-core-service-detail="dao"]').selected().length, 0,
      'The actual route must retain the free-entry landing, including the static Spanish route');
    await assertDaoLandingReady(mounted.page, mounted.expect, locale);
    assert.deepEqual(await exerciseDaoRequestUi(mounted.page, mounted.expect, locale),
      { requestCount: 4, mockedSave: true, messengerLinksOpened: false });
    assert.equal(mounted.fetchCount(), 4);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}

for (const [fault, expectedRequests] of [
  ['wrong service', 0], ['wrong heading', 0], ['missing enquiry', 0], ['duplicate enquiry', 0], ['broken primary anchor', 0],
  ['hidden name', 0], ['hidden question', 0], ['hidden save form', 0],
  ['blocked trigger', 0], ['accept failed save', 1], ['accept unsaved response', 2], ['accept invalid reference', 3],
  ['links while pending', 1], ['submit enabled while pending', 1], ['details editable while pending', 1],
  ['lose description', 1], ['wrong recipient', 4], ['missing telegram', 4], ['stale topic', 4],
  ['duplicate name entry', 0], ['duplicate description entry', 0], ['missing qualification', 4],
]) {
  test('DAO acceptance rejects ' + fault, async () => {
    const mounted = mountDao('en', fault);
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault), 'Intended mutation applied: ' + fault);
    await assert.rejects(() => exerciseDaoRequestUi(mounted.page, mounted.expect, 'en'), error => {
      assert.equal(error.code, 'ERR_ASSERTION');
      assert.match(error.stack, /assertDaoLandingReady|assertSingleEntryEnquiryUi|exercisePublicEnquiryUi|assertPreparedContactChannels/);
      return true;
    });
    assert.equal(mounted.fetchCount(), expectedRequests, 'Mutation reaches its expected failing stage, not an unrelated earlier failure');
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false, 'Scoped interception is removed even on failure');
  });
}

test('DAO mocked request flow refuses production origin before any request or interception', async () => {
  const mounted = mountDao('en', '', 'https://holistichouse.vercel.app');
  await assert.rejects(() => exerciseDaoRequestUi(mounted.page, mounted.expect, 'en'), /127/);
  assert.equal(mounted.fetchCount(), 0);
  assert.equal(mounted.intercepted(), false);
});

test('drawing preparation helper clicks only the explicitly named prepare button', () => {
  assert.match(read('scripts/helpers/free-situation-ui-verifier.mjs'),
    /await intake\.getByRole\('button', \{ name: text\.prepare, exact: true \}\)\.click\(\)/);
});
