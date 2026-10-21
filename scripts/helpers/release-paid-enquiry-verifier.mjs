import assert from 'node:assert/strict';
import { PHONE_COUNTRIES } from '../../lib/contact/phone-country.js';

// These are the two explicit REAUDIT_LABEL / REAUDIT_ORIGIN pairs in the
// existing release workflow. Production is read-only, never a fixture mode.
const origins = { local: 'http://127.0.0.1:3123', live: 'https://holistichouse.vercel.app' };
export function assertReleasePaidMode({ origin, label }) {
  assert.ok(Object.hasOwn(origins, label), 'Unknown paid read-only audit mode');
  assert.ok(origin === origins[label], 'Paid audit mode/origin mismatch');
}
export function releasePaidPolicy({ origin, label, locale, width }) {
  assertReleasePaidMode({ origin, label });
  assert.ok(['en', 'ru', 'es'].includes(locale), 'Unsupported paid audit locale');
  assert.ok([390, 1365].includes(width), 'Unsupported paid audit width');
  return Object.freeze({ origin, label, locale, width, path: '/' + locale + '/services/imagery-therapy' });
}

export function classifyPaidRequest(policy, request) {
  // Reject first, without logging URL/query/header/body data. No private API,
  // prefetch query, image proxy, provider, or arbitrary document is allowlisted.
  if (request.method() !== 'GET') return 'non-GET';
  let url;
  try { url = new URL(request.url()); } catch { return 'malformed URL'; }
  if (url.href !== request.url() || url.username || url.password || url.search || url.hash || /%|\\/.test(request.url())) return 'noncanonical URL';
  if (url.origin !== policy.origin) return 'external origin';
  const type = request.resourceType();
  if (type === 'document' && request.isNavigationRequest() && url.pathname === policy.path) return null;
  if (/^\/_next\/static\/[A-Za-z0-9_./-]+\.js$/.test(url.pathname) && type === 'script') return null;
  if (/^\/_next\/static\/[A-Za-z0-9_./-]+\.css$/.test(url.pathname) && type === 'stylesheet') return null;
  if (/^\/_next\/static\/[A-Za-z0-9_./-]+\.(?:woff2?|ttf|otf)$/.test(url.pathname) && type === 'font') return null;
  if (/^\/images\/holistic-house\/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g|avif|svg)$/.test(url.pathname) && type === 'image') return null;
  return 'unallowlisted public resource';
}

// Diagnostics only. This never participates in the allow/deny decision.
// Keep values, arbitrary keys, paths, hosts and payloads out of failure logs.
export function deniedPaidRequestMetadata(policy, request) {
  const raw = request.url();
  let url;
  try { url = new URL(raw); } catch { /* Only bounded categories below. */ }
  const resourceTypes = ['document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack', 'xhr', 'fetch', 'eventsource', 'websocket', 'manifest', 'other'];
  const resourceType = request.resourceType();
  const known = ['_rsc', 'v', 'dpl'];
  const present = new Set();
  let unknownQueryKeyCount = 0;
  if (url) for (const key of url.searchParams.keys()) {
    if (known.includes(key)) present.add(key);
    else unknownQueryKeyCount = Math.min(100, unknownQueryKeyCount + 1);
  }
  const path = url?.pathname;
  return {
    resourceType: resourceTypes.includes(resourceType) ? resourceType : 'other',
    sameOrigin: url?.origin === policy.origin,
    pathClass: path === policy.path ? 'exact-audited-page'
      : path?.startsWith('/_next/static/') ? 'next-static'
        : path?.startsWith('/images/holistic-house/') ? 'image' : 'other',
    knownQueryKeys: known.filter(key => present.has(key)), unknownQueryKeyCount,
    hasPercent: raw.includes('%'), hasBackslash: raw.includes('\\'),
    hasHash: Boolean(url?.hash), hasUserinfo: Boolean(url?.username || url?.password),
  };
}

