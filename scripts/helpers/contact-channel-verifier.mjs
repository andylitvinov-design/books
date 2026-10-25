import assert from 'node:assert/strict';

// Read and validate prepared links only: acceptance must never send an enquiry.
export async function assertPreparedContactChannels(chooser, expect) {
  await expect(chooser).toHaveCount(1);
  await expect(chooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'true');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
  const whatsapp = chooser.locator('a[data-contact-channel="whatsapp"]');
  const telegram = chooser.locator('a[data-contact-channel="telegram"]');
  const urls = [];
  for (const [link, host, path] of [[whatsapp, 'https://wa.me', '/14376066502'], [telegram, 'https://t.me', '/AndyTherapist']]) {
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toHaveAttribute('rel', /noreferrer/);
    const url = new URL(await link.getAttribute('href'));
    assert.equal(url.origin, host);
    assert.equal(url.pathname, path);
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(url.hash, '');
    assert.deepEqual([...url.searchParams.keys()], ['text'], 'Only the prepared message belongs in the contact URL');
    assert.ok(url.searchParams.get('text')?.trim(), 'Prepared message must not be empty');
    urls.push(url);
  }
  assert.equal(urls[1].searchParams.get('text'), urls[0].searchParams.get('text'), 'Both channels must preserve the exact selected request');
  // Retrying assertions observe the committed open state after React effects.
  await expect(chooser.locator('button[data-contact-order]')).toHaveAttribute('aria-expanded', 'true');
  return { whatsapp, telegram, whatsappUrl: urls[0], telegramUrl: urls[1] };
}

