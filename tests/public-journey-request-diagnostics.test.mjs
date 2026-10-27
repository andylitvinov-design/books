import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { publicJourneyRequestDiagnostic, publicJourneyRequestDecision, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
function constant(source, name) {
  let found
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === name) found = node.initializer
    ts.forEachChild(node, visit)
  }
  visit(ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX))
  assert.ok(found, 'Exact source constant: ' + name)
  return vm.runInNewContext('(' + found.getText() + ')', Object.create(null), { timeout: 1000 })
}
const localFixtures = [
  ['/', 'public-home-wordmark'], ['/es', 'public-home-wordmark'],
  ['/holistic-house-app.webmanifest', 'public-app-manifest'],
  ['/icons/holistic-house-teal.svg', 'public-app-icon-svg'],
  ['/holistic-house-icon/180', 'public-app-apple-icon'],
  ...['en', 'ru', 'es'].flatMap(locale => [
    ['/' + locale + '/masters', 'remote-support-masters-link'],
    ['/' + locale + '/academy/reiki/yggdrasil/free-initiation', 'remote-support-free-initiation-link'],
  ]),
]
const poster = 'https://i.ytimg.com/vi/HqfixazXqRY/hqdefault.jpg'
const diagnostic = (url, extra = {}, decision = 'unplanned-route') => publicJourneyRequestDiagnostic({ url, method: 'GET', navigation: false, ...extra }, decision, origin)

test('fixed diagnostic labels are backed by exact current metadata and link/poster sources', () => {
  const helper = read('scripts/helpers/public-journey-verifier.mjs')
  assert.deepEqual(Array.from(constant(helper, 'diagnosticSourcePaths'), pair => Array.from(pair)), localFixtures)
  const layout = constant(read('app/layout.tsx').replace('metadataBase: metadataBaseFor(),', 'metadataBase: null,'), 'metadata')
  assert.equal(layout.manifest, '/holistic-house-app.webmanifest')
  assert.equal(layout.icons.icon, '/icons/holistic-house-teal.svg')
  assert.equal(layout.icons.apple, '/holistic-house-icon/180')
  const header = read('components/public-site-header.tsx')
  assert.match(header, /href=\{locale === "es" \? "\/es" : "\/"\}/)
  const booking = read('components/remote-energy-support-booking.tsx')
  assert.match(booking, /<Link href=\{"\/" \+ locale \+ "\/masters"\}>/)
  assert.match(booking, /<Link href=\{"\/" \+ locale \+ "\/academy\/reiki\/yggdrasil\/free-initiation"\}>/)
  const english = constant(read('data/academy/english-guided-meditations.ts'), 'englishGuidedMeditations')
  const sun = english.find(item => item.key === 'flight-to-sun')
  assert.equal(sun.youtubeId, 'HqfixazXqRY')
  assert.equal(constant(helper, 'diagnosticSunPoster'), 'https://i.ytimg.com/vi/' + sun.youtubeId + '/hqdefault.jpg')
  const playlist = read('components/academy-course-video-playlist.tsx')
  assert.match(playlist, /youtubeId=\{active.id\}/); assert.match(playlist, /posterLoading="eager"/)
  const selection = read('data/academy/holistic-support-meditations.ts')
  assert.match(selection, /if \(locale !== "ru"\)/); assert.match(selection, /item.key === "flight-to-sun"/)
  const player = read('components/academy-video-player.tsx')
  assert.match(player, /src=\{"https:\/\/i.ytimg.com\/vi\/" \+ safeId \+ "\/hqdefault.jpg"\}/)
  assert.match(player, /const \[playing, setPlaying\] = useState\(false\)/)
})

test('source identity is exact and passive, never an allowlist for prefetch, navigation, API or provider', () => {
  for (const [path, sourceId] of localFixtures) {
    for (const navigation of [false, true]) {
      const request = { url: origin + path + '?_rsc=synthetic', method: 'GET', navigation, prefetch: true }
      assert.equal(publicJourneyRequestDiagnostic(request, 'unplanned-route', origin).sourceId, sourceId)
      assert.equal(publicJourneyRequestDecision(request, origin), 'unplanned-route')
    }
    assert.equal(diagnostic('https://unreviewed.invalid' + path).sourceId, 'unclassified')
    assert.equal(diagnostic(origin + path + '#private').sourceId, 'unclassified')
    assert.equal(diagnostic('http://username:password@127.0.0.1:3100' + path).sourceId, 'unclassified')
    assert.equal(publicJourneyRequestDiagnostic({ url: origin + path, method: 'GET' }, 'unplanned-route').sourceId, 'unclassified', 'Local labels need the exact isolated origin')
  }
  for (const path of ['/en/masters/private-person', '/en/masters/', '/en/app', '/en/client?startTests=private', '/api/private-records', '/holistic-house-icon/181', '/icons/private.svg']) {
    assert.equal(diagnostic(origin + path).sourceId, 'unclassified')
    assert.equal(publicJourneyRequestDecision({ url: origin + path, method: 'GET', prefetch: true }, origin), 'unplanned-route')
  }
  assert.equal(diagnostic(poster, {}, 'external-resource').sourceId, 'public-english-sun-poster')
  assert.equal(publicJourneyRequestDecision({ url: poster, method: 'GET' }, origin), 'external-resource')
  for (const url of [poster + '?visitor=private', poster + '#private', poster.replace('HqfixazXqRY', 'otherPublic'), poster.replace('i.ytimg.com', 'unreviewed.invalid'), 'https://www.youtube-nocookie.com/embed/HqfixazXqRY', 'https://wa.me/14376066502', 'https://accounts.google.com']) {
    assert.equal(diagnostic(url).sourceId, 'unclassified')
    assert.equal(publicJourneyRequestDecision({ url, method: 'GET', navigation: true }, origin), 'external-navigation')
  }
})

