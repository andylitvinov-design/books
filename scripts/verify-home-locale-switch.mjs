import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium, webkit, expect } from '@playwright/test';

const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3129';
const evidence = 'tmp/home-locale-switch';
await mkdir(evidence, { recursive: true });
const results = [];
let app;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const navigationTraceKey = 'hh-home-entry-navigation-trace';

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
  assert.deepEqual(await options.evaluateAll(items => items.map(item => item.dataset.homeFreeOption)), ['situation', 'wu', 'stress']);
  for (const [id, suffix] of [['situation', '/services/free-situation-review'], ['wu', '/services/dao-health-profile'], ['stress', '/client#cabinet-tests']]) {
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
  await capture.locator('button[data-home-free-option="situation"]').click();
  results.push({ engine, width, locale, freeOffersInBottomCapture: ['situation', 'wu', 'stress'], touchTargets: true });
}

async function exerciseFreeJourneys(page, engine, width) {
  // Only entry navigation is under test. Never query client data or create a guest session.
  const unexpectedApiRequests = [];
  await page.route(`${origin}/api/app/**`, route => {
    const request = route.request();
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/app/guest/bootstrap') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"expiresAt":null,"moodCheckins":[],"results":[]}' });
    }
    unexpectedApiRequests.push({ method: request.method(), path: new URL(request.url()).pathname });
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"APP_UNAVAILABLE"}' });
  });
  for (const locale of ['en', 'ru']) {
    for (const [id, suffix, target] of [
      ['situation', '/services/free-situation-review', '#review-hero-title'],
      ['wu', '/services/dao-health-profile', '[data-core-service-detail="dao"] h1'],
      ['stress', '/client#cabinet-tests', '#cabinet-tests [data-prelogin-test-picker]'],
    ]) {
      await page.goto(`${origin}/?lang=${locale}`, { waitUntil: 'domcontentloaded' });
      // Let homepage prefetches settle before intentionally replacing its document.
      await page.waitForLoadState('networkidle');
      const bootstrapFinished = id === 'stress'
        ? page.waitForResponse(response => response.request().method() === 'GET' && response.url() === `${origin}/api/app/guest/bootstrap`).then(async response => {
          assert.equal(response.status(), 200);
          assert.deepEqual(await response.json(), { expiresAt: null, moodCheckins: [], results: [] });
        })
        : Promise.resolve();
      const chooser = page.locator('[data-home-free-capture]');
      await chooser.locator('button[data-home-free-option="' + id + '"]').click();
      const cta = chooser.locator('a[data-home-free-action="' + id + '"]');
      const beforeClick = await cta.evaluate(element => ({ url: location.href, href: element.href, readyState: document.readyState, hydrated: Boolean(history.state?.__NA), earlyCsp: Boolean(window.__cspPreHydration), reactProps: Object.keys(element).some(key => key.startsWith('__reactProps$')) }));
      results.push({ engine, width, locale, entryClickAttempt: id, time: Date.now(), beforeClick });
      await cta.click();
      await expect(page).toHaveURL(`${origin}/${locale}${suffix}`);
      await expect(page.locator(target)).toBeVisible();
      if (id === 'stress') await expect(page.locator('#cabinet-tests')).toHaveCount(1);
      await bootstrapFinished;
      // In WebKit, tearing down an in-flight fetch reports an access-control error.
      // Complete the synthetic bootstrap/prefetches; retain the strict pageerror check.
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await expect(page).toHaveURL(`${origin}/?lang=${locale}`);
      await expect(page.locator('[data-home-contact-capture] [data-home-free-capture]')).toBeVisible();
      await page.waitForLoadState('networkidle');
      results.push({ engine, width, locale, freeJourney: id, destinationRendered: true, backReturned: true, submitted: false });
    }
  }
  assert.deepEqual(unexpectedApiRequests, [], 'Entry navigation must not submit or request private app data');
}