export async function installPaidReadOnlyGuard(context, policy) {
  const violations = [];
  const pending = new Set();
  const track = task => {
    const promise = Promise.resolve().then(task);
    pending.add(promise);
    return promise.finally(() => pending.delete(promise));
  };
  const abort = route => route.abort('blockedbyclient').catch(() => {});
  let posts = 0, allowedGets = 0;
  const record = diagnostic => violations.push(diagnostic); // Bounded categories only, never raw request data.
  await context.route('**/*', route => track(async () => {
    const request = route.request();
    if (request.method() === 'POST') posts++;
    const denied = classifyPaidRequest(policy, request);
    if (denied) {
      let diagnostic = denied;
      try { diagnostic = { reason: denied, ...deniedPaidRequestMetadata(policy, request) }; }
      catch { /* Metadata must never interrupt the original record/abort path. */ }
      record(diagnostic); await abort(route); return;
    }
    try {
      // Continuing blindly could follow a redirect outside the reviewed boundary.
      const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
      if (response.status() >= 300 && response.status() < 400) {
        record('redirect'); await abort(route); return;
      }
      allowedGets++;
      await route.fulfill({ response });
    } catch {
      record('allowlisted GET failed'); await abort(route);
    }
  }));
  assert.equal(typeof context.routeWebSocket, 'function', 'Paid guard requires pre-navigation WebSocket interception');
  await context.routeWebSocket('**/*', socket => track(async () => {
    record('WebSocket');
    try { await socket.close(); } catch { record('WebSocket close failed'); }
  }));
  return {
    async settle() { while (pending.size) await Promise.allSettled([...pending]); },
    assertClean() {
      assert.equal(posts, 0, 'Paid read-only audit attempted a POST');
      assert.deepEqual(violations, [], 'Paid read-only network boundary violated');
      return { postAttempts: posts, blockedRequests: violations.length, allowedGets };
    },
  };
}

const formCopy = {
  en: {
    consent: 'I agree to be contacted personally about this enquiry only. No marketing subscription.',
    privacy: 'Please avoid medical records, diagnoses or sensitive personal details in this short enquiry.',
    description: 'Add a short note (optional)',
    name: 'Your name *', email: 'Email', phone: 'Phone / WhatsApp',
    country: 'Country calling code', number: 'Phone number', submit: 'Register my request',
  },
  ru: {
    consent: 'Согласен(на) на личный ответ по этой заявке. На рекламную рассылку не подписываюсь.',
    privacy: 'Не указывайте здесь диагнозы, медицинские документы и другие чувствительные сведения.',
    description: 'Добавить комментарий (необязательно)',
    name: 'Ваше имя *', email: 'Электронная почта', phone: 'Телефон / WhatsApp',
    country: 'Код страны', number: 'Номер телефона', submit: 'Оставить заявку',
  },
  es: {
    consent: 'Acepto que me contacten solamente sobre esta solicitud. No me suscribo a publicidad.',
    privacy: 'Evita incluir diagnósticos, documentos médicos o datos personales sensibles.',
    description: 'Añadir una nota (opcional)',
    name: 'Tu nombre *', email: 'Correo electrónico', phone: 'Teléfono / WhatsApp',
    country: 'Prefijo del país', number: 'Número de teléfono', submit: 'Registrar mi solicitud',
  },
};

