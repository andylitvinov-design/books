// Spanish About acceptance. Production mode is read-only; the local form test
// intercepts window.open and never contacts WhatsApp or creates a client record.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3201';
const evidence = '/tmp/site-video-evidence';
const results = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync(evidence, { recursive: true });
let app;
try {
  if (!live) {
    assert.equal(process.env.CI, 'true');
    const log = createWriteStream(`${evidence}/es-local-app.log`);
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3201', '-H', '127.0.0.1'], {
      env: { ...process.env, PRESCRIPTIONS_KV_REST_API_URL: '', PRESCRIPTIONS_KV_REST_API_TOKEN: '', PRESCRIPTIONS_ADMIN_TOKEN: '', PRESCRIPTIONS_ADMIN_PIN: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    app.stdout.pipe(log); app.stderr.pipe(log);
    for (let i = 0; ; i++) {
      try { if ((await fetch(`${origin}/es/about`)).ok) break; } catch { /* starting */ }
      assert.ok(i < 90 && app.exitCode === null, 'Local ES application did not start');
      await pause(1000);
    }
  }
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      for (const width of [390, 1365]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-MX', serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        let response;
        for (let i = 0; ; i++) {
          response = await page.goto(`${origin}/es/about`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          if (response.status() === 200 && await page.locator('main.about-shell[lang="es"]').count()) break;
          assert.ok(live && i < 35, 'Spanish page not released');
          await pause(5000);
        }
        assert.match(await response.text(), /<html lang="es"/);
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://holistichouse.vercel.app/es/about');
        for (const lang of ['en', 'ru', 'es']) await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute('href', `https://holistichouse.vercel.app/${lang}/about`);
        await expect(page.locator('.site-language-switch a[lang="es"]')).toHaveAttribute('aria-current', 'true');
        assert.equal(await page.locator('.about-biography > section').count(), 7);
        assert.equal(await page.locator('.about-biography li').count(), 7);
        assert.equal(await page.locator('.about-video-grid .site-video-player').count(), 3);
        await expect(page.getByRole('heading', { name: 'Especializaciones y formación' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Área de clientes' })).toBeVisible();
        const intro = page.locator('[data-video-locale="es"]');
        await expect.poll(() => intro.locator('img.site-video-poster').evaluate(el => el.complete && el.naturalWidth >= 320)).toBe(true);
        assert.equal(await page.locator('iframe').count(), 0);
        await expect(intro.locator('.site-video-ai-badge')).toHaveText('Avatar IA');
        await expect(intro.locator('.site-video-duration')).toHaveText('0:31');
        await expect(intro.locator('img.site-video-poster')).toHaveAttribute('src', /psychic-alchemy-es-v1/);
        await expect(intro.locator('.site-video-player')).toHaveAttribute('lang', 'es');
        await expect(intro.locator('.site-video-watch-link')).not.toBeVisible();
        const summary = intro.locator('summary');
        await summary.focus(); await summary.press('Enter');
        await expect(intro.locator('.site-video-more p')).toHaveAttribute('lang', 'es');
        await expect(intro.locator('.site-video-more')).toContainText('Me encantará explorar tu situación contigo');
        assert.doesNotMatch(await page.locator('main').innerText(), /[\u0400-\u04ff]/);
        await summary.press('Enter');
        const form = page.locator('.personal-consultation-form');
        await expect(form).toHaveAttribute('lang', 'es');
        await expect(form.locator('button[type="submit"]')).toContainText('Solicitar una consulta personal');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'ES horizontal overflow');
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-es-about-${engine}-${width}.png`, fullPage: true });
        await intro.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-es-video-${engine}-${width}.png` });
        if (!live) {
          await page.evaluate(() => { window.open = (url, target, features) => { window.__esFormTest = { url, target, features }; return null; }; });
          await form.locator('input[name="name"]').fill('Prueba de interfaz');
          await form.locator('input[name="contact"]').fill('qa@example.invalid');
          await form.locator('textarea').fill('Comprobación local sin enviar mensajes.');
          await form.locator('button[type="submit"]').click();
          const opened = await page.evaluate(() => window.__esFormTest);
          const url = new URL(opened.url);
          assert.equal(url.origin, 'https://wa.me');
          assert.equal(url.pathname, '/14376066502');
          assert.match(url.searchParams.get('text'), /Solicitud de consulta personal/);
          assert.match(url.searchParams.get('text'), /Nombre: Prueba de interfaz/);
          assert.match(url.searchParams.get('text'), /Contacto preferido:/);
          assert.equal(opened.features, 'noopener,noreferrer');
        }
        await intro.getByRole('button', { name: /^Ver vídeo:/ }).click();
        await expect(intro.locator('iframe')).toHaveAttribute('src', 'https://app.heygen.com/embeds/2c251709aba74fd96ae8be43257a080b');
        for (const lang of ['ru', 'en', 'es']) {
          await page.locator('.site-language-menu-trigger').click();
          await page.locator(`.site-language-switch a[lang="${lang}"]`).click();
          await expect(page).toHaveURL(new RegExp(`/${lang}/about$`));
          await expect(page.locator('main')).toHaveAttribute('lang', lang);
          await expect(page.locator('html')).toHaveAttribute('lang', lang);
        }
        assert.deepEqual(errors, []);
        results.push({ engine, width, language: 'Spanish SSR and hydrated UI', biography: 'all 7 sections', form: live ? 'read-only labels' : 'Spanish WhatsApp text intercepted, not sent', video: 'independent Spanish audio 2c251709aba74fd96ae8be43257a080b, real poster, 31 seconds, ES transcript', navigation: 'ES/EN/RU round trip', overflow: false });
        console.log(`PASS: ${live ? 'live' : 'local'} ES About ${engine} ${width}`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.ok((await sitemap.text()).includes('https://holistichouse.vercel.app/es/about'));
  writeFileSync(`${evidence}/${live ? 'live' : 'local'}-es-about-results.json`, JSON.stringify({ scope: live ? 'read-only production' : 'isolated production build', results, newRender: false, messageSent: false }, null, 2));
} finally { if (app) app.kill('SIGTERM'); }
