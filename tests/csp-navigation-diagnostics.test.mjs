import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCspNavigationCancellation, traverseCspHistory } from '../scripts/csp-navigation-diagnostics.mjs';
const origin = 'http://127.0.0.1:3123';
const lifecycle = [
  { type: 'init', time: 1, documentProbe: 'old', url: origin + '/en/about' },
  { type: 'navigate', time: 100, documentProbe: 'old', sameDocument: false, destination: origin + '/en/academy/reiki/tantra-reiki' },
  { type: 'pagehide', time: 140, documentProbe: 'old' },
  { type: 'init', time: 150, documentProbe: 'new', url: origin + '/en/academy/reiki/tantra-reiki' },
];
const detail = { engine: 'webkit', readiness: 'rapid-history', origin, lifecycle };
const diagnostic = (url = origin + '/?_rsc=probe', time = 125) => ({ time, stack: `Fetch API cannot load ${url} due to access control checks.\n    at fetch` });
test('only the exact old-document teardown diagnostic has a bounded classification', () => {
  assert.equal(classifyCspNavigationCancellation(diagnostic(), detail)?.kind, 'webkit-hard-navigation-fetch-cancellation');
  const privateLife = lifecycle.map(event => event.type === 'init' && event.documentProbe === 'old' ? { ...event, url: origin + '/en/client' } : event);
  assert.ok(classifyCspNavigationCancellation(diagnostic(origin + '/api/app/guest/bootstrap'), { ...detail, lifecycle: privateLife }));
});
test('stable/new documents, other engines, and loaded journeys keep identical messages fatal', () => {
  for (const variant of [
    { ...detail, lifecycle: [lifecycle[0]] },
    { ...detail, lifecycle: lifecycle.filter(event => event.type !== 'pagehide') },
    { ...detail, engine: 'chromium' },
    { ...detail, readiness: 'loaded-history' },
    { ...detail, lifecycle: lifecycle.map(event => event.type === 'navigate' ? { ...event, sameDocument: true } : event) },
    { ...detail, lifecycle: lifecycle.map(event => event.type === 'init' ? { ...event, documentProbe: 'old' } : event) },
  ]) assert.equal(classifyCspNavigationCancellation(diagnostic(), variant), null);
  for (const time of [10, 99, 141, 150, 151]) assert.equal(classifyCspNavigationCancellation(diagnostic(undefined, time), detail), null);
});
test('unknown endpoints, origins, queries, ordinary throws and uncaught rejections remain fatal', () => {
  for (const url of [origin + '/api/app/unknown', origin + '/api/admin/private', origin + '/api/app/guest/bootstrap?new=1', origin + '/', origin + '/?_rsc=x&other=y', 'https://elsewhere.test/?_rsc=x']) {
    assert.equal(classifyCspNavigationCancellation(diagnostic(url), detail), null);
  }
  assert.equal(classifyCspNavigationCancellation({ time: 125, stack: 'Error: ordinary failure' }, detail), null);
  for (const type of ['window-error', 'unhandled-rejection']) {
    assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...detail, lifecycle: [...lifecycle, { type, time: 125 }] }), null);
  }
});

test('client homepage RSC cancellation requires the exact private-to-About history boundary', () => {
  const privateLife = lifecycle.map(event => {
    if (event.type === 'init' && event.documentProbe === 'old') return { ...event, url: origin + '/en/client' };
    if (event.type === 'navigate') return { ...event, documentClass: 'private', navigationType: 'traverse', destination: origin + '/en/about' };
    if (event.type === 'init' && event.documentProbe === 'new') return { ...event, url: origin + '/en/about' };
    return event;
  });
  const privateDetail = { ...detail, lifecycle: privateLife };
  assert.ok(classifyCspNavigationCancellation(diagnostic(), privateDetail));
  for (const change of [
    { documentClass: 'public-video' }, { navigationType: 'push' },
    { destination: origin + '/en/services' }, { sameDocument: true },
  ]) assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...privateDetail, lifecycle: privateLife.map(event => event.type === 'navigate' ? { ...event, ...change } : event) }), null);
  for (const source of ['/en/about-other', '/ru/client', '/en/client?unexpected=1']) {
    assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...privateDetail, lifecycle: privateLife.map(event => event.type === 'init' && event.documentProbe === 'old' ? { ...event, url: origin + source } : event) }), null);
  }
  for (const url of [origin + '/en/services/free-situation-review?_rsc=x', origin + '/api/app/unknown', origin + '/?_rsc=x&other=y', 'https://elsewhere.test/?_rsc=x']) {
    assert.equal(classifyCspNavigationCancellation(diagnostic(url), privateDetail), null);
  }
  for (const time of [99, 141, 150, 151]) assert.equal(classifyCspNavigationCancellation(diagnostic(undefined, time), privateDetail), null);
  for (const type of ['window-error', 'unhandled-rejection']) assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...privateDetail, lifecycle: [...privateLife, { type, time: 125 }] }), null);
  for (const type of ['navigate', 'pagehide']) assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...privateDetail, lifecycle: privateLife.filter(event => event.type !== type) }), null);
  for (const override of [{ engine: 'chromium' }, { readiness: 'loaded-history' }]) assert.equal(classifyCspNavigationCancellation(diagnostic(), { ...privateDetail, ...override }), null);
  assert.equal(classifyCspNavigationCancellation({ time: 125, stack: 'Refused to connect because it violates Content Security Policy' }, privateDetail), null);
});


