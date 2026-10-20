import assert from 'node:assert/strict';
import { assertPreparedContactChannels } from './contact-channel-verifier.mjs';

// Explicit contracts for these public UI journeys, not arbitrary API fixtures.
const services = {
  'tantra-initiation': { route: 'academy/reiki/tantra-reiki/free-initiation', en: 'Tantra Reiki · Level 1', ru: 'Тантра Рейки · 1-я ступень', es: 'Tantra Reiki · Nivel 1' },
  'yggdrasil-initiation': { route: 'academy/reiki/yggdrasil/free-initiation', en: 'Reiki Yggdrasil · Level 1', ru: 'Reiki Yggdrasil · Level 1', es: 'Reiki Yggdrasil · Level 1' },
  'academy-tantra': { route: 'academy', en: 'Tantra Reiki', ru: 'Tantra Reiki', es: 'Tantra Reiki' },
  'temple-initiation': { route: 'academy/temple-studies', en: 'Temple Studies', ru: 'Temple Studies', es: 'Temple Studies' },
  dao: { slug: 'dao-health-profile', en: 'Free symbolic Wu Xing Resource Profile', ru: 'Бесплатный символический профиль ресурсов У-Син', es: 'Perfil simbólico gratuito de recursos Wu Xing' },
  situation: { slug: 'free-situation-review', en: 'Free written Situation Review', ru: 'Бесплатный письменный разбор ситуации', es: 'Revisión escrita gratuita de la situación' },
  drawing: { slug: 'free-situation-review', en: 'Coaching questionnaire — free drawing assessment', ru: 'Коучинг-форма — бесплатная диагностика по рисунку', es: 'Formulario de coaching — evaluación gratuita mediante dibujo' },
  alchemy: { slug: 'alchemy-of-soul', en: 'Alchemy of the Soul / Psycho-homeopathy', ru: 'Алхимия души / Психогомеопатия' },
  'imagery-therapy': { slug: 'imagery-therapy', en: 'Request a guided imagery session', ru: 'Запросить сеанс образной психотерапии', es: 'Solicitar una sesión de imágenes guiadas' },
  'systemic-constellations': { slug: 'systemic-constellations', en: 'Request a systemic constellation session', ru: 'Запросить расстановочную сессию', es: 'Solicitar una sesión de constelaciones' },
  business: { slug: 'business-consulting', en: 'Business Strategy & Archetypal Coaching', ru: 'Бизнес-консалтинг и архетипический коучинг', es: 'Consultoría de negocios y coaching arquetípico' },
  hypnotherapy: { slug: 'hypnotherapy-course', en: 'Guided Imagery Hypnotherapy', ru: 'Курс гипнотерапии' },
};
const handoff = {
  en: 'Messenger handoff is optional.',
  ru: 'Переход в мессенджер необязателен.',
  es: 'El chat es opcional.',
};
export function publicEnquiryContract(kind, locale) {
  const service = services[kind];
  assert.ok(Object.hasOwn(services, kind) && ['en', 'ru', 'es'].includes(locale) && typeof service[locale] === 'string', 'Only explicitly supported public UI contracts may use the mock');
  return { slug: service.slug, title: service[locale], ...(service.route ? { route: service.route } : {}) };
}

