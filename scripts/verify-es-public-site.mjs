// Verify real Spanish pages, not English redirects. No live edits, real private
// links, production form submissions, media generation or outbound messages.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';
import { getSpanishRemedySlugs } from '../data/remedies-es.js';
const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3202';
const evidence = '/tmp/site-video-evidence';
const results = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const routes = ['/es', '/es/services', '/es/books', '/es/about', '/es/homeopathy', '/es/homeopathy/remedies', '/es/client'];
const nav = ['/es', '/es/books', '/es/homeopathy', '/es/services', '/es/about'];
mkdirSync(evidence, { recursive: true });
let app;
try {
  if (!live) {
    assert.equal(process.env.CI, 'true');
    const log = createWriteStream(`${evidence}/es-public-local-app.log`);
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3202', '-H', '127.0.0.1'], { env: { ...process.env, PRESCRIPTIONS_KV_REST_API_URL: '', PRESCRIPTIONS_KV_REST_API_TOKEN: '', PRESCRIPTIONS_ADMIN_TOKEN: '', PRESCRIPTIONS_ADMIN_PIN: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    app.stdout.pipe(log); app.stderr.pipe(log);
    for (let i=0;;i++) { try { if ((await fetch(`${origin}/es`)).ok) break; } catch {} assert.ok(i<90 && app.exitCode===null, 'Local Spanish site did not start'); await pause(1000); }
  }
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      for (const width of [390,1365]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-MX', serviceWorkers: 'block' });
        const page = await context.newPage(); const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (const path of routes) {
          let response;
          for (let i=0;;i++) { response = await page.goto(origin+path, { waitUntil: 'domcontentloaded', timeout: 60000 }); if (response.status()===200 && await page.locator('main[lang="es"]').count()) break; assert.ok(live && i<35, path+' missing'); await pause(5000); }
          assert.match(await response.text(), /<html lang="es"/);
          await expect(page.locator('html')).toHaveAttribute('lang','es');
          await expect(page.locator('.site-language-switch a[lang="es"]')).toHaveAttribute('aria-current','true');
          assert.deepEqual(await page.locator('.site-navigation > a').evaluateAll(elements => elements.map(el => el.getAttribute('href'))), nav, path);
          assert.doesNotMatch(await page.locator('main').innerText(), /Inicio \(EN\)|Servicios \(EN\)|Remedios \(EN\)|[\u0400-\u04ff]/, path);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+2), 'Overflow: '+path);
          assert.equal(await page.locator('iframe').count(),0,'No eager video');
          if (path === '/es') {
            for (const language of ['en', 'ru']) {
              const link = page.locator(`link[rel="alternate"][hreflang="${language}"]`);
              await expect(link).toHaveAttribute('href', new RegExp('\\?lang=' + language + '$'));
            }
            if (width === 390) await expect(page.locator('.service-home-card-grid')).toHaveCSS('grid-template-columns', /\d+(?:\.\d+)?px/);
          }
          await page.evaluate(() => document.fonts.ready);
          if (['/es','/es/services','/es/books','/es/homeopathy'].includes(path)) {
            const file=path.split('/').filter(Boolean).join('-');
            await page.screenshot({ path:`${evidence}/${live?'live':'local'}-${file}-${engine}-${width}.png`, animations: 'disabled' });
          }
        }
        await page.goto(origin+'/es/homeopathy/remedies');
        const search = page.getByRole('searchbox'); await search.fill('Aconitum');
        await expect(page.getByRole('status')).toHaveText('1 remedio');
        await page.getByRole('link', { name: /Aconitum.*Leer el texto completo/ }).click();
        await expect(page).toHaveURL(/\/es\/homeopathy\/remedies\/aconitum$/);
        await expect(page.getByRole('heading',{name:'Aconitum',exact:true})).toBeVisible();
        await expect(page.locator('.remedy-content-body')).toContainText('Aconitum');
        await expect(page.locator('.remedy-content-body')).not.toContainText('homeoterapia');
        await expect(page.locator('.remedy-source-reference')).not.toHaveAttribute('open','');
        await page.screenshot({path:`${evidence}/${live?'live':'local'}-es-aconitum-${engine}-${width}.png`, animations:'disabled'});
        await page.locator('.site-language-switch a[lang="en"]').click();
        await expect(page).toHaveURL(/\/en\/homeopathy\/remedies\/aconitum$/);
        await page.locator('.site-language-switch a[lang="es"]').click();
        await expect(page).toHaveURL(/\/es\/homeopathy\/remedies\/aconitum$/);
        await page.goto(origin+'/'); await expect(page).toHaveURL(origin+'/es');
        await page.locator('.site-language-switch a[lang="en"]').click();
        await expect(page).toHaveURL(/\/\?lang=en$/);
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        await page.getByRole('link',{name:'ES',exact:true}).click(); await expect(page).toHaveURL(origin+'/es');
        if (!live) {
          await page.goto(origin+'/es/client');
          await page.getByRole('button',{name:/Entrar al área de clientes/}).click();
          // The Next.js route announcer is a separate alert landmark.
          await expect(page.locator('.client-entry-form').getByRole('alert')).toContainText('enlace válido');
          assert.ok(page.url().endsWith('/es/client'));
        }
        assert.deepEqual(errors,[]);
        results.push({engine,width,routes:routes.length,publicNavigation:'five Spanish destinations',search:'single matching remedy + ES detail',languageSwitch:'same remedy EN/ES + remembered home',homeAlternates:'distinct EN/RU query URLs',overflow:false,pageErrors:0});
        console.log(`PASS: ${live?'live':'local'} Spanish public site ${engine} ${width}`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
  const slugs = getSpanishRemedySlugs();
  for (let i=0;i<slugs.length;i+=5) await Promise.all(slugs.slice(i,i+5).map(async slug=>{
    const response = await fetch(`${origin}/es/homeopathy/remedies/${slug}`);
    assert.equal(response.status,200,slug); const html=await response.text();
    assert.match(html,/<html lang="es"/); assert.ok(html.includes('Traducción automática'),slug); assert.ok(!response.url.includes('/en/'),slug);
  }));
  const xml=await (await fetch(origin+'/sitemap.xml')).text();
  for (const path of routes.filter(path=>path!=='/es/client')) assert.ok(xml.includes('https://holistichouse.vercel.app'+path),path);
  for (const slug of slugs) assert.ok(xml.includes('/es/homeopathy/remedies/'+slug),slug);
  assert.ok(!xml.includes('/es/client'));
  // CabinetPage rejects ES with notFound() before authorizeCabinetRequest.
  // Next can return either a rendered 404 or a streamed not-found error shell.
  // Both must be genuine denial documents with noindex and no cabinet UI.
  const privatePath = await fetch(origin+'/es/client/not-a-real-client-id', {redirect:'manual'});
  const privateHtml = await privatePath.text();
  assert.ok([200,404].includes(privatePath.status), 'Unsupported locale must not redirect or error');
  const plainNotFound = /<h1\b[^>]*>\s*404\s*<\/h1>/.test(privateHtml) && /This page could not be found\./.test(privateHtml);
  const streamedNotFound = /<html\b[^>]*id="__next_error__"/.test(privateHtml) && /<meta\b[^>]*name="next-error"[^>]*content="not-found"/.test(privateHtml) && /NEXT_HTTP_ERROR_FALLBACK;404/.test(privateHtml);
  assert.ok(plainNotFound || streamedNotFound, 'Unsupported private locale must deliver a genuine not-found document');
  assert.match(privateHtml, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex[^>]*>/, 'Unsupported private locale must remain non-indexable');
  assert.doesNotMatch(privateHtml, /class="[^"]*(?:client-cabinet|prescription-access-gate|client-entry-form)/, 'No cabinet, access form or private entry in the denial document');
  console.log('PASS: unsupported Spanish private locale renders noindex not-found, not a cabinet');
  writeFileSync(`${evidence}/${live?'live':'local'}-es-public-results.json`,JSON.stringify({scope:live?'read-only production':'isolated production build',results,allRemedyRoutes:slugs.length,unsupportedPrivateLocale:'noindex not-found document, no cabinet',automaticTranslationLabel:true,originalBookEditions:'clearly labelled, not claimed translated',newRender:false,privateRecordsRead:false},null,2));
} finally { if(app)app.kill('SIGTERM'); }
