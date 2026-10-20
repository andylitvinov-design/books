import assert from 'node:assert/strict';
import test from 'node:test';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { assertPublicEnquiryFixture, publicEnquiryContract, assertSingleEntryEnquiryUi, exercisePublicEnquiryUi } from '../scripts/helpers/public-enquiry-ui-verifier.mjs';
import { assertFreeSituationLandingReady, exerciseFreeSituationRequestUi, prepareDrawingIntakeUi } from '../scripts/helpers/free-situation-ui-verifier.mjs';

for (const locale of ['en', 'ru']) {
  test(locale + ' actual Alchemy personalized and price-card choosers retain selections, retry, and never pay or send', async () => {
    const mounted = mountPublicConversion(locale, 'alchemy');
    const { page, expect } = mounted;
    const form = page.locator('[data-alchemy-lead-form="single"]');
    await expect(form.locator('select')).toHaveCount(2);
    await assertSingleEntryEnquiryUi(form, expect);
    await form.locator('select').first().selectOption('30');
    await form.locator('select').nth(1).selectOption('business');
    await exercisePublicEnquiryUi(page, form, expect, { locale, kind: 'alchemy',
      requiredMessage: ['€50', locale === 'ru' ? 'Работа и деньги' : 'Work and money'] });
    const pricing = page.locator('[data-alchemy-booking-formats]');
    await pricing.locator('[data-alchemy-format="30"]').click();
    await expect(pricing.locator('[data-alchemy-format="30"]')).toHaveAttribute('aria-pressed', 'true');
    const prepared = await exercisePublicEnquiryUi(page, pricing, expect, { locale, kind: 'alchemy',
      requiredMessage: ['€50', locale === 'ru' ? 'Экспресс · 30 минут' : 'Express review · 30 min'] });
    assert.ok(prepared.whatsappUrl.searchParams.get('text').includes('€50'));
    assert.equal(mounted.fetchCount(), 8);
    await pricing.locator('[data-alchemy-format="60"]').click();
    await expect(pricing.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
    await expect(pricing.locator('a[data-contact-channel]')).toHaveCount(0);
    await expect(pricing.locator('form').locator('textarea')).toHaveValue('');
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });

  test(locale + ' actual component hypnotherapy footer retains its named request and collapsed free alternative', async () => {
    const mounted = mountPublicConversion(locale, 'hypnotherapy');
    const { page, expect } = mounted;
    const capture = page.locator('[data-sitewide-capture="core-service"][data-core-service-capture="hypnotherapy"]');
    await expect(capture).toBeVisible();
    const prepared = await exercisePublicEnquiryUi(page, capture, expect, { locale, kind: 'hypnotherapy' });
    assert.ok(prepared.whatsappUrl.searchParams.get('text').includes(locale === 'ru' ? 'Курс гипнотерапии' : 'Guided Imagery Hypnotherapy'));
    const alternative = capture.locator('details');
    assert.equal(await alternative.evaluate(node => node.open), false);
    await alternative.locator('summary').click();
    await expect(alternative.locator('a[href="/' + locale + '/services/free-situation-review"]')).toBeVisible();
    assert.equal(mounted.fetchCount(), 4);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });

  test(locale + ' actual free enquiry and full drawing path preserve answers, focus, private copy/retry and no-send semantics', async () => {
    const mounted = mountPublicConversion(locale, 'situation');
    const { page, expect } = mounted;
    await assertFreeSituationLandingReady(page, expect, locale);
    await exerciseFreeSituationRequestUi(page, expect, locale);
    assert.equal(mounted.fetchCount(), 4);
    const { ready, uniqueProblem, uniqueGoal } = await prepareDrawingIntakeUi(page, expect, locale, { quickEntrySaved: true });
    assert.equal(mounted.copiedValues.length, 0, 'Preparing answers must not copy them automatically');
    assert.equal(mounted.fetchCount(), 4, 'Preparing the private questionnaire is local-only');
    const prepared = await exercisePublicEnquiryUi(page, ready, expect, {
      locale, kind: 'drawing', privateValues: [uniqueProblem, uniqueGoal],
      requiredMessage: locale === 'ru' ? ['рисунка от руки', 'письменный отчёт'] : ['handwritten drawing', 'written report'],
    });
    assert.equal(mounted.fetchCount(), 8);
    for (const answer of [uniqueProblem, uniqueGoal]) {
      assert.ok(!JSON.stringify(mounted.requests).includes(answer), 'No private questionnaire answer is sent in a save request');
      assert.ok(!prepared.whatsappUrl.searchParams.get('text').includes(answer));
      assert.ok(!prepared.telegramUrl.searchParams.get('text').includes(answer));
    }
    const label = locale === 'ru' ? 'Скопировать ответы' : 'Copy answers';
    const copied = locale === 'ru' ? 'Скопировано' : 'Copied';
    const fallback = locale === 'ru' ? 'Выделите и скопируйте текст ниже' : 'Select and copy the text below';
    await ready.getByRole('button', { name: label, exact: true }).click();
    await expect(ready.locator('p[aria-live="polite"]')).toContainText(copied);
    assert.equal(mounted.copiedValues.length, 1);
    for (const answer of [uniqueProblem, uniqueGoal]) assert.ok(mounted.copiedValues[0].includes(answer));
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async () => { throw new Error('synthetic clipboard denial'); } } }));
    await ready.getByRole('button', { name: label, exact: true }).click();
    await expect(ready.locator('p[aria-live="polite"]')).toContainText(fallback);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async value => { window.__syntheticClipboardRecovery = value; } } }));
    await ready.getByRole('button', { name: label, exact: true }).click();
    await expect(ready.locator('p[aria-live="polite"]')).toContainText(copied);
    const recovered = await page.evaluate(() => window.__syntheticClipboardRecovery);
    for (const answer of [uniqueProblem, uniqueGoal]) assert.ok(recovered.includes(answer));
    assert.deepEqual(mounted.events, [], 'The real analytics safety hold remains in force');
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}