test('About client-link prefetch teardown requires the observed Back-to-home replacement', () => {
  const homeLife = [
    { type: 'init', time: 1, documentProbe: 'old', url: origin + '/en/about' },
    { type: 'navigate', time: 95, documentProbe: 'old', url: origin + '/en/about', documentClass: 'public-video', sameDocument: true, navigationType: 'traverse', destination: origin + '/' },
    { type: 'navigate', time: 100, documentProbe: 'old', documentClass: 'public-video', sameDocument: false, navigationType: 'replace', destination: origin + '/' },
    { type: 'pagehide', time: 140, documentProbe: 'old' },
    { type: 'init', time: 150, documentProbe: 'new', url: origin + '/' },
  ];
  const info = { ...detail, lifecycle: homeLife };
  const scopedDiagnostic = (url) => ({...diagnostic(url), phase:'back-to-public-home'});
  const error = scopedDiagnostic(origin + '/en/client?_rsc=probe');
  assert.ok(classifyCspNavigationCancellation(error, info));
  assert.ok(classifyCspNavigationCancellation(scopedDiagnostic(origin + '/en/contact?_rsc=probe'), info));
  assert.equal(classifyCspNavigationCancellation({...error,phase:'initial'},info),null);
  for (const [index, change] of [
    [0, {url: origin + '/en/about?other=1'}], [0, {url: origin + '/en/services'}],
    [1, {sameDocument: false}], [1, {navigationType: 'push'}], [1, {time: 101}],
    [1, {documentProbe: 'other'}], [1, {destination: origin + '/en/services'}],
    [1, {documentClass: 'private'}], [1, {url: origin + '/'}],
    [2, {sameDocument: true}], [2, {navigationType: 'traverse'}],
    [2, {documentClass: 'private'}], [2, {destination: origin + '/en/about'}],
    [4, {url: origin + '/en/about'}], [4, {documentProbe: 'old'}],
  ]) assert.equal(classifyCspNavigationCancellation(error, {...info, lifecycle:homeLife.map((e,i)=>i===index?{...e,...change}:e)}), null);
  for (const index of [1,2,3,4]) assert.equal(classifyCspNavigationCancellation(error,{...info,lifecycle:homeLife.filter((_,i)=>i!==index)}),null);
  for (const path of ['/en/client','/en/client?_rsc=x&other=y','/en/contact?_rsc=x&other=y','/ru/contact?_rsc=x','/ru/client?_rsc=x','/api/client?_rsc=x','/en/client?_rsc=']) assert.equal(classifyCspNavigationCancellation(scopedDiagnostic(origin+path),info),null);
  assert.equal(classifyCspNavigationCancellation(scopedDiagnostic('https://elsewhere.test/en/client?_rsc=x'),info),null);
  for (const time of [99,141,150,151]) assert.equal(classifyCspNavigationCancellation({...error,time},info),null);
  for (const type of ['window-error','unhandled-rejection']) assert.equal(classifyCspNavigationCancellation(error,{...info,lifecycle:[...homeLife,{type,time:125}]}),null);
  for (const override of [{engine:'chromium'},{readiness:'loaded-history'}]) assert.equal(classifyCspNavigationCancellation(error,{...info,...override}),null);
});