async function exercise(engine, browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const navigationRequests = await installEntryDiagnostics(context, page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let delayedLocale = null;
  let heldRequests = 0;
  // Hold the real RSC response. This makes the old double-switch race deterministic.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/' && request.headers().rsc === '1' && url.searchParams.get('lang') === delayedLocale) {
      heldRequests++;
      const response = await route.fetch();
      await pause(2000);
      await route.fulfill({ response });
    } else await route.continue();
  });
  try {
    await page.goto(origin + '/?lang=en', { waitUntil: 'domcontentloaded' });
    for (const [from, to] of [['en', 'ru'], ['ru', 'en']]) {
      const current = page.locator(`[data-video-slot="home-intro"][data-video-locale="${from}"]`);
      if (await current.locator('iframe').count() === 0) await current.locator('.site-video-play').click();
      await expect(current.locator('iframe')).toHaveCount(1);
      const countBefore = heldRequests;
      delayedLocale = to;
      await page.locator('.site-language-menu-trigger').click();
      await page.locator(`.site-language-switch button[lang="${to}"]`).click();
      await expect.poll(() => heldRequests, { timeout: 15000 }).toBeGreaterThan(countBefore);
      // Before the navigation commits, the new language must not become a clickable
      // optimistic player that will be discarded when the RSC response arrives.
      await expect(page.locator('main.house-home')).toHaveAttribute('lang', from);
      const next = page.locator(`[data-video-slot="home-intro"][data-video-locale="${to}"]`);
      await expect(next).toHaveCount(1, { timeout: 20000 });
      await expect(next.locator('iframe')).toHaveCount(0);
      await next.locator('.site-video-play').click();
      const expectedId = to === 'en' ? 'ed202847a43a96b918308aa972177b34' : '388a04b39ebf215ae656bcd22d0d0847';
      await expect(next.locator('iframe')).toHaveAttribute('src', `https://app.heygen.com/embeds/${expectedId}`);
      const frame = await next.locator('iframe').elementHandle();
      await pause(2200);
      assert.ok(await frame.evaluate(element => element.isConnected), 'First-click iframe was discarded after navigation');
      await expect(page).toHaveURL(new RegExp(`\\?lang=${to}$`));
      delayedLocale = null;
      results.push({ engine, width, from, to, heldRsc: true, firstClickRetained: true });
      await verifyFreeOffers(page, to, engine, width);
    }
    assert.deepEqual(errors, []);
    // Owner-approved homepage: assert computed layout and actual image load, not just JSX strings.
    const offers = page.locator('[data-core-service-offers="home"]');
    await expect(page.locator('main[data-home-design="approved-v2"]')).toHaveCount(1);
    await expect(page.locator('[data-free-insights="public"]')).toHaveCount(0);
    const bottomFree = page.locator('[data-home-contact-capture] [data-home-free-capture]');
    await expect(bottomFree).toHaveCount(1);
    assert.deepEqual(await bottomFree.locator('[data-home-free-option]').evaluateAll(buttons => buttons.map(button => button.dataset.homeFreeOption)), ['situation', 'wu', 'stress']);
    await expect(bottomFree.locator('a[data-home-free-action="situation"]')).toHaveAttribute('href', '/en/services/free-situation-review');
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
    await capture.locator('button[data-home-free-option="wu"]').click();
    await expect(capture.locator('a[data-home-free-action="wu"]')).toHaveAttribute('href', '/en/services/dao-health-profile');
    await capture.locator('button[data-home-free-option="stress"]').click();
    await expect(capture.locator('a[data-home-free-action="stress"]')).toHaveAttribute('href', '/en/client#cabinet-tests');
    await capture.locator('button[data-home-free-option="situation"]').click();
    const videoPosters = page.locator('[data-personal-testimonials="home"] .site-video-fallback-poster');
    await expect(videoPosters).toHaveCount(6);
    await videoPosters.first().scrollIntoViewIfNeeded();
    await expect.poll(() => videoPosters.first().evaluate(image => image.complete && image.naturalWidth > 100), { timeout: 15000 }).toBe(true);
    // The first review image must be a frame from that exact review, not the botanical placeholder.
    await expect(videoPosters.first()).toHaveAttribute('src', /Dk0LBmOivQo\.webp/);
    const firstReview = page.locator('[data-personal-testimonials="home"] [data-testimonial-video-id="Dk0LBmOivQo"]');
    await expect(firstReview.locator('.site-video-play')).toHaveCount(1);
    await expect(firstReview.locator('.site-video-watch-link')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=Dk0LBmOivQo');
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
    // One tap must replace the poster with a working YouTube embed URL.
    await firstReview.locator('.site-video-play').click();
    await expect(firstReview.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/Dk0LBmOivQo\?/);
    await expect(firstReview.locator('.site-video-fallback-poster')).toHaveCount(0);

    await exerciseFreeJourneys(page, engine, width);
    assert.deepEqual(errors, []);

  } catch (error) {
    results.push({ engine, width, failure: error.message, pageErrors: errors });
    await page.screenshot({ path: `${evidence}/failed-${engine}-${width}.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    const lifecycle = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || '[]'), navigationTraceKey).catch(() => []);
    await writeFile(`${evidence}/${live ? 'live' : 'local'}-${engine}-${width}-navigation-diagnostics.json`, JSON.stringify({ engine, width, lifecycle, requests: navigationRequests, errors }, null, 2));
    await context.close();
    await browser.close();
  }
}

try {
  if (!live) {
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3129'], { stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await pause(1000);
    }
    assert.ok(ready, 'Local production server did not start');
  }
  const outcomes = await Promise.allSettled([['chromium', chromium], ['webkit', webkit]].flatMap(([name, type]) => [390, 1365].map(width => exercise(name, type, width))));
  assert.ok(outcomes.every(result => result.status === 'fulfilled'), 'Locale-switch regression failed; inspect artifact');
  assert.equal(results.filter(result => result.firstClickRetained).length, 8);
  assert.equal(results.filter(result => result.freeJourney).length, 24);
  console.log('PASS: eight delayed-RSC EN/RU switches, Chromium/WebKit, mobile/desktop; no lost first click');
} finally {
  await writeFile(`${evidence}/${live ? 'live' : 'local'}-results.json`, JSON.stringify({ origin, results, fullPlayback: 'Not claimed by this interaction-only test' }, null, 2));
  app?.kill('SIGTERM');
}
