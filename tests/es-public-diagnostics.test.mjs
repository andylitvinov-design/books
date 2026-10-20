import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { publicRoute, createPublicDiagnostics, installPublicLifecycle } from '../scripts/es-public-diagnostics.mjs';
const origin='https://127.0.0.1:3443';
test('public routes emit only path and RSC flag; private, external and credentials excluded',()=>{
 assert.deepEqual(publicRoute('/es/masters?_rsc=secret&token=secret#secret',origin),{path:'/es/masters',rsc:true});
 for(const path of ['/es/client','/en/app','/api/client/secret','/es/unknown','https://outside.test/es','https://user:secret@127.0.0.1:3443/es']) assert.equal(publicRoute(path,origin),null);
 assert.equal(publicRoute('/es','file://127.0.0.1'),null);
});
test('bounded metadata ignores arbitrary values and private stage paths',()=>{
 const d=createPublicDiagnostics(origin,2);
 d.record('request-start','/es?_rsc=secret',{stage:'webkit 1365 /es/client',request:1,body:'secret',headers:{secret:1},status:200});
 d.record('pageerror','/es',{error:'other',stage:'webkit 1365 remembered language'});
 d.record('pageerror','/es',{stage:'webkit 1365 search'});
 d.record('pageerror','/es',{stage:'webkit 1365 search'});
 assert.equal(d.events.length,3);assert.equal(d.events[0].stage,'unlisted');assert.equal(d.events[1].stage,'remembered language');
 assert.ok(!JSON.stringify(d.events).includes('secret'));assert.ok(!JSON.stringify(d.events).includes('/es/client'));
});
test('request lifecycle retains IDs, responses and failures without changing event objects',()=>{
 const p=new EventEmitter();p.url=()=>origin+'/es';p.mainFrame=()=>null;
 const d=createPublicDiagnostics(origin);d.observePage(p,()=> 'webkit 1365 search');
 const r={url:()=>origin+'/es/masters?_rsc=secret'};
 p.emit('request',r);p.emit('response',{url:r.url,request:()=>r,status:()=>200});p.emit('requestfailed',r);
 p.emit('pageerror',new Error('secret due to access control checks.'));
 assert.deepEqual(d.events.map(e=>e.kind),['request-start','response','request-failed','pageerror']);
 assert.equal(d.events[0].request,d.events[2].request);assert.equal(d.events[1].status,200);assert.equal(d.events[3].error,'access-control');assert.ok(!JSON.stringify(d.events).includes('secret'));
 assert.doesNotThrow(()=>p.emit('request',{url(){throw Error('observer');}}));
});
test('proxy observes outcomes without handling errors or writing responses',()=>{
 const d=createPublicDiagnostics(origin); const incoming={url:'/es?_rsc=secret'};
 const outgoing=new EventEmitter();outgoing.statusCode=200;const upstream=new EventEmitter();
 d.observeProxy(incoming,outgoing,upstream);upstream.emit('response',{statusCode:200});outgoing.emit('finish');outgoing.emit('close');upstream.emit('error',new Error('secret'));
 assert.deepEqual(d.events.map(e=>e.kind),['proxy-start','proxy-response','proxy-finish','proxy-close','proxy-error']);
 assert.equal(new Set(d.events.map(e=>e.request)).size,1);assert.ok(!JSON.stringify(d.events).includes('secret'));
});
test('browser lifecycle does not replace fetch/history or cancel errors',async()=>{
 const handlers={}; const records=[];const fetch=()=>Promise.resolve();const history={};
 const window={fetch,history,__esPublicEvidence:async e=>records.push(e),addEventListener:(k,f)=>handlers[k]=f};
 vm.runInNewContext(`(${installPublicLifecycle})()`,{window,location:{origin,pathname:'/es'},Math,Date});
 handlers.pagehide();handlers.error();handlers.unhandledrejection();
 assert.equal(window.fetch,fetch);assert.equal(window.history,history);assert.equal(records.length,4);assert.equal(new Set(records.map(e=>e.document)).size,1);
 window.__esPublicEvidence=()=>{throw Error('unavailable');};assert.doesNotThrow(()=>handlers.load());
});
test('integration retains fatal gate, original checks and navigation sequence exactly',()=>{
 let source=readFileSync(new URL('../scripts/verify-es-public-site.mjs',import.meta.url),'utf8');
 assert.match(source,/page\.on\('pageerror', error => errors\.push\(error\.message\)\)/);
 assert.match(source,/assert\.deepEqual\(errors,\[\]\)/);
 assert.ok(!source.includes('errors.filter'));assert.ok(!source.includes('errors.length ='));
 const start=source.indexOf('        // Do not abort');const end=source.indexOf('        results.push',start);
 const block=source.slice(start,end);
 const portraitAssertion="await expect(page).toHaveURL(origin+'/en/app/portrait');";
 assert.equal(block.split(portraitAssertion).length-1,2,'Both actual navigation and reload require the approved canonical portrait route');
 // Preserve the original frozen action sequence except for the two approved
 // portrait redirects and the new exact canonical-course catalog assertion.
 const catalogAssertion="\n          if (['/es/courses', '/es/academy/free-ai-courses'].includes(path)) await assertSpanishCourseCatalog(page, response);";
 assert.equal(block.split(catalogAssertion).length-1,1,'Exactly one bounded course catalog assertion');
 // The approved Library header moved account access into the exact My House
 // menu item. Freeze that complete handoff, then preserve the old rest-of-flow hash.
 const accountEntry=`        const accountMenu = page.locator('.site-navigation details.site-main-menu');
        await expect(accountMenu).toHaveCount(1);
        await expect(accountMenu).toHaveJSProperty('open', false);
        await click(page.locator('.site-main-menu-trigger'));
        await expect(accountMenu).toHaveJSProperty('open', true);
        const accountLink = page.locator('.site-main-menu-grid > a[data-nav-item="house"][href="/en/app"]');
        await expect(accountMenu.getByRole('link', { name: 'Gabinete', exact: true })).toHaveCount(1);
        await expect(accountLink).toHaveCount(1);
        await expect(accountLink).toHaveAccessibleName('Gabinete');
        await expect(accountLink).toBeVisible();
        await expect(accountLink).toHaveAttribute('href','/en/app');
        await click(accountLink);`;
 assert.equal(block.split(accountEntry).length-1,1,'Exactly one reviewed menu-to-account handoff');
 const priorAccountEntry=`        await expect(page.locator('.site-navigation [data-nav-item="cabinet"]')).toHaveAttribute('href','/en/app');
        await click(page.locator('.site-navigation [data-nav-item="cabinet"]'));`;
 // The approved guest redesign changes only the entry assertions, not the
 // menu action, canonical arrival, reload, locale, or private-control guards.
 const guestAssertion='        await assertCabinetGuestEntry(page, expect);';
 assert.equal(block.split(guestAssertion).length-1,2,'Exactly two awaited guest checks, on arrival and reload');
 const arrival=`        ${portraitAssertion}\n${guestAssertion}\n        await expect(page.locator('[data-subscription-settings], [data-course-testing-complete]')).toHaveCount(0);`;
 const reload=`        await expect(page.locator('html')).toHaveAttribute('lang','en');\n${guestAssertion}`;
 assert.equal(block.split(arrival).length-1,1,'Guest assertion immediately follows canonical arrival and retains the private-control guard');
 assert.equal(block.split(reload).length-1,1,'Guest assertion follows the unchanged reload locale check');
 const oldGuest=`        await expect(page.locator('.hh-app .hh-entry')).toBeVisible();\n        await expect(page.locator('.hh-app .hh-entry h1')).toHaveText(/^(A little space to understand yourself\\.|The new personal app is not connected yet\\.)$/);\n        await expect(page.locator('.hh-app .hh-entry a.hh-text-link')).toHaveAttribute('href','/en/client');`;
 const normalized=block.replace(guestAssertion,oldGuest).replace(guestAssertion,"        await expect(page.locator('.hh-app .hh-entry')).toBeVisible();").replace(accountEntry,priorAccountEntry).replace(catalogAssertion,'').replaceAll(portraitAssertion,"await expect(page).toHaveURL(origin+'/en/app');");
 assert.equal(createHash('sha256').update(normalized).digest('hex'),'c7de0338d185c732f43a2c0503d4615edffc3d138318117d100b2995df64a4b4','Frozen action/assertion block apart from approved redirects and account menu handoff');
});