test('Tantra prefetch teardown requires the observed Back-to-About replacement', () => {
  const tantra = origin + '/en/academy/reiki/tantra-reiki', about = origin + '/en/about';
  const trace = [
    {type:'init',time:1,documentProbe:'tantra',url:tantra},
    {type:'navigate',time:95,documentProbe:'tantra',url:tantra,documentClass:'tantra-media',sameDocument:true,navigationType:'traverse',destination:about},
    {type:'navigate',time:100,documentProbe:'tantra',url:tantra,documentClass:'tantra-media',sameDocument:false,navigationType:'replace',destination:about},
    {type:'pagehide',time:140,documentProbe:'tantra'},
    {type:'init',time:150,documentProbe:'about',url:about},
  ];
  const info = {...detail,lifecycle:trace};
  const err = path => ({...diagnostic(origin+path),phase:'back-from-tantra'});
  for (const path of ['/?_rsc=probe','/en/academy?_rsc=probe','/en/academy/principles-of-energywork/learn?_rsc=probe','/en/client/tests?focus=tantra&_rsc=probe'])
    assert.ok(classifyCspNavigationCancellation(err(path),info),path);
  for (const path of ['/en/academy?_rsc=probe&other=1','/en/client/tests?focus=other&_rsc=probe','/en/client/tests?focus=tantra&_rsc=probe&other=1','/en/contact?_rsc=probe'])
    assert.equal(classifyCspNavigationCancellation(err(path),info),null,path);
  for (const change of [{phase:'initial'},{time:141},{time:150}])
    assert.equal(classifyCspNavigationCancellation({...err('/?_rsc=probe'),...change},info),null);
  for (const index of [0,1,2,3,4])
    assert.equal(classifyCspNavigationCancellation(err('/?_rsc=probe'),{...info,lifecycle:trace.filter((_,i)=>i!==index)}),null);
});

for (const [phase, destination, otherPhase] of [
  ['forward-to-public', '/en/about', 'back-to-private'],
  ['back-to-private', '/en/client', 'forward-to-public'],
]) test(`home free-review prefetch teardown requires exact ${phase} boundary`, () => {
  const homeLife = [
    { type: 'init', time: 1, documentProbe: 'home', url: origin + '/' },
    { type: 'navigate', time: 100, documentProbe: 'home', documentClass: 'public-video', sameDocument: false, navigationType: 'traverse', destination: origin + destination },
    { type: 'pagehide', time: 140, documentProbe: 'home' },
    { type: 'init', time: 150, documentProbe: 'destination', url: origin + destination },
  ];
  const info = { ...detail, lifecycle: homeLife };
  const error = { ...diagnostic(origin + '/en/services/free-situation-review?_rsc=probe'), phase };
  assert.equal(classifyCspNavigationCancellation(error, info)?.kind, 'webkit-hard-navigation-fetch-cancellation');
  for (const wrongPhase of [undefined, 'initial', 'back-to-public-home', 'forward-to-public-home', otherPhase]) assert.equal(classifyCspNavigationCancellation({ ...error, phase: wrongPhase }, info), null);
  for (const [index, change] of [
    [0, { url: origin + '/?unexpected=1' }], [0, { url: origin + '/en/services' }],
    [0, { url: 'https://elsewhere.test/' }], [0, { documentProbe: 'unrelated' }],
    [1, { sameDocument: true }], [1, { documentClass: 'private' }],
    [1, { navigationType: 'replace' }], [1, { navigationType: 'push' }],
    [1, { destination: origin + '/en/services' }], [1, { destination: origin + '/en/about?other=1' }],
    [2, { documentProbe: 'unrelated' }], [2, { time: 99 }], [2, { time: 151 }],
    [3, { documentProbe: 'home' }], [3, { url: origin + '/' }], [3, { time: 99 }],
  ]) assert.equal(classifyCspNavigationCancellation(error, { ...info, lifecycle: homeLife.map((event, i) => i === index ? { ...event, ...change } : event) }), null);
  for (const index of [0, 1, 2, 3]) assert.equal(classifyCspNavigationCancellation(error, { ...info, lifecycle: homeLife.filter((_, i) => i !== index) }), null);
  for (const path of ['/?_rsc=x', '/en/client?_rsc=x', '/api/app/guest/bootstrap', '/en/services/free-situation-review', '/en/services/free-situation-review?_rsc=', '/en/services/free-situation-review?_rsc=x&other=y', '/en/services/free-situation-review?_rsc=x&_rsc=y', '/ru/services/free-situation-review?_rsc=x']) {
    assert.equal(classifyCspNavigationCancellation({ ...diagnostic(origin + path), phase: error.phase }, info), null);
  }
  assert.equal(classifyCspNavigationCancellation({ ...diagnostic('https://elsewhere.test/en/services/free-situation-review?_rsc=x'), phase: error.phase }, info), null);
  for (const time of [99, 141, 150, 151]) assert.equal(classifyCspNavigationCancellation({ ...error, time }, info), null);
  for (const type of ['window-error', 'unhandled-rejection']) assert.equal(classifyCspNavigationCancellation(error, { ...info, lifecycle: [...homeLife, { type, time: 125 }] }), null);
  for (const override of [{ engine: 'chromium' }, { readiness: 'loaded-history' }]) assert.equal(classifyCspNavigationCancellation(error, { ...info, ...override }), null);
  for (const stack of ['Error: ordinary failure', 'Refused to connect because it violates Content Security Policy']) assert.equal(classifyCspNavigationCancellation({ ...error, stack }, info), null);
});

