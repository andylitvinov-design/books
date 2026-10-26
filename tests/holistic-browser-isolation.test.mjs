import test from 'node:test';
import assert from 'node:assert/strict';
import {permittedHolisticRead, permittedHolisticHomePrefetch, createHolisticBrowserIsolation} from '../scripts/helpers/holistic-browser-isolation.mjs';
import {readFileSync} from 'node:fs';

const origin='http://127.0.0.1:3100';
const request=(url,method='GET',type='document',headers={})=>({url:()=>url,method:()=>method,resourceType:()=>type,headers:()=>headers});

test('exact public document/RSC profile permits only the native four-route Holistic journeys',()=>{
  for(const locale of ['en','ru','es']) for(const path of ['/holistic-support','/services/remote-energy-support','/services/free-consultation','/pro']) {
    const url=origin+'/'+locale+path;
    assert.equal(permittedHolisticRead(request(url),origin,locale),true,url);
    assert.equal(permittedHolisticRead(request(url+'?_rsc=abc-123','GET','fetch',{rsc:'1'}),origin,locale),true,url);
    for(const bad of [request(url+'?'),request(url+'?goal=private'),request(url+'#private'),request(url,'POST'),
      request(url,'GET','fetch'),request(url+'?_rsc=x','GET','fetch'),request(url+'?_rsc=x&_rsc=y','GET','fetch',{rsc:'1'}),
      request(url+'?_rsc=x&goal=private','GET','fetch',{rsc:'1'}),request(url+'?_rsc=x','POST','fetch',{rsc:'1'}),
      request(url+'/'),request(url.replace('http:','https:')),request(url.replace('127.0.0.1','example.test'))]) {
      assert.equal(permittedHolisticRead(bad,origin,locale),false,bad.url());
    }
  }
  for(const path of ['/api/holistic-support/talismans','/api/client','/en/app','/en/client','/en/admin','/en/services/other','/ru/holistic-support'])
    assert.equal(permittedHolisticRead(request(origin+path),origin,'en'),false,path);
});

test('typed local production images/chunks/original audio cannot turn optimizer or same-origin GET into a tunnel',()=>{
  for(const [path,type] of [['/_next/static/chunks/app/%5Blocale%5D/page-abc.js','script'],
    ['/_next/static/css/abc.css','stylesheet'],['/_next/static/media/abc.woff2','font'],
    ['/images/holistic-house/hero-olive-incense.webp','image'],
    ['/_next/image?url=%2Fimages%2Fholistic-house%2Fhero-olive-incense.webp&w=640&q=75','image'],
    ['/audio/holistic-house-soft-melody-gentle-waves-96s.wav','media']]) {
    assert.equal(permittedHolisticRead(request(origin+path,'GET',type),origin,'en'),true,path);
    assert.equal(permittedHolisticRead(request(origin+path,'POST',type),origin,'en'),false,path);
    assert.equal(permittedHolisticRead(request(origin+path,'GET','fetch'),origin,'en'),false,path);
  }
  for(const [path,type] of [['/_next/image?url=https%3A%2F%2Fexample.test%2Fprivate&w=640&q=75','image'],
    ['/_next/image?url=%2Fapi%2Fclient&w=640&q=75','image'],
    ['/_next/image?url=%2Fimages%2Fa.png&w=640&q=75&q=10','image'],
    ['/_next/image?url=%2Fimages%2Fa.png&w=999999&q=75','image'],
    ['/_next/static/chunks/api.js?private=1','script'],['/images/a.svg?private=1','image'],
    ['/images/%2e%2e/private.png','image'],['/images/a.png','document'],
    ['/audio/other.wav','media'],['/api/client.svg','image'],['/any.js','script']]) {
    assert.equal(permittedHolisticRead(request(origin+path,'GET',type),origin,'en'),false,path);
  }
});

// Browser-shaped protocol stub only, not native browser evidence.
function stubBrowser() {
  const order=[], calls=[], responses=[]; let handler, onPage;
  const page={isClosed:()=>false,evaluate:async()=>0};
  const context={
    route:async(_,callback)=>{order.push('route');handler=callback;},
    routeWebSocket:async()=>{order.push('websocket');},
    exposeBinding:async()=>{order.push('binding');},addInitScript:async()=>{order.push('init');},
    on:(_,callback)=>{order.push('page-listener');onPage=callback;},
    newPage:async()=>{order.push('new-page');onPage(page);return page;},close:async()=>{order.push('close');},
  };
  return {order,calls,responses,browser:{newContext:async options=>{calls.push(options);return context;}},
    route:async request=>{
      const result={request:()=>request,abort:async()=>{responses.push({abort:true});},
        fetch:async options=>{assert.deepEqual(options,{maxRedirects:0});responses.push({fetch:true});
          return {url:()=>request.url(),status:()=>200,dispose:async()=>{responses.push({dispose:true});}};},
        fulfill:async value=>{responses.push(value);}};
      await handler(result);
    },
  };
}

