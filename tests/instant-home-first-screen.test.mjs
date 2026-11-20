import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {instantHomeLocale} from '../lib/instant-home-policy.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const documentHeaders=new Headers({accept:'text/html,application/xhtml+xml'});
const choose=(pathname,opts={})=>instantHomeLocale({
 pathname,method:opts.method||'GET',
 headers:opts.headers||documentHeaders,
 searchParams:new URLSearchParams(opts.search||'')
});

test('only full EN/RU Home documents get the fast public HTML; ES is manual',()=>{
 for(const path of ['/','/en','/en/','/ru','/ru/'])
  assert.equal(choose(path),path==='/'||path.startsWith('/en')?'en':'ru');
 for(const path of ['/es','/en/app','/ru/app','/en/client','/api/app','/admin','/ru/about','/en/mytube'])
  assert.equal(choose(path),null,path);
 assert.equal(choose('/',{search:'_rsc=abc'}),null);
 assert.equal(choose('/',{search:'full=1'}),null);
  assert.equal(choose('/en',{search:'full=1'}),null);
 assert.equal(choose('/ru',{search:'full=1'}),null);
 assert.equal(choose('/ru',{method:'POST'}),null);
 assert.equal(choose('/',{headers:new Headers({RSC:'1'})}),null);
 assert.equal(choose('/',{headers:new Headers({'Next-Router-State-Tree':'[]'})}),null);
 assert.equal(choose('/',{headers:new Headers({'Next-Router-Prefetch':'1'})}),null);
 assert.equal(choose('/',{headers:new Headers({Accept:'text/x-component'})}),null);
});

test('EN/RU are complete first-screen documents without the Next CSS/JS chain',()=>{
 for(const locale of ['en','ru']){
  const html=read('public/instant-home/'+locale+'.html');
  assert.match(html,new RegExp('<html lang="'+locale+'">'));
  assert.match(html,/data-home-dialogue-entry/);
  assert.match(html,/data-home-intent-form/);
  assert.match(html,/data-home-intent-composer/);
  assert.match(html,/data-home-send-to-ali/);
  assert.match(html,/data-home-free-review/);
   assert.match(html,/data-home-request-session/);
   assert.ok(html.includes('/'+locale+'/services/free-consultation'));
   assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html,/data-hh-unified-dock/);
  assert.match(html,/data-home-discover-more/);
  assert.match(html,/data-home-full-experience/);
  assert.match(html,new RegExp(locale==='ru' ? '/ru\\?full=1' : '/\\?full=1'));
  assert.equal((html.match(/data-home-intent-option=/g)||[]).length,4);
  assert.match(html,/href="\/es"/);
  assert.match(html,/<style data-home-critical-css>/);
  assert.ok(html.includes('<style data-home-critical-css>'+read('public/instant-home/fast.css')+'</style>'));
  assert.doesNotMatch(html,/<link[^>]*rel="stylesheet"/);
  assert.match(html,/\/instant-home\/fast\.js/);
  assert.doesNotMatch(html,/_next\/|https?:\/\/fonts\.|<iframe|autoplay|data:text\/html/);
  assert.ok(statSync(new URL('../public/instant-home/'+locale+'.html',import.meta.url)).size<24000);
 }
 const css=read('public/instant-home/fast.css');
 const js=read('public/instant-home/fast.js');
 const integrity="sha256-"+createHash('sha256').update(css).digest('base64');
 assert.ok(read('middleware.ts').includes("'"+integrity+"'"));
 assert.doesNotMatch(read('middleware.ts'),/style-src 'self' 'unsafe-inline'/);
 assert.match(read('middleware.ts'),/const fastLocale = instantHomeLocale\(/);
 assert.ok(Buffer.byteLength(css)<11000);
 assert.ok(Buffer.byteLength(js)<5000);
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/hh:home-ali-handoff:v1/);
 assert.match(js,/sessionStorage\.setItem/);
 assert.match(js,/window\.location\.assign/);
 assert.doesNotMatch(js,/location\.search\s*=|URLSearchParams\(.*message|OpenRouter|innerHTML/);
});


test('instant homepage preserves Ali public topics and business selections',()=>{
 const script=read('public/instant-home/fast.js');
 assert.match(script,/selectMode\(button\.dataset\.mode\)/);
 assert.doesNotMatch(script,/querySelectorAll\("\[data-intent\]"\)\.forEach/);
 for(const locale of ['en','ru']){
  const content=read('public/instant-home/'+locale+'.html');
  for(const intent of ['stress','love','money'])assert.ok(content.includes('/'+locale+'/app/messages?section=ai&amp;intent='+intent));
  for(const need of ['business_clients','business_strategy','business_team','business_burnout'])assert.ok(content.includes('/'+locale+'/services?topic=business_support&amp;need='+need));
  assert.match(content,/data-business-label=/);
  assert.match(content,/data-business-href=/);
  assert.ok(content.includes('/'+locale+'/explore/business'));
  assert.equal((content.match(/data-home-intent-option=/g)||[]).length,4);
 }
});

test('middleware preserves protected CSP and source App Router RSC path',()=>{
 const middleware=read('middleware.ts');
 assert.match(middleware,/instantHomeLocale\(/);
 assert.match(middleware,/NextResponse\.rewrite\(new URL\('\/instant-home\/'/);
 assert.ok(middleware.indexOf('if (fastLocale)') < middleware.indexOf('const authCookieChanges = await refreshAdminAuth(request)'));
 assert.match(middleware,/script-src 'self'/);
 assert.match(middleware,/fastRequestHeaders\.set\('Content-Security-Policy', fastCsp\)/);
 assert.ok(middleware.includes('request: { headers: fastRequestHeaders }'));
 assert.match(middleware,/response\.headers\.set\('Content-Security-Policy', fastCsp\)/);
 assert.match(middleware,/frame-ancestors 'none'/);
 assert.match(middleware,/nonce-\$\{nonce\}/);
 assert.match(middleware,/privatePath\(request\.nextUrl\.pathname\)/);
});

test('React full mode survives the Russian language redirect without static fallback',()=>{
 const route=read('app/page.tsx');
 assert.match(route,/const \{ lang, full \} = await searchParams/);
 assert.match(route,/requestedFull === "1" \? "\?full=1" : ""/);
 // Existing locale routes still handle Next React requests normally.
 const policy=read('lib/instant-home-policy.mjs');
 assert.match(policy,/searchParams\?\.get\("full"\)==="1"/);
});

test('IA smoke test keeps full React Home while CDN Home has independent browser checks',()=>{
 const ia=read('scripts/verify-ia-v2.mjs');
 assert.match(ia,/go\(page, '\/\?full=1'\)/);
 assert.match(ia,/locale === 'es' \? '\/es' : '\/\?full=1&lang='/);
});