export async function openContactChannelChooser(scope, expect) {
  const chooser = scope.locator('[data-contact-channel-chooser]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toHaveCount(1);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
  for (const channel of ['whatsapp', 'telegram']) {
    const link = chooser.locator('a[data-contact-channel="' + channel + '"]');
    await expect(link).toHaveCount(1);
    await expect(link).toBeHidden();
  }
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await assertPreparedContactChannels(chooser, expect);
  return chooser;
}

/**
 * Page routes precede context routes. Never use continue here: even a harmless
 * read must fall back through the caller's context-level privacy boundary.
 * All diagnostics are fixed labels, never request URLs, headers or bodies.
 */
export function createSyntheticContactRegistrationGate(pageURL, { profile, onSaved } = {}) {
  let origin;
  try {
    const url = new URL(pageURL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error();
    origin = url.origin;
  } catch { throw Error('Synthetic contact route requires an HTTP(S) page origin'); }
  const endpoint = origin + '/api/service-enquiries';
  const submissions = [], reasons = [], pending = new Set();
  let blockedCount = 0, armed = false, draining = false;
  async function block(route, reason) {
    blockedCount++;
    if (reasons.length < 8) reasons.push(reason);
    await route.abort('blockedbyclient');
  }
  const gate = {
    submissions,
    async drain() { while (pending.size) await Promise.allSettled([...pending]); },
    beginInteraction() { assert.equal(draining, false, 'Synthetic route is closed'); armed = true; },
    beginTeardown() { draining = true; armed = false; },
    diagnostics() { return { blockedCount, reasons: [...reasons] }; },
    assertClean() {
      assert.equal(blockedCount, 0, 'Synthetic contact route blocked: ' + reasons.join(', '));
    },
    async handle(route) {
      if (draining) return block(route, 'after-teardown');
      const request = route.request();
      let url;
      try { url = new URL(request.url()); }
      catch { return block(route, 'invalid-url'); }
      const method = request.method();
      // GET/HEAD elsewhere remain subject to existing context read restrictions.
      // The enquiry endpoint, including foreign/query variants, is never a read.
      if (url.pathname !== '/api/service-enquiries' && ['GET', 'HEAD'].includes(method)) {
        return route.fallback();
      }
      if (method !== 'POST') return block(route, 'unexpected-method');
      if (url.origin !== origin) return block(route, 'unexpected-origin');
      if (url.pathname !== '/api/service-enquiries') return block(route, 'unexpected-endpoint');
      // Exact serialization also rejects bare '?', credentials and fragments.
      if (request.url() !== endpoint) return block(route, 'noncanonical-endpoint');
      if (!armed) return block(route, 'before-explicit-submit');
      if (blockedCount) return block(route, 'prior-violation');
      if (submissions.length) return block(route, 'duplicate-submission');
      let data;
      try { data = request.postDataJSON(); }
      catch { return block(route, 'invalid-json'); }
      if (profile) {
        try { assertCompactAlchemyBody(data, profile); }
        catch { return block(route, 'unexpected-synthetic-body'); }
      } else if (!data || typeof data !== 'object' || Array.isArray(data)
        || data.contact?.displayName !== 'Public QA Visitor'
        || data.contact?.email !== 'enquiry-qa@example.test'
        || data.contact?.phone !== '' || data.contactConsent !== true
        || data.description !== '' || typeof data.serviceTitle !== 'string' || !data.serviceTitle.trim()
        || typeof data.operationId !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.operationId)
        || data.website !== '') return block(route, 'unexpected-synthetic-body');
      submissions.push(data);
      // Mark the synthetic saved acknowledgment before releasing its response.
      // Marking after fulfill races the real browser's response continuation.
      await onSaved?.();
      await route.fulfill({ status: 201, contentType: 'application/json',
        body: JSON.stringify({ saved: true, referenceCode: profile?.referenceCode || 'HH-ABCD1234EF56' }) });
    },
  };
  const handle = gate.handle;
  gate.handle = route => {
    const operation = Promise.resolve().then(async () => {
      try { return await handle(route); }
      catch (primary) {
        // A throwing fulfillment/ack callback must not leave fetch suspended.
        try { await route.abort('blockedbyclient'); } catch { /* retain primary */ }
        throw primary;
      }
    });
    pending.add(operation);
    operation.then(() => pending.delete(operation), () => {
      pending.delete(operation);
      blockedCount++;
      if (reasons.length < 8) reasons.push('route-handler-failed');
    });
    return operation;
  };
  return gate;
}

/**
 * Verify the REAL public two-stage flow against a hydrated local Next server.
 * Mock only the POST response to avoid writing fake contacts into Supabase.
 * A messenger link cannot exist until an explicitly consented enquiry is saved.
 */
export async function openRegisteredContactChannelChooser(scope, expect, page) {
  const chooser = scope.locator('[data-contact-channel-chooser]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toHaveCount(1);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  const gate = createSyntheticContactRegistrationGate(page.url());
  const { submissions } = gate;
  const handler = route => gate.handle(route);
  await page.route('**/*', handler);
  let primaryFailure = false;
  try {
    await trigger.click();
    gate.assertClean();
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    const form = chooser.locator('form');
    await expect(form).toBeVisible();
    const submit = form.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();
    await form.locator('input[autocomplete="name"]').fill('Public QA Visitor');
    await form.locator('input[autocomplete="email"]').fill('enquiry-qa@example.test');
    await expect(submit).toBeDisabled();
    await form.locator('input[type="checkbox"]').check();
    gate.assertClean();
    gate.beginInteraction();
    await submit.click();
    gate.assertClean();
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
    assert.equal(submissions.length,1,'Exactly one explicitly consented synthetic registration');
    const data=submissions[0];
    assert.equal(data.contact.displayName,'Public QA Visitor');
    assert.equal(data.contact.email,'enquiry-qa@example.test');
    assert.equal(data.contactConsent,true);
    assert.equal(data.description,'','Optional personal note must not be required');
    assert.ok(data.serviceTitle && typeof data.serviceTitle==='string');
    assert.ok(data.operationId && /^[a-f0-9-]{36}$/i.test(data.operationId));
    assert.equal(data.website,'');
    const prepared = await assertPreparedContactChannels(chooser,expect);
    assert.doesNotMatch(prepared.whatsappUrl.searchParams.get('text')||'',
      /Public QA Visitor|enquiry-qa@example\.test/,'No synthetic contact data in a messenger URL');
    assert.match(prepared.whatsappUrl.searchParams.get('text')||'',/HH-ABCD1234EF56/);
    gate.assertClean();
    return chooser;
  } catch (error) {
    primaryFailure = true;
    throw error;
  } finally {
    const failures = [];
    for (const cleanup of [() => gate.beginTeardown(), () => page.unroute('**/*', handler),
      () => gate.drain(), () => gate.assertClean()]) {
      try { await cleanup(); } catch (error) { failures.push(error); }
    }
    // Cleanup must not hide the original UI/route failure, but an already-started
    // asynchronous handler must settle before this helper can report success.
    if (!primaryFailure && failures.length) throw failures[0];
  }
}


/** Fixed local selected-format fixture, independent of observed request/DOM values. */
export function createCompactAlchemyRegistrationProfile(pageURL, { format = '30', referenceCode = 'HH-ABCD1234EF56' } = {}) {
  const url = new URL(pageURL);
  assert.equal(url.protocol, 'http:', 'Compact fixture requires loopback HTTP');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.port);
  assert.ok(!url.username && !url.password && pageURL === url.origin + url.pathname);
  const match = url.pathname.match(/^\/(en|ru|es)\/services\/alchemy-of-soul$/);
  assert.ok(match, 'Compact fixture requires the exact localized Alchemy route');
  assert.equal(format, '30', 'Only the selected express fixture is authorized');
  assert.match(referenceCode, /^HH-[A-F0-9]{12}$/);
  const locale = match[1];
  const fixed = {
    en: ['Alchemy of the Soul / Psycho-homeopathy', 'Express review · 30 min · €50', 'Format',
      'Hello Andrey!', 'Holistic House — service enquiry', 'Service', 'Request', 'Selected option', 'Page', 'Enquiry',
      'Hello! I would like to book the selected Alchemy of the Soul / Psycho-homeopathy service. Please share available times and confirm the terms.'],
    ru: ['Алхимия души / Психогомеопатия', 'Экспресс · 30 минут · €50', 'Формат',
      'Здравствуйте, Андрей!', 'Holistic House — запрос по услуге', 'Услуга', 'Запрос', 'Выбранный вариант', 'Страница', 'Заявка',
      'Здравствуйте! Хочу заказать выбранную услугу «Алхимия души / Психогомеопатия». Уточните, пожалуйста, доступное время и подтвердите условия.'],
    es: ['Alquimia del Alma / Psicohomeopatía', 'Revisión exprés · 30 minutos · €50', 'Formato',
      'Hola Andrey.', 'Holistic House — solicitud de servicio', 'Servicio', 'Solicitud', 'Opción elegida', 'Página', 'Solicitud',
      '¡Hola! Quisiera solicitar el servicio elegido de Alquimia del Alma / Psicohomeopatía. Indícame los horarios disponibles y confirma las condiciones.'],
  }[locale];
  const [service, option, label, greeting, headline, serviceLabel, requestLabel, optionLabel, pageLabel, referenceLabel, request] = fixed;
  const serviceTitle = service + ' · ' + option;
  const message = [greeting, headline, '', serviceLabel + ': ' + serviceTitle, requestLabel + ': ' + request,
    optionLabel + ': ' + option, pageLabel + ': https://holistichouse.vercel.app' + url.pathname,
    '', referenceLabel + ': ' + referenceCode].join('\n');
  // Match the production append's URLSearchParams serialization, not merely text.
  const whatsapp = new URL('https://wa.me/14376066502'); whatsapp.searchParams.set('text', message);
  const telegramUrl = 'https://t.me/AndyTherapist?text=' + encodeURIComponent(message);
  return Object.freeze({ locale, sourcePath: url.pathname, serviceTitle, description: label + ': ' + option,
    contact: Object.freeze({ displayName: '', email: '', phone: '+14165550123' }),
    referenceCode, whatsappUrl: whatsapp.href, telegramUrl });
}

export function assertCompactAlchemyBody(data, profile) {
  assert.ok(data && typeof data === 'object' && !Array.isArray(data));
  assert.deepEqual(Object.keys(data).sort(), ['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'].sort());
  assert.match(data.operationId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
  for (const key of ['serviceTitle', 'description', 'sourcePath', 'locale']) assert.equal(data[key], profile[key]);
  assert.deepEqual(data.contact, profile.contact);
  assert.equal(data.contactConsent, true);
  assert.equal(data.website, '');
}

/**
 * Fixture-owned popup sentinel. It never calls the original window.open or any
 * real location API. All untrusted attempted destinations become fixed reasons;
 * only the exact known synthetic URL may appear in recorded evidence.
 */
export async function installSyntheticContactPopup(page, { expectedDestination }) {
  const parsed = new URL(expectedDestination);
  assert.ok((parsed.origin === 'https://wa.me' && parsed.pathname === '/14376066502')
    || (parsed.origin === 'https://t.me' && parsed.pathname === '/AndyTherapist'));
  assert.ok(!parsed.username && !parsed.password && !parsed.hash);
  assert.deepEqual([...parsed.searchParams.keys()], ['text']);
  assert.match(parsed.searchParams.get('text') || '', /HH-[A-F0-9]{12}$/);
  assert.doesNotMatch(parsed.searchParams.get('text') || '', /4165550123|enquiry-qa@example\.test|Public QA Visitor/);
  await page.evaluate(expected => {
    if (Object.hasOwn(window, '__hhSyntheticContactPopup')) throw Error('POPUP_FIXTURE_ALREADY_INSTALLED');
    const original = Object.getOwnPropertyDescriptor(window, 'open');
    const originalOpen = window.open;
    const state = { original, originalOpen, expected, attempts: [], reasons: [], count: 0, active: null };
    const fail = reason => { state.count++; if (state.reasons.length < 8) state.reasons.push(reason); throw Error(reason); };
    const replacement = (...args) => {
      const attempt = state.active;
      if (!attempt) return fail('POPUP_BEFORE_EXPLICIT_ACTION');
      if (args.length !== 2 || args[0] !== 'about:blank' || args[1] !== '_blank') return fail('POPUP_UNEXPECTED_ARGUMENTS');
      if (attempt.events.length) return fail('POPUP_DUPLICATE_RESERVATION');
      attempt.events.push('reserved');
      const popup = { opener: null, closed: false, close() {
        if (popup.closed) return fail('POPUP_DUPLICATE_CLOSE');
        popup.closed = true; attempt.events.push('closed');
      } };
      const location = Object.freeze({ replace(destination) {
        if (!attempt.saved) return fail('POPUP_BEFORE_SAVED_ACK');
        if (popup.closed || attempt.events.at(-1) !== 'saved-ack') return fail('POPUP_UNEXPECTED_ORDER');
        if (destination !== state.expected) return fail('POPUP_UNEXPECTED_DESTINATION');
        attempt.events.push('destination'); attempt.destination = state.expected;
      } });
      Object.defineProperty(popup, 'location', { get: () => location, set: () => fail('POPUP_LOCATION_ASSIGNMENT') });
      return popup;
    };
    state.replacement = replacement;
    state.fail = fail;
    Object.defineProperty(window, '__hhSyntheticContactPopup', { value: state, configurable: true });
    try {
      window.open = replacement;
      if (window.open !== replacement) throw Error('POPUP_INSTALL_FAILED');
    } catch (error) {
      if (original) Object.defineProperty(window, 'open', original); else delete window.open;
      delete window.__hhSyntheticContactPopup;
      throw error;
    }
  }, expectedDestination);
  let restored = false;
  const inspect = async () => page.evaluate(() => {
    const state = window.__hhSyntheticContactPopup;
    if (!state || window.open !== state.replacement) throw Error('POPUP_FIXTURE_REPLACED');
    return { blockedCount: state.count, reasons: [...state.reasons], attempts: state.attempts.map(a => ({events:[...a.events], ...(a.destination ? {destination:a.destination} : {})})) };
  });
  const assertClean = async () => {
    const state = await inspect();
    assert.equal(state.blockedCount, 0, 'Synthetic popup blocked: ' + state.reasons.join(', '));
    return state;
  };
  return {
    snapshot: inspect,
    assertClean,
    async arm() {
      await assertClean();
      await page.evaluate(() => {
        const state = window.__hhSyntheticContactPopup;
        if (state.active && !['destination', 'closed'].includes(state.active.events.at(-1))) return state.fail('POPUP_PREVIOUS_ATTEMPT_PENDING');
        state.active = { saved: false, events: [] }; state.attempts.push(state.active);
      });
    },
    async acknowledgeSaved() {
      await assertClean();
      await page.evaluate(() => {
        const state = window.__hhSyntheticContactPopup, attempt = state?.active;
        if (!state || window.open !== state.replacement) throw Error('POPUP_FIXTURE_REPLACED');
        if (!attempt || attempt.saved || attempt.events.join(',') !== 'reserved') return state.fail('POPUP_SAVED_ACK_OUT_OF_ORDER');
        attempt.saved = true; attempt.events.push('saved-ack');
      });
    },
    async assertAttempt({ saved }) {
      const state = await assertClean(), attempt = state.attempts.at(-1);
      assert.ok(attempt, 'Explicit popup attempt required');
      assert.deepEqual(attempt.events, saved ? ['reserved', 'saved-ack', 'destination'] : ['reserved', 'closed']);
      if (saved) assert.equal(attempt.destination, expectedDestination);
    },
    async restore() {
      if (restored) return;
      const result = await page.evaluate(() => {
        const state = window.__hhSyntheticContactPopup;
        if (!state) throw Error('POPUP_FIXTURE_MISSING_DURING_CLEANUP');
        const intact = window.open === state.replacement;
        if (state.original) Object.defineProperty(window, 'open', state.original); else delete window.open;
        const restoredIdentity = window.open === state.originalOpen;
        delete window.__hhSyntheticContactPopup;
        return { intact, restoredIdentity, blockedCount: state.count, reasons: [...state.reasons] };
      });
      restored = true;
      assert.ok(result.restoredIdentity, 'Original popup global must be restored');
      assert.ok(result.intact, 'Popup sentinel was replaced during fixture');
      assert.equal(result.blockedCount, 0, 'Synthetic popup blocked: ' + result.reasons.join(', '));
    },
  };
}

/** Consent through real compact controls; no CRM transport or provider navigation. */
export async function openRegisteredCompactPhoneChooser(scope, expect, page) {
  const pageURL = page.url();
  const profile = createCompactAlchemyRegistrationProfile(pageURL);
  const chooser = scope.locator('[data-contact-channel-chooser][data-compact-phone-trigger="true"]');
  await expect(chooser).toHaveCount(1);
  const trigger = chooser.locator('button[data-contact-order]');
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
  const gate = createSyntheticContactRegistrationGate(page.url(), { profile, onSaved: () => popup.acknowledgeSaved() });
  const handler = route => gate.handle(route);
  let popup, routed = false, primary;
  try {
    await page.route('**/*', handler); routed = true;
    popup = await installSyntheticContactPopup(page, { expectedDestination: profile.whatsappUrl });
    await trigger.click();
    gate.assertClean(); await popup.assertClean();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const form = chooser.locator('form');
    await expect(form).toBeVisible();
    await expect(form.locator('input[type="email"]')).toHaveCount(0);
    for (const channel of ['whatsapp', 'telegram']) await expect(form.locator('button[data-contact-channel-submit="' + channel + '"]')).toBeVisible();
    await form.locator('[data-phone-country-input] select').selectOption('CA');
    await form.locator('[data-phone-country-input] input[type="tel"]').fill('4165550123');
    await form.locator('input[type="checkbox"]').check();
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
    assert.equal(gate.submissions.length, 0, 'No registration before explicit action');
    gate.assertClean(); await popup.assertClean();
    await popup.arm(); gate.beginInteraction();
    await form.locator('button[data-contact-channel-submit="whatsapp"]').click();
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2);
    await gate.drain(); gate.assertClean();
    assert.equal(gate.submissions.length, 1, 'Exactly one explicitly consented synthetic registration');
    assertCompactAlchemyBody(gate.submissions[0], profile);
    const prepared = await assertPreparedContactChannels(chooser, expect);
    assert.equal(prepared.whatsappUrl.href, profile.whatsappUrl, 'Exact frozen public request and reference');
    assert.equal(prepared.telegramUrl.href, profile.telegramUrl, 'Exact same frozen request on Telegram');
    await popup.assertAttempt({ saved: true });
    assert.equal(page.url(), pageURL, 'Compact receipt stays on the Alchemy page');
    return chooser;
  } catch (error) { primary = error; throw error; }
  finally {
    const failures = [];
    // Try every cleanup even when route removal or global restoration fails.
    for (const cleanup of [() => gate.beginTeardown(), () => routed && page.unroute('**/*', handler), () => gate.drain(),
      () => gate.assertClean(), () => popup?.restore()]) {
      try { await cleanup(); } catch (error) { failures.push(error); }
    }
    if (!primary && failures.length) throw failures[0];
  }
}