export function expectedPaidForm(locale) {
  const c = formCopy[locale];
  const control = (tag, type, extra = {}) => ({ tag, type, required: false, disabled: false, empty: true, autocomplete: null, min: null, max: null, name: null, label: null, visibleLabel: null, tab: null, ...extra });
  return {
    busy: 'false', customControls: 0,
    // Exact schema, not a blanket count of seven. A diagnosis/file/hidden-field
    // addition changes this schema and must fail even if total count is stable.
    controls: [
      control('INPUT', 'text', { required: true, autocomplete: 'name', visibleLabel: c.name, min: '2', max: '120' }),
      control('INPUT', 'email', { autocomplete: 'email', visibleLabel: c.email, max: '254' }),
      control('SELECT', null, { empty: false, label: c.country }),
      control('INPUT', 'tel', { autocomplete: 'tel-national', max: '24', label: c.number, visibleLabel: c.phone }),
      control('TEXTAREA', null, { max: '1400', label: c.description }),
      control('INPUT', 'checkbox', { required: true, empty: false, checked: false, visibleLabel: c.consent }),
      control('INPUT', 'text', { autocomplete: 'off', name: 'website', tab: '-1', visibleLabel: 'Website' }),
      control('BUTTON', 'submit', { disabled: true }),
    ],
    countries: PHONE_COUNTRIES.map(item => ({ value: item.iso, text: `${item.flag} ${item.dial || '+'} · ${item.names[locale] || item.names.en}` })),
    country: 'CA', consent: c.consent, privacy: c.privacy, description: c.description,
    noteClosed: true, noteContainsOnlyTextarea: true, honeypotHidden: true, submit: c.submit,
  };
}

// This snapshot contains schema and empty-state booleans only. Never collect
// personal field values, storage, cookies, requests, or client-page content.
export function readPaidForm(form) {
  const note = form.querySelector('details');
  const consent = form.querySelector('input[type="checkbox"]');
  const country = form.querySelector('select');
  const honeypot = form.querySelector('input[name="website"]');
  return {
    busy: form.getAttribute('aria-busy'),
    customControls: form.querySelectorAll('[contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="checkbox"], [role="combobox"]').length,
    controls: [...form.querySelectorAll('input, textarea, select, button')].map(el => ({
      tag: el.tagName, type: el.getAttribute('type'), required: el.required === true, disabled: el.disabled === true,
      empty: el.value === '', autocomplete: el.getAttribute('autocomplete'), min: el.getAttribute('minlength'), max: el.getAttribute('maxlength'),
      name: el.getAttribute('name'), label: el.getAttribute('aria-label'), visibleLabel: el.labels?.length ? el.labels[0].textContent.trim() : null, tab: el.getAttribute('tabindex'),
      ...(el.type === 'checkbox' ? { checked: el.checked } : {}),
    })),
    countries: [...(country?.options || [])].map(option => ({ value: option.value, text: option.textContent.trim() })),
    country: country?.value, consent: consent?.closest('label')?.querySelector('span')?.textContent.trim(),
    privacy: note?.querySelector('small')?.textContent.trim(), description: note?.querySelector('summary')?.textContent.trim(),
    noteClosed: note?.open === false, noteContainsOnlyTextarea: note?.querySelectorAll('input, textarea, select').length === 1 && !!note.querySelector('textarea'),
    honeypotHidden: honeypot?.closest('label')?.getAttribute('aria-hidden') === 'true',
    submit: form.querySelector('button[type="submit"]')?.textContent.trim(),
  };
}

export function assertPaidFormSnapshot(snapshot, locale) {
  assert.deepEqual(snapshot, expectedPaidForm(locale), 'Exact blank contact-only enquiry schema, optional note, unchecked consent and disabled submit');
}

