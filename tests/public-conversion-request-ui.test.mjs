import assert from 'node:assert/strict';
import test from 'node:test';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { assertPublicEnquiryFixture, publicEnquiryContract, assertSingleEntryEnquiryUi, exercisePublicEnquiryUi } from '../scripts/helpers/public-enquiry-ui-verifier.mjs';
import { assertFreeSituationLandingReady, exerciseFreeSituationRequestUi, prepareDrawingIntakeUi } from '../scripts/helpers/free-situation-ui-verifier.mjs';
import { assertDaoLandingReady, exerciseDaoRequestUi } from '../scripts/helpers/dao-request-ui-verifier.mjs';

const freeTopicContracts = {
  situation: { ready: assertFreeSituationLandingReady, exercise: exerciseFreeSituationRequestUi },
  dao: { ready: assertDaoLandingReady, exercise: exerciseDaoRequestUi },
};
for (const locale of ['en', 'ru', 'es']) for (const [kind, contract] of Object.entries(freeTopicContracts)) {
  test(`${locale} ${kind} native topic name is exact while getByLabel retains descendant option text`, async () => {
    for (const fault of ['', 'nested topic label']) {
      const mounted = mountPublicConversion(locale, kind, fault);
      const { enquiry, text, topic } = await contract.ready(mounted.page, mounted.expect, locale);
      if (fault) assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault));
      await mounted.expect(topic).toHaveCount(1);
      await mounted.expect(topic.locator('option')).toHaveText(text.topics);
      // Reproduce the old browser failure against the actual compiled component,
      // not a fixture that discards the nested options when computing label text.
      const oldTopic = enquiry.getByLabel(text.topic, { exact: true });
      await mounted.expect(oldTopic).toHaveCount(0);
      await assert.rejects(() => mounted.expect(oldTopic).toBeVisible(), { code: 'ERR_ASSERTION' });
      await mounted.expect(enquiry.getByLabel(text.topic)).toHaveCount(1);
      await mounted.expect(enquiry.getByLabel(text.topic.toUpperCase(), { exact: false })).toHaveCount(1);
      await mounted.expect(enquiry.getByLabel(text.topic + text.topics.join(''), { exact: true })).toHaveCount(1);
      await topic.selectOption('2');
      await mounted.expect(topic).toHaveValue('2');
      assert.equal(mounted.fetchCount(), 0, 'Reading or selecting a topic never submits');
      assert.equal(mounted.externalClicks(), 0);
      mounted.unmount();
    }
  });

  for (const fault of ['missing topic', 'hidden topic', 'duplicate topic', 'wrong topic label',
    'unassociated topic label', 'wrong topic role', 'wrong topic option', 'missing topic option',
    'stuck topic value', 'stale topic']) {
    test(`${locale} ${kind} exact topic contract rejects ${fault} at its intended stage`, async () => {
      const nominal = mountPublicConversion(locale, kind);
      await contract.exercise(nominal.page, nominal.expect, locale);
      assert.equal(nominal.fetchCount(), 4, 'The same actual route must first pass the complete nominal request');
      nominal.unmount();
      const mounted = mountPublicConversion(locale, kind, fault);
      const enquiry = mounted.page.locator(`[data-free-resource-enquiry="${kind}"]`);
      assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault
        && receipt.path === 'components/free-resource-enquiry.tsx'), 'Mutate the current shared source');
      if (fault === 'hidden topic') assert.equal(enquiry.locator('select').selected()[0].hidden, true);
      if (fault === 'wrong topic role') await mounted.expect(enquiry.getByRole('listbox')).toHaveCount(1);
      let failedMatcher;
      const expect = actual => {
        const original = mounted.expect(actual);
        return Object.fromEntries(Object.entries(original).map(([name, method]) => [name,
          typeof method !== 'function' ? method : async (...args) => {
            try { return await method(...args); } catch (error) { failedMatcher = name; throw error; }
          }]));
      };
      expect.poll = mounted.expect.poll;
      await assert.rejects(() => contract.exercise(mounted.page, expect, locale), error => {
        assert.equal(error.code, 'ERR_ASSERTION');
        if (fault === 'stale topic') assert.match(error.message, /Prepared .* request must retain/);
        else assert.equal(failedMatcher, fault.includes('option') ? 'toHaveText'
          : fault === 'stuck topic value' ? 'toHaveValue' : 'toHaveCount');
        return true;
      });
      assert.equal(mounted.fetchCount(), fault === 'stale topic' ? 4 : 0);
      assert.equal(mounted.externalClicks(), 0);
      assert.equal(mounted.intercepted(), false);
      mounted.unmount();
    });
  }
}

