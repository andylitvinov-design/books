import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const source = readFileSync(new URL('../scripts/verify-site-video-browser.mjs', import.meta.url), 'utf8')
function extract(begin, end) {
  const start = source.indexOf(begin), finish = source.indexOf(end, start)
  assert.ok(start >= 0 && finish > start, 'Expected isolated diagnostic boundary')
  return source.slice(start, finish)
}
const diagnosticSource = extract('// BEGIN bounded About poster diagnostics', '// END bounded About poster diagnostics.')
const { aboutPosterDiagnosticSnapshot, withAboutPosterDiagnostic } = runInNewContext(
  diagnosticSource + '\n({ aboutPosterDiagnosticSnapshot, withAboutPosterDiagnostic })', { URL }, { timeout: 1000 })
const gallerySource = extract('// BEGIN bounded About gallery contract', '// END bounded About gallery contract.')
const { aboutTestimonialVideos, classifyAboutGallery } = runInNewContext(
  gallerySource + '\n({ aboutTestimonialVideos, classifyAboutGallery })', {}, { timeout: 1000 })
const ids = JSON.parse(JSON.stringify(aboutTestimonialVideos)).map(([id]) => id)
const origin = 'http://127.0.0.1:3100'
const path = id => `/images/holistic-house/testimonial-posters/${id}.webp`
const forbidden = () => { throw new Error('SYNTHETIC-PRIVATE-TEXT-MUST-NOT-APPEAR') }
function image(raw, current = raw, { complete = true, naturalWidth = 480 } = {}) {
  return { getAttribute(name) { assert.equal(name, 'src'); return raw }, currentSrc: current, complete, naturalWidth,
    get textContent() { return forbidden() }, get outerHTML() { return forbidden() }, get innerHTML() { return forbidden() },
    click: forbidden, scrollIntoView: forbidden, setAttribute: forbidden }
}
function card(index, { fallback, primary, id = ids[index] } = {}) {
  const initial = image(path(ids[index]), origin + path(ids[index]))
  fallback ??= [initial]; primary ??= fallback
  const player = { querySelectorAll(selector) {
    if (selector === 'img.site-video-fallback-poster') return fallback
    if (selector === 'img.site-video-poster') return primary
    return forbidden()
  } }
  return { getAttribute(name) { assert.equal(name, 'data-testimonial-video-id'); return id },
    querySelector(selector) { assert.equal(selector, '.site-video-player'); return player },
    get textContent() { return forbidden() }, get outerHTML() { return forbidden() }, get innerHTML() { return forbidden() } }
}
function gallery(cards = ids.map((_, i) => card(i))) {
  return { querySelectorAll(selector) { assert.equal(selector, '[data-testimonial-video-id]'); return cards },
    get textContent() { return forbidden() }, get outerHTML() { return forbidden() }, get innerHTML() { return forbidden() } }
}
function snapshot(galleries = [gallery()]) {
  return JSON.parse(JSON.stringify(aboutPosterDiagnosticSnapshot(galleries, { ids, origin })))
}
const kinds = new Set(['absent', 'invalid', 'expected-relative', 'expected-absolute', 'credentials-present',
  'data-source', 'blob-source', 'other-scheme', 'same-path-with-suffix', 'same-path-other-form',
  'same-id-next-image', 'other-local-testimonial', 'other-same-origin', 'same-id-provider-thumbnail', 'other-origin'])
function assertSchema(value) {
  assert.deepEqual(Object.keys(value).sort(), ['cardCount', 'cards', 'galleryCount', 'status'])
  assert.equal(value.status, 'captured')
  assert.ok(Number.isInteger(value.galleryCount) && value.galleryCount >= 0 && value.galleryCount <= 2)
  assert.ok(Number.isInteger(value.cardCount) && value.cardCount >= 0 && value.cardCount <= 11)
  assert.equal(value.cards.length, 10)
  for (const [i, row] of value.cards.entries()) {
    assert.deepEqual(Object.keys(row).sort(), ['alias', 'fallback', 'fallbackCount', 'idMatches', 'posterCount', 'present', 'primary'])
    assert.equal(row.alias, `about-video-${String(i + 1).padStart(2, '0')}`)
    for (const key of ['present', 'idMatches']) assert.equal(typeof row[key], 'boolean')
    for (const key of ['fallbackCount', 'posterCount']) assert.ok(Number.isInteger(row[key]) && row[key] >= 0 && row[key] <= 2)
    for (const key of ['fallback', 'primary']) {
      assert.deepEqual(Object.keys(row[key]).sort(), ['complete', 'currentSource', 'hasNaturalWidth', 'present', 'source'])
      assert.ok(kinds.has(row[key].source)); assert.ok(kinds.has(row[key].currentSource))
      for (const field of ['present', 'complete', 'hasNaturalWidth']) assert.equal(typeof row[key][field], 'boolean')
    }
  }
  assert.ok(!/https?:|SYNTHETIC|SECRET|data:|blob:|\.webp|\.jpg|<img|src=/.test(JSON.stringify(value)), 'No raw URLs, payloads or HTML may leave the reader')
  for (const id of ids) assert.ok(!JSON.stringify(value).includes(id), 'Only fixed aliases, not raw media IDs')
}