test('WebKit rapid About-to-Tantra forward requires real old-document RSC provenance', () => {
  const about = origin + '/en/about';
  const tantra = origin + '/en/academy/reiki/tantra-reiki';
  const forwardLife = [
    { type:'init', time:1, documentProbe:'about', url:about },
    { type:'navigate', time:95, documentProbe:'about', url:about, documentClass:'public-video', sameDocument:true, navigationType:'traverse', destination:tantra },
    { type:'navigate', time:100, documentProbe:'about', url:tantra, documentClass:'public-video', sameDocument:false, navigationType:'replace', destination:tantra },
    { type:'init', time:150, documentProbe:'tantra', url:tantra },
    { type:'domcontentloaded', time:160, documentProbe:'tantra', url:tantra, documentClass:'tantra-media' },
  ];
  const seenFetch=[{ type:'fetch-start', path:'/', rsc:true, documentProbe:'about', time:121 }];
  const err={ ...diagnostic(origin+'/?_rsc=probe', 125), phase:'forward-to-tantra' };
  const info={ ...detail, lifecycle:forwardLife, fetchTelemetry:seenFetch };
  assert.equal(classifyCspNavigationCancellation(err,info)?.kind, 'webkit-traced-forward-rsc-teardown');
  for (const change of [
    { fetchTelemetry:[] },
    { fetchTelemetry:[{...seenFetch[0],documentProbe:'other'}] },
    { fetchTelemetry:[{...seenFetch[0],time:99}] },
    { fetchTelemetry:[{...seenFetch[0],path:'/en/client'}] },
    { fetchTelemetry:[{...seenFetch[0],rsc:false}] },
    { lifecycle:forwardLife.filter(x=>x.type!=='domcontentloaded') },
    { lifecycle:forwardLife.filter(x=>!(x.type==='navigate' && x.sameDocument)) },
    { lifecycle:forwardLife.map(x=>x.type==='init' && x.documentProbe==='tantra'?{...x,url:about}:x) },
    { lifecycle:forwardLife.map(x=>x.type==='navigate' && !x.sameDocument?{...x,documentClass:'private'}:x) },
    { lifecycle:[...forwardLife,{type:'policy-violation',documentProbe:'about',time:122}] },
    { readiness:'loaded-history' },
    { engine:'chromium' },
  ]) assert.equal(classifyCspNavigationCancellation(err,{...info,...change}),null,
    'Missing independent source, policy or navigation proof must remain fatal');
  for (const change of [
    {phase:'initial'}, {phase:'back-from-tantra'}, {time:99}, {time:150},
    {stack:'Error: genuine CSP violation'},
    {stack:'Fetch API cannot load https://other.test/?_rsc=probe due to access control checks.'},
  ]) assert.equal(classifyCspNavigationCancellation({...err,...change},info),null);
});