test('each exact browser group retains reserved capacity and reports drops; kinds and source paths are bounded',()=>{
 const d=createPublicDiagnostics(origin,1);
 for(const engine of ['chromium','webkit']) for(const width of [390,1365]) {
  d.record('request-start','/es',{stage:`${engine} ${width} search`,source:'/es/services?secret=value'});
  d.record('request-start','/es',{stage:`${engine} ${width} search`});
 }
 d.record('secret-malicious-kind','/es');
 assert.equal(d.events.length,4);assert.equal(Object.values(d.dropped).reduce((a,b)=>a+b,0),4);
 assert.equal(d.events[3].engine,'webkit');assert.equal(d.events[3].width,1365);assert.equal(d.events[3].observedFramePath,'/es/services');
 const p=createPublicDiagnostics(origin);p.record('request-start','/es',{source:'/es/client?id=secret'});assert.ok(!('observedFramePath' in p.events[0]));
 assert.ok(!JSON.stringify(d.events).includes('secret'));
});

test('proxy and ordinary requests cannot exhaust error or lifecycle evidence',()=>{
 const d=createPublicDiagnostics(origin,1);const fields={stage:'webkit 1365 search'};
 for(const kind of ['proxy-start','proxy-finish','request-start','request-finished','pageerror','pagehide']) d.record(kind,'/es',fields);
 assert.deepEqual(d.events.map(e=>e.kind),['proxy-start','request-start','pageerror','pagehide']);
 assert.equal(d.dropped['webkit-1365:proxy'],1);assert.equal(d.dropped['webkit-1365:requests'],1);
});

