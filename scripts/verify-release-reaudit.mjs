import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from '@playwright/test';

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
  ['/books/maya-tradition', 'en'],
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
        assert.equal(state.lang, locale, 'Main language');
        assert.ok(state.title?.trim(), 'Missing main heading');
        assert.ok(state.overflow <= 2, `Horizontal overflow ${state.overflow}px`);
        assert.equal(state.iframesBeforeClick, 0, 'Video must be poster-first');
        assert.deepEqual(errors, [], 'Unexpected page JS error');
        for (const img of await page.locator('.site-video-poster').all()) {
          await img.scrollIntoViewIfNeeded();
          await img.evaluate(el => el.decode());
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
    if (engine === 'chromium' && width === 390) {
      for (const book of volumes) {
        await check('maya-reader-and-images', { path: `/books/${book}` }, async () => {
          const response = await page.goto(origin + `/books/${book}`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          assert.ok((await page.locator('.reader-article').innerText()).length > 1000, 'Source text must render');
          for (const src of await page.locator('.reader-shell img').evaluateAll(images => images.map(img => img.getAttribute('src')))) {
            const asset = new URL(src, origin);
            if (asset.origin === origin) media.add(asset.pathname);
          }
          const img = page.locator('.reader-cover img');
          await img.scrollIntoViewIfNeeded();
          await img.evaluate(el => el.decode());
          return { sourceVisible: true };
        });
      }
    }
  } finally { await context.close(); await browser.close(); }
}
await Promise.all([exercise('chromium', chromium, 390), exercise('chromium', chromium, 1365), exercise('webkit', webkit, 390), exercise('webkit', webkit, 1365)]);
const browser = await chromium.launch();
const context = await browser.newContext();
try {
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
  const selector = 'reauditSyntheticOnly01';
  for (const path of [`/api/client/${selector}/documents/reaudit-nonexistent/pdf?locale=en`, `/api/client/${selector}/documents/reaudit-nonexistent/pdf?locale=es`, `/es/client/${selector}`]) {
    await check('private-anonymous', { path }, async () => {
      const response = await context.request.get(origin + path);
      assert.equal(response.status(), 404);
      assert.match(response.headers()['cache-control'] || '', /no-store/);
      assert.match(response.headers()['x-robots-tag'] || '', /noindex/);
      if (path.startsWith('/api/')) assert.equal((await response.body()).length, 0);
    });
  }
} finally { await context.close(); await browser.close(); }
const failed = results.filter(row => !row.ok);
writeFileSync(`${evidence}/${label}-results.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA, total: results.length, failed: failed.length, results }, null, 2));
console.log(JSON.stringify({ label, total: results.length, failed: failed.length, failures: failed }, null, 2));
if (!process.argv.includes('--observe')) assert.equal(failed.length, 0, 'Re-audit failed; inspect evidence');