test('query evidence is bounded shape only and private-text identity stays redacted', () => {
  const shapes = [['', 'none'], ['?_rsc=SECRET_RSC_VALUE', 'single-rsc'], ['?_rsc=', 'other'], ['?_rsc=x&_rsc=y', 'other'], ['?_rsc=x&private=SECRET_EXTRA', 'other'], ['?private=SECRET_OTHER', 'other']]
  for (const [query, queryShape] of shapes) {
    const result = diagnostic(origin + '/en/masters' + query)
    assert.equal(result.queryShape, queryShape)
    assert.doesNotMatch(JSON.stringify(result), /SECRET|_rsc=|private=/)
  }
  assert.equal(diagnostic('not a valid URL SECRET_INVALID').queryShape, 'invalid-url')
  const request = { url: origin + '/en/masters?_rsc=SECRET_PRIVATE', method: 'GET', body: 'SECRET_BODY', headers: { authorization: 'SECRET_AUTH', referer: 'SECRET_REFERER' }, prefetchSignals: { purposePrefetch: 'SECRET_PURPOSE', nextRouterPrefetch: '1', rsc: true } }
  const result = publicJourneyRequestDiagnostic(request, 'private-text', origin)
  assert.equal(result.sourceId, 'redacted'); assert.equal(result.queryShape, 'redacted'); assert.equal(result.path, '[redacted]')
  assert.deepEqual(result.prefetchSignals, { purposePrefetch: false, nextRouterPrefetch: false, rsc: true })
  assert.doesNotMatch(JSON.stringify(result), /SECRET|authorization|referer|BODY|AUTH|PRIVATE/)
})

test('route diagnostics retain exact boolean prefetch markers while every unknown request still aborts', async () => {
  let handler
  const actions = []
  const fence = await installPublicJourneyFence({ route: async (_, callback) => { handler = callback } }, origin, ['SECRET_PRIVATE'])
  const send = async (url, headers = {}, method = 'GET', navigation = false) => handler({
    request: () => ({ url: () => url, method: () => method, postData: () => '', isNavigationRequest: () => navigation, resourceType: () => 'fetch', headers: () => headers }),
    continue: async () => assert.fail('diagnostic label must never forward an unplanned route'),
    fulfill: async () => assert.fail('diagnostics must never synthesize successful content'),
    abort: async reason => { assert.equal(reason, 'blockedbyclient'); actions.push('abort') },
  })
  await send(origin + '/en/masters?_rsc=HIDDEN_VALUE', { purpose: 'prefetch', 'next-router-prefetch': '1', rsc: '1', authorization: 'SECRET_AUTH', referer: 'SECRET_REFERER' })
  await send(origin + '/en/academy/reiki/yggdrasil/free-initiation', { purpose: 'other-private-value', 'next-router-prefetch': '0', rsc: '0' })
  await send(origin + '/api/private-records', { purpose: 'prefetch', rsc: '1' })
  await send(origin + '/en/masters', { purpose: 'prefetch' }, 'POST')
  await send('https://accounts.google.com', {}, 'GET', true)
  await send(poster)
  await send(origin + '/en/masters?_rsc=SECRET_PRIVATE', { purpose: 'prefetch' })
  let summary = fence.summary()
  assert.deepEqual(summary.violations, ['unplanned-route', 'unplanned-route', 'unplanned-route', 'write', 'external-navigation', 'private-text'])
  assert.equal(summary.blockedExternalResources, 1, 'Blocked public poster remains separate from violations, never allowed')
  assert.equal(summary.anonymousTalismanReads, 0)
  assert.deepEqual(summary.requestDiagnostics[0].prefetchSignals, { purposePrefetch: true, nextRouterPrefetch: true, rsc: true })
  assert.deepEqual(summary.requestDiagnostics[1].prefetchSignals, { purposePrefetch: false, nextRouterPrefetch: false, rsc: false })
  assert.equal(summary.requestDiagnostics[0].prefetch, true); assert.equal(summary.requestDiagnostics[1].prefetch, false)
  assert.equal(summary.requestDiagnostics[6].sourceId, 'redacted')
  for (let index = 0; index < 20; index++) await send(origin + '/unknown/SECRET_PERSON_' + index + '?note=SECRET_NOTE')
  summary = fence.summary()
  assert.equal(summary.requestDiagnostics.length, 20, 'Existing hard bound remains20')
  assert.equal(summary.violations.length, 26); assert.equal(actions.length, 27)
  assert.doesNotMatch(JSON.stringify(summary), /SECRET|HIDDEN_VALUE|private-records|accounts.google|i.ytimg|authorization|referer|other-private-value/)
  assert.throws(() => fence.assertNoSideEffects('still fatal'), /no private-text, API, write or external navigation/)
})
