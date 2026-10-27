import { withReviewConsentDiagnostics } from './review-consent-diagnostics.mjs';
import assert from 'node:assert/strict';

export async function openHomeConversation(page, expect) {
  const guide = page.locator('[data-home-conversation-guide]');
  const disclosure = page.locator('details[data-home-more-deferred="true"]');
  await expect(disclosure).toHaveCount(1);
  await expect(guide).toHaveCount(0);
  assert.equal(await disclosure.evaluate(node => node.open), false);
  const summary = disclosure.locator(':scope > summary');
  await expect(summary).toHaveCount(1);
  await expect(summary).toBeVisible();
  await summary.click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(guide).toHaveCount(1);
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute('data-guide-phase', 'ready');
  return guide;
}

const phone = '+14165550123';
const reference = 'HH-AABBCCDDEEFF';
const service = { en: 'Free personal express review', ru: 'Бесплатная личная экспресс-диагностика' };
const focus = { en: 'Situation', ru: 'Ситуация' };

export function assertReviewFaultPayload(payload, locale) {
  assert.deepEqual(Object.keys(payload).sort(), ['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'].sort());
  assert.match(payload.operationId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  assert.equal(payload.serviceTitle, service[locale]);
  assert.equal(payload.description, 'Express review focus: ' + focus[locale]);
  assert.equal(payload.sourcePath, '/' + locale + '/services/free-situation-review');
  assert.equal(payload.locale, locale);
  assert.deepEqual(payload.contact, { displayName: '', email: '', phone });
  assert.equal(payload.contactConsent, true);
  assert.equal(payload.website, '');
}

export function assertReviewFaultLinks(urls) {
  assert.equal(urls.length, 2);
  const expected = [['wa.me', '/14376066502'], ['t.me', '/AndyTherapist']];
  const messages = urls.map((value, index) => {
    const url = new URL(value);
    assert.equal(url.protocol, 'https:');
    for (const field of ['username', 'password', 'port', 'hash']) assert.equal(url[field], '', 'No extra URL credentials, port or fragment');
    assert.equal(url.hostname, expected[index][0]);
    assert.equal(url.pathname, expected[index][1]);
    assert.deepEqual([...url.searchParams.keys()], ['text']);
    const message = url.searchParams.get('text') || '';
    assert.ok(message.length >= 35);
    assert.ok(message.includes(reference));
    for (const secret of [phone, '14165550123', '4165550123', 'qa.home@example.test', 'Initial question:', 'Express review focus:']) assert.ok(!message.includes(secret), 'No private contact/context in messenger draft');
    return message;
  });
  assert.equal(messages[0], messages[1], 'Both channels carry the same neutral draft');
}

// All writes/provider requests are intercepted before any request leaves the
// isolated browser. No database, external delivery or popup-opening requirement.
export function createReviewFaultGuard(origin, locale, kind) {
  const url = new URL(origin);
  assert.equal(url.origin, origin);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.ok(['en', 'ru'].includes(locale));
  assert.ok(['retry', 'handoff-failure'].includes(kind));
  const writes = [], blocked = [], providerAttempts = [], unexpectedWrites = [], unexpectedProviderAttempts = [], routeErrors = [];
  const pending = new Set();
  let allowedProviderUrl = null, routeVersion = 0;
  const handle = async requestRoute => {
    const request = requestRoute.request();
    const target = new URL(request.url());
    const method = request.method();
    if (target.origin === origin && target.pathname === '/api/service-enquiries' && !target.search && method === 'POST') {
      const payload = request.postDataJSON();
      assertReviewFaultPayload(payload, locale);
      writes.push(payload);
      const failed = kind === 'retry' && writes.length === 1;
      return requestRoute.fulfill({ status: failed ? 503 : 201, contentType: 'application/json',
        body: JSON.stringify(failed ? { error: 'SYNTHETIC_SAVE_FAILURE' } : { saved: true, referenceCode: reference }) });
    }
    if (target.origin === origin && ['GET', 'HEAD'].includes(method)) {
      if (target.pathname.startsWith('/api/')) return requestRoute.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"SYNTHETIC_READ_BLOCKED"}' });
      return requestRoute.continue();
    }
    if (!['GET', 'HEAD'].includes(method)) unexpectedWrites.push({ method, category: 'unexpected-write' });
    if (['wa.me', 't.me'].includes(target.hostname)) {
      providerAttempts.push(request.url());
      if (request.url() !== allowedProviderUrl || method !== 'GET') unexpectedProviderAttempts.push(request.url());
      allowedProviderUrl = null; // One native fallback gesture permits one aborted request.
    }
    else blocked.push({ method, category: 'nonlocal-or-write' });
    return requestRoute.abort('blockedbyclient');
  };
  const route = requestRoute => {
    routeVersion++;
    const task = handle(requestRoute).catch(async error => {
      routeErrors.push(error);
      try { await requestRoute.abort('blockedbyclient'); } catch (abortError) { routeErrors.push(abortError); }
    }).finally(() => pending.delete(task));
    pending.add(task);
    return task;
  };
  const drain = async () => {
    // Closing the owned pages stops new browser work. Let queued route callbacks
    // enter, then await every tracked fulfillment/abort, including nested work.
    let version;
    do {
      version = routeVersion;
      await Promise.all([...pending]);
      await new Promise(resolve => setImmediate(resolve));
    } while (pending.size || version !== routeVersion);
  };
  const allowFallback = destination => {
    assert.equal(allowedProviderUrl, null);
    assert.equal(providerAttempts.length, 0, 'No provider request before the explicit acknowledged fallback');
    allowedProviderUrl = destination;
  };
  return { route, drain, allowFallback, writes, blocked, providerAttempts, unexpectedWrites, unexpectedProviderAttempts, routeErrors };
}