for (const [fault, expectedRequests] of [
  ['missing enquiry', 0], ['missing full intake', 0], ['expanded full intake', 0],
  ['missing drawing qualification', 0], ['missing required answer', 0],
  ['broken prepare', 0], ['lost prepared answer', 0], ['automatic answer copy', 0],
  ['drawing answer URL leak', 4],
]) {
  test('full drawing acceptance rejects ' + fault, async () => {
    const mounted = mountPublicConversion('en', 'situation', fault);
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault), 'Intended drawing mutation applied: ' + fault);
    await assert.rejects(async () => {
      const { ready, uniqueProblem, uniqueGoal } = await prepareDrawingIntakeUi(mounted.page, mounted.expect, 'en');
      assert.equal(mounted.copiedValues.length, 0, 'Preparing answers must not copy them automatically');
      await exercisePublicEnquiryUi(mounted.page, ready, mounted.expect, {
        locale: 'en', kind: 'drawing', privateValues: [uniqueProblem, uniqueGoal],
      });
    });
    assert.equal(mounted.fetchCount(), expectedRequests);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}

for (const [fault, selector, select, required] of [
  ['stale alchemy format', '[data-alchemy-booking-formats]', async scope => scope.locator('[data-alchemy-format="30"]').click(), '€50'],
  ['stale alchemy topic', '[data-alchemy-lead-form="single"]', async scope => scope.locator('select').nth(1).selectOption('business'), 'Work and money'],
]) {
  test('Alchemy acceptance rejects ' + fault, async () => {
    const mounted = mountPublicConversion('en', 'alchemy', fault);
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault));
    const scope = mounted.page.locator(selector);
    await select(scope);
    await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, scope, mounted.expect,
      { locale: 'en', kind: 'alchemy', requiredMessage: [required] }), /Prepared alchemy request must retain/);
    assert.equal(mounted.fetchCount(), 4);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}

test('es actual free enquiry and drawing retain Spanish qualifications, private answers and copy-only handoff', async () => {
  const mounted = mountPublicConversion('es', 'situation');
  const { page, expect } = mounted;
  await exerciseFreeSituationRequestUi(page, expect, 'es');
  const { ready, uniqueProblem, uniqueGoal } = await prepareDrawingIntakeUi(page, expect, 'es', { quickEntrySaved: true });
  assert.equal(mounted.copiedValues.length, 0);
  assert.equal(mounted.fetchCount(), 4, 'Drawing preparation is local-only');
  await exercisePublicEnquiryUi(page, ready, expect, { locale: 'es', kind: 'drawing',
    privateValues: [uniqueProblem, uniqueGoal], requiredMessage: ['dibujo hecho a mano', 'informe escrito'] });
  assert.equal(mounted.fetchCount(), 8);
  for (const value of [uniqueProblem, uniqueGoal]) assert.ok(!JSON.stringify(mounted.requests).includes(value));
  await ready.getByRole('button', { name: 'Copiar respuestas', exact: true }).click();
  await expect(ready.locator('p[aria-live="polite"]')).toContainText('Copiado');
  assert.equal(mounted.copiedValues.length, 1);
  for (const value of [uniqueProblem, uniqueGoal]) assert.ok(mounted.copiedValues[0].includes(value));
  assert.equal(mounted.externalClicks(), 0);
  assert.deepEqual(mounted.events, []);
  assert.equal(mounted.intercepted(), false);
});

