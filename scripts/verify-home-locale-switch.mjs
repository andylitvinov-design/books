import assert from 'node:assert/strict';
import { createHomeRouteSupervisor } from './home-route-supervisor.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium, webkit, expect } from '@playwright/test';

const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3129';
const evidence = 'tmp/home-locale-switch';
await mkdir(evidence, { recursive: true });
const results = [];
let app;
const serverLifecycle = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const navigationTraceKey = 'hh-home-entry-navigation-trace';

function homePath(locale) {
  assert.ok(locale === 'en' || locale === 'ru', 'Expected an EN/RU homepage locale');
  return locale === 'en' ? '/' : '/ru';
}

function shouldHoldHomeRsc(request, delayedLocale) {
  // With no active switch, a query-free URL must never match a null locale.
  if (delayedLocale !== 'en' && delayedLocale !== 'ru') return false;
  const url = new URL(request.url());
  return url.origin === origin
    && url.pathname === homePath(delayedLocale)
    && !url.searchParams.has('lang')
    && request.headers().rsc === '1';
}

async function chooseHomeLocale(page, locale) {
  const menu = page.locator('.site-language-menu');
  await expect(menu).toHaveCount(1);
  if (!(await menu.evaluate(node => node.open))) await menu.locator('.site-language-menu-trigger').click();
  await expect(menu).toHaveAttribute('open', '');
  const link = menu.locator(`a[lang="${locale}"]`);
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', homePath(locale));
  await link.click();
}

async function installEntryDiagnostics(context, page) {
  const requests = [];
  await context.addInitScript(({ key }) => {
    const probe = Math.random().toString(36).slice(2);
    const record = (type, details = {}) => {
      try {
        const items = JSON.parse(sessionStorage.getItem(key) || '[]');
        items.push({ type, time: Date.now(), probe, url: location.href, readyState: document.readyState, hydrated: Boolean(history.state?.__NA), earlyCsp: Boolean(window.__cspPreHydration), ...details });
        sessionStorage.setItem(key, JSON.stringify(items.slice(-500)));
      } catch {}
    };
    record('init');
    for (const event of ['pageshow', 'pagehide', 'popstate', 'DOMContentLoaded', 'load']) {
      window.addEventListener(event, value => record(event, { persisted: Boolean(value.persisted) }), true);
    }
    document.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link) return;
      const details = { href: link.href, offer: link.dataset.homeFreeAction || null, trusted: event.isTrusted, x: event.clientX, y: event.clientY };
      record('click-capture', { ...details, prevented: event.defaultPrevented });
      queueMicrotask(() => record('click-after', { ...details, prevented: event.defaultPrevented }));
    }, true);
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function (...args) {
        record(`history-${method}`, { destination: args[2] == null ? null : String(args[2]) });
        return Reflect.apply(original, this, args);
      };
    }
  }, { key: navigationTraceKey });
  const relevant = request => {
    const url = new URL(request.url());
    return url.origin === origin && (request.isNavigationRequest() || url.searchParams.has('_rsc') || url.pathname === '/api/app/guest/bootstrap');
  };
  for (const event of ['request', 'requestfinished', 'requestfailed']) {
    page.on(event, request => {
      if (relevant(request)) requests.push({ event, time: Date.now(), pageUrl: page.url(), url: request.url(), method: request.method(), failure: request.failure()?.errorText || null });
    });
  }
  page.on('response', response => {
    if (relevant(response.request())) requests.push({ event: 'response', time: Date.now(), pageUrl: page.url(), url: response.url(), status: response.status() });
  });
  return requests;
}