export async function verifyPaidEnquiryUi(page, policy, expect) {
  const capture = page.locator('[data-consultation-capture="service"]');
  await expect(capture).toHaveCount(1);
  const choices = capture.locator('[role="group"] button');
  await expect(choices).toHaveCount(3);
  const chooser = capture.locator('[data-contact-channel-chooser]');
  const trigger = chooser.locator('button[data-contact-order]');
  const form = chooser.locator('form');
  const clickButton = async button => {
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute('type', 'button');
    for (const name of ['form', 'formaction', 'formmethod']) assert.equal(await button.getAttribute(name), null, 'No form-associated audit click');
    assert.equal(await button.evaluate(el => el.tagName === 'BUTTON' && el.form === null), true, 'Only standalone non-submit buttons may be clicked');
    await button.click();
  };
  const blank = async (index, minutes, price) => {
    await expect(choices.nth(index)).toHaveAttribute('aria-pressed', 'true');
    const option = await choices.nth(index).innerText();
    assert.ok(option.includes(minutes) && option.includes(price), 'Selected paid duration and price');
    await expect(chooser).toHaveCount(1);
    await expect(chooser).toHaveAttribute('data-open', 'false');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(form).toHaveCount(1);
    await expect(capture.locator('form')).toHaveCount(1);
    await expect(capture.locator('input, textarea, select')).toHaveCount(7);
    await expect(capture.locator('[contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="checkbox"], [role="combobox"]')).toHaveCount(0);
    assertPaidFormSnapshot(await form.evaluate(readPaidForm), policy.locale);
    await expect(chooser.locator('a, [data-contact-channel]')).toHaveCount(0);
    await clickButton(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(form).toBeVisible();
    await expect(chooser.locator('a, [data-contact-channel]')).toHaveCount(0);
    const note = form.locator('details');
    await expect(note).toHaveCount(1);
    const summary = note.locator(':scope > summary');
    await expect(summary).toHaveCount(1);
    await expect(summary.locator('a, button, input, select, textarea')).toHaveCount(0);
    await summary.click();
    await expect(form.locator('textarea')).toBeVisible();
    await summary.click();
    assertPaidFormSnapshot(await form.evaluate(readPaidForm), policy.locale);
  };
  await blank(0, '60', '€100');
  await clickButton(trigger);
  await blank(0, '60', '€100'); // Reopening must not submit or create links.
  const originalForm = await form.elementHandle();
  assert.ok(originalForm, 'Original paid form is present');
  try {
    await clickButton(choices.nth(1));
    await expect.poll(() => originalForm.evaluate(el => el.isConnected)).toBe(false);
  } finally { await originalForm.dispose(); }
  await blank(1, '30', '€50');
  const expressForm = await form.elementHandle();
  assert.ok(expressForm, 'Express paid form is present');
  try {
    await clickButton(choices.nth(2));
    await expect.poll(() => expressForm.evaluate(el => el.isConnected)).toBe(false);
  } finally { await expressForm.dispose(); }
  await expect(chooser).toHaveCount(0);
  const free = capture.locator('[data-consultation-action]');
  await expect(free).toHaveCount(1);
  await expect(free).toBeVisible();
  await expect(free).toHaveAttribute('data-consultation-action', 'free');
  assert.equal(await free.getAttribute('href'), '/' + policy.locale + '/services/free-situation-review');
  assert.equal(await free.getAttribute('target'), null);
  assert.equal(await free.getAttribute('data-contact-channel'), null);
  await clickButton(choices.nth(0));
  await blank(0, '60', '€100');
  return { contactOnlySchemaVerified: true, paidPricesVerified: true, freeAssessmentInternal: true, resetVerified: true,
    postSaveRuntimeVerified: false, preparedMessageRuntimeVerified: false, messageSent: false };
}

export async function verifyReleasePaidEnquiry(browser, options, expect) {
  const policy = releasePaidPolicy(options); // Must reject before ANY context/network operation.
  const context = await browser.newContext({ viewport: { width: policy.width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  let guard, result;
  try {
    guard = await installPaidReadOnlyGuard(context, policy);
    const page = await context.newPage();
    const response = await page.goto(policy.origin + policy.path, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, 'Paid public page must return 200');
    await expect(page).toHaveURL(policy.origin + policy.path);
    result = await verifyPaidEnquiryUi(page, policy, expect);
  } finally {
    // Keep interception installed until the whole fresh context is closed, then
    // check every attempt, including late teardown traffic. No fixture or POST.
    await context.close();
    if (guard) {
      await guard.settle();
      result = { ...result, ...guard.assertClean() };
    }
  }
  return result;
}
