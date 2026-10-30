// The reviewed public home contract is English at / and Russian at /ru.
async function assertSpanishHomeAlternates(page) {
  for (const [language, href] of [
    ['en', 'https://holistichouse.vercel.app'],
    ['ru', 'https://holistichouse.vercel.app/ru'],
  ]) {
    const alternate = page.locator(`link[rel="alternate"][hreflang="${language}"]`);
    await expect(alternate).toHaveCount(1);
    await expect(alternate).toHaveAttribute('href', href);
  }
}
// Exact approved public hero and its real topic-selection anchor, in each tested locale.
async function assertPublicPickerEntrance(target,locale){
 const copy=locale==='ru'
  ? {region:'Подберите свои тесты',hero:'Лучше поймите себя. Найдите следующий шаг.',action:'Тесты',first:'Что вы хотите исследовать?'}
  : {region:'Choose your tests',hero:'Understand yourself. Find your next step.',action:'Tests',first:'What would you like to explore?'}
 const picker=target.locator('[data-prelogin-test-picker]')
 await expect(picker).toHaveAttribute('aria-label',copy.region)
 await expect(picker.locator('[data-client-tests-hero]').getByRole('heading',{name:copy.hero,level:1,exact:true})).toBeVisible()
 const entrance=picker.locator('[data-client-tests-hero]').getByRole('navigation').getByRole('link',{name:copy.action,exact:true})
 await expect(entrance).toBeVisible()
 await expect(entrance).toHaveAttribute('href',`/${locale}/client/tests`)
 await expect(entrance).toHaveAttribute('aria-current','page')
 await expect(picker.getByRole('heading',{name:copy.first,level:2,exact:true})).toHaveAttribute('id','hh-simple-topic-title')
}
// Keep direct actions compact; the complete catalog remains in the site menu.
async function assertSpanishNavigation(page, path) {
  const currentUrl = page.url();
  const navigation = page.locator('.site-navigation');
  await expect(navigation).toHaveCount(1);
  // Keep the three visible visitor needs and free written review in the header.
  const direct = navigation.locator(':scope > a:not([data-nav-item="shop"]):not([data-nav-item="cart"])');
  const first = ['/es/services/free-situation-review','/es/explore/energy','/es/explore/love','/es/explore/business','/es/about'];
  // The account entry lives inside its own component; it is never one of
  // the five direct service/navigation anchors. Validate it below separately.
  assert.deepEqual(await direct.evaluateAll(elements => elements.map(el => el.getAttribute('href'))), first, 'Spanish direct destinations: ' + path);
  const cabinet = navigation.locator('.site-cabinet-entry');
  await expect(cabinet).toHaveCount(1);
  // The root HomePersonalSpaceProvider renders this as an accessible
  // dialog opener on every Spanish public route, never as a direct /en/app
  // anchor. Keep the real authenticated-Cabinet destination inside the panel.
  await expect(cabinet).toHaveAttribute('aria-haspopup','dialog');
  await expect(cabinet).toHaveAttribute('aria-controls','home-personal-space-dialog');
  await expect(cabinet).toHaveAccessibleName('Mi espacio');
  if (path === '/es/library') {
    await cabinet.click();
    const spaceDialog = page.locator('#home-personal-space-dialog');
    await expect(spaceDialog).toBeVisible();
    await expect(spaceDialog.locator('a[href^="/en/app"]').first()).toBeVisible({timeout:15000});
    await spaceDialog.getByRole('button',{name:'Cerrar Mi espacio'}).click();
    await expect(spaceDialog).toBeHidden();
  }
  // Derive the complete ordering from the same reviewed public navigation
  // model used by SiteNavigation; retain independent, exact ID/route guards so
  // a deleted destination in that model cannot silently turn browser CI green.
  const compact = getCompactNavigation('es');
  const more = getSiteNavigation('es').filter(item =>
    ['energy', 'love', 'business', 'library', 'events'].includes(item.id));
  assert.deepEqual(compact.map(item => item.id),
    ['home', 'analysis', 'courses', 'profile', 'alchemy', 'pro', 'temple']);
  assert.deepEqual(more.map(item => item.id),
    ['energy', 'love', 'business', 'library', 'events']);
  const destinations = [
    '/es/services/free-situation-review',
    ...compact.map(item => item.href),
    '/es/shop', '/es/cart', '/es/install',
    ...more.map(item => item.href),
    '/es/temple-insights', '/es/services', '/es/about',
  ];
  for (const required of [
    '/es', '/es/services/free-situation-review', '/es/academy',
    '/es/personality-profiles', '/es/services/alchemy-of-soul',
    '/es/pro', '/es/holistic-support', '/es/shop', '/es/cart',
    '/es/install', '/es/explore/energy', '/es/explore/love',
    '/es/explore/business', '/es/library', '/es/events',
    '/es/temple-insights', '/es/services', '/es/about',
  ]) assert.ok(destinations.includes(required), 'Missing required Spanish public menu destination: ' + required);
  const menu = navigation.locator('details.site-main-menu');
  const trigger = menu.locator('summary');
  const links = menu.locator('.site-main-menu-panel a');
  await expect(menu).toHaveCount(1);
  await expect(menu).toHaveJSProperty('open', false);
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAccessibleName('Abrir menú del sitio');
  assert.deepEqual(await links.evaluateAll(elements => elements.map(el => el.getAttribute('href'))), destinations, 'Spanish full menu destinations: ' + path);
  await trigger.focus();
  await trigger.press('Enter');
  await expect(menu).toHaveJSProperty('open', true);
  for (const link of await links.all()) await expect(link).toBeVisible();
  for (const [id, expectedLabel] of [
    ['energy', 'Cuerpo y energía'],
    ['love', 'Estrés y relaciones'],
    ['business', 'Dinero y negocios'],
  ]) await expect(menu.locator('.site-main-menu-panel a[data-nav-item="' + id + '"]')).toHaveAccessibleName(expectedLabel);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Open Spanish site menu overflow: ' + path);
  await trigger.press('Tab');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveJSProperty('open', false);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(currentUrl);
}
async function assertSpanishCourseCatalog(page, response) {
  const canonical = '/es/academy/free-ai-courses';
  await expect(page).toHaveURL(origin + canonical);
  assert.equal(response.status(), 200, 'Canonical Spanish course catalog must render');
  assert.equal(response.url(), origin + canonical, 'The final navigation response belongs to the canonical catalog');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://holistichouse.vercel.app' + canonical);
  const catalog = page.locator('main[data-public-my-courses]');
  await expect(catalog).toHaveCount(1);
  await expect(catalog).toHaveAttribute('lang', 'es');
  await expect(catalog.getByRole('heading', { level: 1, name: 'Cursos de IA gratuitos', exact: true })).toBeVisible();
  // The header's free-start action and the course hero intentionally share a label.
  // Scope each contract; the direct header action is hidden at compact widths.
  const freeStart = catalog.locator('.site-navigation > a.site-nav-free-entry');
  await expect(freeStart).toHaveCount(1);
  await expect(freeStart).toHaveText('Revisión gratis');
  await expect(freeStart).toHaveAttribute('href', '/es/services/free-situation-review');
  if (page.viewportSize().width > 1140) {
    await expect(freeStart).toBeVisible();
    await expect(freeStart).toHaveAccessibleName('Revisión gratis');
  } else await expect(freeStart).toBeHidden();
  const hero = catalog.locator('section[aria-labelledby="courses-title"]');
  await expect(hero).toHaveCount(1);
  const start = hero.getByRole('link', { name: 'Empezar gratis', exact: true });
  await expect(start).toHaveCount(1);
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute('href', '/en/app/course?program=stress');
  await expect(catalog.locator('[data-course-programme]')).toHaveCount(1);
  const stress = catalog.locator('[data-course-programme="stress"]');
  await expect(stress.getByRole('heading', { level: 3, name: 'Menos estrés', exact: true })).toBeVisible();
  await expect(stress.locator('a[href="/en/app/course?program=stress"]')).toHaveCount(1);
  await expect(catalog.getByRole('link', { name: 'Conocer Antiestrés', exact: true })).toHaveCount(2);
  for (const link of await catalog.getByRole('link', { name: 'Conocer Antiestrés', exact: true }).all()) await expect(link).toHaveAttribute('href', '/es/courses/antistress');
  await expect(catalog.getByRole('link', { name: 'Conocer el método OPORA', exact: true })).toHaveAttribute('href', '/es/courses/methodology');
  await expect(catalog.locator('#my-courses [data-course-cabinet]')).toHaveCount(1);
  await expect(catalog.locator('[data-opora-stress-seven-skills] ol > li')).toHaveCount(7);
  await expect(catalog.locator('[data-opora-14-day-public-plan]')).toHaveCount(1);
  // The current seven-tab navigation explicitly selects Courses on its own
  // public catalog page. Retain a precise single-active-tab contract.
  await expect(page.locator('.mobile-bottom-navigation [data-nav-item="courses"][aria-current="page"]')).toHaveCount(1);
  await expect(page.locator('.mobile-bottom-navigation [aria-current="page"]')).toHaveCount(1);
}