for (const locale of ['en', 'ru', 'es']) {
  for (const kind of ['imagery-therapy', 'systemic-constellations', 'business']) {
    test(locale + ' actual ' + kind + ' express request preserves localized service identity, price and save gate', async () => {
      const mounted = mountPublicConversion(locale, kind);
      const { page, expect } = mounted;
      const scope = page.locator(kind === 'business' ? '[data-business-offer="express"]' : '[data-consultation-capture="service"]');
      await expect(scope).toHaveCount(1);
      if (kind !== 'business') {
        const choices = scope.locator('[data-choice-layout="service"]').locator('button');
        await expect(choices).toHaveCount(3);
        await choices.nth(1).click();
        await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
      }
      await exercisePublicEnquiryUi(page, scope, expect, { locale, kind, requiredMessage: ['€50', '30'] });
      assert.equal(mounted.fetchCount(), 4);
      assert.equal(mounted.externalClicks(), 0);
      assert.equal(mounted.intercepted(), false);
    });
  }
}

for (const fault of ['wrong method', 'wrong service title', 'extra payload field', 'wrong source path']) {
  test('strict public enquiry fixture rejects ' + fault + ' without returning a success', async () => {
    const mounted = mountPublicConversion('es', 'business', fault);
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault));
    await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-business-offer="express"]'), mounted.expect,
      { locale: 'es', kind: 'business' }));
    assert.equal(mounted.fetchCount(), 1, 'Fail closed at the first malformed request');
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}

test('fixture allowlist rejects unsupported service/locale combinations, external hosts and mismatched paths', () => {
  for (const args of [['alchemy', 'es'], ['hypnotherapy', 'es'], ['constructor', 'en'], ['business', 'de'], ['unknown', 'en']]) {
    assert.throws(() => publicEnquiryContract(...args), /explicitly supported/);
  }
  for (const url of ['https://example.com/es/services/business-consulting',
    'http://127.0.0.1.example.com:3100/es/services/business-consulting',
    'http://127.0.0.1:3100/en/services/business-consulting',
    'http://localhost:3100/es/services/imagery-therapy',
    'http://localhost:3100/es/services/business-consulting?unexpected=1']) {
    assert.throws(() => assertPublicEnquiryFixture({ url: () => url }, 'business', 'es'));
  }
  assert.equal(assertPublicEnquiryFixture({ url: () => 'http://localhost:3100/es/services/business-consulting#request' }, 'business', 'es').service.slug,
    'business-consulting');
});

for (const [fault, expectedRequests] of [
  ['prechecked consent', 0], ['missing consent gate', 0], ['both contacts required', 0], ['invalid phone accepted', 1],
  ['missing contact payload', 1], ['consent payload false', 1], ['contact URL leak', 4],
]) {
  test('current contact and consent acceptance rejects ' + fault, async () => {
    const mounted = mountPublicConversion('en', 'business', fault);
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault), 'Mutation must alter the current component source');
    await assert.rejects(() => exercisePublicEnquiryUi(mounted.page,
      mounted.page.locator('[data-business-offer="express"]'), mounted.expect,
      { locale: 'en', kind: 'business' }));
    assert.equal(mounted.fetchCount(), expectedRequests);
    assert.equal(mounted.intercepted(), false);
    assert.equal(mounted.externalClicks(), 0);
  });
}

for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' confirmed-save reset erases contact, description, consent and messenger links', async () => {
    const mounted = mountPublicConversion(locale, 'business');
    const { page, expect } = mounted;
    const scope = page.locator('[data-business-offer="express"]');
    await exercisePublicEnquiryUi(page, scope, expect, { locale, kind: 'business' });
    const label = { en: 'New enquiry', ru: 'Новый запрос', es: 'Nueva solicitud' }[locale];
    await scope.getByRole('button', { name: label, exact: true }).click();
    await expect(scope.locator('form')).toHaveCount(1);
    for (const selector of ['input[autocomplete="name"]', 'input[type="email"]', 'input[type="tel"]', 'textarea']) {
      await expect(scope.locator('form').locator(selector)).toHaveValue('');
    }
    await expect(scope.locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(scope.locator('a[data-contact-channel]')).toHaveCount(0);
    await expect(scope.locator('button[type="submit"]')).toBeDisabled();
    assert.equal(mounted.fetchCount(), 4, 'Reset never submits or sends a messenger message');
    mounted.unmount();
    assert.deepEqual(mounted.writesAfterUnmount, []);
  });
}

for (const locale of ['en', 'ru', 'es']) for (const contactMode of ['phone', 'both']) {
  test(locale + ' exact ' + contactMode + ' contact payload completes all four consented save attempts', async () => {
    const mounted = mountPublicConversion(locale, 'business');
    await exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-business-offer="express"]'),
      mounted.expect, { locale, kind: 'business', contactMode });
    assert.equal(mounted.fetchCount(), 4);
    for (const request of mounted.requests) {
      assert.equal(request.contact.email, contactMode === 'phone' ? '' : 'visitor@example.test');
      assert.equal(request.contact.phone, '+14165551234');
      assert.equal(request.contactConsent, true);
    }
    assert.equal(mounted.externalClicks(), 0);
  });
}
