import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

const origin = process.env.REAUDIT_ORIGIN || 'http://127.0.0.1:3123';
const url = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', 'holistichouse.vercel.app'].includes(url.hostname), 'Use only the local test build or canonical public site');
assert.ok(!url.username && !url.password && !url.search && !url.hash);
const label = process.env.REAUDIT_LABEL || 'local';
const evidence = '/tmp/release-reaudit';
mkdirSync(evidence, { recursive: true });
const results = [];
const media = new Set();
const routes = [
  ['/?lang=en', 'en'], ['/?lang=ru', 'ru'], ['/es', 'es'],
  ...['about', 'services', 'homeopathy', 'books', 'client'].flatMap(section => ['en', 'ru', 'es'].map(locale => [`/${locale}/${section}`, locale])),
  ['/books/maya-tradition', 'en'], ['/books/maya-tradition?lang=ru', 'ru'],
];
const volumes = ['maya-egregor-gods', 'maya-calendar', 'maya-exorcism', 'maya-mysteries'];
async function check(name, detail, fn) {
  try { const extra = await fn(); results.push({ name, ...detail, ok: true, ...extra }); }
  catch (error) { results.push({ name, ...detail, ok: false, error: String(error.message).slice(0, 1800) }); }
}
async function exercise(engine, browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let errors = [];
  page.on('pageerror', error => errors.push(String(error.message).slice(0, 300)));
  try {
    for (const [path, locale] of routes) {
      await check('public-page', { engine, width, path }, async () => {
        errors = [];
        const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 35000 });
        assert.equal(response.status(), 200);
        await page.locator('main').first().waitFor();
        const state = await page.evaluate(() => ({ lang: document.querySelector('main')?.lang, htmlLang: document.documentElement.lang, overflow: document.documentElement.scrollWidth - innerWidth, title: document.querySelector('h1')?.textContent, players: document.querySelectorAll('.site-video-player').length, iframesBeforeClick: document.querySelectorAll('.site-video-player iframe').length }));
        assert.equal(state.htmlLang, locale, 'Document language must match the visible page locale');
        assert.equal(state.lang || state.htmlLang, locale, 'Effective page language (including valid inheritance)');
        assert.ok(state.title?.trim(), 'Missing main heading');
        assert.ok(state.overflow <= 2, `Horizontal overflow ${state.overflow}px`);
        assert.equal(state.iframesBeforeClick, 0, 'Video must be poster-first');
        if (path.endsWith('/about')) {
          assert.equal(await page.locator('[data-consultation-capture="personal"]').count(), 1, 'About must contain one accessible personal consultation selector');
          assert.equal(await page.locator('.public-consultation-cta').count(), 0, 'About must not repeat the generic consultation CTA');
        }
        assert.deepEqual(errors, [], 'Unexpected page JS error');
        // React may swap a max-resolution YouTube poster for its HQ fallback
        // while WebKit scrolls or decodes. Re-query the current image and retry
        // only these transient source/DOM-change errors, never a genuinely broken image.
        const posters = page.locator('.site-video-poster');
        for (let i = 0; i < await posters.count(); i++) {
          for (let attempt = 0; attempt < 4; attempt++) {
            if (i >= await posters.count()) break;
            try {
              await posters.nth(i).scrollIntoViewIfNeeded({ timeout: 7000 });
              await posters.nth(i).evaluate(el => el.decode(), { timeout: 7000 });
              break;
            } catch (error) {
              const message = String(error?.message || error);
              if (!/Aborted by source change|Element is not attached to the DOM|not attached to the DOM/.test(message) || attempt === 3) throw error;
              await page.waitForTimeout(250);
            }
          }
        }
        if (['/en/about', '/es/about', '/books/maya-tradition'].includes(path)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `${evidence}/${label}-${engine}-${width}-${path.replaceAll('/', '_')}.png`, fullPage: true });
        }
        return state;
      });
    }
    await page.goto(origin + '/en/about', { waitUntil: 'networkidle' });
    const menu = page.locator('.site-language-menu');
    const trigger = page.locator('.site-language-menu-trigger');
    await check('menu-escape', { engine, width }, async () => {
      await trigger.click();
      assert.equal(await menu.evaluate(el => el.open), true);
      for (const option of await menu.locator('[lang]').all()) {
        assert.ok(await option.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }), 'Open menu option must be visible, unclipped and clickable');
      }
      await page.screenshot({ path: `${evidence}/${label}-menu-${engine}-${width}.png` });
      await page.keyboard.press('Escape');
      assert.equal(await menu.evaluate(el => el.open), false, 'Escape must dismiss the language menu');
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Focus must return to the trigger');
    });
    await check('menu-outside', { engine, width }, async () => {
      if (!await menu.evaluate(el => el.open)) await trigger.click();
      await page.locator('h1').first().click();
      assert.equal(await menu.evaluate(el => el.open), false, 'Click outside must dismiss the menu');
    });
    await check('menu-current-selection', { engine, width }, async () => {
      if (!await menu.evaluate(el => el.open)) await trigger.click();
      await menu.locator('[lang="en"]').click();
      await page.waitForTimeout(300);
      assert.equal(await menu.evaluate(el => el.open), false, 'Selection must dismiss the menu');
    });
    for (const locale of ['ru', 'es', 'en']) {
      await check('about-language-navigation', { engine, width, locale }, async () => {
        await trigger.click();
        await menu.locator(`[lang="${locale}"]`).click();
        await expect(page).toHaveURL(origin + `/${locale}/about`);
        await expect(page.locator('main').first()).toHaveAttribute('lang', locale);
        await expect(page.locator('.site-language-menu')).not.toHaveAttribute('open', '');
      });
    }
    await page.goto(origin + '/books/maya-tradition', { waitUntil: 'networkidle' });
    for (const locale of ['ru', 'en']) {
      await check('maya-language-navigation', { engine, width, locale }, async () => {
        await page.locator('.site-language-menu-trigger').click();
        await page.locator(`.site-language-menu [lang="${locale}"]`).click();
        await expect(page).toHaveURL(origin + `/books/maya-tradition?lang=${locale}`);
        await expect(page.locator('main').first()).toHaveAttribute('lang', locale);
        await expect(page.locator(`main ol a[href$="?lang=${locale}"]`)).toHaveCount(4);
      });
    }
    for (const locale of ['en', 'ru', 'es']) {
      await check('consultation-safe-handoff', { engine, width, locale }, async () => {
        await page.goto(origin + `/${locale}/about`, { waitUntil: 'networkidle' });
        const capture = page.locator('[data-consultation-capture="personal"]');
        await expect(capture).toHaveCount(1);
        await expect(capture.locator('[role="group"] button')).toHaveCount(4);
        assert.equal(await capture.locator('form, input, textarea').count(), 0, 'Personal details must not be required');
        const action = capture.locator('[data-contact-channel="whatsapp"]');
        const originalUrl = new URL(await action.getAttribute('href'));
        assert.equal(originalUrl.origin, 'https://wa.me');
        assert.equal(originalUrl.pathname, '/14376066502');
        assert.ok(originalUrl.searchParams.get('text').trim(), 'Prepared message must not be empty');
        const selected = capture.locator('[role="group"] button').nth(1);
        await selected.click();
        await expect(selected).toHaveAttribute('aria-pressed', 'true');
        const changedUrl = new URL(await action.getAttribute('href'));
        assert.equal(changedUrl.origin, 'https://wa.me');
        assert.equal(changedUrl.pathname, '/14376066502');
        assert.notEqual(changedUrl.searchParams.get('text'), originalUrl.searchParams.get('text'), 'Selecting a topic must change the prepared message');
        assert.ok(changedUrl.searchParams.get('text').includes(await selected.innerText()), 'Prepared message must mention the chosen topic');
        await capture.locator('[role="group"] button').nth(0).click();
        const resetUrl = new URL(await action.getAttribute('href'));
        assert.equal(resetUrl.searchParams.get('text'), originalUrl.searchParams.get('text'), 'Resetting topic must restore the original message');
        assert.equal(await page.locator('[data-consultation-capture="personal"] form').count(), 0);
        assert.equal(await capture.locator('[data-contact-channel="telegram"]').count(), 1);
        return { externalNavigationIntercepted: false, messageSent: false, privateFieldsAbsent: true, changingTopicRebuildsUrl: true };
      });
    }
    if (width === 390) {
      await check('translation-failure-invalid-response-and-recovery', { engine, width }, async () => {
        // Isolate network fixtures: service-worker-owned requests can bypass page.route.
        // The ordinary public, form and image audits retain service workers enabled.
        const translationContext = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        const page = await translationContext.newPage();
        const networkErrors = [];
        page.on('requestfailed', request => networkErrors.push({ url: request.url(), error: request.failure()?.errorText }));
        page.on('pageerror', error => networkErrors.push({ error: error.message }));
        let mode = 'failure';
        const calls = { failure: 0, invalid: 0, success: 0 };
        let releaseInvalid;
        const invalidGate = new Promise(resolve => { releaseInvalid = resolve; });
        await page.route('**/api/public-translate', async route => {
          const phase = mode;
          calls[phase]++;
          const payload = route.request().postDataJSON();
          if (phase === 'failure') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
          if (phase === 'invalid') await invalidGate;
          const translations = phase === 'invalid' ? [] : payload.texts.map((_, i) => `English test fixture ${i}`);
          // A sibling failed batch may already have cancelled this request.
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ translations }) }).catch(() => {});
        });
        try {
          await page.goto(origin + '/books/maya-mysteries?lang=en', { waitUntil: 'networkidle' });
          await expect.poll(() => calls.failure).toBeGreaterThan(0);
          await expect(page.locator('.reader-translation-error')).toBeVisible();
          const original = page.locator('.reader-content[lang="ru"]');
          assert.ok((await original.innerText()).length > 1000, 'Original must remain readable after service failure');
          mode = 'invalid';
          await page.getByRole('button', { name: 'Retry English translation' }).click();
          // Observe this retry's in-flight state, not the previous error still on screen.
          await expect.poll(() => calls.invalid).toBeGreaterThan(0);
          await expect(page.locator('.reader-translation-progress')).toBeVisible();
          releaseInvalid();
          await expect(page.locator('.reader-translation-error')).toBeVisible();
          assert.ok((await original.innerText()).length > 1000, 'Original must survive malformed translation');
          mode = 'success';
          await page.getByRole('button', { name: 'Retry English translation' }).click();
          await expect.poll(() => calls.success).toBeGreaterThan(0);
          await expect(page.locator('.reader-content[lang="en"]')).toBeVisible({ timeout: 20000 });
          await expect(page.locator('.reader-translation-error')).toHaveCount(0);
          return { translationServiceStubbed: true, paidCalls: 0, originalPreserved: true, retryVerified: true, fixtureServiceWorkersBlocked: true, calls };
        } catch (error) {
          await page.screenshot({ path: `${evidence}/${label}-translation-${engine}-failed.png` });
          throw new Error(`${error.message}; requests=${JSON.stringify(calls)}; networkErrors=${JSON.stringify(networkErrors)}; status=${await page.locator('[role="status"]').allTextContents()}`);
        } finally { releaseInvalid(); await translationContext.close(); }
      });
    }
    if (engine === 'chromium' && width === 390) {
      for (const book of volumes) {
        for (const [readerPath, locale] of [[`/books/${book}?lang=en`, 'en'], [`/books/${book}`, 'ru']]) {
          await check('maya-reader-and-images', { path: readerPath, locale }, async () => {
            const response = await page.goto(origin + readerPath, { waitUntil: 'domcontentloaded', timeout: 35000 });
            assert.equal(response.status(), 200);
            await page.locator('.reader-article').waitFor({ state: 'visible', timeout: 20000 });
            const language = await page.evaluate(() => ({ htmlLang: document.documentElement.lang, mainLang: document.querySelector('main')?.lang }));
            assert.equal(language.htmlLang, locale, 'Reader document language');
            assert.equal(language.mainLang, locale, 'Reader main language');
            assert.ok((await page.locator('.reader-article').innerText()).length > 1000, 'Source text must render');
            for (const src of await page.locator('.reader-shell img').evaluateAll(images => images.map(img => img.getAttribute('src')))) {
              const asset = new URL(src, origin);
              if (asset.origin === origin) media.add(asset.pathname);
            }
            const img = page.locator('.reader-cover img');
            await img.scrollIntoViewIfNeeded();
            await img.evaluate(el => el.decode());
            return { sourceVisible: true, ...language };
          });
        }
      }
    }
  } finally { await context.close(); await browser.close(); }
}
await Promise.all([exercise('chromium', chromium, 390), exercise('chromium', chromium, 1365), exercise('webkit', webkit, 390), exercise('webkit', webkit, 1365)]);
const browser = await chromium.launch();
const context = await browser.newContext();
try {
  await check('consultation-SSR-privacy', {}, async () => {
    const response = await context.request.get(origin + '/en/about');
    const html = await response.text();
    assert.doesNotMatch(html, /<form[^>]*class="personal-consultation-form"/, 'Do not SSR an intake form');
    assert.doesNotMatch(html, /<input[^>]+name="(?:name|contact|request)"/, 'Do not request private contact details');
    return { noDefaultGET: true, noCompulsoryPersonalFields: true };
  });
  const paths = [...media];
  for (let i = 0; i < paths.length; i += 6) {
    await Promise.all(paths.slice(i, i + 6).map(path => check('reader-image-http', { path }, async () => {
      const response = await context.request.get(origin + path, { timeout: 20000 });
      assert.equal(response.status(), 200, 'Image HTTP status');
      assert.match(response.headers()['content-type'] || '', /^image\//);
      assert.ok((await response.body()).length > 100, 'Image must have content');
    })));
  }
  for (const path of ['/admin', '/admin/clients', '/admin/consultations/new']) {
    await check('admin-anonymous', { path }, async () => {
      const response = await context.request.get(origin + path);
      assert.match(response.url(), /\/admin\/login$/);
      assert.equal(response.status(), 200);
    });
  }
  const selector = 'reauditSyntheticOnly001';
  for (const path of [`/api/client/${selector}/documents/reaudit-nonexistent/pdf?locale=en`, `/api/client/${selector}/documents/reaudit-nonexistent/pdf?locale=es`, `/es/client/${selector}`]) {
    await check('private-anonymous', { path }, async () => {
      const response = await context.request.get(origin + path);
      assert.equal(response.status(), 404);
      assert.match(response.headers()['cache-control'] || '', /no-store/);
      const robots = response.headers()['x-robots-tag'] || (await response.text()).match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
      assert.match(robots, /noindex/);
      if (path.startsWith('/api/')) assert.equal((await response.body()).length, 0);
    });
  }
} finally { await context.close(); await browser.close(); }
const failed = results.filter(row => !row.ok);
writeFileSync(`${evidence}/${label}-results.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA, total: results.length, failed: failed.length, results }, null, 2));
console.log(JSON.stringify({ label, total: results.length, failed: failed.length, failures: failed }, null, 2));
if (!process.argv.includes('--observe')) assert.equal(failed.length, 0, 'Re-audit failed; inspect evidence');
