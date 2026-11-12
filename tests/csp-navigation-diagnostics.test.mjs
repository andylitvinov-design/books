import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCspNavigationCancellation } from '../scripts/csp-navigation-diagnostics.mjs';
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

test('exact Telegram public-readiness fetch aborted only during proven WebKit Tantra Back teardown', () => {
  const tantra = origin + '/en/academy/reiki/tantra-reiki';
  const about = origin + '/en/about';
  const trace = [
    {type:'init',time:1,documentProbe:'tantra',url:tantra},
    {type:'navigate',time:95,documentProbe:'tantra',url:tantra,documentClass:'tantra-media',sameDocument:true,navigationType:'traverse',destination:about},
    {type:'navigate',time:100,documentProbe:'tantra',url:about,documentClass:'tantra-media',sameDocument:false,navigationType:'replace',destination:about},
    {type:'pagehide',time:140,documentProbe:'tantra'},
    {type:'init',time:150,documentProbe:'about',url:about},
  ];
  const info={...detail,lifecycle:trace,fetchTelemetry:[{type:'fetch-start',path:'/api/public/telegram-diagnostic',rsc:false,documentProbe:'tantra',time:105}]};
  const error={...diagnostic(origin+'/api/public/telegram-diagnostic',125),phase:'back-from-tantra'};
  assert.equal(classifyCspNavigationCancellation(error,info)?.kind,
    'webkit-hard-navigation-fetch-cancellation');
  assert.equal(classifyCspNavigationCancellation(error,{...info,fetchTelemetry:[]}),null);
  // Exact provider-free path only; no general API, history or CSP exemption.
  for(const path of ['/api/public/telegram-diagnostic?debug=1',
    '/api/public/telegram-diagnostic/other', '/api/public/telegram-diagnostic?_rsc=x',
    '/api/app/crm/private','/api/public/telegram-diagnostic/'])
    assert.equal(classifyCspNavigationCancellation({...error,stack:diagnostic(origin+path).stack},info),null,path);
  assert.equal(classifyCspNavigationCancellation({...error,stack:diagnostic('https://elsewhere.test/api/public/telegram-diagnostic').stack},info),null);
  for(const change of [{engine:'chromium'},{readiness:'loaded-history'},
    {lifecycle:trace.filter(item=>item.type!=='pagehide')},
    {lifecycle:trace.filter((_,i)=>i!==1)},
    {lifecycle:trace.map((item,i)=>i===2?{...item,navigationType:'push'}:item)},
    {lifecycle:trace.map((item,i)=>i===2?{...item,documentClass:'public-video'}:item)},
    {lifecycle:trace.map((item,i)=>i===4?{...item,url:origin+'/en/contact'}:item)},
    {lifecycle:[...trace,{type:'policy-violation',time:120,documentProbe:'tantra'}]},
    {lifecycle:[...trace,{type:'unhandled-rejection',time:125,documentProbe:'tantra'}]}])
    assert.equal(classifyCspNavigationCancellation(error,{...info,...change}),null,
      'Missing signed navigation provenance or real policy violation stays fatal');
  for(const change of [{phase:'initial'},{time:99},{time:141},{time:150},
    {stack:'Refused to connect because it violates Content Security Policy'}])
    assert.equal(classifyCspNavigationCancellation({...error,...change},info),null);
});
