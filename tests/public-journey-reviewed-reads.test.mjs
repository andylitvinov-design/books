import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { publicJourneyRequestDecision, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'
const origin = 'http://127.0.0.1:3100'
const prefetchPaths = ['/', '/es', '/en/masters', '/en/academy/reiki/yggdrasil/free-initiation', '/ru/masters', '/ru/academy/reiki/yggdrasil/free-initiation', '/es/masters', '/es/academy/reiki/yggdrasil/free-initiation']
const signals = { purposePrefetch: false, nextRouterPrefetch: true, rsc: true }
const idleSignals = { purposePrefetch: false, nextRouterPrefetch: false, rsc: false }
const prefetchRead = path => ({ url: origin + path + '?_rsc=a1b2c', method: 'GET', body: '', navigation: false, resourceType: 'fetch', prefetch: true, prefetchSignals: signals })
const manifestRead = { url: origin + '/holistic-house-app.webmanifest', method: 'GET', body: '', navigation: false, resourceType: 'other', prefetch: false, prefetchSignals: idleSignals }
const decide = request => publicJourneyRequestDecision(request, origin, ['PRIVATE_SYNTHETIC_GOAL'])
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('only the exact source-authored public reads are admitted with their observed resource/query/header shape', () => {
  const header = read('components/public-site-header.tsx')
  const booking = read('components/remote-energy-support-booking.tsx')
  assert.match(header, /href=\{locale === "es" \? "\/es" : "\/"\}/)
  assert.match(booking, /<Link href=\{"\/" \+ locale \+ "\/masters"\}>/)
  assert.match(booking, /<Link href=\{"\/" \+ locale \+ "\/academy\/reiki\/yggdrasil\/free-initiation"\}>/)
  assert.match(read('app/layout.tsx'), /manifest: "\/holistic-house-app.webmanifest"/)
  const manifest = JSON.parse(read('public/holistic-house-app.webmanifest'))
  assert.equal(manifest.name, 'Holistic House')
  for (const path of prefetchPaths) assert.equal(decide(prefetchRead(path)), 'allow', path)
  assert.equal(decide(manifestRead), 'allow')
  // Reading a static manifest does NOT authorize its private launch, shortcuts,
  // image routes, installation or service worker; neither does a public source ID.
  for (const path of [manifest.start_url, manifest.id, ...manifest.shortcuts.map(item => item.url), ...manifest.icons.map(item => item.src)]) {
    assert.notEqual(decide({ ...prefetchRead(path), sourceId: 'public-app-manifest' }), 'allow')
  }
})

test('reviewed public paths do not admit ordinary navigation, missing markers, writes, bodies or unrelated query shapes', () => {
  for (const path of prefetchPaths) {
    const request = prefetchRead(path)
    for (const delta of [
      { method: 'HEAD' }, { method: 'POST' }, { method: 'PUT' }, { method: 'DELETE' },
      { navigation: true }, { body: 'unsubmitted text' }, { body: ' ' },
      { resourceType: 'document' }, { resourceType: 'image' }, { resourceType: 'xhr' },
      { prefetch: false }, { prefetchSignals: undefined },
      { prefetchSignals: { ...signals, nextRouterPrefetch: false } },
      { prefetchSignals: { ...signals, rsc: false } },
      { prefetchSignals: { ...signals, purposePrefetch: true } },
      { url: origin + path }, { url: origin + path + '?_rsc=' },
      { url: origin + path + '?_rsc=a&_rsc=b' }, { url: origin + path + '?_rsc=a&other=b' },
      { url: origin + path + '?other=synthetic' }, { url: request.url + '#fragment' },
      { url: 'http://user:password@127.0.0.1:3100' + path + '?_rsc=a1b2c' },
      { url: 'https://public.example.test' + path + '?_rsc=a1b2c' },
    ]) assert.notEqual(decide({ ...request, ...delta }), 'allow', path + ' rejects ' + JSON.stringify(delta))
  }
  for (const delta of [
    { method: 'HEAD' }, { method: 'POST' }, { navigation: true }, { body: '{}' },
    { resourceType: 'fetch' }, { resourceType: 'image' }, { prefetch: true },
    { prefetchSignals: undefined }, { prefetchSignals: signals },
    { prefetchSignals: { ...idleSignals, purposePrefetch: true } },
    { url: manifestRead.url + '?other=1' }, { url: manifestRead.url + '?_rsc=a1b2c' },
    { url: manifestRead.url + '#fragment' },
    { url: 'http://user:password@127.0.0.1:3100/holistic-house-app.webmanifest' },
    { url: 'https://public.example.test/holistic-house-app.webmanifest' },
  ]) assert.notEqual(decide({ ...manifestRead, ...delta }), 'allow')
})

test('private-text priority and every API/provider/unknown image or unplanned route denial remain intact', () => {
  for (const text of ['PRIVATE_SYNTHETIC_GOAL', encodeURIComponent('PRIVATE_SYNTHETIC_GOAL'), '%2550RIVATE_SYNTHETIC_GOAL']) {
    assert.equal(decide({ ...prefetchRead('/'), url: origin + '/?_rsc=' + text }), 'private-text')
    assert.equal(decide({ ...manifestRead, body: text }), 'private-text')
  }
  for (const path of ['/en', '/ru', '/en/masters/', '/en/masters/private', '/en/app', '/en/client', '/api/service-enquiries', '/api/auth/signin/google', '/api/holistic-support/talismans', '/admin', '/unknown-image', '/unknown-public.png', '/academy/unreviewed.jpg']) {
    assert.equal(decide(prefetchRead(path)), 'unplanned-route')
    assert.equal(decide({ ...prefetchRead(path), url: origin + path, resourceType: 'image', prefetch: false, prefetchSignals: idleSignals }), 'unplanned-route')
  }
  for (const url of ['https://accounts.google.com', 'https://wa.me/14376066502', 'https://i.ytimg.com/vi/HqfixazXqRY/hqdefault.jpg']) {
    assert.equal(decide({ ...prefetchRead('/'), url, navigation: true }), 'external-navigation')
    assert.equal(decide({ ...manifestRead, url, resourceType: 'image' }), 'external-resource')
  }
})

test('context fence forwards only typed reviewed reads; ordinary navigation and unknown images remain fatal', async () => {
  let callback
  const actions = []
  const fence = await installPublicJourneyFence({ route: async (_, fn) => { callback = fn } }, origin, ['PRIVATE_SYNTHETIC_GOAL'])
  const send = request => callback({
    request: () => ({ url: () => request.url, method: () => request.method, postData: () => request.body || '', isNavigationRequest: () => request.navigation,
      resourceType: () => request.resourceType, headers: () => request.prefetch ? { 'next-router-prefetch': '1', rsc: '1' } : {} }),
    continue: async () => actions.push('continue'), abort: async () => actions.push('abort'), fulfill: async () => assert.fail('no new synthetic response'),
  })
  await send(manifestRead)
  for (const path of prefetchPaths) await send(prefetchRead(path))
  fence.assertNoSideEffects('nine exact reviewed public reads')
  for (const request of [
    { ...prefetchRead('/en/masters'), navigation: true },
    { ...manifestRead, url: origin + '/private-image', resourceType: 'image' },
    { ...prefetchRead('/'), url: origin + '/?_rsc=PRIVATE_SYNTHETIC_GOAL' },
    { ...manifestRead, url: 'https://i.ytimg.com/vi/HqfixazXqRY/hqdefault.jpg', resourceType: 'image' },
  ]) await send(request)
  assert.deepEqual(actions, [...Array(9).fill('continue'), ...Array(4).fill('abort')])
  assert.deepEqual(fence.summary().violations, ['unplanned-route', 'unplanned-route', 'private-text'])
  assert.equal(fence.summary().blockedExternalResources, 1)
  assert.equal(fence.summary().anonymousTalismanReads, 0)
  assert.throws(() => fence.assertNoSideEffects('unknown still fatal'), /no private-text, API, write or external navigation/)
})


test('raw Next15 RSC hash grammar rejects encoded private text plus malformed escapes at every layer', () => {
  const bad = [
    '%50RIVATE_SYNTHETIC_GOAL%', '%50RIVATE_SYNTHETIC_GOAL%ZZ',
    '%2550RIVATE_SYNTHETIC_GOAL%25', '%2550RIVATE_SYNTHETIC_GOAL%25ZZ',
    '%252550RIVATE_SYNTHETIC_GOAL%2525', '%25252550RIVATE_SYNTHETIC_GOAL%252525ZZ',
    '%61b2c', '%2561b2c', 'a1b2c%', 'a1b2c%ZZ', 'a1b2c%25',
    'ABC12', 'abcdef', 'a_b', 'a-b', 'a+b', 'a%20b', '💭',
    'AbCdEf012345_-X', 'AbCdEf012345_-XYZ', 'AbCdEf012345_-X%', 'AbCdEf012345_-X%ZZ',
    '%41bCdEf012345_-XY', 'AbCdEf012345_-X+', 'AbCdEf012345_-X/',
  ]
  for (const path of prefetchPaths) for (const value of bad) {
    assert.notEqual(decide({ ...prefetchRead(path), url: origin + path + '?_rsc=' + value }), 'allow')
  }
  for (const query of ['?%5frsc=a1b2c', '?_rsc=a1b2c&', '?_rsc=a1b2c%26', '?_rsc=a1b2c;private=1'])
    assert.notEqual(decide({ ...prefetchRead('/'), url: origin + '/' + query }), 'allow')
  for (const token of ['0', 'a', 'a1b2c', 'zzzzz', 'AbCdEf012345_-XY', '________________', '----------------']) assert.equal(decide({ ...prefetchRead('/'), url: origin + '/?_rsc=' + token }), 'allow')
})