export async function verifyCurrentReviewFault(page, expect, { origin, locale, kind, screenshotPath }) {
  const context = page.context();
  const guard = createReviewFaultGuard(origin, locale, kind);
  const existingPages = new Set(context.pages());
  const ownedPages = new Set([page]);
  const errors = [];
  const onError = error => errors.push(error.message);
  const onPage = child => { if (!existingPages.has(child) && !ownedPages.has(child)) { ownedPages.add(child); child.on('pageerror', onError); } };
  page.on('pageerror', onError);
  context.on('page', onPage);
  const expectedWrites = kind === 'retry' ? 2 : 1;
  let primaryError;
  let guardInstalled = false;
  const cleanupErrors = [];
  try {
    await context.route('**/*', guard.route);
    guardInstalled = true;
    await page.goto(origin + '/' + locale + '/services/free-situation-review', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(fault => {
      const probe = { popups: [], attempts: [], failures: [] };
      window.__homeReviewFaultProbe = probe;
      window.open = () => {
        const state = { closed: false };
        probe.popups.push(state);
        return { opener: null, get closed() { return state.closed; }, close() { state.closed = true; },
          location: { replace(destination) {
            probe.attempts.push(destination);
            if (fault === 'handoff-failure') {
              probe.failures.push({ destination, code: 'SYNTHETIC_HANDOFF_FAILURE' });
              throw new Error('SYNTHETIC_HANDOFF_FAILURE');
            }
          } } };
      };
    }, kind);
    const main = page.locator('main[data-free-entry-landing="situation"]');
    await expect(main).toHaveAttribute('lang', locale);
    const enquiry = main.locator('[data-personal-express-enquiry]');
    const reveal = enquiry.locator('button[data-express-reveal]');
    await expect(reveal).toHaveAttribute('aria-expanded', 'false');
    await reveal.click();
    await expect(reveal).toHaveAttribute('aria-expanded', 'true');
    await expect(enquiry.locator('[data-express-inline-disclosure]')).toBeVisible();
    const chooser = enquiry.locator('[data-contact-channel-chooser][data-reiki-phone-enquiry]');
    await expect(chooser).toHaveCount(1);
    const form = chooser.locator('form');
    const contact = form.locator('[data-phone-country-input] input[type="tel"]');
    const consent = form.locator('input[type="checkbox"]');
    await expect(consent).not.toBeChecked();
    assert.equal(guard.writes.length, 0, 'Opening never saves');
    assert.equal(guard.providerAttempts.length, 0, 'Opening never attempts delivery');
    const submit = form.locator('button[data-contact-channel-submit="whatsapp"]');
    await withReviewConsentDiagnostics(page, form, { locale, kind,
      counters: () => ({ writes: guard.writes.length, providerAttempts: guard.providerAttempts.length,
        routeErrors: guard.routeErrors.length, pageErrors: errors.length }),
    }, async () => {
      await form.locator('[data-phone-country-input] select').selectOption('CA');
      await contact.fill('4165550123');
      await submit.click();
      await expect(form.getByRole('alert')).toBeVisible();
    });
    await expect(consent).not.toBeChecked();
    assert.equal(guard.writes.length, 0, 'No write before explicit reply consent');
    assert.equal(guard.providerAttempts.length, 0, 'No provider attempt before explicit reply consent');
    assert.deepEqual((await page.evaluate(() => window.__homeReviewFaultProbe)).attempts, [], 'No handoff before explicit reply consent');
    const label = form.locator('label:has(input[type="checkbox"])');
    await expect(label).toHaveCount(1);
    await label.click();
    await expect(consent).toBeChecked();
    await submit.click();
    if (kind === 'retry') {
      await expect(form.getByRole('alert')).toBeVisible();
      await expect(chooser.getByRole('status')).toHaveCount(0);
      await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0);
      assert.equal(guard.writes.length, 1);
      assert.equal(guard.providerAttempts.length, 0, 'Rejected save must not attempt provider delivery');
      const failed = await page.evaluate(() => window.__homeReviewFaultProbe);
      assert.deepEqual(failed.attempts, [], 'Failed save must not navigate or send');
      assert.ok(failed.popups.every(popup => popup.closed), 'Close any provisional handoff after failed save');
      await expect(page).toHaveURL(origin + '/' + locale + '/services/free-situation-review');
      await form.locator('button[data-contact-channel-submit="telegram"]').click();
    }
    await expect(chooser.getByRole('status')).toContainText(reference);
    assert.equal(guard.writes.length, expectedWrites);
    assert.equal(guard.providerAttempts.length, 0, 'No provider request before the explicit acknowledged fallback');
    if (kind === 'retry') assert.deepEqual(guard.writes[0], guard.writes[1], 'Unchanged retry reuses the same operation and payload');
    if (kind === 'handoff-failure') await expect(chooser.getByRole('alert')).toBeVisible();
    const links = [chooser.locator('a[data-contact-channel="whatsapp"]'), chooser.locator('a[data-contact-channel="telegram"]')];
    const urls = [];
    for (const link of links) {
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      urls.push(await link.getAttribute('href'));
      await link.click({ trial: true, timeout: 8000 });
      const box = await link.boundingBox();
      const width = page.viewportSize().width;
      assert.ok(box && box.width >= 100 && box.height >= 44 && box.x >= -1 && box.x + box.width <= width + 1, 'Safe fallback is tappable and inside viewport');
    }
    assertReviewFaultLinks(urls);
    const acknowledged = await page.evaluate(() => window.__homeReviewFaultProbe);
    const intendedDestination = urls[kind === 'retry' ? 1 : 0];
    assert.deepEqual(acknowledged.attempts, [intendedDestination], 'The selected explicit channel must actually attempt its safe prepared handoff');
    assert.deepEqual(acknowledged.failures, kind === 'handoff-failure'
      ? [{ destination: intendedDestination, code: 'SYNTHETIC_HANDOFF_FAILURE' }] : [],
    'The post-ACK failure scenario must exercise the intended synthetic exception');
    if (kind === 'handoff-failure') assert.ok(acknowledged.popups.every(popup => popup.closed), 'Close any blocked handoff without retracting receipt');
    // This is a real explicit fallback gesture, not a new registration. The
    // context fence aborts its provider navigation before any external delivery.
    guard.allowFallback(urls[1]);
    const attemptsBeforeFallback = guard.providerAttempts.length;
    await links[1].click({ noWaitAfter: true });
    await expect.poll(() => guard.providerAttempts.length).toBe(attemptsBeforeFallback + 1);
    for (const destination of guard.providerAttempts) assert.equal(destination, urls[1]);
    await expect(chooser.getByRole('status')).toContainText(reference);
    assert.equal(guard.writes.length, expectedWrites, 'A failed explicit handoff must not resave the acknowledged enquiry');
    await expect(page).toHaveURL(origin + '/' + locale + '/services/free-situation-review');
    assert.deepEqual(errors, []);
    assert.deepEqual(guard.unexpectedWrites, [], "No other API/provider write is permitted");
    if (screenshotPath) await chooser.screenshot({ path: screenshotPath, animations: 'disabled' });
  } catch (error) {
    primaryError = error;
  }
  // Do not return a successful receipt before cleanup can emit its last write.
  // Keep the context fence until all owned pages close and all handlers settle.
  const attemptedClose = new Set();
  let safeToUnroute = false;
  try {
    for (;;) {
      for (const child of context.pages()) onPage(child);
      const next = [...ownedPages].filter(child => !attemptedClose.has(child));
      if (!next.length) break;
      for (const child of next) {
        attemptedClose.add(child);
        try { await child.close(); } catch (error) { cleanupErrors.push(error); }
      }
      await guard.drain();
    }
    await guard.drain();
    assert.ok([...ownedPages].every(child => child.isClosed()), 'Every owned page must close before removing the safety fence');
    safeToUnroute = true;
    if (guardInstalled) await context.unroute('**/*', guard.route);
    await guard.drain();
  } catch (error) { cleanupErrors.push(error); }
  // These are deliberately after closure, route removal and the final drain.
  for (const check of [
    () => assert.equal(guard.writes.length, expectedWrites, 'Final drained write count must exclude duplicate saves during cleanup'),
    () => assert.deepEqual(guard.unexpectedWrites, [], 'No late API/provider write is permitted'),
    () => assert.deepEqual(guard.unexpectedProviderAttempts, [], 'Provider requests must belong to the one explicit acknowledged fallback'),
    () => assert.equal(guard.providerAttempts.length, 1, 'Exactly one deliberate fallback request is accounted for'),
    () => assert.deepEqual(guard.routeErrors, [], 'No route handler error may be lost during cleanup'),
    () => assert.deepEqual(errors, [], 'No late page error may be lost during cleanup'),
  ]) { try { check(); } catch (error) { cleanupErrors.push(error); } }
  if (safeToUnroute) {
    context.off('page', onPage);
    for (const child of ownedPages) child.off('pageerror', onError);
  }
  if (primaryError) {
    if (cleanupErrors.length) Object.defineProperty(primaryError, 'cleanupErrors', { value: cleanupErrors });
    throw primaryError;
  }
  if (cleanupErrors.length) {
    Object.defineProperty(cleanupErrors[0], 'additionalCleanupErrors', { value: cleanupErrors.slice(1) });
    throw cleanupErrors[0];
  }
  return { locale, kind, syntheticWrites: guard.writes.length, sameOperationOnRetry: kind === 'retry', receiptRetained: true, noExternalDelivery: true };
}
