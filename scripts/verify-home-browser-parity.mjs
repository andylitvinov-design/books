// Local-only, read-only visual and hydration acceptance of two Next builds.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve(process.argv[2] || 'artifacts/home-perf');
const origins = { before: 'https://127.0.0.1:3498', after: 'https://127.0.0.1:3499' };
const locales = { en: '/', ru: '/ru', es: '/es' };
const { chromium } = await import(pathToFileURL(resolve(process.env.HH_PLAYWRIGHT_MODULE)).href);
assert.ok(process.env.CHROME_PATH, 'Pinned audit browser path required');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
const reports = [], pairs = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
async function sample(stage, locale, pass) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, ignoreHTTPSErrors: true, isMobile: true, hasTouch: true, locale: locale === 'en' ? 'en-US' : locale});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {
    if (m.type() === 'error' && /hydrat|react error|content security policy|refused to execute|refused to apply/i.test(m.text())) errors.push(m.text());
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
  await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 90 * 1024, connectionType: 'cellular4g'});
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.addInitScript(() => {
    window.__hhPerf = {lcp: null, cls: 0, csp: []};
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__hhPerf.lcp = {ms: e.startTime, url: e.url, element: e.element?.tagName || null};
    }).observe({type:'largest-contentful-paint', buffered:true});
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__hhPerf.cls += e.value;
    }).observe({type:'layout-shift', buffered:true});
    addEventListener('securitypolicyviolation', e => window.__hhPerf.csp.push({directive:e.violatedDirective, blocked:e.blockedURI}));
  });
  const prefix = 'browser-' + stage + '-' + locale + '-' + pass;
  try {
    const response = await page.goto(origins[stage] + locales[locale], {waitUntil: 'domcontentloaded', timeout: 45000});
    assert.equal(response.status(), 200);
    await page.locator('[data-home-dialogue-entry][data-home-interactive="true"]').waitFor({timeout: 45000});
    await page.waitForFunction(() => [...document.querySelectorAll('link[data-home-full-style]')].every(l => !l.disabled && l.media !== 'print' && l.sheet), {timeout: 30000});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].filter(i => {const r=i.getBoundingClientRect(); return r.width && r.height && r.top < innerHeight && r.bottom > 0;}).every(i => i.complete && i.naturalWidth > 0), {timeout: 30000});
    await pause(1200);
    const metrics = await page.evaluate(() => {
      const nav=performance.getEntriesByType('navigation')[0];
      return {...window.__hhPerf, loadMs: nav?.loadEventEnd || null, fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, portrait:document.querySelector('[data-home-ali-persona] > img')?.getAttribute('src')};
    });
    assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.nextHopProtocol), 'h2');
    // Keep the natural screenshot as evidence. Then apply exactly the same
    // reversible viewport redraw to BOTH pages before the reference capture.
    // This standardizes compositor rasterization without changing CSS or DOM.
    const options = {animations:'disabled',caret:'hide',scale:'css'};
    const natural = await page.screenshot({...options,path:join(out,prefix+'-natural.png')});
    const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.setViewportSize({width:391,height:844});
    await frame();
    await page.setViewportSize({width:390,height:844});
    await frame();
    await page.evaluate(() => document.fonts.ready);
    await frame();
    const image = await page.screenshot({...options,path:join(out,prefix+'.png')});
    // Exercise the already hydrated composer without submitting or contacting any service.
    const input = page.locator('[data-home-dialogue-entry] textarea').first();
    await input.fill('Local CSS audit');
    assert.equal(await input.inputValue(),'Local CSS audit');
    await input.fill('');
    const report = {stage,locale,pass,...metrics,errors:[...errors]};
    reports.push(report);
    return {image,natural,report};
  } catch (e) {
    reports.push({stage,locale,pass,error:String(e),errors:[...errors]});
    await page.screenshot({path:join(out,prefix+'-failure.png'),timeout:5000}).catch(()=>{});
    return {image:null,report:reports.at(-1)};
  } finally { await ctx.close(); }
}
try {
  for (let pass=1;pass<=2;pass++) for (const locale of Object.keys(locales)) {
    const before=await sample('before',locale,pass), after=await sample('after',locale,pass);
    // Exact equality of lossless PNG output establishes pixel parity. Any
    // difference remains a failure requiring review, never silently ignored.
    const identical=Boolean(before.image && after.image && before.image.equals(after.image));
    const naturalIdentical=Boolean(before.natural && after.natural && before.natural.equals(after.natural));
    const clean=[before.report,after.report].every(r=>!r.error && r.errors.length===0 && r.csp.length===0 && Number.isFinite(r.lcp?.ms));
    const localTargets=clean && after.report.lcp.ms < 2500 && after.report.cls < 0.1;
    pairs.push({locale,pass,identical,naturalIdentical,clean,localTargets});
    console.log(JSON.stringify({locale,pass,identical,naturalIdentical,clean,localTargets,beforeLcp:before.report.lcp?.ms,afterLcp:after.report.lcp?.ms}));
  }
} finally {
  await browser.close();
  await writeFile(join(out,'applied-slow4g-browser.json'),JSON.stringify({method:'CDP applied 150 ms / 1.6 Mbit/s / 4x CPU over HTTPS/HTTP2; 390x844 mobile; two fresh runs per locale and build; natural and exact standardized-redraw captures',reports,pairs},null,2));
}
assert.ok(pairs.length===6 && pairs.every(x=>x.identical && x.clean && x.localTargets),'Exact standardized visual/hydration and applied slow-4G targets have not passed');