test('label fidelity preserves nested consent text and explicit private-note aria-label without a request', async () => {
  const mounted = mountPublicConversion('en', 'situation');
  const scope = mounted.page.locator('[data-free-resource-enquiry="situation"]');
  const fields = [
    ['Your name *', 'input[autocomplete="name"]'],
    ['Email', 'input[type="email"]'],
    ['Phone number', 'input[type="tel"]'],
    ['Add a short note (optional)', 'textarea'],
    ['I agree to be contacted personally about this enquiry only. No marketing subscription.', 'input[type="checkbox"]'],
  ];
  for (const [label, selector] of fields) {
    const byLabel = scope.getByLabel(label, { exact: true });
    await mounted.expect(byLabel).toHaveCount(1);
    await mounted.expect(scope.locator(selector)).toHaveCount(1);
    // Locator resolution rerenders the VM tree; stable paths identify the same
    // real control without comparing newly created callback function objects.
    assert.deepEqual(byLabel.selected().map(node => node.path), scope.locator(selector).selected().map(node => node.path));
    await mounted.expect(scope.getByLabel(label.toUpperCase(), { exact: false })).toHaveCount(1);
    await mounted.expect(scope.getByLabel(label + ' incorrect', { exact: true })).toHaveCount(0);
  }
  await mounted.expect(scope.locator('input[type="checkbox"]')).not.toBeChecked();
  assert.equal(mounted.fetchCount(), 0);
  assert.equal(mounted.externalClicks(), 0);
  mounted.unmount();
});

for (const locale of ['en', 'ru']) {
  test(locale + ' actual Alchemy personalized and price-card choosers retain selections, retry, and never pay or send', async () => {
    const mounted = mountPublicConversion(locale, 'alchemy');
    const { page, expect } = mounted;
    const form = page.locator('[data-alchemy-lead-form="single"]');
    const format = form.getByRole('combobox', { name: locale === 'ru' ? 'Формат' : 'Session format', exact: true });
    const topic = form.getByRole('combobox', { name: locale === 'ru' ? 'Тема' : 'Topic', exact: true });
    await expect(format).toHaveCount(1);
    await expect(topic).toHaveCount(1);
    await assertSingleEntryEnquiryUi(form, expect);
    await format.selectOption('30');
    await topic.selectOption('business');
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
  ['stale alchemy topic', '[data-alchemy-lead-form="single"]', async scope => scope.getByRole('combobox', { name: 'Topic', exact: true }).selectOption('business'), 'Work and money'],
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
      assert.equal(request.contact.phone, '+447700900123');
      assert.equal(request.contactConsent, true);
    }
    assert.equal(mounted.externalClicks(), 0);
  });
}