test('private observer location retains redacted error and lifecycle evidence but no requests',()=>{
 const d=createPublicDiagnostics(origin);const fields={stage:'webkit 1365 /es/client',document:123};
 for(const kind of ['request-start','pageerror','pagehide','error']) d.record(kind,'/es/client/private-id?token=secret',fields);
 assert.deepEqual(d.events.map(e=>e.kind),['pageerror','pagehide','error']);
 assert.ok(d.events.every(e=>e.path===null && e.document===123));
 assert.ok(!/client|private-id|token|secret/.test(JSON.stringify(d.events)));
 d.record('pageerror','https://outside.test/es',fields);assert.equal(d.events.length,3);
});

test('diagnostic write failure cannot prevent original proxy and app cleanup',()=>{
 const source=readFileSync(new URL('../scripts/verify-es-public-site.mjs',import.meta.url),'utf8');
 const cleanup=source.slice(source.lastIndexOf('  try {saveDiagnostics();}'));
 const calls=[];const failure=new Error('disk unavailable');
 const run=new Function('saveDiagnostics','proxy','app',cleanup.slice(0,cleanup.lastIndexOf('}')));
 assert.throws(()=>run(()=>{throw failure;},{closeAllConnections(){calls.push('connections');},close(){calls.push('proxy');}},{kill(signal){calls.push(signal);}}),error=>error===failure);
 assert.deepEqual(calls,['connections','proxy','SIGTERM']);
});

for (const locale of ['en', 'ru', 'es']) test(locale + ' canonical course diagnostics retain sanitized lifecycle and request evidence', () => {
 const path='/' + locale + '/academy/free-ai-courses';
 assert.deepEqual(publicRoute(path+'?_rsc=secret&token=secret#secret',origin),{path,rsc:true});
 const d=createPublicDiagnostics(origin);
 for(const kind of ['request-start','response','request-failed','proxy-response','frame-navigation','pageerror'])d.record(kind,path+'?secret=hidden',{stage:'webkit 390 '+path,status:200,error:'other'});
 assert.equal(d.events.length,6);
 assert.ok(d.events.every(event=>event.path===path && event.stage===path));
 assert.ok(!/secret|hidden/.test(JSON.stringify(d.events)));
 for(const suffix of ['/private-id','/progress','/course-a'])assert.equal(publicRoute(path+suffix,origin),null);
 for(const privatePath of ['/'+locale+'/client/tests','/'+locale+'/app/course'])assert.equal(publicRoute(privatePath,origin),null);
});