test('Telegram anonymous GET is allowed ONLY when exact old Tantra document abort is proven', () => {
  const url = origin + '/api/public/telegram-diagnostic';
  const tantra = origin + '/en/academy/reiki/tantra-reiki';
  const about = origin + '/en/about';
  const trace = [
    {type:'init',time:1,documentProbe:'tantra',url:tantra},
    {type:'navigate',time:95,documentProbe:'tantra',url:tantra,documentClass:'tantra-media',sameDocument:true,navigationType:'traverse',destination:about},
    {type:'navigate',time:100,documentProbe:'tantra',url:about,documentClass:'tantra-media',sameDocument:false,navigationType:'replace',destination:about},
    {type:'pagehide',time:110,documentProbe:'tantra'},
    {type:'init',time:125,documentProbe:'about',url:about},
  ];
  const fetch=[{type:'fetch-start',path:'/api/public/telegram-diagnostic',rsc:false,documentProbe:'tantra',time:102}];
  const err={...diagnostic(url,105),phase:'back-from-tantra'};
  const info={...detail,lifecycle:trace,fetchTelemetry:fetch};
  assert.equal(classifyCspNavigationCancellation(err,info)?.kind,'webkit-hard-navigation-fetch-cancellation');
  for(const variant of [
    {...info,fetchTelemetry:[]},
    {...info,fetchTelemetry:[{...fetch[0],documentProbe:'about'}]},
    {...info,fetchTelemetry:[{...fetch[0],path:'/api/app/guest/bootstrap'}]},
    {...info,fetchTelemetry:[{...fetch[0],time:106}]},
    {...info,lifecycle:trace.filter(event=>event.type!=='pagehide')},
    {...info,lifecycle:[...trace,{type:'policy-violation',documentProbe:'tantra',time:104}]},
    {...info,readiness:'loaded-history'}, {...info,engine:'chromium'},
    {...info,lifecycle:trace.map(e=>e.type==='navigate'&&!e.sameDocument?{...e,navigationType:'push'}:e)},
  ]) assert.equal(classifyCspNavigationCancellation(err,variant),null);
  for(const wrong of [url+'?token=secret',url+'?_rsc=x','https://elsewhere.test/api/public/telegram-diagnostic'])
    assert.equal(classifyCspNavigationCancellation({...err,stack:diagnostic(wrong,105).stack},info),null);
  for(const time of [99,110,125])
    assert.equal(classifyCspNavigationCancellation({...err,time},info),null);
});

test('WebKit late Telegram teardown needs verified fetch and <=10ms post-pagehide evidence',()=>{
  // Run #43669083441: old document pagehide=8666, second error=8667, new init=8711.
  const tantra=origin+'/en/academy/reiki/tantra-reiki',about=origin+'/en/about';
  const trace=[
    {type:'init',time:1000,documentProbe:'tantra',url:tantra},
    {type:'navigate',time:1195,documentProbe:'tantra',url:tantra,documentClass:'tantra-media',sameDocument:true,navigationType:'traverse',destination:about},
    {type:'navigate',time:1200,documentProbe:'tantra',url:about,documentClass:'tantra-media',sameDocument:false,navigationType:'replace',destination:about},
    {type:'pagehide',time:1400,documentProbe:'tantra'},
    {type:'init',time:1445,documentProbe:'about',url:about},
  ];
  const seen=[{type:'fetch-start',path:'/api/public/telegram-diagnostic',rsc:false,documentProbe:'tantra',time:1392}];
  const err={...diagnostic(origin+'/api/public/telegram-diagnostic',1401),phase:'back-from-tantra'};
  const info={...detail,lifecycle:trace,fetchTelemetry:seen};
  assert.equal(classifyCspNavigationCancellation(err,info)?.kind,'webkit-traced-telegram-post-pagehide');
  for(const override of [
    {engine:'chromium'},{readiness:'loaded-history'},{fetchTelemetry:[]},
    {fetchTelemetry:[{...seen[0],documentProbe:'other'}]},
    {fetchTelemetry:[{...seen[0],time:1199}]},
    {fetchTelemetry:[{...seen[0],time:1401}]},
    {fetchTelemetry:[{...seen[0],path:'/api/admin/private'}]},
    {lifecycle:trace.filter(e=>e.type!=='pagehide')},
    {lifecycle:trace.filter(e=>e.type!=='navigate'||e.sameDocument)},
    {lifecycle:trace.filter(e=>e.type!=='init'||e.documentProbe!=='about')},
    {lifecycle:[...trace,{type:'policy-violation',documentProbe:'tantra',time:1400}]},
    {lifecycle:[...trace,{type:'window-error',documentProbe:'tantra',time:1400}]},
    {lifecycle:trace.map(e=>e.type==='init'&&e.documentProbe==='tantra'?{...e,url:about}:e)},
    {lifecycle:trace.map(e=>e.type==='init'&&e.documentProbe==='about'?{...e,time:1401}:e)},
  ]) assert.equal(classifyCspNavigationCancellation(err,{...info,...override}),null);
  for(const time of [1199,1400,1411,1445,1500])
    assert.equal(classifyCspNavigationCancellation({...err,time},info),null,'time '+time);
  for(const url of [origin+'/api/public/telegram-diagnostic?x=1',origin+'/api/admin/private','https://other.test/api/public/telegram-diagnostic'])
    assert.equal(classifyCspNavigationCancellation({...err,stack:diagnostic(url,1401).stack},info),null);
  assert.equal(classifyCspNavigationCancellation({...err,phase:'initial'},info),null);
});