// These mutations change the current component source and first pass the same
// nominal request, so an unrelated earlier failure cannot satisfy the control.
for (const [fault, expectedRequests, matcher, message] of [
  ['missing country', 0, 'toHaveCount'], ['duplicate country', 0, 'toHaveCount'],
  ['hidden country', 0, 'toHaveCount'], ['wrong country name', 0, 'toHaveCount'],
  ['wrong country option', 0, 'toHaveText'], ['missing country option', 0, 'toHaveText'],
  ['wrong country option value', 0, 'toHaveCount'], ['stuck country', 0, 'toHaveValue'],
  ['country dial lost', 0, 'toHaveValue'], ['country editable while pending', 1, 'toBeDisabled'],
  ['required private note', 0, null, 'Private note is optional'],
  ['minimum private note', 0, null, 'Private note has no minimum length'],
  ['expanded private note', 0, null, 'Private note starts collapsed'],
  ['private note blocks contact only', 0, 'toBeEnabled'],
  ['private note URL leak', 4, null, 'Contact and separately entered private details never enter messenger URLs'],
]) {
  test('actual country/private-note contract rejects ' + fault + ' at the intended guard', async () => {
    const nominal = mountPublicConversion('en', 'situation');
    await exerciseFreeSituationRequestUi(nominal.page, nominal.expect, 'en', { contactMode: 'phone' });
    assert.equal(nominal.fetchCount(), 4);
    assert.ok(nominal.requests.every(body => body.contact.phone === '+447700900123'));
    nominal.unmount();
    const mounted = mountPublicConversion('en', 'situation', fault);
    mounted.page.locator('[data-free-resource-enquiry]').selected();
    assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault
      && receipt.path === (fault.includes('country') ? 'components/phone-country-input.tsx' : 'components/contact-channel-chooser.tsx')));
    let failedMatcher;
    const expect = actual => Object.fromEntries(Object.entries(mounted.expect(actual)).map(([name, method]) => [name,
      typeof method !== 'function' ? method : async (...args) => {
        try { return await method(...args); } catch (error) { failedMatcher = name; throw error; }
      }]));
    expect.poll = mounted.expect.poll;
    await assert.rejects(() => exerciseFreeSituationRequestUi(mounted.page, expect, 'en', { contactMode: 'phone' }), error => {
      assert.equal(error.code, 'ERR_ASSERTION');
      if (matcher) assert.equal(failedMatcher, matcher);
      else assert.ok(error.message.includes(message), error.message);
      return true;
    });
    assert.equal(mounted.fetchCount(), expectedRequests);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
    mounted.unmount();
    assert.deepEqual(mounted.writesAfterUnmount, []);
  });
}

for (const kind of ['dao', 'situation']) test(kind + ' keyed topic change creates a fresh collapsed private-note disclosure and country state', async () => {
  const mounted = mountPublicConversion('en', kind);
  const { enquiry, topic } = await freeTopicContracts[kind].ready(mounted.page, mounted.expect, 'en');
  const chooser = enquiry.locator('[data-contact-channel-chooser]');
  await chooser.locator('button[data-contact-order]').click();
  const note = chooser.locator('details');
  await note.locator(':scope > summary').click();
  await chooser.locator('textarea').fill('Private note from old keyed scope');
  await chooser.getByRole('combobox', { name: 'Country calling code', exact: true }).selectOption('GB');
  assert.equal(await note.evaluate(node => node.open), true);
  await topic.selectOption('1');
  await mounted.expect(chooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'false');
  await chooser.locator('button[data-contact-order]').click();
  assert.equal(await note.evaluate(node => node.open), false, 'New native disclosure cannot inherit old open state');
  await mounted.expect(chooser.locator('textarea')).toBeHidden();
  await mounted.expect(chooser.locator('textarea')).toHaveValue('');
  await mounted.expect(chooser.getByRole('combobox', { name: 'Country calling code', exact: true })).toHaveValue('CA');
  assert.equal(mounted.fetchCount(), 0);
  assert.equal(mounted.externalClicks(), 0);
  mounted.unmount();
});