test('Holistic wrapper installs mobile context-first isolation and exact synthetic anonymous401 without any API transport',async()=>{
  const stub=stubBrowser();
  const guard=await createHolisticBrowserIsolation(stub.browser,{origin,locale:'en',viewport:{width:320,height:568}});
  assert.deepEqual(stub.calls,[{deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce',viewport:{width:320,height:568},serviceWorkers:'block'}]);
  assert.deepEqual(stub.order,['route','websocket','binding','init','page-listener','new-page']);
  await stub.route(request(origin+'/api/holistic-support/talismans','GET','fetch'));
  assert.equal(stub.responses.length,1);
  assert.equal(stub.responses[0].status,401);
  assert.equal(stub.responses[0].body,'{"error":"SIGN_IN_REQUIRED"}');
  assert.equal(guard.summary().anonymousTalismansReads,1);
  await stub.route(request(origin+'/en/holistic-support'));
  assert.equal(stub.responses.filter(value=>value.fetch).length,1);
  assert.equal(stub.responses.filter(value=>value.dispose).length,1);
  await guard.assertClean(); await guard.close();
});

test('synthetic gallery cannot authorize query variants, writes, other API, foreign reads or popup document API',async()=>{
  const url=origin+'/api/holistic-support/talismans';
  for(const bad of [request(url,'POST','fetch'),request(url,'DELETE','fetch'),request(url,'HEAD','fetch'),
    request(url,'GET','document'),request(url+'?id=x','GET','fetch'),request(url+'/','GET','fetch'),
    request(url.replace('127.0.0.1','example.test'),'GET','fetch'),request(origin+'/api/other','GET','fetch')]) {
    const stub=stubBrowser();
    const guard=await createHolisticBrowserIsolation(stub.browser,{origin,locale:'en',viewport:{width:390,height:844}});
    await stub.route(bad);
    assert.deepEqual(stub.responses,[{abort:true}],bad.url());
    assert.equal(guard.summary().anonymousTalismansReads,0);
    await assert.rejects(guard.assertClean);
    await assert.rejects(guard.close);
  }
});

const homePrefetchHeaders = {rsc:'1','next-router-prefetch':'1'};
test('separate Home prefetch profile permits only authored EN/RU root fetches and never changes four-route default',()=>{
  for(const locale of ['en','ru'])for(const token of ['a','_-9','a'.repeat(64)]){
    const req=request(origin+'/?_rsc='+token,'GET','fetch',homePrefetchHeaders);
    assert.equal(permittedHolisticHomePrefetch(req,origin,locale),true);
    assert.equal(permittedHolisticRead(req,origin,locale),false,'Default four-route profile still denies root');
  }
  for(const locale of ['es','de','',undefined])
    assert.equal(permittedHolisticHomePrefetch(request(origin+'/?_rsc=x','GET','fetch',homePrefetchHeaders),origin,locale),false);
});

test('Home prefetch rejects document/HEAD/nonprefetch/unknown-query/foreign/private/API/write variants',()=>{
  const valid=origin+'/?_rsc=x';
  const denied=[
    request(origin),request(valid,'GET','document',homePrefetchHeaders),
    ...['HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].map(method=>request(valid,method,'fetch',homePrefetchHeaders)),
    ...['xhr','image','script','stylesheet','font','media','other'].map(type=>request(valid,'GET',type,homePrefetchHeaders)),
    ...[{}, {rsc:'1'}, {'next-router-prefetch':'1'}, {rsc:'0','next-router-prefetch':'1'},
      {rsc:'1','next-router-prefetch':'0'}, {rsc:'1',purpose:'prefetch'},
      {rsc:1,'next-router-prefetch':1}].map(headers=>request(valid,'GET','fetch',headers)),
    ...['/','/?','/?_rsc=','/?_rsc='+('a'.repeat(65)),'/?_rsc=bad%20value',
      '/?_rsc=bad%2Fvalue','/?_rsc=x&_rsc=y','/?_rsc=x&lang=ru','/?lang=ru&_rsc=x',
      '/?_rsc=x&private=synthetic','/?unknown=x','/?_rsc=x#private',
      '/ru?_rsc=x','/en?_rsc=x','/es?_rsc=x','/ru/pro?_rsc=x',
      '/ru/app?_rsc=x','/ru/client?_rsc=x','/api/client?_rsc=x','/%2f?_rsc=x',
      '/%5c?_rsc=x','//?_rsc=x'].map(path=>request(origin+path,'GET','fetch',homePrefetchHeaders)),
    request('https://127.0.0.1:3100/?_rsc=x','GET','fetch',homePrefetchHeaders),
    request('http://localhost:3100/?_rsc=x','GET','fetch',homePrefetchHeaders),
    request('http://127.0.0.1:3101/?_rsc=x','GET','fetch',homePrefetchHeaders),
    request('http://user:synthetic@127.0.0.1:3100/?_rsc=x','GET','fetch',homePrefetchHeaders),
    request('https://provider.invalid/?_rsc=x','GET','fetch',homePrefetchHeaders),
    request('not a URL','GET','fetch',homePrefetchHeaders),
  ];
  for(const [index,req]of denied.entries())
    assert.equal(permittedHolisticHomePrefetch(req,origin,'ru'),false,'denied synthetic variant '+index);
});

test('new anonymous branch rejects credential-header names without reading their values and leaves existing routes unchanged',()=>{
  for(const name of ['authorization','Authorization','AUTHORIZATION','proxy-authorization','Proxy-Authorization'])
    for(const enumerable of [true,false]){
      let valueReads=0;
      const headers={...homePrefetchHeaders};
      Object.defineProperty(headers,name,{enumerable,get(){valueReads++;throw Error('AUTH_VALUE_MUST_NOT_BE_READ');}});
      assert.equal(permittedHolisticHomePrefetch(request(origin+'/?_rsc=x','GET','fetch',headers),origin,'ru'),false);
      assert.equal(valueReads,0);
      assert.equal(permittedHolisticRead(request(origin+'/ru/pro?_rsc=x','GET','fetch',headers),origin,'ru'),true,
        'Existing four-route policy is not silently changed');
      assert.equal(valueReads,0);
    }
  for(const authorization of ['', 'synthetic'])
    assert.equal(permittedHolisticHomePrefetch(request(origin+'/?_rsc=x','GET','fetch',{...homePrefetchHeaders,authorization}),origin,'ru'),false);
});

test('locale cookie presence is not a cookie-free claim and no cookie value is inspected by Home predicate',()=>{
  let cookieReads=0;const headers={...homePrefetchHeaders};
  Object.defineProperty(headers,'cookie',{enumerable:true,get(){cookieReads++;throw Error('COOKIE_VALUE_MUST_NOT_BE_READ');}});
  assert.equal(permittedHolisticHomePrefetch(request(origin+'/?_rsc=x','GET','fetch',headers),origin,'ru'),true);
  assert.equal(cookieReads,0);
  assert.equal(permittedHolisticHomePrefetch({...request(origin+'/?_rsc=x','GET','fetch',headers),headers(){throw Error('METADATA_UNAVAILABLE');}},origin,'ru'),false);
});

test('opt-in is explicit boolean and defaults stay blocked with identical fresh anonymous mobile context options',async()=>{
  for(const selected of [undefined,false,true]){
    const stub=stubBrowser();
    const guard=await createHolisticBrowserIsolation(stub.browser,{origin,locale:'ru',viewport:{width:390,height:844},
      ...(selected===undefined?{}:{allowPublicHomePrefetch:selected})});
    await stub.route(request(origin+'/?_rsc=x','GET','fetch',homePrefetchHeaders));
    assert.deepEqual(stub.calls,[{deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce',viewport:{width:390,height:844},serviceWorkers:'block'}]);
    assert.equal(stub.responses.some(value=>value.fetch),selected===true);
    assert.equal(stub.responses.some(value=>value.abort),selected!==true);
    await guard.close();
  }
  for(const invalid of ['true',1,{},null]){
    const stub=stubBrowser();
    await assert.rejects(createHolisticBrowserIsolation(stub.browser,{origin,locale:'ru',viewport:{width:390,height:844},allowPublicHomePrefetch:invalid}),{code:'ERR_ASSERTION'});
    assert.equal(stub.calls.length,0,'Invalid opt-in never creates a context');
  }
});

test('only actual master verifier opts in; source-authored header remains unchanged and sibling callers retain defaults',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const master=read('scripts/verify-holistic-master-browser.mjs');
  assert.equal(master.split('allowPublicHomePrefetch:true').length,2);
  assert.match(master,/engine\.launch\(\{headless: true\}\)/);
  assert.match(master,/createHolisticBrowserIsolation\(browser, \{origin, locale, viewport:\{width, height:844\}, observeTransport:diagnostics\.observeTransport, allowPublicHomePrefetch:true\}\)/);
  assert.doesNotMatch(master,/storageState|httpCredentials|addCookies|setExtraHTTPHeaders/);
  for(const path of ['scripts/verify-holistic-support-browser.mjs','scripts/verify-holistic-topics-browser.mjs']){
    const source=read(path);assert.match(source,/createHolisticBrowserIsolation\(browser/);
    assert.doesNotMatch(source,/allowPublicHomePrefetch/);
  }
  const header=read('components/public-site-header.tsx');
  assert.match(header,/href=\{locale === "es" \? "\/es" : "\/"\}/);
  assert.doesNotMatch(header,/prefetch=/);
});

test('Home opt-in rejects reviewer raw normalization and encoded-query counterexamples literally',()=>{
  const normalizedPaths=['/./','/../','/%2e/','/%2e%2e/','/api/../','/api/%2E%2E/','/api\\..\\'];
  for(const path of normalizedPaths){
    const raw=origin+path+'?_rsc=x';
    assert.equal(new URL(raw).pathname,'/','Reviewer examples still have only the effective public root target');
    assert.equal(permittedHolisticHomePrefetch(request(raw,'GET','fetch',homePrefetchHeaders),origin,'ru'),false);
  }
  for(const tail of ['/?%5frsc=x','/?_r%73c=x','/?_rsc=%78','/?_rsc=ab%2Dcd','/?_rsc=ab%5Fcd',
    '/?_rsc=x&','/?_rsc=x&&','/?&_rsc=x','/?_rsc=x#','/?_rsc=x&#'])
    assert.equal(permittedHolisticHomePrefetch(request(origin+tail,'GET','fetch',homePrefetchHeaders),origin,'ru'),false,tail);
  for(const raw of [' '+origin+'/?_rsc=x',origin+'/?_rsc=x\n',origin.toUpperCase()+'/?_rsc=x'])
    assert.equal(permittedHolisticHomePrefetch(request(raw,'GET','fetch',homePrefetchHeaders),origin,'ru'),false);
});

test('Home opt-in accepts ordinary Playwright own-header maps only, with Object or null prototype',()=>{
  for(const prototype of [Object.prototype,null])for(const token of ['x','abc-123','_-9','a'.repeat(64)]){
    const headers=Object.assign(Object.create(prototype),homePrefetchHeaders,
      {accept:'*/*','next-url':'/ru/pro',cookie:'holistic_house_public_locale=ru'});
    const req=request(origin+'/?_rsc='+token,'GET','fetch',headers);
    assert.equal(permittedHolisticHomePrefetch(req,origin,'ru'),true);
    assert.equal(permittedHolisticRead(req,origin,'ru'),false);
  }
  let valueReads=0;
  const inherited=Object.create(Object.defineProperty({},'authorization',
    {get(){valueReads++;throw Error('CREDENTIAL_GETTER_MUST_NOT_RUN');}}));
  Object.assign(inherited,homePrefetchHeaders);
  const custom=Object.assign(Object.create({}),homePrefetchHeaders);
  const array=Object.assign([],homePrefetchHeaders);
  for(const headers of [inherited,custom,array,null,undefined])
    assert.equal(permittedHolisticHomePrefetch({...request(origin+'/?_rsc=x','GET','fetch'),headers:()=>headers},origin,'ru'),false);
  assert.equal(valueReads,0);
});

test('literal opt-in denial occurs before reading request header metadata',()=>{
  let headerReads=0;
  for(const tail of ['/api/../?_rsc=x','/api\\..\\?_rsc=x','/?_rsc=%78','/?%5frsc=x','/?_rsc=x&','/?_rsc=x#']){
    const req={...request(origin+tail,'GET','fetch'),headers(){headerReads++;throw Error('UNNECESSARY_HEADER_READ');}};
    assert.equal(permittedHolisticHomePrefetch(req,origin,'ru'),false);
  }
  assert.equal(headerReads,0);
});