test('poster diagnostic observes exact image forms and readiness booleans without reading text or causing loading', () => {
  const value = snapshot(); assertSchema(value)
  for (const row of value.cards) {
    assert.equal(row.idMatches, true); assert.equal(row.fallbackCount, 1); assert.equal(row.posterCount, 1)
    assert.equal(row.fallback.source, 'expected-relative'); assert.equal(row.fallback.currentSource, 'expected-absolute')
    assert.equal(row.fallback.complete, true); assert.equal(row.fallback.hasNaturalWidth, true)
  }
  const missing = snapshot([]); assertSchema(missing)
  assert.equal(missing.galleryCount, 0); assert.equal(missing.cardCount, 0)
  assert.ok(missing.cards.every(row => !row.present && !row.fallback.present && row.fallback.source === 'absent'))
})

test('source classifications are fixed enums and never accept or reveal unknown URLs, queries, credentials or data', () => {
  const id = ids[0], p = path(id)
  const cases = [
    [null, 'absent'], ['', 'absent'], [p, 'expected-relative'], [origin + p, 'expected-absolute'],
    ['//127.0.0.1:3100' + p, 'same-path-other-form'], [p + '?SECRET=SYNTHETIC', 'same-path-with-suffix'],
    [origin + '/_next/image?url=' + encodeURIComponent(p) + '&w=SECRET', 'same-id-next-image'],
    [path(ids[1]), 'other-local-testimonial'], ['/unrelated/SECRET.webp', 'other-same-origin'],
    [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, 'same-id-provider-thumbnail'],
    [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, 'same-id-provider-thumbnail'],
    [`https://i.ytimg.com/vi/${id}/hqdefault.jpg?SECRET`, 'other-origin'],
    ['https://unknown.invalid/SECRET?token=SYNTHETIC', 'other-origin'],
    ['https://SECRET:SYNTHETIC@unknown.invalid/private', 'credentials-present'],
    ['data:image/webp;base64,SYNTHETIC-SECRET', 'data-source'], ['blob:' + origin + '/SECRET', 'blob-source'],
    ['javascript:SYNTHETIC-SECRET', 'other-scheme'], ['https://[SECRET', 'invalid'], [' ' + p, 'invalid'], ['SECRET'.repeat(400), 'invalid'],
  ]
  for (const [raw, expected] of cases) {
    const cards = ids.map((_, i) => card(i)); cards[0] = card(0, { fallback: [image(raw)], id: 'SYNTHETIC-PRIVATE-ID' })
    const value = snapshot([gallery(cards)]); assertSchema(value)
    assert.equal(value.cards[0].fallback.source, expected); assert.equal(value.cards[0].idMatches, false)
  }
})

test('missing local fallback and same-video provider fallback are distinguishable but remain failed acceptance', () => {
  const cards = ids.map((_, i) => card(i)); cards[0] = card(0, { fallback: [], primary: [image(`https://i.ytimg.com/vi/${ids[0]}/hqdefault.jpg`)] })
  const diagnostic = snapshot([gallery(cards)]); assertSchema(diagnostic)
  assert.equal(diagnostic.cards[0].fallbackCount, 0)
  assert.equal(diagnostic.cards[0].fallback.source, 'absent')
  assert.equal(diagnostic.cards[0].primary.source, 'same-id-provider-thumbnail')
  const accepted = { galleryCount: 1, locale: 'en', playerCount: 10, iframeCount: 0, watchLinkCount: 0,
    cards: JSON.parse(JSON.stringify(aboutTestimonialVideos)).map(([id, audioLanguage]) => ({ id, audioLanguage, playerCount: 1, playerLocale: 'en', playCount: 1, playDisabled: false, posterSrc: path(id) })) }
  assert.equal(classifyAboutGallery(accepted, origin), 'match')
  for (const raw of [null, `https://i.ytimg.com/vi/${ids[0]}/hqdefault.jpg`, path(ids[1])]) {
    accepted.cards[0].posterSrc = raw
    assert.equal(classifyAboutGallery(accepted, origin), 'poster-identity', 'Diagnostic categories never widen the independent acceptance oracle')
  }
})