test('WebKit rapid Forward from Tests to home needs exact old RSC fetch provenance', () => {
  // Run 43722642549 / 390px: navigate 5924, fetch 5947, diagnostic 5953,
  // pagehide 5990 and next home document 6002 (relative times below).
  const old=origin+'/en/client/tests', home=origin+'/';
  const life=[
    {type:'init',time:1000,documentProbe:'tests',url:old},
    {type:'navigate',time:1024,documentProbe:'tests',documentClass:'private',sameDocument:false,
      navigationType:'traverse',destination:home},
    {type:'pagehide',time:1090,documentProbe:'tests'},
    {type:'init',time:1102,documentProbe:'home',url:home},
  ];
  const fetches=[{type:'fetch-start',path:'/',rsc:true,documentProbe:'tests',time:1047}];
  const state={...detail,lifecycle:life,fetchTelemetry:fetches};
  const error={...diagnostic(home+'?_rsc=KDPtKEcIGJvAs2D9',1053),phase:'forward-to-public-home'};
  assert.equal(classifyCspNavigationCancellation(error,state)?.kind,'webkit-hard-navigation-fetch-cancellation');
  for (const phase of [undefined,'initial','back-to-public-home','forward-to-tantra'])
    assert.equal(classifyCspNavigationCancellation({...error,phase},state),null);
  for (const variant of [{engine:'chromium'},{readiness:'loaded-history'},
    {fetchTelemetry:[]},{fetchTelemetry:[{...fetches[0],path:'/api/private'}]},
    {fetchTelemetry:[{...fetches[0],rsc:false}]},
    {fetchTelemetry:[{...fetches[0],documentProbe:'other'}]},
    {fetchTelemetry:[{...fetches[0],time:1023}]},
    {fetchTelemetry:[{...fetches[0],time:1054}]},
    {lifecycle:life.filter(e=>e.type!=='pagehide')},
    {lifecycle:life.filter(e=>e.type!=='navigate')},
    {lifecycle:life.filter(e=>e.type!=='init'||e.documentProbe!=='home')},
    {lifecycle:[...life,{type:'policy-violation',documentProbe:'tests',time:1052}]},
    {lifecycle:[...life,{type:'window-error',documentProbe:'tests',time:1052}]},
    {lifecycle:life.map(e=>e.type==='init'&&e.documentProbe==='tests'?{...e,url:origin+'/en/client'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,navigationType:'push'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,documentClass:'public-video'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,sameDocument:true}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,destination:origin+'/en/about'}:e)},
    {lifecycle:life.map(e=>e.type==='pagehide'?{...e,time:1052}:e)},
    {lifecycle:life.map(e=>e.type==='init'&&e.documentProbe==='home'?{...e,url:origin+'/en/about'}:e)},
  ]) assert.equal(classifyCspNavigationCancellation(error,{...state,...variant}),null);
  for(const time of [1023,1090,1102,1150])
    assert.equal(classifyCspNavigationCancellation({...error,time},state),null,'time '+time);
  for(const url of [home,home+'?_rsc=',home+'?_rsc=x&other=1',
    origin+'/en/about?_rsc=x','https://other.test/?_rsc=x'])
    assert.equal(classifyCspNavigationCancellation({...error,stack:diagnostic(url,1053).stack},state),null,url);
});

