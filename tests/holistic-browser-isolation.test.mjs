import test from 'node:test';
import assert from 'node:assert/strict';
import {permittedHolisticRead, createHolisticBrowserIsolation} from '../scripts/helpers/holistic-browser-isolation.mjs';

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