async function verifyFreeOffers(page, locale, engine, width) {
  await expect(page.locator('[data-free-insights="public"]')).toHaveCount(0);
  const capture = page.locator('[data-home-contact-capture] [data-home-free-capture]');
  await expect(capture).toHaveCount(1);
  const options = capture.locator('[data-home-free-option]');
  assert.deepEqual(await options.evaluateAll(items => items.map(item => item.dataset.homeFreeOption)), ['selfTest', 'analysis', 'reiki']);
  for (const [id, suffix] of [['selfTest', '/client/tests'], ['analysis', '/services/free-situation-review'], ['reiki', '/academy/principles-of-energywork/learn']]) {
    const option = capture.locator('button[data-home-free-option="' + id + '"]');
    await expect(option).toBeVisible();
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    const cta = capture.locator('a[data-home-free-action="' + id + '"]');
    await expect(cta).toHaveAttribute('href', '/' + locale + suffix);
    await expect(cta).toBeVisible();
    const size = await cta.evaluate(element => ({ height: element.getBoundingClientRect().height, font: parseFloat(getComputedStyle(element).fontSize) }));
    assert.ok(size.height >= 46 && size.font >= 14, 'Small ' + locale + ' ' + id + ' CTA: ' + JSON.stringify(size));
  }
  const captureAfterServices = await capture.evaluate(element => {
    const services = document.querySelector('[data-core-service-offers="home"]');
    return services && (services.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });
  assert.equal(captureAfterServices, true, 'Free chooser must be in the bottom capture after the existing service cards');
  await capture.locator('button[data-home-free-option="selfTest"]').click();
  results.push({ engine, width, locale, freeOffersInBottomCapture: ['selfTest', 'analysis', 'reiki'], touchTargets: true });
}

async function exerciseFreeJourneys(page, engine, width) {
  // Only entry navigation is under test. Never query client data or create a guest session.
  const unexpectedApiRequests = [];
  await page.route(`${origin}/api/app/**`, route => {
    const request = route.request();
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/app/guest/bootstrap') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"expiresAt":null,"moodCheckins":[],"results":[]}' });
    }
    // Read-only status checks may occur in the test picker and Reiki guest course;
    // block them without confusing navigation QA with a private-data submission.
    if (request.method() === 'GET') {
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"APP_UNAVAILABLE"}' });
    }
    unexpectedApiRequests.push({ method: request.method(), path: new URL(request.url()).pathname });
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"APP_UNAVAILABLE"}' });
  });
  for (const locale of ['en', 'ru']) {
    for (const [id, suffix, target] of [
      ['selfTest', '/client/tests', '[data-prelogin-test-picker]'],
      ['analysis', '/services/free-situation-review', '#review-hero-title'],
      ['reiki', '/academy/principles-of-energywork/learn', '[data-energywork-ai-learner]'],
    ]) {
      await page.goto(origin + homePath(locale), { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(origin + homePath(locale));
      // Let homepage prefetches settle before intentionally replacing its document.
      await page.waitForLoadState('networkidle');
      const chooser = page.locator('[data-home-free-capture]');
      await chooser.locator('button[data-home-free-option="' + id + '"]').click();
      const cta = chooser.locator('a[data-home-free-action="' + id + '"]');
      const beforeClick = await cta.evaluate(element => ({ url: location.href, href: element.href, readyState: document.readyState, hydrated: Boolean(history.state?.__NA), earlyCsp: Boolean(window.__cspPreHydration), reactProps: Object.keys(element).some(key => key.startsWith('__reactProps$')) }));
      results.push({ engine, width, locale, entryClickAttempt: id, time: Date.now(), beforeClick });
      await cta.click();
      await expect(page).toHaveURL(`${origin}/${locale}${suffix}`);
      await expect(page.locator(target)).toBeVisible();
      // In WebKit, tearing down an in-flight fetch reports an access-control error.
      // Complete the synthetic bootstrap/prefetches; retain the strict pageerror check.
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await expect(page).toHaveURL(origin + homePath(locale));
      await expect(page.locator('[data-home-contact-capture] [data-home-free-capture]')).toBeVisible();
      await page.waitForLoadState('networkidle');
      results.push({ engine, width, locale, freeJourney: id, destinationRendered: true, backReturned: true, submitted: false });
    }
  }
  assert.deepEqual(unexpectedApiRequests, [], 'Entry navigation must not submit or request private app data');
}

async function verifyHomeTestimonialPosters(page) {
  // The Home public layout shows the first four exact EN originals with archived stills.
  // Two more originals remain in the expandable archive.
  const expectedIds = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk'];
  const testimonials = page.locator('[data-personal-testimonials="home"]');
  await expect(testimonials).toHaveCount(1);
  await expect(testimonials).toHaveAttribute('lang', 'en');
  const cards = testimonials.locator('[data-testimonial-video-id]');
  await expect(cards).toHaveCount(expectedIds.length);
  assert.deepEqual(await cards.evaluateAll(items => items.map(item => item.dataset.testimonialVideoId)), expectedIds);
  const videoPosters = testimonials.locator('.site-video-fallback-poster');
  await expect(videoPosters).toHaveCount(expectedIds.length);
  await expect(testimonials.locator('blockquote')).toHaveCount(1);
  await expect(testimonials.locator('blockquote')).toBeVisible();
  for (const id of expectedIds) {
    const review = testimonials.locator(`[data-testimonial-video-id="${id}"]`);
    await expect(review).toHaveCount(1);
    const poster = review.locator('.site-video-fallback-poster');
    await expect(poster).toHaveCount(1);
    // Next Image may serialize a same-origin absolute src after hydration.
    // Compare the complete resolved URL; foreign origins, query/hash and wrong IDs fail.
    const expectedPoster = new URL(`/images/holistic-house/testimonial-posters/${id}.webp`, page.url()).href;
    await expect.poll(async () => {
      const src = await poster.getAttribute('src');
      return src ? new URL(src, page.url()).href : null;
    }).toBe(expectedPoster);
    await poster.scrollIntoViewIfNeeded();
    await expect(poster).toBeVisible();
    await expect.poll(() => poster.evaluate(image => image.complete && image.naturalWidth > 100), { timeout: 15000 }).toBe(true);
    await expect(review.locator('.site-video-play')).toHaveCount(1);
    await expect(review.locator('iframe')).toHaveCount(0);
    const watch = review.locator('.site-video-watch-link');
    await expect(watch).toHaveCount(1);
    await expect(watch).toHaveAttribute('href', `https://www.youtube.com/watch?v=${id}`);
  }
  return testimonials.locator('[data-testimonial-video-id="Dk0LBmOivQo"]');
}

async function exercise(engine, browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const navigationRequests = await installEntryDiagnostics(context, page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let phase = 'setup';
  const transport = createHomeRouteSupervisor({origin, engine, width, stage:() => phase, pageUrl:() => page.url()});
  const cleanupErrors = [];
  let caseFailure;
  let delayedLocale = null;
  let heldRequests = 0;
  let delayedRscGate = Promise.resolve();
  let releaseHeldRsc = () => {};
  // Hold the real RSC response. This makes the old double-switch race deterministic.
  await page.route('**/*', async route => {
    await transport.handle(route, async perform => {
    const request = route.request();
    if (shouldHoldHomeRsc(request, delayedLocale)) {
      const gate = delayedRscGate;
      heldRequests++;
      const response = await perform('fetch', () => route.fetch());
      await perform('delay', () => pause(2000));
      await perform('gate', () => gate);
      await perform('fulfill', () => route.fulfill({ response }));
    } else await perform('continue', () => route.continue());
    });
  });
  try {
    for (const [from, to] of [['en', 'ru'], ['ru', 'en']]) {
      phase = `${from}-to-${to}`;
      transport.assertHealthy();
      // A fresh source document keeps the target out of the client router cache:
      // both directions must prove an actual held RSC request, not a cached return.
      await page.goto(origin + homePath(from), { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(origin + homePath(from));
      await expect(page.locator('main.house-home')).toHaveAttribute('lang', from);
      const current = page.locator(`[data-video-slot="home-intro"][data-video-locale="${from}"]`);
      await expect(current.locator('iframe')).toHaveCount(0);
      await current.locator('button.site-video-play').click();
      const fromYouTubeId = from === 'en' ? 'Y4K4piEwwA8' : 'AE8Pelpo424';
      await expect(current.locator('iframe')).toHaveAttribute('src', new RegExp('^https://www\\.youtube-nocookie\\.com/embed/' + fromYouTubeId + '\\?'));
      const countBefore = heldRequests;
      delayedRscGate = new Promise(resolve => { releaseHeldRsc = resolve; });
      delayedLocale = to;
      await chooseHomeLocale(page, to);
      await expect.poll(() => heldRequests, { timeout: 15000 }).toBeGreaterThan(countBefore);
      transport.assertHealthy();
      // Before the navigation commits, the new language must not become a clickable
      // optimistic player that will be discarded when the RSC response arrives.
      await expect(page.locator('main.house-home')).toHaveAttribute('lang', from);
      const next = page.locator(`[data-video-slot="home-intro"][data-video-locale="${to}"]`);
      await expect(next).toHaveCount(0);
      releaseHeldRsc();
      await expect(next).toHaveCount(1, { timeout: 20000 });
      transport.assertHealthy();
      await expect(next.locator('iframe')).toHaveCount(0);
      const toYouTubeId = to === 'en' ? 'Y4K4piEwwA8' : 'AE8Pelpo424';
      await next.locator('button.site-video-play').click();
      await expect(next.locator('iframe')).toHaveAttribute('src', new RegExp('^https://www\\.youtube-nocookie\\.com/embed/' + toYouTubeId + '\\?'));
      const frame = await next.locator('iframe').elementHandle();
      await pause(2200);
      assert.ok(await frame.evaluate(element => element.isConnected), 'First-click YouTube iframe was discarded after navigation');
      await expect(page).toHaveURL(origin + homePath(to));
      delayedLocale = null;
      results.push({ engine, width, from, to, heldRsc: true, firstClickRetained: true });
      phase = 'free-offers';
      await verifyFreeOffers(page, to, engine, width);
      transport.assertHealthy();
    }
    transport.assertHealthy();
    assert.deepEqual(errors, []);
    phase = 'visual';
    // Owner-approved homepage: assert computed layout and actual image load, not just JSX strings.
    const offers = page.locator('[data-core-service-offers="home"]');
    await expect(page.locator('main[data-home-design="approved-v2"]')).toHaveCount(1);
    await expect(page.locator('[data-free-insights="public"]')).toHaveCount(0);
    const bottomFree = page.locator('[data-home-contact-capture] [data-home-free-capture]');
    await expect(bottomFree).toHaveCount(1);
    assert.deepEqual(await bottomFree.locator('[data-home-free-option]').evaluateAll(buttons => buttons.map(button => button.dataset.homeFreeOption)), ['selfTest', 'analysis', 'reiki']);
    await expect(bottomFree.locator('a[data-home-free-action="selfTest"]')).toHaveAttribute('href', '/en/client/tests');
    await expect(offers.locator('[data-core-service-id]')).toHaveCount(4);
    for (const id of ['situation', 'dao', 'alchemy', 'hypnotherapy']) {
      await expect(offers.locator('[data-core-service-id="' + id + '"]')).toHaveCount(1);
    }
    const firstOfferPhoto = offers.locator('[data-core-service-id="situation"] img');
    await firstOfferPhoto.scrollIntoViewIfNeeded();
    await expect.poll(() => firstOfferPhoto.evaluate(img => img.complete && img.naturalWidth > 100), { timeout: 15000 }).toBe(true);
    await expect(page.locator('[data-home-contact-capture]')).toHaveCount(1);
    const capture = page.locator('[data-home-contact-capture] [data-consultation-capture="home-free"]');
    await expect(capture).toBeVisible();
    await expect(capture.locator('[data-choice-layout="home-free"] button')).toHaveCount(3);
    await capture.locator('button[data-home-free-option="analysis"]').click();
    await expect(capture.locator('a[data-home-free-action="analysis"]')).toHaveAttribute('href', '/en/services/free-situation-review');
    await capture.locator('button[data-home-free-option="reiki"]').click();
    await expect(capture.locator('a[data-home-free-action="reiki"]')).toHaveAttribute('href', '/en/academy/principles-of-energywork/learn');
    await capture.locator('button[data-home-free-option="selfTest"]').click();
    const firstReview = await verifyHomeTestimonialPosters(page);
    const portrait = page.locator('.service-home-about__image');
    await portrait.scrollIntoViewIfNeeded();
    await expect.poll(() => portrait.evaluate(img => img.complete && img.naturalWidth > 100), { timeout: 15000 }).toBe(true);
    const measurements = await page.evaluate(() => {
      const bounds = selector => document.querySelector(selector)?.getBoundingClientRect();
      const first = bounds('[data-core-service-id="situation"]');
      const photo = bounds('[data-core-service-id="situation"] img');
      const portrait = bounds('.service-home-about__image');
      const contact = bounds('[data-home-contact-capture]');
      const frame = document.querySelector('[data-home-contact-capture]');
      return {
        cardCount: document.querySelectorAll('[data-core-service-offers="home"] [data-core-service-id]').length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        featuredCardWidth: first?.width,
        featuredPhotoWidth: photo?.width,
        featuredPhotoHeight: photo?.height,
        portraitWidth: portrait?.width,
        portraitHeight: portrait?.height,
        contactWidth: contact?.width,
        contactChoices: frame?.querySelectorAll('[data-choice-layout="home-free"] button').length,
        contactHasBlueCapture: !!frame?.querySelector('[data-consultation-capture="home-free"]'),
        contactBackground: frame && getComputedStyle(frame.querySelector('[data-consultation-capture="home-free"]')).backgroundImage,
      };
    });
    assert.equal(measurements.cardCount, 4, 'Home must show all four restored image-left cards');
    assert.ok(measurements.overflow <= 2, 'Homepage causes horizontal scroll: ' + JSON.stringify(measurements));
    assert.ok(measurements.featuredCardWidth > (width === 390 ? 250 : 200), 'First offer card is too narrow: ' + JSON.stringify(measurements));
    assert.ok(measurements.featuredPhotoWidth >= 90 && measurements.featuredPhotoHeight >= 95, 'Featured service image is tiny or hidden: ' + JSON.stringify(measurements));
    assert.ok(measurements.portraitWidth > (width === 390 ? 180 : 230), 'Real practitioner portrait has collapsed: ' + JSON.stringify(measurements));
    assert.ok(measurements.portraitHeight >= 160, 'Real practitioner portrait is too short: ' + JSON.stringify(measurements));
    assert.equal(measurements.contactChoices, 3, 'Bottom capture must offer the three free choices');
    assert.equal(measurements.contactHasBlueCapture, true, 'Homepage must contain the shared blue capture form');
    assert.ok(measurements.contactBackground?.includes('linear-gradient'), 'Blue capture gradient must render');
    results.push({ engine, width, homeVisual: true, ...measurements });
    await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-${engine}-${width}.png`, fullPage: true });
    // Poster click must load the exact YouTube original inside this card.
    await firstReview.locator('button.site-video-play').click();
    await expect(firstReview.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\\.com\\/embed\\/Dk0LBmOivQo\\?/);
    await expect(firstReview.locator('.site-video-fallback-poster')).toHaveCount(0);

    phase = 'journeys';
    await exerciseFreeJourneys(page, engine, width);
    transport.assertHealthy();
    assert.deepEqual(errors, []);

  } catch (error) {
    caseFailure = transport.failure ?? error;
    results.push({ engine, width, failure: caseFailure.message, pageErrors: errors });
    await page.screenshot({ path: `${evidence}/failed-${engine}-${width}.png`, fullPage: true }).catch(() => {});
  } finally {
    delayedLocale = null;
    releaseHeldRsc();
    phase = 'cleanup';
    try { await transport.drain(); } catch { cleanupErrors.push('initial-drain-failed'); }
    const lifecycle = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '[]'), navigationTraceKey).catch(() => []);
    try { await context.close(); } catch { cleanupErrors.push('context-close-failed'); }
    try { await browser.close(); } catch { cleanupErrors.push('browser-close-failed'); }
    try { await transport.drain(1000); } catch { cleanupErrors.push('final-drain-failed'); }
    caseFailure = transport.failure ?? caseFailure;
    if (!caseFailure && cleanupErrors.length) caseFailure = new Error('Locale verifier cleanup failed');
    try {
      await writeFile(`${evidence}/${live ? 'live' : 'local'}-${engine}-${width}-navigation-diagnostics.json`, JSON.stringify({ engine, width, lifecycle, requests: navigationRequests, errors, transport:transport.events, homeRscTransport:transport.homeRscEvents, transportFailures:transport.failures, transportDropped:transport.dropped, cleanupErrors, serverLifecycle, failure:caseFailure ? (transport.failure ? 'route-transport-failed' : 'acceptance-or-cleanup-failed') : null }, null, 2));
    } catch (error) { caseFailure ??= error; }

  }
  if (caseFailure) throw caseFailure;
}

try {
  if (!live) {
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3129'], { stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
    const serverEvent = (kind, code, signal) => {
      if(serverLifecycle.length >= 16) return;
      const event = {kind,time:Date.now()};
      if(Number.isInteger(code)) event.exitCode = code;
      if(['SIGTERM','SIGKILL','SIGINT','SIGABRT'].includes(signal)) event.signal = signal;
      serverLifecycle.push(event);
    };
    serverEvent('spawn');
    app.on('exit', (code,signal) => serverEvent('exit',code,signal));
    app.on('error', () => serverEvent('error'));
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await pause(1000);
    }
    assert.ok(ready, 'Local production server did not start');
    serverEvent('ready');
  }
  const outcomes = await Promise.allSettled([['chromium', chromium], ['webkit', webkit]].flatMap(([name, type]) => [390, 1365].map(width => exercise(name, type, width))));
  assert.ok(outcomes.every(result => result.status === 'fulfilled'), 'Locale-switch regression failed; inspect artifact');
  assert.equal(results.filter(result => result.firstClickRetained).length, 8);
  assert.equal(results.filter(result => result.freeJourney).length, 24);
  console.log('PASS: eight delayed-RSC EN/RU switches, Chromium/WebKit, mobile/desktop; no lost inline YouTube playback');
} finally {
  await writeFile(`${evidence}/${live ? 'live' : 'local'}-results.json`, JSON.stringify({ origin, results, fullPlayback: 'Not claimed by this interaction-only test' }, null, 2));
  app?.kill('SIGTERM');
}