test('English My Space metadata cancellation needs the exact old-home fetch plus proven WebKit About teardown',()=>{
  // Run 43742140905 / 390px: home init=3369, pageshow=3700,
  // navigate=3723, diagnostic=3869, pagehide=3872,
  // About init=3881, About DOMContentLoaded=4005.
  const home=origin+'/',about=origin+'/en/about';
  const life=[
    {type:'init',time:1000,documentProbe:'home',url:home},
    {type:'pageshow',time:1331,documentProbe:'home',documentClass:'public-video'},
    {type:'navigate',time:1354,documentProbe:'home',documentClass:'public-video',
      navigationType:'traverse',sameDocument:false,destination:about},
    {type:'pagehide',time:1503,documentProbe:'home'},
    {type:'init',time:1512,documentProbe:'about',url:about},
    {type:'domcontentloaded',time:1636,documentProbe:'about',documentClass:'public-video'},
  ];
  const fetches=[{type:'fetch-start',path:'/api/public/english-intro-video',
    rsc:false,documentProbe:'home',time:1338}];
  const state={...detail,lifecycle:life,fetchTelemetry:fetches};
  const diagnosticError={...diagnostic(origin+'/api/public/english-intro-video',1500),
    phase:'forward-to-public'};
  assert.equal(classifyCspNavigationCancellation(diagnosticError,state)?.kind,
    'webkit-traced-english-intro-teardown');
  for(const phase of [undefined,'initial','forward-to-tantra','forward-to-public-home','back-to-private']){
    assert.equal(classifyCspNavigationCancellation({...diagnosticError,phase},state),null);
  }
  for(const override of [{engine:'chromium'},{readiness:'loaded-history'},
    {fetchTelemetry:[]},{fetchTelemetry:[{...fetches[0],path:'/api/private'}]},
    {fetchTelemetry:[{...fetches[0],rsc:true}]},
    {fetchTelemetry:[{...fetches[0],documentProbe:'about'}]},
    {fetchTelemetry:[{...fetches[0],time:999}]},
    {fetchTelemetry:[{...fetches[0],time:1501}]},
    {lifecycle:life.filter(e=>e.type!=='pagehide')},
    {lifecycle:life.filter(e=>e.type!=='pageshow')},
    {lifecycle:life.filter(e=>e.type!=='domcontentloaded')},
    {lifecycle:life.filter(e=>e.type!=='navigate')},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,documentClass:'private'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,navigationType:'push'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,sameDocument:true}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,destination:origin+'/en/client'}:e)},
    {lifecycle:life.map(e=>e.type==='init'&&e.documentProbe==='home'?{...e,url:about}:e)},
    {lifecycle:life.map(e=>e.type==='pagehide'?{...e,time:1499}:e)},
    {lifecycle:life.map(e=>e.type==='init'&&e.documentProbe==='about'?{...e,time:1713}:e)},
    {lifecycle:[...life,{type:'policy-violation',documentProbe:'home',time:1498}]},
    {lifecycle:[...life,{type:'window-error',documentProbe:'home',time:1498}]},
  ]) assert.equal(classifyCspNavigationCancellation(diagnosticError,
    {...state,...override}),null,JSON.stringify(override));
  for(const ms of [1353,1450,1504,1512,1700]){
    assert.equal(classifyCspNavigationCancellation({...diagnosticError,time:ms},state),null,'time '+ms);
  }
  for(const url of ['/api/public/english-intro-video?session=private',
    '/api/public/english-intro-video?_rsc=foo',
    '/api/public/english-intro-video/other','/api/admin/private',
    '/api/public/telegram-diagnostic','/api/app/guest/bootstrap',
    '/en/about?_rsc=x','https://other.test/api/public/english-intro-video']){
    assert.equal(classifyCspNavigationCancellation({...diagnosticError,
      stack:diagnostic(url.startsWith('http')?url:origin+url,1500).stack},state),null,url);
  }
});

