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
  for (const path of ['/en/client','/en/client?_rsc=x&other=y','/ru/client?_rsc=x','/api/client?_rsc=x','/en/client?_rsc=']) assert.equal(classifyCspNavigationCancellation(scopedDiagnostic(origin+path),info),null);
  assert.equal(classifyCspNavigationCancellation(scopedDiagnostic('https://elsewhere.test/en/client?_rsc=x'),info),null);
  for (const time of [99,141,150,151]) assert.equal(classifyCspNavigationCancellation({...error,time},info),null);
  for (const type of ['window-error','unhandled-rejection']) assert.equal(classifyCspNavigationCancellation(error,{...info,lifecycle:[...homeLife,{type,time:125}]}),null);
  for (const override of [{engine:'chromium'},{readiness:'loaded-history'}]) assert.equal(classifyCspNavigationCancellation(error,{...info,...override}),null);
});
