import { attachCatalogStatsResponseDiagnostic } from '../scripts/catalog-stats-request-diagnostics.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { decodeReadyPoster } from '../scripts/public-poster-readiness.mjs';
const source = readFileSync(new URL('../scripts/verify-release-reaudit.mjs', import.meta.url), 'utf8');
function fixture(change = {}) {
  const document = { visibilityState: 'visible', baseURI: 'http://127.0.0.1:3123/' };
  let decoded = 0; let disposed = false; let ticks = 0;
  const attrs = { src: '/poster.webp?secret=private#fragment', srcset: null };
  const el = { isConnected: true, ownerDocument: document, complete: true, naturalWidth: 100, naturalHeight: 50,
    currentSrc: 'http://127.0.0.1:3123/poster.webp?secret=private#fragment', getAttribute: name => attrs[name],
    decode: async () => { decoded++; }, ...change };
  const handle = { scrollIntoViewIfNeeded: async () => {}, evaluate: (fn, arg) => Promise.resolve().then(() => runInNewContext(`(${fn})(el,arg)`, { el, arg, document, URL })), dispose: async () => { disposed = true; } };
  const expect = { poll: (fn, options) => ({ toBe: async value => {
    assert.equal(options.timeout, 7000);
    for (let i = 0; i < 4; i++) { ticks++; fixtureTick?.(el, attrs, ticks); if (await fn() === value) { afterReady?.(el); return; } }
    throw new Error('Readiness timeout');
  } }) };
  let fixtureTick; let afterReady;
  return { el, attrs, document, run: () => decodeReadyPoster(handle, expect),
    onTick: fn => { fixtureTick = fn; }, afterReady: fn => { afterReady = fn; }, decoded: () => decoded, disposed: () => disposed };
}
test('waits for lazy load on the same element before strict decoding', async () => {
  const f = fixture({ complete: false, naturalWidth: 0 });
  f.onTick((el, _, tick) => { assert.equal(f.decoded(), 0); if (tick === 2) { el.complete = true; el.naturalWidth = 100; } });
  await f.run(); assert.equal(f.decoded(), 1); assert.equal(f.disposed(), true);
});
for (const [name, change] of [['broken image', { naturalWidth: 0 }], ['zero height', { naturalHeight: 0 }], ['missing current source', { currentSrc: '' }], ['detached element', { isConnected: false }]]) {
  test(`rejects ${name} and reports sanitized identity`, async () => {
    const f = fixture(change);
    await assert.rejects(f.run(), error => { assert.match(error.message, /poster=/); assert.doesNotMatch(error.message, /secret|private|fragment/); return true; });
    assert.equal(f.decoded(), 0); assert.equal(f.disposed(), true);
  });
}
test('source mutation and inactive document cannot pass readiness', async () => {
  const f = fixture(); f.onTick((_, attrs) => { attrs.src = '/changed.webp'; });
  await assert.rejects(f.run(), /source changed/);
  const inactive = fixture(); inactive.document.visibilityState = 'hidden'; await assert.rejects(inactive.run(), /no longer active/);
});
test('decode EncodingError remains fatal with original cause; mutation during decode is fatal', async () => {
  const failure = new Error('EncodingError: The source image cannot be decoded.');
  const f = fixture({ decode: async () => { throw failure; } });
  await assert.rejects(f.run(), error => error.cause === failure && error.message.includes('EncodingError'));
  const changed = fixture(); changed.el.decode = async () => { changed.el.currentSrc = 'http://127.0.0.1:3123/changed.webp'; };
  await assert.rejects(changed.run(), /changed during decode/);
});
test('actual page collector isolates late retired requests, but new pending requests block settling', async () => {
  const start = source.indexOf('  const createPublicPage = async () => {');
  const end = source.indexOf('  let publicPageState = await createPublicPage();', start);
  assert.ok(start >= 0 && end > start);
  const pages = [];
  const diagnostics = { requests: [], responses: [], statsResponses: [], failedRequests: [], pageErrors: [] };
  const context = { newPage: async () => { const events = {}; const page = { on: (type, fn) => { events[type] = fn; }, url: () => 'http://127.0.0.1:3123/', events }; pages.push(page); return page; } };
  const make = new Function('context', 'publicDiagnostics', 'origin', 'attachCatalogStatsResponseDiagnostic', `let errors=[];let publicPhase='test';${source.slice(start,end)};return createPublicPage;`)(context, diagnostics, 'http://127.0.0.1:3123', attachCatalogStatsResponseDiagnostic);
  const old = await make(); const next = await make();
  const request = path => ({ url: () => 'http://127.0.0.1:3123/' + path, frame: () => ({ url: () => 'old-document' }), method: () => 'GET', resourceType: () => 'fetch', failure: () => ({ errorText: 'aborted' }) });
  pages[0].events.request(request('late-old'));
  assert.equal(old.pendingPublicRequests.size, 1); assert.equal(next.pendingPublicRequests.size, 0);
  const current = request('new-real-pending'); pages[1].events.request(current);
  const predicate = source.match(/expect\.poll\((\(\) => publicPageState\.pendingPublicRequests[^,]+), \{ timeout: 15000/)[1];
  const settled = new Function('publicPageState','Date',`return (${predicate})();`);
  assert.equal(settled(next, { now: () => Date.now() + 1000 }), false, 'A genuine new-page request must remain fatal at timeout');
  pages[0].events.requestfinished(current); assert.equal(next.pendingPublicRequests.size, 1);
  pages[1].events.requestfinished(current); assert.equal(settled(next, { now: () => Date.now() + 1000 }), true);
  pages[0].events.pageerror(new Error('retired failure'));
  assert.equal(old.errors.length, 1); assert.equal(next.errors.length, 0);
  assert.equal(diagnostics.pageErrors.length, 1);
  assert.equal(diagnostics.requests.length, 2, 'Prior diagnostics are retained');
});
test('route isolation is failure-only and original failure result is retained', () => {
  assert.match(source, /if \(!routePassed\) \{[\s\S]*?retiredDocuments\.push[\s\S]*?await page\.close\(\);[\s\S]*?publicPageState = await createPublicPage\(\)/);
  assert.match(source, /const posterImages = await posters\.elementHandles\(\);/);
  assert.doesNotMatch(source, /i >= await posters\.count\(\)/);
  assert.doesNotMatch(source, /pendingPublicRequests\.clear\(|EncodingError.*continue/);
  assert.match(source, /catch \(error\) \{ results\.push\(\{ name, \.\.\.detail, ok: false/);
  assert.match(source, /if \(readiness !== 'loaded-history'\) return;/);
});

test('ready currentSrc is bound through decode and disappeared elements cannot pass', async () => {
  const changed = fixture(); changed.afterReady(el => { el.currentSrc = 'http://127.0.0.1:3123/other.webp'; });
  await assert.rejects(changed.run(), /changed before decode/); assert.equal(changed.decoded(), 0);
  const removed = fixture(); removed.afterReady(el => { el.isConnected = false; });
  await assert.rejects(removed.run(), /changed before decode/); assert.equal(removed.decoded(), 0);
  const absent = fixture({ currentSrc: '', naturalWidth: 0 }); absent.attrs.src = null;
  await assert.rejects(absent.run(), error => error.message.includes('"srcPath":null') && error.message.includes('"currentSrcPath":null'));
});

test('route-local verdict survives interleaved successes and failures from other engines', async () => {
  const checkSource = source.slice(source.indexOf('async function check('), source.indexOf('async function assertCspPublicHome('));
  const results = [];
  const check = new Function('results', `${checkSource}; return check;`)(results);
  let release;
  const paused = new Promise(resolve => { release = resolve; });
  const failedRoute = check('mine', {}, async () => { await paused; throw Error('image failed'); });
  assert.equal(await check('other', {}, async () => ({})), true);
  release();
  const routePassed = await failedRoute;
  assert.equal(await check('another-success', {}, async () => ({})), true);
  assert.equal(routePassed, false, 'This failed page must retire despite the latest other-engine success');
  const passedRoute = await check('mine-success', {}, async () => ({}));
  assert.equal(await check('another-failure', {}, async () => { throw Error('other'); }), false);
  assert.equal(passedRoute, true, 'This successful page must stay despite another engine failure');
  assert.equal(results.filter(result => !result.ok).length, 2);
  assert.match(source, /const routePassed = await check\('public-page'/);
  assert.doesNotMatch(source, /results\.at\(-1\)/);
});
