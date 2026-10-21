import assert from 'node:assert/strict';
import { assertPreparedContactChannels } from './contact-channel-verifier.mjs';
import { PHONE_COUNTRIES } from '../../lib/contact/phone-country.js';

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

// Explicit composition of the CRM lifecycle and owner compact enquiry1442/1443.
// Exactly one selected reply channel; no permissive legacy/new fallback.
export const publicEnquiryUiVariant = 'crm-single-entry-compact-contact-optional-name-v3';
const contactCopy = {
  en: { email: 'Email', methodPhone: 'Phone / WhatsApp', google: 'Continue with Google', name: 'Add your name (optional)', country: 'Country calling code', phone: 'Phone number', note: 'Add a short note (optional)' },
  ru: { email: 'Электронная почта', methodPhone: 'Телефон / WhatsApp', google: 'Продолжить с Google', name: 'Добавить имя (необязательно)', country: 'Код страны', phone: 'Номер телефона', note: 'Добавить комментарий (необязательно)' },
  es: { email: 'Correo electrónico', methodPhone: 'Teléfono / WhatsApp', google: 'Continuar con Google', name: 'Añadir tu nombre (opcional)', country: 'Prefijo del país', phone: 'Número de teléfono', note: 'Añadir una nota (opcional)' },
};
export async function assertSingleEntryEnquiryUi(scope, expect) {
  for (const [selector, count] of [
    ['form', 1], ['input[type="text"]', 2], // one contact name plus hidden honeypot
    ['input[autocomplete="name"]', 1], ['input[name="website"]', 1],
    ['input[type="email"]', 1], ['input[type="tel"]', 0],
    ['textarea', 1], ['input[type="checkbox"]', 1], ['button', 5],
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
export async function exercisePublicEnquiryUi(page, scope, expect, { locale, kind, requiredMessage = [], privateValues = [], scopeIsChooser = false, contactMode = 'email', noteMode = 'supplied', nameMode = 'supplied' }) {
  const { service, current } = assertPublicEnquiryFixture(page, kind, locale);
  const endpoint = current.origin + '/api/service-enquiries';
  // Catch malformed query/trailing-path variants too, but never another host.
  // Only the exact endpoint and payload below may receive a positive fixture.
  const endpointMatch = url => url.origin === current.origin && /^\/api\/service-enquiries(?:\/|$)/.test(url.pathname);
  assert.ok(['absent', 'supplied'].includes(noteMode), 'Explicit optional-note fixture mode required');
  const description = noteMode === 'absent' ? '' : 'Synthetic private ' + kind + ' note for ' + locale + '.';
  const words = contactCopy[locale];
  const referenceCode = 'HH-0123456789AB';
  assert.ok(['email', 'phone'].includes(contactMode), 'Explicit synthetic contact mode required');
  assert.ok(['absent', 'supplied'].includes(nameMode), 'Explicit optional-name fixture mode required');
  const contact = { displayName: nameMode === 'absent' ? '' : 'Synthetic Visitor',
    email: contactMode === 'phone' ? '' : 'visitor@example.test',
    phone: contactMode === 'email' ? '' : '+447700900123' };
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
    const note = form.locator('details:has(textarea)');
    const nameDisclosure = form.locator('details:has(input[autocomplete="name"])');
    const details = note.locator('textarea');
    const submit = form.locator('button[type="submit"]');
    const name = form.locator('input[autocomplete="name"]');
    const email = form.locator('input[type="email"]');
    const phone = form.getByLabel(words.phone, { exact: true });
    const phoneField = form.locator('[data-phone-country-input]');
    const country = phoneField.getByRole('combobox', { name: words.country, exact: true });
    const noteToggle = note.locator(':scope > summary');
    const consent = form.locator('input[type="checkbox"]');
    const emailMethod = form.getByRole('button', { name: words.email, exact: true });
    const phoneMethod = form.getByRole('button', { name: words.methodPhone, exact: true });
    const google = form.getByRole('button', { name: words.google, exact: true });
    await expect(form).toHaveCount(1);
    await expect(form).toBeVisible();
    await expect(note).toHaveCount(1);
    await expect(form.locator('textarea')).toHaveCount(1);
    await expect(form.locator('details')).toHaveCount(2);
    await expect(chooser.locator('details')).toHaveCount(3); // name, private note, separate privacy disclosure
    await expect(nameDisclosure).toHaveCount(1);
    await expect(nameDisclosure.locator(':scope > summary')).toHaveText(words.name);
    assert.equal(await nameDisclosure.evaluate(node => node.open), false, 'Optional name starts collapsed');
    await expect(name).toBeHidden();
    assert.equal(await name.getAttribute('required'), null, 'Name is optional');
    await expect(name).toHaveAttribute('minlength', '2');
    await expect(name).toHaveAttribute('maxlength', '120');
    for (const field of [email, consent, emailMethod, phoneMethod, google]) await expect(field).toBeVisible();
    await expect(emailMethod).toHaveAttribute('aria-pressed', 'true');
    await expect(phoneMethod).toHaveAttribute('aria-pressed', 'false');
    await expect(email).toHaveAttribute('required', '');
    await expect(phoneField).toHaveCount(0);
    await expect(phone).toHaveCount(0);
    assert.equal(await note.evaluate(node => node.open), false, 'Private note starts collapsed');
    await expect(noteToggle).toBeVisible();
    await expect(noteToggle).toHaveText(words.note);
    await expect(note.getByLabel(words.note, { exact: true })).toHaveCount(1);
    await expect(details).toHaveAttribute('aria-label', words.note);
    assert.equal(await details.getAttribute('required'), null, 'Private note is optional');
    assert.equal(await details.getAttribute('minlength'), null, 'Private note has no minimum length');
    await expect(details).toHaveAttribute('maxlength', '1400');
    await expect(details).toBeHidden();
    await expect(details).toHaveValue('');
    await expect(submit).toBeDisabled();
    assert.equal(requests.length, 0, 'Opening the chooser must not submit an enquiry');
    await expect(consent).toHaveAttribute('required', '');
    await expect(consent).not.toBeChecked();
    await consent.check();
    await expect(submit).toBeDisabled();
    await phoneMethod.click();
    await expect(phoneMethod).toHaveAttribute('aria-pressed', 'true');
    await expect(emailMethod).toHaveAttribute('aria-pressed', 'false');
    await expect(email).toHaveCount(0);
    await expect(phoneField).toHaveCount(1);
    await expect(phoneField.locator('select')).toHaveCount(1);
    await expect(phone).toBeVisible();
    await expect(phone).toHaveAttribute('required', '');
    await expect(country).toHaveCount(1);
    await expect(country).toBeVisible();
    await expect(country).toHaveValue('CA');
    await expect(country.locator('option')).toHaveText(PHONE_COUNTRIES.map(item =>
      item.flag + ' ' + (item.dial || '+') + ' · ' + item.names[locale]));
    for (const item of PHONE_COUNTRIES) await expect(country.locator('option[value="' + item.iso + '"]')).toHaveCount(1);
    await phone.fill('123');
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(chooser.locator('[role="alert"]')).toBeVisible();
    assert.equal(requests.length, 0, 'An invalid selected phone cannot submit');
    await country.selectOption('GB');
    await expect(country).toHaveValue('GB');
    await phone.fill('7700 900123');
    await expect(phone).toHaveValue('7700900123');
    await expect(submit).toBeEnabled();
    await nameDisclosure.locator(':scope > summary').click();
    await expect(name).toBeVisible();
    await name.fill('X');
    await submit.click();
    assert.equal(requests.length, 0, 'An invalid supplied optional name cannot submit');
    await name.fill('Synthetic Visitor');
    await expect(submit).toBeEnabled();
    await name.fill(contact.displayName);
    await expect(submit).toBeEnabled();
    await consent.uncheck();
    await expect(submit).toBeDisabled();
    assert.equal(requests.length, 0, 'Contact details without explicit consent cannot submit');
    if (contactMode === 'email') {
      await emailMethod.click();
      await expect(email).toBeVisible();
      await expect(phoneField).toHaveCount(0);
      await email.fill(contact.email);
    } else {
      await expect(email).toHaveCount(0);
      await expect(country).toHaveValue('GB');
    }
    await consent.check();
    await expect(submit).toBeEnabled();
    // An absent note already permits the valid contact-only request. A short
    // supplied note must not introduce a hidden minimum-length requirement.
    if (noteMode === 'supplied') {
      await noteToggle.click();
      assert.equal(await note.evaluate(node => node.open), true);
      await expect(details).toBeVisible();
      await details.fill('brief');
      await expect(submit).toBeEnabled();
      await details.fill(description);
      await expect(submit).toBeEnabled();
    } else await expect(details).toBeHidden();
    assert.equal(requests.length, 0, 'Contact, country, note and consent edits must not auto-submit');
    for (let index = 0; index < replies.length; index++) {
      // Hold each response so the browser must expose its true pending state,
      // not just a successful settled frame. Always release even on assertion failure.
      pendingResponse = new Promise(resolve => { releaseResponse = resolve; });
      const click = submit.click();
      void click.catch(() => {});
      try {
        await expect.poll(() => requests.length).toBe(index + 1);
        await expect(submit).toBeDisabled();
        for (const field of [details, name, consent, emailMethod, phoneMethod, google,
          ...(contactMode === 'email' ? [email] : [phone, country])]) await expect(field).toBeDisabled();
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
        for (const field of [details, name, consent, emailMethod, phoneMethod, google,
          ...(contactMode === 'email' ? [email] : [phone, country])]) await expect(field).toBeDisabled();
        await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
        await expect(chooser.locator('[role="status"]')).toHaveCount(0);
      }
    }
    await expect(chooser.locator('[role="status"]')).toContainText(referenceCode);
    await expect(chooser.locator('form')).toHaveCount(0);
    await expect(chooser).toContainText(handoff[locale]);
    const prepared = await assertPreparedContactChannels(chooser, expect);
    const message = prepared.whatsappUrl.searchParams.get('text');
    for (const required of [service.title, ...requiredMessage, referenceCode]) {
      assert.ok(message.includes(required), 'Prepared ' + kind + ' request must retain: ' + required);
    }
    for (const privateValue of [...Object.values(contact).filter(Boolean), ...(description ? [description] : []), ...privateValues]) {
      for (const url of [prepared.whatsappUrl, prepared.telegramUrl]) {
        assert.ok(!url.searchParams.get('text').includes(privateValue), 'Contact and separately entered private details never enter messenger URLs');
        assert.ok(!decodeURIComponent(url.href).includes(privateValue), 'Contact and separately entered private details never enter messenger URLs');
      }
      assert.ok(!decodeURIComponent(page.url()).includes(privateValue), 'Private details never enter page URL');
    }
    assert.equal(requests.length, replies.length, 'Reading prepared links must not resubmit');
    return { ...prepared, requestCount: requests.length, mockedSave: true, messengerLinksOpened: false };
  } finally {
    releaseResponse?.();
    await page.unroute(endpointMatch, intercept);
  }
}