test('English My Space on Back-to-private requires observed old home GET and real private Tests document',()=>{
  const home=origin+'/',privateTests=origin+'/en/client/tests';
  const life=[
    {type:'init',time:1000,documentProbe:'home',url:home},
    {type:'pageshow',time:1331,documentProbe:'home',documentClass:'public-video'},
    {type:'navigate',time:1354,documentProbe:'home',documentClass:'public-video',
      sameDocument:false,navigationType:'traverse',destination:privateTests},
    {type:'pagehide',time:1503,documentProbe:'home'},
    {type:'init',time:1512,documentProbe:'private',url:privateTests},
    {type:'domcontentloaded',time:1636,documentProbe:'private',documentClass:'private'},
  ];
  const fetches=[{type:'fetch-start',path:'/api/public/english-intro-video',
    rsc:false,documentProbe:'home',time:1338}];
  const info={...detail,lifecycle:life,fetchTelemetry:fetches};
  const error={...diagnostic(origin+'/api/public/english-intro-video',1500),
    phase:'back-to-private'};
  assert.equal(classifyCspNavigationCancellation(error,info)?.kind,'webkit-traced-english-intro-teardown');
  for(const overrides of [
    {engine:'chromium'},{readiness:'loaded-history'},{fetchTelemetry:[]},
    {fetchTelemetry:[{...fetches[0],path:'/api/private'}]},
    {fetchTelemetry:[{...fetches[0],rsc:true}]},
    {fetchTelemetry:[{...fetches[0],documentProbe:'private'}]},
    {fetchTelemetry:[{...fetches[0],time:1501}]},
    {lifecycle:life.filter(e=>e.type!=='pageshow')},
    {lifecycle:life.filter(e=>e.type!=='pagehide')},
    {lifecycle:life.filter(e=>e.type!=='domcontentloaded')},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,documentClass:'private'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,navigationType:'push'}:e)},
    {lifecycle:life.map(e=>e.type==='navigate'?{...e,destination:origin+'/en/about'}:e)},
    {lifecycle:life.map(e=>e.type==='init'&&e.documentProbe==='home'?{...e,url:origin+'/en/about'}:e)},
    {lifecycle:life.map(e=>e.type==='domcontentloaded'?{...e,documentClass:'public-video'}:e)},
    {lifecycle:[...life,{type:'policy-violation',documentProbe:'home',time:1498}]},
    {lifecycle:[...life,{type:'unhandled-rejection',documentProbe:'home',time:1498}]},
  ])assert.equal(classifyCspNavigationCancellation(error,{...info,...overrides}),null,
    'Only proven old-home teardown may be classified');
  for(const change of [
    {phase:'forward-to-public'},{time:1353},{time:1450},{time:1504},
    {stack:diagnostic(origin+'/api/public/english-intro-video?secret=bad',1500).stack},
    {stack:diagnostic('https://other.test/api/public/english-intro-video',1500).stack},
  ])assert.equal(classifyCspNavigationCancellation({...error,...change},info),null);
});


test('rapid native history waiter cancellation requires independently proven arrival and never repeats traversal', async () => {
  for (const [engine, direction, method, reason] of [
    ['webkit','forward','goForward','Load request cancelled'],
    ['chromium','back','goBack','net::ERR_ABORTED'],
  ]) {
    let calls = 0, proofs = 0; const evidence = [];
    const err = new Error('page.' + method + ': ' + reason + '; maybe frame was detached?\nCall log:');
    const page = { isClosed: () => false, [method]: async options => { calls++; assert.equal(options.waitUntil,'domcontentloaded'); throw err; } };
    const opts = { page, direction, engine, readiness:'rapid-history', verifyArrival:async()=>{ proofs++; }, onCancellation:record=>evidence.push(record) };
    await traverseCspHistory(opts);
    assert.equal(calls,1); assert.equal(proofs,1); assert.equal(evidence.length,1);
    assert.equal(evidence[0].method,method);
    await assert.rejects(traverseCspHistory({...opts,verifyArrival:async()=>{throw new Error('wrong destination');}}), /wrong destination/);
    assert.equal(calls,2); assert.equal(evidence.length,1);
    await assert.rejects(traverseCspHistory({...opts,readiness:'loaded-history'}), e=>e===err);
    await assert.rejects(traverseCspHistory({...opts,engine:'firefox'}), e=>e===err);
    await assert.rejects(traverseCspHistory({...opts,page:{...page,isClosed:()=>true}}), e=>e===err);
    await assert.rejects(traverseCspHistory({...opts,page:{...page,[method]:async()=>{throw new Error('Timeout 30000ms exceeded');}}}), /Timeout/);
    assert.equal(evidence.length,1);
  }
});
