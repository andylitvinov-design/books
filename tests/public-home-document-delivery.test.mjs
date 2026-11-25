import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { gunzipSync, gzipSync } from 'node:zlib'
import { join } from 'node:path'
import test from 'node:test'
import { createServer } from 'node:http'
import { requestHomeDocument } from '../scripts/public-home-http.mjs'
import { publicHomeDocumentLocale, publicHomeEncoding } from '../lib/public-home-document-request.mjs'
import { GET, generateStaticParams, revalidate } from '../app/hh-public-document/[locale]/route.js'

function select(pathname = '/', fields = {}, method = 'GET', search = '') {
  return publicHomeDocumentLocale({ pathname, method, search, headers: new Headers(fields) })
}

test('only canonical anonymous document navigations qualify for shared home HTML', () => {
  for (const [path, locale] of [['/', 'en'], ['/ru', 'ru'], ['/es', 'es']]) {
    assert.equal(select(path, { accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' }), locale)
    assert.equal(select(path, { accept: '*/*' }, 'HEAD'), locale)
    assert.equal(select(path, { 'cache-control': 'max-age=0' }), locale)
    assert.equal(select(path, { cookie: 'holistic_house_public_locale=es; holistic_house_ui_locale=ru' }), locale)
    for (const query of ['?lang=ru', '?full=1', '?_rsc=ax', '?test=1']) assert.equal(select(path, {}, 'GET', query), null)
  }
  for (const path of ['/en', '/ru/', '/en/about', '/api/app/sessions', '/es/client', '/hh-public-document/en']) assert.equal(select(path), null)
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) assert.equal(select('/', {}, method), null)
  for (const headers of [
    { authorization: 'fixture' }, { 'proxy-authorization': 'fixture' }, { cookie: 'session=test' },
    { cookie: 'holistic_house_public_locale=en; new_account_cookie=1' }, { cookie: '__prerender_bypass=test' },
    { cookie: 'holistic_house_ui_locale=arbitrary' }, { rsc: '1' }, { 'next-url': '/ru' },
    { 'next-action': 'fixture' }, { 'next-router-state-tree': '[]' }, { 'next-router-prefetch': '1' },
    { 'next-router-segment-prefetch': '/_tree' }, { 'x-nextjs-data': '1' }, { 'x-middleware-prefetch': '1' },
    { 'x-hh-render-public-home': '1' }, { 'sec-purpose': 'prefetch;prerender' }, { purpose: 'prefetch' },
    { 'cache-control': 'no-store' }, { pragma: 'no-cache' }, { 'cache-control': 'no-cache' },
    { accept: 'application/json' }, { accept: 'text/x-component' }, { 'sec-fetch-dest': 'script' },
    { 'sec-fetch-mode': 'cors' }, { range: 'bytes=0-42' }, { 'x-prerender-revalidate': 'fixture' },
  ]) assert.equal(select('/', headers), null, Object.keys(headers)[0])
})

test('gzip representation has a separate cache key and honors explicit zero quality', () => {
  for (const header of [null, '', 'br', 'identity', 'br,gzip;q=0', 'gzip;q=0, *;q=1', '*;q=1, gzip;q=0', 'gzip;q=bad']) assert.equal(publicHomeEncoding(header), 'identity', header)
  for (const header of ['gzip', 'BR, GZIP', 'gzip;q=0.5', '*;q=0.7']) assert.equal(publicHomeEncoding(header), 'gzip', header)
})

test('the delivered document, policy and optional preload come from the same completed build', async () => {
  assert.equal(revalidate, 0)
  assert.deepEqual(generateStaticParams(), [])
  const cwd = process.cwd(), previous = process.env.HH_COMPILED_PUBLIC_HOME_BUILD_ID
  const dir = await mkdtemp(join(tmpdir(), 'hh-public-document-'))
  const response = locale => GET(undefined, { params: Promise.resolve({ locale }) })
  const policy = "default-src 'self'; script-src 'sha256-fixture' 'strict-dynamic'"
  const snapshot = { buildId: 'build-a', html: '<!DOCTYPE html><html lang="ru"><body>fixture</body></html>', policy, portrait: '/images/holistic-house/ali-inner-alchemist-hero.webp' }
  try {
    process.chdir(dir)
    await mkdir('.home-documents')
    process.env.HH_COMPILED_PUBLIC_HOME_BUILD_ID = 'build-a'
    snapshot.gzip = gzipSync(snapshot.html).toString('base64')
    await writeFile('.home-documents/ru.json', JSON.stringify(snapshot))
    let reply = await response('ru')
    assert.equal(await reply.text(), snapshot.html)
    assert.equal(reply.headers.get('content-security-policy'), policy)
    assert.match(reply.headers.get('link'), /ali-inner-alchemist-hero\.webp>; rel=preload/)
    assert.match(reply.headers.get('cache-control'), /private, no-store/)
    assert.doesNotMatch(reply.headers.get('cache-control'), /\bs-maxage=[1-9]/i)
    assert.equal(reply.headers.get('set-cookie'), null)
    assert.equal(reply.headers.get('content-encoding'), null)
    assert.match(reply.headers.get('vary'), /Accept-Encoding/)
    assert.match(reply.headers.get('vary'), /X-HH-Public-Home-Encoding/)
    assert.doesNotMatch(reply.headers.get('vary'), /(?:^|,\s*)Cookie(?:,|$)/i)
    const encoded = await response('ru-gzip')
    assert.equal(encoded.headers.get('content-encoding'), 'gzip')
    assert.equal(gunzipSync(Buffer.from(await encoded.arrayBuffer())).toString(), snapshot.html)
    assert.equal(encoded.headers.get('content-security-policy'), policy)
    const protocolFallback = await response('en-full')
    assert.equal(protocolFallback.status, 307)
    assert.equal(protocolFallback.headers.get('location'), '/?full=1')
    await writeFile('.home-documents/ru.json', JSON.stringify({ ...snapshot, portrait: 'https://example.com/test' }))
    assert.equal((await response('ru')).headers.get('link'), null)
    process.env.HH_COMPILED_PUBLIC_HOME_BUILD_ID = 'build-b'
    reply = await response('ru')
    assert.equal(reply.status, 307)
    assert.equal(reply.headers.get('location'), '/ru?full=1')
    assert.match(reply.headers.get('cache-control'), /no-store/)
    assert.equal((await response('en')).headers.get('location'), '/?full=1')
    await writeFile('.home-documents/es.json', 'invalid')
    assert.equal((await response('es')).headers.get('location'), '/es?full=1')
    assert.equal((await response('../other')).status, 404)
  } finally {
    process.chdir(cwd)
    if (previous === undefined) delete process.env.HH_COMPILED_PUBLIC_HOME_BUILD_ID
    else process.env.HH_COMPILED_PUBLIC_HOME_BUILD_ID = previous
    await rm(dir, { recursive: true, force: true })
  }
})


test('built canonical CSS delivery remains no-store and isolates cookie, authorization and router requests', {
  skip: !process.env.HH_PUBLIC_HOME_TEST_ORIGIN,
}, async () => {
  const origin=new URL(process.env.HH_PUBLIC_HOME_TEST_ORIGIN)
  assert.ok(['localhost','127.0.0.1'].includes(origin.hostname), 'local build only')
  const request=(path,fields={},method='GET')=>requestHomeDocument(new URL(path,origin),{method,headers:fields})
  const isHashDocument=response=>{
    const csp=response.headers.get('content-security-policy')||''
    return /'sha256-/.test(csp)&&!/'nonce-/.test(csp)
  }
  const privateResponse=response=>{
    assert.match(response.headers.get('cache-control')||'',/no-store|private/i)
    assert.ok(!isHashDocument(response),'excluded request must not receive shared guest document')
    assert.doesNotMatch(response.headers.get('cache-control')||'',/\bs-maxage=[1-9]/i)
  }
  for(const path of ['/', '/ru', '/es']){
    const first=await request(path)
    assert.equal(first.status,200,path)
    assert.ok(isHashDocument(first),path+' guest hash CSP')
    assert.match(first.headers.get('cache-control')||'',/private.*no-store|no-store.*private/i,path+' must retain private no-store')
    assert.doesNotMatch(first.headers.get('cache-control')||'',/\bs-maxage=[1-9]/i)
    assert.equal(first.headers.get('set-cookie'),null)
    assert.doesNotMatch(first.headers.get('vary')||'',/(?:^|,\s*)Cookie(?:,|$)/i)
    const body=await first.text()
    assert.match(body,/data-home-dialogue-entry/)
    assert.match(body,/<img\b[^>]*src="\/images\/holistic-house\/(?:ali-inner-alchemist-hero\.webp|my-coach-motion\/[a-z0-9_-]+\.webp)"[^>]*>/i,path+' original URL portrait')
    assert.doesNotMatch(body,/<img\b[^>]*src="data:image\/webp;base64,[^"]+"[^>]*>/i,path+' no inline hero data URL')
    const compressed=await request(path,{'accept-encoding':'gzip'})
    assert.equal(compressed.status,200,path+' gzip')
    assert.equal(compressed.headers.get('content-encoding'),'gzip',path+' gzip wire representation')
    assert.match(compressed.headers.get('cache-control')||'',/private.*no-store|no-store.*private/i)
    assert.equal(await compressed.text(),body)
    for(const headers of [
      {cookie:'hh_test_session=fixture'},
      {authorization:'Bearer hh-local-fixture'},
      {cookie:'hh_test_session=fixture','x-hh-public-home-encoding':'gzip'},
      {'cache-control':'no-cache','x-hh-public-home-encoding':'identity'},
      {rsc:'1','x-hh-public-home-encoding':'identity'},
      {'sec-fetch-mode':'cors'},
      {'sec-fetch-dest':'script'},
    ]){
      const excluded=await request(path,headers)
      privateResponse(excluded)
      await excluded.arrayBuffer()
    }
    const full=await request(path+'?full=1')
    privateResponse(full)
    await full.arrayBuffer()
    const again=await request(path)
    assert.equal(again.status,200)
    assert.ok(isHashDocument(again))
    assert.equal(await again.text(),body)
  }
  for(const path of ['/hh-public-document/en','/hh-public-document/ru-gzip','/hh-public-document/es']){
    const response=await request(path,{'x-hh-public-home-encoding':'identity'})
    assert.equal(response.status,404)
    privateResponse(response)
    await response.arrayBuffer()
  }
})

test('raw navigation audit emits the intended browser metadata and decodes the actual gzip wire body', async () => {
  const raw = '<!DOCTYPE html><html lang="en">fixture</html>';
  const gz = gzipSync(raw);
  const observed = [];
  const server = createServer((req,res)=>{
    observed.push(req.headers);
    if(req.url==='/redirect'){res.writeHead(307,{location:'/'});res.end('redirect');return}
    res.writeHead(200,{'content-encoding':'gzip','content-type':'text/html'});
    res.end(gz);
  });
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
    const origin='http://127.0.0.1:'+server.address().port;
    const page=await requestHomeDocument(origin+'/',{headers:{'accept-encoding':'gzip'}});
    assert.equal(observed[0]['sec-fetch-mode'],'navigate');
    assert.equal(observed[0]['sec-fetch-dest'],'document');
    assert.equal(observed[0]['accept-encoding'],'gzip');
    assert.equal(page.wireBytes,gz.length);
    assert.equal(await page.text(),raw);
    const redirect=await requestHomeDocument(origin+'/redirect',{headers:{'sec-fetch-mode':'cors',cookie:'fixture=1'}});
    assert.equal(redirect.status,307);
    assert.equal(observed.length,2);
    assert.equal(observed[1]['sec-fetch-mode'],'cors');
    assert.equal(observed[1].cookie,'fixture=1');
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