export function assertPublicEnquiryFixture(page, kind, locale) {
  const service = publicEnquiryContract(kind, locale);
  const current = new URL(page.url());
  assert.match(current.origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
  assert.equal(current.pathname, '/' + locale + '/' + (service.route || 'services/' + service.slug));
  assert.equal(current.search, '');
  return { service, current };
}

// Explicit final-composition contract for the CRM single-entry UX introduced in
// a7c74814370c1aa4c5ffccbcc85f4f9a79c81df2. Not a permissive legacy/new fallback.
export const publicEnquiryUiVariant = 'crm-single-entry-v1';
export async function assertSingleEntryEnquiryUi(scope, expect) {
  for (const [selector, count] of [
    ['form', 1], ['input[type="text"]', 2], // one contact name plus hidden honeypot
    ['input[autocomplete="name"]', 1], ['input[name="website"]', 1],
    ['input[type="email"]', 1], ['input[type="tel"]', 1],
    ['textarea', 1], ['input[type="checkbox"]', 1], ['button', 2],
    ['input[maxlength="80"]', 0], ['input[autocomplete="given-name"]', 0],
    ['textarea[maxlength="350"]', 0],
  ]) await expect(scope.locator(selector)).toHaveCount(count);
}

/**
 * Public UI contract only. This segment formerly inspected prepared links, not
 * persistence. Intercept the one loopback endpoint: no real enquiry is created.
 * Backend validation/storage/notification integration remains a separate gate.
 * Nothing clicks a messenger link or equates a saved request with message sent.
 */
export async function exercisePublicEnquiryUi(page, scope, expect, { locale, kind, requiredMessage = [], privateValues = [], scopeIsChooser = false, contactMode = 'email' }) {
  const { service, current } = assertPublicEnquiryFixture(page, kind, locale);
  const endpoint = current.origin + '/api/service-enquiries';
  // Catch malformed query/trailing-path variants too, but never another host.
  // Only the exact endpoint and payload below may receive a positive fixture.
  const endpointMatch = url => url.origin === current.origin && /^\/api\/service-enquiries(?:\/|$)/.test(url.pathname);
  const description = 'Synthetic ' + kind + ' public UI enquiry for ' + locale + '.';
  const referenceCode = 'HH-0123456789AB';
  assert.ok(['email', 'phone', 'both'].includes(contactMode), 'Explicit synthetic contact mode required');
  const contact = { displayName: 'Synthetic Visitor',
    email: contactMode === 'phone' ? '' : 'visitor@example.test',
    phone: contactMode === 'email' ? '' : '+14165551234' };
  const replies = [
    { status: 503, json: { error: 'SYNTHETIC_UNAVAILABLE' } },
    { status: 200, json: { saved: false, referenceCode } },
    { status: 200, json: { saved: true, referenceCode: 'invalid-reference' } },
    { status: 201, json: { saved: true, referenceCode } },
  ];
  const requests = [];
  let releaseResponse;
  let pendingResponse = Promise.resolve();
  const expectedBody = operationId => ({
    operationId, serviceTitle: service.title, description, sourcePath: current.pathname, locale,
    contact, contactConsent: true, website: '',
  });
  const intercept = async route => {
    const request = route.request();
    let body;
    try { body = request.postDataJSON(); } catch { body = null; }
    const captured = { url: request.url(), method: request.method(), body };
    requests.push(captured);
    let valid = false;
    try {
      assert.equal(captured.url, endpoint);
      assert.equal(captured.method, 'POST');
      assert.match(body?.operationId, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
      assert.deepEqual(body, expectedBody(requests[0].body?.operationId));
      valid = true;
    } catch { /* Fail closed, then report the exact mismatch in the assertions below. */ }
    const reply = valid ? (replies[requests.length - 1] || { status: 409, json: { error: 'UNEXPECTED_RETRY' } })
      : { status: 422, json: { error: 'INVALID_SYNTHETIC_REQUEST' } };
    await pendingResponse;
    await route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.json) });
  };
  await page.route(endpointMatch, intercept);
  try {
    await scope.scrollIntoViewIfNeeded();
    const chooser = scopeIsChooser ? scope : scope.locator('[data-contact-channel-chooser]');
    const trigger = chooser.locator('button[data-contact-order]');
    await expect(chooser).toHaveCount(1);
    await expect(chooser).toHaveAttribute('data-contact-channel-chooser', /^(?:true)?$/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const form = chooser.locator('form');
    const details = form.locator('textarea');
    const submit = form.locator('button[type="submit"]');
    const name = form.locator('input[autocomplete="name"]');
    const email = form.locator('input[type="email"]');
    const phone = form.locator('input[type="tel"]');
    const consent = form.locator('input[type="checkbox"]');
    await expect(form).toHaveCount(1);
    await expect(form).toBeVisible();
    for (const field of [name, email, phone, consent]) await expect(field).toBeVisible();
    for (const field of [details, name, email, phone, consent]) await expect(field).toHaveCount(1);
    await expect(details).toHaveAttribute('required', '');
    await expect(details).toHaveAttribute('minlength', '10');
    await expect(details).toHaveAttribute('maxlength', '1400');
    await expect(details).toBeVisible();
    await expect(submit).toBeDisabled();
    await details.fill('short');
    await expect(submit).toBeDisabled();
    assert.equal(requests.length, 0, 'Opening the chooser must not submit an enquiry');
    await details.fill(description);
    await expect(submit).toBeDisabled();
    await expect(name).toHaveAttribute('required', '');
    await expect(consent).toHaveAttribute('required', '');
    await expect(consent).not.toBeChecked();
    await name.fill(contact.displayName);
    await expect(submit).toBeDisabled();
    await consent.check();
    await expect(submit).toBeDisabled();
    await phone.fill('123');
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(chooser.locator('[role="alert"]')).toBeVisible();
    assert.equal(requests.length, 0, 'An invalid phone cannot submit when no email was provided');
    await phone.fill('+14165551234');
    await expect(submit).toBeEnabled();
    await name.fill('');
    await expect(submit).toBeDisabled();
    await name.fill('X');
    await expect(submit).toBeDisabled();
    await name.fill(contact.displayName);
    await expect(submit).toBeEnabled();
    await consent.uncheck();
    await expect(submit).toBeDisabled();
    assert.equal(requests.length, 0, 'Contact details without explicit consent cannot submit');
    await email.fill(contact.email);
    await phone.fill(contact.phone);
    await consent.check();
    await expect(submit).toBeEnabled();
    for (let index = 0; index < replies.length; index++) {
      // Hold each response so the browser must expose its true pending state,
      // not just a successful settled frame. Always release even on assertion failure.
      pendingResponse = new Promise(resolve => { releaseResponse = resolve; });
      const click = submit.click();
      void click.catch(() => {});
      try {
        await expect.poll(() => requests.length).toBe(index + 1);
        await expect(submit).toBeDisabled();
        for (const field of [details, name, email, phone, consent]) await expect(field).toBeDisabled();
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
        await expect(chooser.locator('[role="status"]')).toHaveCount(0);
      } finally {
        releaseResponse();
        await click;
      }
      const request = requests[index];
      assert.equal(request.url, endpoint);
      assert.equal(request.method, 'POST');
      assert.match(request.body.operationId, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
      assert.deepEqual(request.body, expectedBody(requests[0].body.operationId),
        'Only the explicitly submitted synthetic enquiry belongs in the save request; retries retain their operation ID');
      if (index < replies.length - 1) {
        await expect(chooser.locator('[role="alert"]')).toBeVisible();
        await expect(submit).toBeEnabled();
        await expect(details).toHaveValue(description);
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
        await expect(chooser.locator('[role="status"]')).toHaveCount(0);
      }
    }
    await expect(chooser.locator('[role="status"]')).toContainText(referenceCode);
    await expect(chooser.locator('form')).toHaveCount(0);
    await expect(chooser).toContainText(handoff[locale]);
    const prepared = await assertPreparedContactChannels(chooser, expect);
    const message = prepared.whatsappUrl.searchParams.get('text');
    for (const required of [service.title, ...requiredMessage, description, referenceCode]) {
      assert.ok(message.includes(required), 'Prepared ' + kind + ' request must retain: ' + required);
    }
    for (const privateValue of [...Object.values(contact).filter(Boolean), ...privateValues]) {
      assert.ok(!message.includes(privateValue), 'Contact and separately entered private details never enter messenger URLs');
      assert.ok(!decodeURIComponent(page.url()).includes(privateValue), 'Private details never enter page URL');
    }
    assert.equal(requests.length, replies.length, 'Reading prepared links must not resubmit');
    return { ...prepared, requestCount: requests.length, mockedSave: true, messengerLinksOpened: false };
  } finally {
    releaseResponse?.();
    await page.unroute(endpointMatch, intercept);
  }
}