test('diagnostic counts remain capped and readiness fields are booleans even for malformed image metadata', () => {
  const cards = Array.from({ length: 30 }, (_, i) => card(i % 10, { fallback: Array.from({ length: 20 }, () => image('SECRET', 'SECRET', { complete: 'SECRET', naturalWidth: NaN })) }))
  const value = snapshot(Array.from({ length: 30 }, () => gallery(cards))); assertSchema(value)
  assert.equal(value.galleryCount, 2); assert.equal(value.cardCount, 11)
  assert.ok(value.cards.every(row => row.fallbackCount === 2 && row.posterCount === 2 && !row.fallback.complete && !row.fallback.hasNaturalWidth))
})

test('passive measurement runs only after failure and preserves the exact original result/error with no retry', async () => {
  const marker = { safe: true }; let calls = 0, observations = 0
  assert.equal(await withAboutPosterDiagnostic(async () => { calls++; return marker }, async () => { observations++ }), marker)
  assert.equal(calls, 1); assert.equal(observations, 0)
  for (const diagnosticFails of [false, true]) {
    calls = 0; observations = 0
    const original = new Error('original-public-assertion')
    await assert.rejects(withAboutPosterDiagnostic(async () => { calls++; throw original }, async () => {
      observations++; if (diagnosticFails) throw new Error('SYNTHETIC-PRIVATE-ERROR')
    }), error => error === original)
    assert.equal(calls, 1); assert.equal(observations, 1)
  }
})

test('recorder captures only fixed metadata, preserves artifact-write failures, and never emits caught error details', async () => {
  const recorderSource = extract('  async function recordAboutPosterDiagnostic()', '  async function readAboutGallery()')
  for (const failAt of ['none', 'dom', 'write']) {
    const writes = [], logs = []; let reads = 0
    const context = { aboutPosterDiagnosticSnapshot, aboutTestimonialVideos, origin, evidence: '/synthetic-evidence',
      page: { locator(selector) { assert.equal(selector, '#about-testimonials[data-personal-testimonials="about"]'); return { async evaluateAll(fn, args) {
        reads++; assert.equal(fn, aboutPosterDiagnosticSnapshot); assert.deepEqual(JSON.parse(JSON.stringify(args)), { ids, origin })
        if (failAt === 'dom') throw new Error('SYNTHETIC-PRIVATE-DOM')
        return snapshot()
      } } } },
      writeFileSync(file, value) { assert.equal(file, '/synthetic-evidence/about-poster-diagnostic.json'); if (failAt === 'write') throw new Error('SYNTHETIC-PRIVATE-FILE'); writes.push(value) },
      console: { error(...args) { logs.push(args) } },
    }
    const record = runInNewContext(recorderSource + '\nrecordAboutPosterDiagnostic', context)
    await record(); assert.equal(reads, 1); assert.equal(logs.length, 1)
    assert.equal(logs[0][0], 'OBSERVATION: about-poster')
    const output = JSON.parse(logs[0][1]); assert.equal(output.schemaVersion, 1); assert.equal(output.caseAlias, 'about-en-gallery')
    assert.equal(output.status, failAt === 'dom' ? 'unavailable' : 'captured')
    assert.ok(!JSON.stringify({ logs, writes }).includes('SYNTHETIC-PRIVATE'))
    if (failAt === 'dom') assert.deepEqual(Object.keys(output).sort(), ['caseAlias', 'schemaVersion', 'status'])
  }
})

test('production and local failure sites retain fatal exact oracle and the diagnostic reader is passive', () => {
  assert.ok(source.includes("if (classifyAboutGallery(await readAboutGallery(), origin) === 'match') break"))
  assert.ok(source.includes("if (i >= 40) await withAboutPosterDiagnostic(async () => {\n        throw new Error('Updated module not observed on production')\n      }, recordAboutPosterDiagnostic)"))
  assert.ok(source.includes("await withAboutPosterDiagnostic(async () => {\n    await expect.poll(async () => classifyAboutGallery(await readAboutGallery(), origin),\n      { timeout: 10000, message: 'About EN gallery: exact ten locale-first identities, local posters and opt-in players' }).toBe('match')\n  }, recordAboutPosterDiagnostic)"))
  assert.ok(!/\b(?:fetch|click|scrollIntoView|goto|reload|route|request|setAttribute)\s*\(|\.src\s*=|textContent|innerHTML|outerHTML|innerText|getAttribute\(['"](?:title|alt)['"]\)/.test(diagnosticSource))
})