// Production-parity HTTPS browser checks. Never read real private records,
// submit production forms, send messages, or mutate publication data.
import assert from 'node:assert/strict';
import { createPublicDiagnostics, installPublicLifecycle } from './es-public-diagnostics.mjs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { mkdirSync, writeFileSync, createWriteStream, readFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';
import { getSpanishRemedySlugs } from '../data/remedies-es.js';
import { getCompactNavigation, getSiteNavigation } from '../lib/site-navigation-model.js';
import { assertUnsupportedSpanishPrivateLocale } from './helpers/es-private-denial-verifier.mjs';
function spanishCabinetEntryExpectation(observation, freshResponse, isolatedLocal) {
  assert.ok(observation, 'Cabinet bootstrap response must be observed, not inferred from missing links');
  if (observation.status === 401) return { state: 'guest', href: '/en/app/portrait' };
  assert.equal(observation.status, 503, 'Unexpected Cabinet bootstrap status');
  assert.equal(isolatedLocal, true, 'Live acceptance must not accept an unavailable Cabinet');
  assert.equal(observation.error, 'APP_UNAVAILABLE', 'Only explicitly unavailable Cabinet permits the error entry');
  assert.equal(freshResponse, true, 'Unavailable Cabinet must be confirmed by the current open attempt');
  return { state: 'unavailable', href: '/en/app' };
}
const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'https://127.0.0.1:3443';
const auditOrigin = live ? origin : 'http://127.0.0.1:3202';
const evidence = '/tmp/site-video-evidence';
const results = [];
const diagnostics = createPublicDiagnostics(origin);
const saveDiagnostics = () => writeFileSync(`${evidence}/${live?'live':'local'}-es-public-diagnostics.json`, JSON.stringify({events:diagnostics.events, dropped:diagnostics.dropped}, null, 2));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const routes = ['/es', '/es/library', '/es/services', '/es/academy', '/es/books', '/es/about', '/es/courses', '/es/academy/free-ai-courses', '/es/homeopathy', '/es/homeopathy/remedies', '/es/client'];
mkdirSync(evidence, { recursive: true });
let app, proxy, stage = 'start';
try {
  if (!live) {
    assert.equal(process.env.CI, 'true');
    const log = createWriteStream(`${evidence}/es-public-local-app.log`);
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3202', '-H', '127.0.0.1'], { env: { ...process.env, PRESCRIPTIONS_KV_REST_API_URL: '', PRESCRIPTIONS_KV_REST_API_TOKEN: '', PRESCRIPTIONS_ADMIN_TOKEN: '', PRESCRIPTIONS_ADMIN_PIN: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    app.stdout.pipe(log); app.stderr.pipe(log);
    for (let i=0;;i++) { try { if ((await fetch(`${auditOrigin}/es`)).ok) break; } catch {} assert.ok(i<90 && app.exitCode===null, 'Local Spanish site did not start'); await pause(1000); }
    proxy = createServer({key:readFileSync('/tmp/video-test-key.pem'),cert:readFileSync('/tmp/video-test-cert.pem')}, (incoming,outgoing) => {
      const upstream = httpRequest({hostname:'127.0.0.1',port:3202,path:incoming.url,method:incoming.method,headers:{...incoming.headers,'x-forwarded-proto':'https'}}, response => {
        outgoing.writeHead(response.statusCode || 502,response.headers); response.pipe(outgoing);
      });
      diagnostics.observeProxy(incoming, outgoing, upstream, stage);
      upstream.on('error',()=>{ if(!outgoing.headersSent)outgoing.writeHead(502); outgoing.end(); });
      incoming.pipe(upstream);
    });
    proxy.listen(3443,'127.0.0.1'); await once(proxy,'listening');
  }
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      for (const width of [390,1365]) {
        const context = await browser.newContext({viewport:{width,height:900},locale:'es-MX',serviceWorkers:'block',ignoreHTTPSErrors:!live});
        await context.exposeBinding('__esPublicEvidence', ({frame}, event) => {
          if (frame !== frame.page().mainFrame() || !['document-init', 'DOMContentLoaded', 'load', 'pageshow', 'pagehide', 'popstate', 'error', 'unhandledrejection'].includes(event?.kind)) return;
          diagnostics.record(event.kind, event.url, {document:event.document, sourceTime:event.sourceTime, stage});
        });
        await context.addInitScript(installPublicLifecycle);
        const page = await context.newPage(); const errors = [];
        // Record only status and the allowlisted unavailable code, never account data.
        const cabinetResponses = [];
        page.on('response', response => {
          const url = new URL(response.url());
          if (url.origin !== origin || url.pathname !== '/api/app/bootstrap' || url.search !== '?view=portrait' || response.request().method() !== 'GET') return;
          cabinetResponses.push((async () => {
            const status = response.status();
            if (status !== 503) return { status };
            try {
              const value = await response.json();
              return { status, error: value?.error === 'APP_UNAVAILABLE' ? 'APP_UNAVAILABLE' : 'UNEXPECTED_ERROR' };
            } catch { return { status, error: 'INVALID_ERROR_RESPONSE' }; }
          })());
        });
        diagnostics.observePage(page, () => stage);
        const unselectedClientRequests = [];
        let watchingUnselectedClients = true;
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => {
          const url = new URL(request.url());
          if (watchingUnselectedClients && url.origin === origin && /^\/(en|ru)\/client(?:\/tests)?\/?$/.test(url.pathname)) {
            unselectedClientRequests.push({path:url.pathname,resourceType:request.resourceType()});
          }
        });
        // Do not abort in-flight Next link prefetches with the next hard goto.
        // All page errors still fail; no CORS or JavaScript errors are filtered.
        const settle = () => page.waitForLoadState('networkidle',{timeout:30000});
        async function navigate(path) {
          await settle();
          const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});
          await settle(); return response;
        }
        async function click(locator) { await settle(); await locator.click(); await settle(); }
        async function openLanguageMenu() {
          const menu = page.locator('.site-language-menu');
          if (!await menu.evaluate(element => element.open)) await click(page.locator('.site-language-menu-trigger'));
        }
        async function chooseLanguage(language) {
          await openLanguageMenu();
          await click(page.locator(`.site-language-switch a[lang="${language}"]`));
        }
        for (const path of routes) {
          stage=`${engine} ${width} ${path}`;
          let response;
          for (let i=0;;i++) { response=await navigate(path); if(response.status()===200 && await page.locator('main[lang="es"]').count())break; assert.ok(live && i<35,path+' missing'); await pause(5000); }
          assert.ok(/<html lang="es"/.test(await response.text()),'Spanish server-rendered document language: '+path);
          await expect(page.locator('html')).toHaveAttribute('lang','es');
          await expect(page.locator('.site-language-switch a[lang="es"]')).toHaveAttribute('aria-current','true');
          await assertSpanishNavigation(page, path);
          if (['/es/courses', '/es/academy/free-ai-courses'].includes(path)) await assertSpanishCourseCatalog(page, response);
          // Original RU testimonials are intentionally audible and labelled RU.
          // Exclude only their source-language cards, not Spanish headings,
          // navigation, reviews or other page content, from the translation check.
          const primaryPublicCopy = await page.locator('main').evaluate(main => {
            const copy = main.cloneNode(true);
            copy.querySelectorAll('[data-testimonial-video-id]').forEach(card => {
              if (card.querySelector('[lang="ru"]')) card.remove();
            });
            return copy.textContent || '';
          });
          assert.ok(!/Inicio \(EN\)|Servicios \(EN\)|Remedios \(EN\)|[\u0400-\u04ff]/.test(primaryPublicCopy),
            'No untranslated public labels (excluding authentic RU video titles): '+path);
          if (path === '/es/about') assert.ok(
            await page.locator('[data-personal-testimonials="about"] .site-video-caption [lang="ru"]').count() > 0,
            'Original RU testimonial cards must remain visible and labelled');
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Overflow: '+path);
          assert.equal(await page.locator('iframe').count(),0,'No eager video');
          if(path==='/es') {
            await assertSpanishHomeAlternates(page);
            if(width===390) {
              // The reviewed ES home uses a responsive topic chooser.
              // Assert both real interactive destinations and two-column geometry.
              const topics = page.locator('[data-home-topic-filters] nav[aria-label="Explora por tema"]');
              await expect(topics).toHaveCount(1);
              await expect(topics.locator('a[data-home-topic-filter]')).toHaveCount(4);
              await expect(topics).toHaveCSS('grid-template-columns', /^\d+(?:\.\d+)?px \d+(?:\.\d+)?px$/);
            }
          }
          if(path==='/es/client') {
            // Also exercise desktop hover without clicking a language.
            await openLanguageMenu();
            await page.locator('.site-language-switch a[lang="en"]').hover();
            await settle();
            await page.locator('.site-language-switch a[lang="ru"]').hover();
            await settle();
          }
          await page.evaluate(()=>document.fonts.ready);
          if(['/es','/es/services','/es/books','/es/homeopathy'].includes(path))await page.screenshot({path:`${evidence}/${live?'live':'local'}-${path.split('/').filter(Boolean).join('-')}-${engine}-${width}.png`,animations:'disabled'});
        }
        assert.deepEqual(unselectedClientRequests,[], 'Client-entry language counterparts must not load before selection');
        watchingUnselectedClients = false;
        stage=`${engine} ${width} client-entry language selection`;
        for (const language of ['en','ru','es']) {
          await chooseLanguage(language);
          await expect(page).toHaveURL(origin+'/'+language+'/client');
          await expect(page.locator('html')).toHaveAttribute('lang',language);
          if (language === 'es') {
            await expect(page.locator('.client-entry-form')).toBeVisible();
          } else {
            // The redesigned Client entry starts with a test battery; Google is the
            // explicit continuation action and remains available below it.
            const preloginPicker=page.locator('[data-prelogin-test-picker]');
            await expect(preloginPicker).toBeVisible();
            await assertPublicPickerEntrance(page,language);
            await expect(preloginPicker.getByRole('heading',{name:language==='ru'?'Рекомендуем для вас':'Recommended for you'})).toBeVisible();
            assert.equal(await preloginPicker.locator('details').first().evaluate(element=>element.open),false,'advanced filter starts folded');
            await expect(preloginPicker.getByRole('button',{name:language==='ru'?/Начать бесплатный мониторинг/:/Start free monitoring/})).toBeVisible();
            await expect(page.getByRole('button',{name:language==='ru'?'Войти в личный кабинет через Google':'Enter personal cabinet with Google'})).toBeVisible();
            const legacy = page.locator('.cabinet-legacy-entry');
            await expect(legacy).not.toHaveAttribute('open','');
            await legacy.locator('summary').click();
            await expect(page.locator('.client-entry-form')).toBeVisible();
          }
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Client-entry overflow: '+language);
        }
        await page.screenshot({path:`${evidence}/${live?'live':'local'}-es-client-${engine}-${width}.png`,animations:'disabled'});
        stage=`${engine} ${width} Spanish account navigation`;
        // The root provider exposes Cabinet as a dialog button on client pages too.
        // Follow the real profile destination inside that dialog into the guest app.
        const accountCabinet = page.locator('.site-navigation .site-cabinet-entry');
        await expect(accountCabinet).toHaveCount(1);
        await expect(accountCabinet).toBeVisible();
        await expect(accountCabinet).toHaveAttribute('aria-haspopup','dialog');
        await expect(accountCabinet).toHaveAttribute('aria-controls','home-personal-space-dialog');
        const cabinetResponsesBeforeOpen = cabinetResponses.length;
        await click(accountCabinet);
        const accountDialog = page.locator('#home-personal-space-dialog');
        await expect(accountDialog).toBeVisible();
        // An open dialog may still be loading. Wait for the actual settled state
        // before snapshotting response metadata; do not infer a state from absent links.
        await expect(accountDialog.getByText('Elige tu camino. Empieza gratis.', { exact: true })
          .or(accountDialog.getByRole('status').filter({ hasText: /^No se pudo abrir tu espacio ahora\.$/ }))).toBeVisible();
        const cabinetResponseSnapshot = [...cabinetResponses];
        const observedCabinetResponses = await Promise.all(cabinetResponseSnapshot);
        const entry = spanishCabinetEntryExpectation(observedCabinetResponses.at(-1), cabinetResponseSnapshot.length > cabinetResponsesBeforeOpen, !live);
        if (entry.state === 'unavailable') {
          await expect(accountDialog.getByRole('status')).toHaveText('No se pudo abrir tu espacio ahora.');
          await expect(accountDialog.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
          await expect(accountDialog.locator('a[data-space-link="profile"]')).toHaveCount(0);
          await expect(accountDialog.getByRole('link')).toHaveCount(1);
        } else {
          await expect(accountDialog.getByText('Elige tu camino. Empieza gratis.', { exact: true })).toBeVisible();
        }
        const accountLink = entry.state === 'unavailable'
          ? accountDialog.getByRole('link', { name: 'Entrar a mi espacio', exact: true })
          : accountDialog.locator('a[data-space-link="profile"]');
        await expect(accountLink).toHaveCount(1);
        await expect(accountLink).toBeVisible();
        await expect(accountLink).toHaveAttribute('href', entry.href);
        await click(accountLink);
        await expect(page).toHaveURL(origin+'/en/app/portrait');
        // The signed-out /en/app/portrait uses CabinetGuestOverview, not the
        // legacy .hh-entry of course/deep-link screens. Verify the real public
        // guest flow, privacy and exact destinations after following the dialog.
        const guestOverview = page.locator('main.hh-app [data-cabinet-guest-overview="true"]');
        await expect(guestOverview).toBeVisible();
        await expect(guestOverview.getByRole('heading',{name:'Discover where you are. Grow into what comes next.',level:1,exact:true})).toBeVisible();
        await expect(guestOverview.getByRole('link',{name:'Explore free tests',exact:true})).toHaveAttribute('href','/en/client/tests');
        await expect(guestOverview.getByText('Your personal tests and reports stay private. You choose what to submit for public publication.',{exact:true})).toBeVisible();
        await expect(guestOverview.getByRole('link',{name:'Open the previous access page',exact:true})).toHaveAttribute('href','/en/client');
        await expect(page.locator('[data-subscription-settings], [data-course-testing-complete]')).toHaveCount(0);
        // Same-CSP SPA navigation preserves the existing root document locale.
        // A direct account load must have its own correct server-rendered locale.
        await page.reload(); await settle();
        await expect(page).toHaveURL(origin+'/en/app/portrait');
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        await expect(guestOverview).toBeVisible();
        await expect(guestOverview.getByRole('heading',{name:'Discover where you are. Grow into what comes next.',level:1,exact:true})).toBeVisible();
        await expect(guestOverview.getByRole('link',{name:'Open the previous access page',exact:true})).toHaveAttribute('href','/en/client');
        stage=`${engine} ${width} search`;
        await navigate('/es/homeopathy/remedies');
        await page.getByRole('searchbox').fill('Aconitum'); await settle();
        await expect(page.getByRole('status')).toHaveText('1 remedio');
        await click(page.getByRole('link',{name:/Aconitum.*Leer el texto completo/}));
        await expect(page).toHaveURL(/\/es\/homeopathy\/remedies\/aconitum$/);
        await expect(page.getByRole('heading',{name:'Aconitum',exact:true})).toBeVisible();
        await expect(page.locator('.remedy-content-body')).toContainText('Aconitum');
        await expect(page.locator('.remedy-content-body')).not.toContainText('homeoterapia');
        await expect(page.locator('.remedy-source-reference')).not.toHaveAttribute('open','');
        await page.screenshot({path:`${evidence}/${live?'live':'local'}-es-aconitum-${engine}-${width}.png`,animations:'disabled'});
        stage=`${engine} ${width} remembered language`;
        await chooseLanguage('en');
        await expect(page).toHaveURL(/\/en\/homeopathy\/remedies\/aconitum$/);
        await chooseLanguage('es');
        await expect(page).toHaveURL(/\/es\/homeopathy\/remedies\/aconitum$/);
        await expect.poll(async()=> (await context.cookies(origin)).find(cookie=>cookie.name==='holistic_house_public_locale')?.value).toBe('es');
        await navigate('/'); await expect(page).toHaveURL(origin+'/');
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        await chooseLanguage('es'); await expect(page).toHaveURL(origin+'/es');
        await chooseLanguage('en');
        await expect(page).toHaveURL(origin+'/');
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        await chooseLanguage('es'); await expect(page).toHaveURL(origin+'/es');
        if(!live){
          await navigate('/es/client');
          await click(page.getByRole('button',{name:/Entrar al área de clientes/}));
          await expect(page.locator('.client-entry-form').getByRole('alert')).toContainText('enlace válido');
          assert.ok(page.url().endsWith('/es/client'));
        }
        assert.deepEqual(errors,[]);
        results.push({engine,width,routes:routes.length,transport:'HTTPS',publicNavigation:'Energy/Love/Business, full catalog in More, My Space dialog on Home; Enter/Tab/Escape',search:'single matching remedy + ES detail',languageSwitch:'same remedy EN/ES + saved preference + explicit canonical home',clientEntryLanguageSwitch:'ES to EN to RU to ES, public entry forms only',unselectedClientRequests:unselectedClientRequests.length,homeAlternates:'exact English root and Russian /ru URLs',courses:'legacy redirect and direct canonical growth catalog, exact Stress Relief enrollment and public detail/methodology links',overflow:false,pageErrors:0});
        console.log(`PASS: ${live?'live':'local'} Spanish public site ${engine} ${width}`);
        await context.close();
      }
    } finally {await browser.close();}
  }
  stage='all remedy routes and sitemap';
  const slugs=getSpanishRemedySlugs();
  for(let i=0;i<slugs.length;i+=5)await Promise.all(slugs.slice(i,i+5).map(async slug=>{
    const response=await fetch(`${auditOrigin}/es/homeopathy/remedies/${slug}`); assert.equal(response.status,200,slug); const html=await response.text();
    assert.ok(/<html lang="es"/.test(html),'Spanish remedy document: '+slug); assert.ok(html.includes('Traducción automática'),slug); assert.ok(!response.url.includes('/en/'),slug);
  }));
  const xml=await(await fetch(auditOrigin+'/sitemap.xml')).text();
  const sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  for(const path of routes.filter(path=>!['/es/client','/es/courses'].includes(path)))assert.ok(sitemapUrls.includes('https://holistichouse.vercel.app'+path),path);
  assert.ok(!sitemapUrls.some(href => new URL(href).pathname === '/es/courses'), 'Legacy course redirect must not be indexed');
  for(const slug of slugs)assert.ok(xml.includes('/es/homeopathy/remedies/'+slug),slug);
  assert.ok(!xml.includes('/es/client'));
  console.log(`PASS: ${slugs.length} complete Spanish remedy routes and public sitemap`);
  stage='unsupported private locale denial';
  const denialBrowser=await chromium.launch({headless:true});
  try {
    const denialPage=await denialBrowser.newPage({ignoreHTTPSErrors:!live});
    const target=origin+'/es/client/not-a-real-client-id';
    const response=await denialPage.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
    await assertUnsupportedSpanishPrivateLocale(denialPage,response,target,expect);
    await denialPage.screenshot({path:`${evidence}/${live?'live':'local'}-es-private-locale-denied.png`});
  } finally {await denialBrowser.close();}
  console.log('PASS: unsupported Spanish private locale visibly renders 404 with noindex and no cabinet');
  writeFileSync(`${evidence}/${live?'live':'local'}-es-public-results.json`,JSON.stringify({scope:live?'read-only production':'isolated production build',results,allRemedyRoutes:slugs.length,unsupportedPrivateLocale:'browser-visible noindex 404, no cabinet',automaticTranslationLabel:true,originalBookEditions:'clearly labelled, not claimed translated',newRender:false,privateRecordsRead:false},null,2));
} catch(error) {
  writeFileSync(`${evidence}/${live?'live':'local'}-es-public-failure.json`,JSON.stringify({stage,message:String(error.message).slice(0,4000),completedBrowserGroups:results},null,2)); throw error;
} finally {
  try {saveDiagnostics();} finally {if(proxy){proxy.closeAllConnections();proxy.close();} if(app)app.kill('SIGTERM');}
}

