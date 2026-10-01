// Production-parity HTTPS browser checks. Never read real private records,
// submit production forms, send messages, or mutate publication data.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { mkdirSync, writeFileSync, createWriteStream, readFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';
import { getSpanishRemedySlugs } from '../data/remedies-es.js';
const live = process.argv.includes('--live');
const origin = live ? 'https://holistichouse.vercel.app' : 'https://127.0.0.1:3443';
const auditOrigin = live ? origin : 'http://127.0.0.1:3202';
const evidence = '/tmp/site-video-evidence';
const results = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const routes = ['/es', '/es/services', '/es/books', '/es/about', '/es/homeopathy', '/es/homeopathy/remedies', '/es/client'];
const nav = ['/es', '/es/books', '/es/homeopathy', '/es/services', '/es/about'];
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
        const page = await context.newPage(); const errors = [];
        const unselectedClientRequests = [];
        let watchingUnselectedClients = true;
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => {
          const url = new URL(request.url());
          if (watchingUnselectedClients && url.origin === origin && /^\/(en|ru)\/client\/?$/.test(url.pathname)) {
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
        for (const path of routes) {
          stage=`${engine} ${width} ${path}`;
          let response;
          for (let i=0;;i++) { response=await navigate(path); if(response.status()===200 && await page.locator('main[lang="es"]').count())break; assert.ok(live && i<35,path+' missing'); await pause(5000); }
          assert.ok(/<html lang="es"/.test(await response.text()),'Spanish server-rendered document language: '+path);
          await expect(page.locator('html')).toHaveAttribute('lang','es');
          await expect(page.locator('.site-language-switch a[lang="es"]')).toHaveAttribute('aria-current','true');
          assert.deepEqual(await page.locator('.site-navigation > a').evaluateAll(elements=>elements.map(el=>el.getAttribute('href'))),nav,path);
          assert.ok(!/Inicio \(EN\)|Servicios \(EN\)|Remedios \(EN\)|[\u0400-\u04ff]/.test(await page.locator('main').innerText()),'No untranslated public labels: '+path);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Overflow: '+path);
          assert.equal(await page.locator('iframe').count(),0,'No eager video');
          if(path==='/es') {
            for(const language of ['en','ru'])await expect(page.locator(`link[rel="alternate"][hreflang="${language}"]`)).toHaveAttribute('href',new RegExp('\\?lang='+language+'$'));
            if(width===390)await expect(page.locator('.service-home-card-grid')).toHaveCSS('grid-template-columns',/^\d+(?:\.\d+)?px$/);
          }
          if(path==='/es/client') {
            // Also exercise desktop hover without clicking a language.
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
          await click(page.locator(`.site-language-switch a[lang="${language}"]`));
          await expect(page).toHaveURL(origin+'/'+language+'/client');
          await expect(page.locator('html')).toHaveAttribute('lang',language);
          await expect(page.locator('.client-entry-form')).toBeVisible();
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Client-entry overflow: '+language);
        }
        await page.screenshot({path:`${evidence}/${live?'live':'local'}-es-client-${engine}-${width}.png`,animations:'disabled'});
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
        await click(page.locator('.site-language-switch a[lang="en"]'));
        await expect(page).toHaveURL(/\/en\/homeopathy\/remedies\/aconitum$/);
        await click(page.locator('.site-language-switch a[lang="es"]'));
        await expect(page).toHaveURL(/\/es\/homeopathy\/remedies\/aconitum$/);
        await expect.poll(async()=> (await context.cookies(origin)).find(cookie=>cookie.name==='holistic_house_public_locale')?.value).toBe('es');
        await navigate('/'); await expect(page).toHaveURL(origin+'/es');
        await click(page.locator('.site-language-switch a[lang="en"]'));
        await expect(page).toHaveURL(/\/\?lang=en$/);
        await expect(page.locator('html')).toHaveAttribute('lang','en');
        await click(page.getByRole('link',{name:'ES',exact:true})); await expect(page).toHaveURL(origin+'/es');
        if(!live){
          await navigate('/es/client');
          await click(page.getByRole('button',{name:/Entrar al área de clientes/}));
          await expect(page.locator('.client-entry-form').getByRole('alert')).toContainText('enlace válido');
          assert.ok(page.url().endsWith('/es/client'));
        }
        assert.deepEqual(errors,[]);
        results.push({engine,width,routes:routes.length,transport:'HTTPS',publicNavigation:'five Spanish destinations',search:'single matching remedy + ES detail',languageSwitch:'same remedy EN/ES + remembered home',clientEntryLanguageSwitch:'ES to EN to RU to ES, public entry forms only',unselectedClientRequests:unselectedClientRequests.length,homeAlternates:'distinct EN/RU query URLs',overflow:false,pageErrors:0});
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
  for(const path of routes.filter(path=>path!=='/es/client'))assert.ok(xml.includes('https://holistichouse.vercel.app'+path),path);
  for(const slug of slugs)assert.ok(xml.includes('/es/homeopathy/remedies/'+slug),slug);
  assert.ok(!xml.includes('/es/client'));
  console.log(`PASS: ${slugs.length} complete Spanish remedy routes and public sitemap`);
  stage='unsupported private locale denial';
  const denialBrowser=await chromium.launch({headless:true});
  try {
    const denialPage=await denialBrowser.newPage({ignoreHTTPSErrors:!live});
    const target=origin+'/es/client/not-a-real-client-id';
    const response=await denialPage.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
    assert.ok([200,404].includes(response.status()),'Unsupported private locale must not redirect or server-error');
    await expect(denialPage).toHaveURL(target);
    await expect(denialPage.getByRole('heading',{name:'404',exact:true})).toBeVisible({timeout:15000});
    await expect(denialPage.getByText('This page could not be found.',{exact:true})).toBeVisible();
    await expect.poll(()=>denialPage.locator('meta[name="robots"]').evaluateAll(elements=>elements.some(el=>(el.getAttribute('content')||'').split(/[\s,]+/).includes('noindex')))).toBe(true);
    await expect(denialPage.locator('.client-cabinet, .prescription-access-gate, .client-entry-form')).toHaveCount(0);
    await denialPage.screenshot({path:`${evidence}/${live?'live':'local'}-es-private-locale-denied.png`});
  } finally {await denialBrowser.close();}
  console.log('PASS: unsupported Spanish private locale visibly renders 404 with noindex and no cabinet');
  writeFileSync(`${evidence}/${live?'live':'local'}-es-public-results.json`,JSON.stringify({scope:live?'read-only production':'isolated production build',results,allRemedyRoutes:slugs.length,unsupportedPrivateLocale:'browser-visible noindex 404, no cabinet',automaticTranslationLabel:true,originalBookEditions:'clearly labelled, not claimed translated',newRender:false,privateRecordsRead:false},null,2));
} catch(error) {
  writeFileSync(`${evidence}/${live?'live':'local'}-es-public-failure.json`,JSON.stringify({stage,message:String(error.message).slice(0,4000),completedBrowserGroups:results},null,2)); throw error;
} finally {if(proxy){proxy.closeAllConnections();proxy.close();} if(app)app.kill('SIGTERM');}
