import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { readFileSync } from 'node:fs';
import { sanitizeCspRequest, installCspFetchTelemetry, attachCspRequestTelemetry, cspFetchTelemetrySource } from '../scripts/csp-request-telemetry.mjs';
const origin = 'http://127.0.0.1:3123';
const requestUrl = origin + '/en/about?_rsc=opaque-secret';
function fixture(fetch) {
  const storage = new Map();
  const env = { fetch, location: { origin }, __cspInitDocumentProbe: 'document-1', performance: { timeOrigin: 100, now: () => 2 }, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
  env.top = env;
  installCspFetchTelemetry(sanitizeCspRequest, env);
  return { env, events: () => JSON.parse(storage.get('__cspRequestTelemetry') || '[]') };
}
test('native this, arguments, Promise identity and abort signal remain exact', async () => {
  const controller = new AbortController();
  const options = { signal: controller.signal, body: 'private-body' };
  const promise = Promise.resolve('result');
  const receiver = {};
  const { env, events } = fixture(function (...args) { assert.equal(this, receiver); assert.deepEqual(args, [requestUrl, options]); assert.equal(args[1], options); return promise; });
  assert.equal(env.fetch.call(receiver, requestUrl, options), promise);
  assert.equal(await promise, 'result');
  assert.equal(events().length, 1);
  assert.deepEqual(events()[0], { type: 'fetch-start', path: '/en/about', rsc: true, id: 'fetch-1', documentProbe: 'document-1', time: 102 });
  assert.doesNotMatch(JSON.stringify(events()), /opaque-secret|private-body|signal|headers/);
});
test('rejected Promise and synchronous exception are not handled or replaced', async () => {
  const failure = new Error('native');
  const rejected = Promise.reject(failure);
  const one = fixture(() => rejected);
  assert.equal(one.env.fetch(requestUrl), rejected);
  await assert.rejects(rejected, error => error === failure);
  const two = fixture(() => { throw failure; });
  assert.throws(() => two.env.fetch(requestUrl), error => error === failure);
});
test('broken observer storage and nonstandard input cannot change native behavior', () => {
  const result = {};
  const { env } = fixture(() => result);
  env.sessionStorage.getItem = () => { throw Error('storage denied'); };
  assert.equal(env.fetch(requestUrl), result);
  const unknown = { get url() { throw Error('getter must not run'); }, toString() { throw Error('must not coerce'); } };
  assert.equal(env.fetch(unknown), result);
});
test('only known loopback public paths and exact RSC query shape are recorded', () => {
  for (const input of [requestUrl, new URL(requestUrl), new Request(requestUrl)]) assert.deepEqual(sanitizeCspRequest(input, origin), { path: '/en/about', rsc: true });
  for (const input of ['/api/app/guest/bootstrap', '/en/client', '/en/about?token=private', '/en/about?_rsc=x&other=y', '/en/about?_rsc=x&_rsc=y', '/en/about?_rsc=', 'https://example.com/en/about?_rsc=x', 'http://name:secret@127.0.0.1:3123/en/about', '/unknown', { url: requestUrl }]) assert.equal(sanitizeCspRequest(input, origin), null);
  assert.equal(sanitizeCspRequest('https://holistichouse.vercel.app/en/about', 'https://holistichouse.vercel.app'), null);
  for (const protocol of ['file:', 'ftp:']) assert.equal(sanitizeCspRequest(protocol + '//localhost/en/about', protocol + '//localhost'), null);
});
test('network lifecycle keeps request identity while excluding raw URL and error text', () => {
  const listeners = {}; const events = []; let time = 1;
  attachCspRequestTelemetry({ on: (type, fn) => { listeners[type] = fn; } }, origin, events, () => time++);
  const request = { url: () => requestUrl, failure: () => ({ errorText: 'secret' }) };
  listeners.request(request); listeners.response({ request: () => request }); listeners.requestfailed(request); listeners.requestfinished(request);
  assert.deepEqual(events.map(event => event.type), ['request-start', 'request-response', 'request-failed', 'request-finished']);
  assert.deepEqual(events.map(event => event.id), Array(4).fill('request-1'));
  assert.deepEqual(events.map(event => event.time), [1, 2, 3, 4]);
  assert.doesNotMatch(JSON.stringify(events), /opaque-secret|secret|https?:|headers|body/);
  listeners.request({ url: () => origin + '/api/app/private?token=secret' }); assert.equal(events.length, 4);
});
test('telemetry is bounded and init source is self-contained', () => {
  const { env, events } = fixture(() => null);
  for (let i = 0; i < 520; i++) env.fetch(requestUrl);
  assert.equal(events().length, 512);
  const source = cspFetchTelemetrySource();
  assert.doesNotMatch(source, /\.then\(|\.catch\(/);
  assert.match(source, /Reflect\.apply\(nativeFetch, this, args\)/);
});
test('verifier preserves fatal error gates and adds no classifier input or waiting policy', () => {
  const source = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
  assert.match(source, /classifyCspNavigationCancellation\(error, \{ engine, readiness, origin, lifecycle: lifecycleTrace \}\)/);
  assert.match(source, /assert\.deepEqual\(unexpectedErrors, \[\], 'No unexplained JavaScript diagnostics during CSP navigation'\)/);
  assert.match(source, /if \(readiness === 'loaded-history'\) assert\.deepEqual\(cspErrors, \[\]/);
  assert.match(source, /if \(readiness !== 'loaded-history'\) return;/);
  assert.match(source, /assert\.deepEqual\(lifecycleTrace\.filter\(event => \['window-error', 'unhandled-rejection'\]/);
});

test('serialized browser init script runs without module bindings and preserves fetch', () => {
  const promise = Promise.resolve('native');
  const storage = new Map();
  const env = { URL, Request, fetch: () => promise, location: { origin }, performance: { timeOrigin: 10, now: () => 1 }, __cspInitDocumentProbe: 'probe', sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
  env.top = env;
  runInNewContext(cspFetchTelemetrySource(), env);
  assert.equal(env.fetch(requestUrl), promise);
  assert.equal(JSON.parse(storage.get('__cspRequestTelemetry'))[0].path, '/en/about');
});

test('overridden URL and Request getters are not invoked by observation', () => {
  for (const [input, property] of [[new URL(requestUrl), 'href'], [new Request(requestUrl), 'url']]) {
    Object.defineProperty(input, property, { get() { throw Error('overridden getter'); } });
    assert.deepEqual(sanitizeCspRequest(input, origin), { path: '/en/about', rsc: true });
    const { env } = fixture(value => value);
    assert.equal(env.fetch(input), input);
  }
});
test('iframe fetch is untouched and network event collection remains bounded', () => {
  const native = () => null;
  const env = { top: {}, fetch: native };
  installCspFetchTelemetry(sanitizeCspRequest, env);
  assert.equal(env.fetch, native);
  const listeners = {}; const events = [];
  attachCspRequestTelemetry({ on: (type, fn) => { listeners[type] = fn; } }, origin, events);
  for (let i = 0; i < 520; i++) listeners.request({ url: () => requestUrl });
  assert.equal(events.length, 512);
});

test('fragment observations match native network paths without changing fetch arguments', () => {
  const address = origin + '/en/services?_rsc=opaque-secret#consultation-secret';
  for (const input of [address, new URL(address), new Request(address)]) {
    const promise = Promise.resolve('native');
    const options = { signal: new AbortController().signal };
    const { env, events } = fixture(function (actual, init) {
      assert.equal(actual, input);
      assert.equal(init, options);
      return promise;
    });
    assert.equal(env.fetch(input, options), promise);
    assert.deepEqual(sanitizeCspRequest(input, origin), { path: '/en/services', rsc: true });
    assert.doesNotMatch(JSON.stringify(events()), /opaque-secret|consultation-secret|#/);
    if (input instanceof URL) assert.equal(input.hash, '#consultation-secret');
    if (input instanceof Request) assert.equal(input.url, address);
  }
  for (const path of ['/en/services#fragment', '/en/services#']) assert.deepEqual(sanitizeCspRequest(origin + path, origin), { path: '/en/services', rsc: false });
  for (const input of [origin + '/en/client?_rsc=x#fragment', origin + '/en/services?token=secret#fragment', origin + '/en/services?_rsc=x&extra=y#fragment', 'https://external.test/en/services?_rsc=x#fragment', 'http://user:secret@127.0.0.1:3123/en/services?_rsc=x#fragment']) assert.equal(sanitizeCspRequest(input, origin), null);
});

test('pinned Next prefetch URL construction retains fragment before native fetch', async () => {
  assert.equal(require('next/package.json').version, '15.5.21');
  const { setCacheBustingSearchParam } = require('next/dist/client/components/router-reducer/set-cache-busting-search-param.js');
  const headers = require('next/dist/client/components/app-router-headers.js');
  const input = new URL(origin + '/en/services#consultation');
  const fetchUrl = new URL(input);
  await setCacheBustingSearchParam(fetchUrl, {
    [headers.NEXT_ROUTER_PREFETCH_HEADER]: '1',
    [headers.NEXT_ROUTER_STATE_TREE_HEADER]: encodeURIComponent(JSON.stringify(['', {}])),
  });
  assert.equal(fetchUrl.hash, '#consultation');
  assert.ok(fetchUrl.searchParams.get('_rsc'));
  assert.equal(input.search, '');
  assert.deepEqual(sanitizeCspRequest(fetchUrl, origin), { path: '/en/services', rsc: true });
  const source = readFileSync(require.resolve('next/dist/client/components/router-reducer/fetch-server-response.js'), 'utf8');
  const construction = source.slice(source.indexOf('let fetchUrl = new URL(url);'), source.indexOf('let browserResponse = await fetch(fetchUrl, fetchOptions);'));
  assert.match(construction, /setCacheBustingSearchParam/);
  assert.doesNotMatch(construction, /hash\s*=/);
});


test('stats diagnostics retain only exact public aggregate path without query values', () => {
  assert.deepEqual(sanitizeCspRequest('/api/test-catalog/stats', origin), { path: '/api/test-catalog/stats', rsc: false });
  for (const path of ['/api/test-catalog/stats?token=secret', '/api/test-catalog/stats?_rsc=secret', '/api/test-catalog/stats/client', '/api/test-catalog/results']) assert.equal(sanitizeCspRequest(path, origin), null);
  const source = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
  assert.match(source, /cspContext.addInitScript\(\{ content: catalogStatsDiagnosticSource\(\) \}\)/);
  assert.match(source, /record\('policy-violation'/);
  assert.match(source, /JSON.stringify\(\{ statsResponses, statsFetch, requestTelemetry, fetchTelemetry/);
});