for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' relative has starts inside each disclosure, rejecting all three ancestor-chain selectors', async () => {
    const mounted = mountPublicConversion(locale, 'situation');
    const { page, expect } = mounted;
    const { main, enquiry, advanced, intake } = await assertFreeSituationLandingReady(page, expect, locale);
    const capture = main.locator('section#request-free-review');
    const form = enquiry.locator('[data-contact-channel-chooser]').locator('form');
    const note = form.locator('details');
    const formTextarea = form.locator('textarea');
    // The actual page has both a contact-note disclosure and a separate full
    // drawing disclosure. Global intersection would incorrectly accept these
    // complete ancestor chains as a nested has selector.
    await expect(note).toHaveCount(1);
    await expect(note.locator('textarea')).toHaveCount(1);
    await expect(note.filter({ has: page.locator('textarea') })).toHaveCount(1);
    assert.equal(note.filter({ has: formTextarea }).selected().length, 0, 'Original note has-chain cannot find an outer form inside its details');
    assert.equal(capture.locator('details').filter({ has: intake }).selected().length, 0, 'Original readiness has-chain cannot find outer capture ancestry inside details');
    const detailedForm = main.locator('[data-free-drawing-intake]');
    assert.equal(main.locator('details').filter({ has: detailedForm }).selected().length, 0, 'Original production has-chain cannot find its outer main inside details');
    await expect(main.locator('details').filter({ has: page.locator('[data-free-drawing-intake]') })).toHaveCount(1);
    await expect(note.filter({ has: page.locator('[data-free-drawing-intake]') })).toHaveCount(0);
    await expect(advanced).toHaveCount(1);
    await expect(advanced.locator('[data-free-drawing-intake]')).toHaveCount(1);
    assert.equal(await advanced.evaluate(node => node.open), false);
    assert.equal(mounted.fetchCount(), 0);
    assert.equal(mounted.externalClicks(), 0);
    mounted.unmount();
  });

  for (const [fault, disclosures, formTextareas, noteTextareas] of [
    ['missing note disclosure', 0, 1, 0],
    ['duplicate note disclosure', 2, 2, 2],
    ['wrong note descendant', 1, 1, 0],
    ['wrong note label', 1, 1, 1],
  ]) {
    test(locale + ' scoped optional-note contract rejects ' + fault + ' before any POST', async () => {
      const nominal = mountPublicConversion(locale, 'imagery-therapy');
      await exercisePublicEnquiryUi(nominal.page, nominal.page.locator('[data-consultation-capture="service"]'), nominal.expect,
        { locale, kind: 'imagery-therapy' });
      assert.equal(nominal.fetchCount(), 4, 'The same actual nested enquiry must first pass its complete nominal flow');
      nominal.unmount();
      const mounted = mountPublicConversion(locale, 'imagery-therapy', fault);
      const scope = mounted.page.locator('[data-consultation-capture="service"]');
      const form = scope.locator('[data-contact-channel-chooser]').locator('form');
      await mounted.expect(form).toHaveCount(1);
      await mounted.expect(form.locator('details')).toHaveCount(disclosures);
      await mounted.expect(form.locator('textarea')).toHaveCount(formTextareas);
      await mounted.expect(form.locator('details').locator('textarea')).toHaveCount(noteTextareas);
      assert.ok(mounted.mutationReceipts.some(receipt => receipt.fault === fault
        && receipt.path === 'components/contact-channel-chooser.tsx'), 'Mutate the actual current source, not a detached invented DOM');
      let failedMatcher;
      const expect = actual => Object.fromEntries(Object.entries(mounted.expect(actual)).map(([name, method]) => [name,
        typeof method !== 'function' ? method : async (...args) => {
          try { return await method(...args); } catch (error) { failedMatcher = name; throw error; }
        }]));
      expect.poll = mounted.expect.poll;
      await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, scope, expect, { locale, kind: 'imagery-therapy' }), error => {
        assert.equal(error.code, 'ERR_ASSERTION');
        assert.equal(failedMatcher, 'toHaveCount');
        assert.match(error.stack, /exercisePublicEnquiryUi/);
        return true;
      });
      assert.equal(mounted.fetchCount(), 0);
      assert.equal(mounted.externalClicks(), 0);
      assert.equal(mounted.intercepted(), false);
      mounted.unmount();
      assert.deepEqual(mounted.writesAfterUnmount, []);
    });
  }
}
