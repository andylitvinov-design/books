import assert from 'node:assert/strict';
import test from 'node:test';
import { getRemoteMediaResponse, mediaSourceUrlFor } from '../data/media.js';
const sha = '2676289f7f90a78853cc7963f58643c9b00f23bd';
const jpg = Buffer.from([255, 216, 255, 224, 0, 0, 255, 217]);
const call = (fetcher, series = 'maya', file = 'photo_54@19-10-2024_00-05-38.jpg', revision = sha) => getRemoteMediaResponse(series, file, revision, fetcher);
const response = (body = jpg, options = {}) => new Response(body, { headers: { 'Content-Type': 'image/jpeg' }, ...options });

test('production serves pinned same-origin image bytes without redirect or credential forwarding', async () => {
  const result = await call(async (url, options) => {
    assert.equal(url, `https://raw.githubusercontent.com/andylitvinov-design/books/${sha}/source-books/book-3-maya-tradition/raw/photos/photo_54%4019-10-2024_00-05-38.jpg`);
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store'); assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(options.headers, { Accept: 'image/jpeg' });
    return response();
  });
  assert.equal(result.status, 200); assert.equal(result.headers.get('location'), null);
  assert.equal(result.headers.get('content-type'), 'image/jpeg');
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(result.headers.get('cache-control'), 'public, max-age=3600, s-maxage=3600');
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), jpg);
});

test('invalid series, traversal, extensions and mutable revisions never fetch', async () => {
  for (const [series, file, revision] of [['__proto__','a.jpg',sha],['constructor','a.jpg',sha],['other','a.jpg',sha],['maya','../a.jpg',sha],['maya','a\\b.jpg',sha],['maya','a.svg',sha],['maya','a.jpg','main']]) {
    const result = await call(() => { throw Error('must not fetch'); }, series, file, revision);
    assert.equal(result.status, 404); assert.equal(mediaSourceUrlFor(series,file,revision), undefined);
  }
});

test('upstream errors, redirects, MIME mismatch and disguised HTML fail closed without caching', async () => {
  for (const fetcher of [async()=>response(null,{status:404}), async()=>response(null,{status:503}), async()=>response(null,{status:307,headers:{location:'https://example.com'}}), async()=>response(jpg,{headers:{'Content-Type':'text/html'}}), async()=>response('<html>not an image</html>'), async()=>{throw new DOMException('timeout','TimeoutError')}]) {
    const result = await call(fetcher); assert.ok([404,502].includes(result.status));
    assert.equal(result.headers.get('cache-control'), 'no-store'); assert.equal(result.headers.get('location'),null);
  }
});

test('rejects declared and streamed oversized bodies and cancels upstream', async () => {
  let cancelled = 0;
  const declared = await call(async()=>new Response(new ReadableStream({cancel(){cancelled++}}),{headers:{'Content-Type':'image/jpeg','Content-Length':String(2*1024*1024+1)}}));
  assert.equal(declared.status,502); assert.equal(cancelled,1);
  const streamed = await call(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(2*1024*1024+1))},cancel(){cancelled++}}),{headers:{'Content-Type':'image/jpeg'}}));
  assert.equal(streamed.status,502); assert.equal(cancelled,2);
});

test('stream read failure returns bounded no-store error', async () => {
  const result = await call(async()=>new Response(new ReadableStream({start(c){c.error(Error('interrupted'))}}),{headers:{'Content-Type':'image/jpeg'}}));
  assert.equal(result.status,502); assert.equal(result.headers.get('cache-control'),'no-store');
});


test('other series are outside the bounded Maya delivery helper', async () => {
  const result = await call(() => { throw Error('must not fetch'); }, 'dao', 'post_347_1.jpg');
  assert.equal(result.status, 404);
});

test('real production route keeps Maya same-origin and other series redirects unchanged', async () => {
  const { readFile } = await import('node:fs/promises');
  const ts = await import('typescript');
  const mediaUrl = new URL('../data/media.js', import.meta.url).href;
  const source = (await readFile(new URL('../app/media/[series]/[file]/route.ts', import.meta.url), 'utf8')).replace('@/data/media', mediaUrl);
  const { outputText, diagnostics } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.deepEqual(diagnostics, []);
  const { GET } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
  const previous = { vercel: process.env.VERCEL, sha: process.env.VERCEL_GIT_COMMIT_SHA, fetch: globalThis.fetch };
  try {
    process.env.VERCEL = '1'; process.env.VERCEL_GIT_COMMIT_SHA = sha;
    let calls = 0;
    globalThis.fetch = async () => { calls++; return response(); };
    const maya = await GET(new Request('https://example.test/media/maya/a.jpg'), { params: Promise.resolve({series:'maya',file:'a.jpg'}) });
    assert.equal(maya.status, 200); assert.equal(maya.headers.get('location'), null);
    assert.deepEqual(Buffer.from(await maya.arrayBuffer()), jpg);
    const dao = await GET(new Request('https://example.test/media/dao/post_347_1.jpg'), { params: Promise.resolve({series:'dao',file:'post_347_1.jpg'}) });
    assert.equal(dao.status, 307); assert.equal(dao.headers.get('location'), mediaSourceUrlFor('dao','post_347_1.jpg',sha));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous.vercel;
    if (previous.sha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA = previous.sha;
  }
});
