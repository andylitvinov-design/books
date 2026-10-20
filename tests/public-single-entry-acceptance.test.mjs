import assert from 'node:assert/strict';
import test from 'node:test';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { publicEnquiryUiVariant } from '../scripts/helpers/public-enquiry-ui-verifier.mjs';
import { exerciseDaoRequestUi } from '../scripts/helpers/dao-request-ui-verifier.mjs';
import { exerciseFreeSituationRequestUi } from '../scripts/helpers/free-situation-ui-verifier.mjs';

// Final source composition: CRM single entry plus the owner-approved optional
// private note and country picker. The actual static Spanish route is retained.
// This is executed TSX/hook evidence, not mounted React, browser layout or storage.
test('public acceptance selects one explicit single-entry contract, not an optional legacy fallback', () => {
  assert.equal(publicEnquiryUiVariant, 'crm-single-entry-optional-private-note-v2');
});
const topicName = { en: 'What would you like to explore?', ru: 'Какой вопрос хотите исследовать?', es: '¿Qué te gustaría explorar?' };
function assertNoAutomaticRequests(mounted) {
  // Rendering is lazy in this VM: select actual nodes before inspecting attempts.
  assert.equal(mounted.page.locator('[data-free-resource-enquiry]').selected().length, 1);
  assert.equal(mounted.fetchCount(), 0, 'No automatic request may be attempted, even if denied or caught');
}
for (const fault of ['automatic mount post', 'automatic topic post']) {
  test('single-entry no-auto-post guard rejects ' + fault, async () => {
    const mounted = mountPublicConversion('en', 'dao', fault);
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault));
    if (fault === 'automatic topic post') {
      assertNoAutomaticRequests(mounted);
      await mounted.page.locator('[data-free-resource-enquiry]').getByRole('combobox', { name: topicName.en, exact: true }).selectOption('1');
    }
    assert.throws(() => assertNoAutomaticRequests(mounted), /No automatic request may be attempted/);
    assert.equal(mounted.fetchCount(), 1, 'The rejected attempt is counted before endpoint or interception assertions');
    assert.deepEqual(mounted.requests, [], 'No denied attempt reaches the synthetic response fixture');
    assert.equal(mounted.intercepted(), false);
    assert.equal(mounted.externalClicks(), 0);
    mounted.unmount();
  });
}
for (const locale of ['en', 'ru', 'es']) for (const kind of ['dao', 'situation']) {
  for (const contactMode of ['email', 'phone']) for (const noteMode of ['absent', 'supplied']) {
    test(`${locale} actual ${kind} single-entry route permits ${contactMode}-only with ${noteMode} private note, consent, topic, no auto-post and saved-only handoff`, async () => {
      const mounted = mountPublicConversion(locale, kind);
      assertNoAutomaticRequests(mounted);
      await mounted.page.locator('[data-free-resource-enquiry]').getByRole('combobox', { name: topicName[locale], exact: true }).selectOption('1');
      assertNoAutomaticRequests(mounted);
      if (kind === 'dao' && locale === 'es') {
        assert.equal(mounted.page.locator('main[data-free-entry-landing="dao"]').selected().length, 1);
        assert.equal(mounted.page.locator('header[data-test-public-header]').selected().length, 1);
        assert.equal(mounted.page.locator('main[data-core-service-detail="dao"]').selected().length, 0);
      }
      const run = kind === 'dao' ? exerciseDaoRequestUi : exerciseFreeSituationRequestUi;
      const result = await run(mounted.page, mounted.expect, locale, { contactMode, noteMode });
      assert.equal(result.mockedSave, true);
      assert.equal(result.requestCount, 4, 'Three unconfirmed fixtures never unlock links; fourth confirms only the mock');
      assert.equal(mounted.fetchCount(), result.requestCount);
      for (const body of mounted.requests) {
        assert.equal(body.contact.displayName, 'Synthetic Visitor');
        assert.equal(body.contact.email, contactMode === 'email' ? 'visitor@example.test' : '');
        assert.equal(body.contact.phone, contactMode === 'phone' ? '+447700900123' : '');
        assert.equal(body.contactConsent, true);
        assert.equal(body.description, noteMode === 'absent' ? '' : 'Synthetic private ' + kind + ' note for ' + locale + '.');
      }
      assert.deepEqual(mounted.copiedValues, [], 'Quick entry never copies privately entered text automatically');
      assert.deepEqual(mounted.events, []);
      assert.equal(mounted.externalClicks(), 0);
      assert.equal(mounted.intercepted(), false);
      mounted.unmount();
      assert.deepEqual(mounted.writesAfterUnmount, []);
    });
  }
}
