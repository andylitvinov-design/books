// Synthetic credentials + ephemeral CI Redis only. --live performs no login or
// mutation on production. Run with the production application's locked build.
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:https'
import { mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { promisify, types as nodeTypes } from 'node:util'
import { performance as nodePerformance } from 'node:perf_hooks'
import { chromium, expect } from '@playwright/test'
import { SITE_VIDEO_SLOTS } from '../lib/site-videos/model.js'
import { RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'
import { verifyAboutVideoCaptionLayout } from './verify-about-video-caption-layout.mjs'

const live = process.argv.includes('--live')
const origin = live ? 'https://holistichouse.vercel.app' : 'http://127.0.0.1:3100'
const evidence = '/tmp/site-video-evidence'
mkdirSync(evidence, { recursive: true })
const results = []
function pass(label) { results.push(label); console.log(`PASS: ${label}`) }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let server, app, browser
const exec = promisify(execFile)
const testToken = 'synthetic-video-browser-test-only'
const namespace = 'holistic-house:site-videos:v1'

// BEGIN bounded About overflow diagnostics (passive, failure-only, no DOM content).
function aboutOverflowDiagnosticSnapshot() {
  const number = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-100000, Math.min(100000, value)) * 10) / 10 : null
  const count = (value, cap) => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? Math.min(value, cap) : 0
  const viewportWidth = number(innerWidth)
  const known = new Set()
  const styleValues = {
    display: ['none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'flow-root', 'table'],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    boxSizing: ['border-box', 'content-box'],
    overflowX: ['visible', 'hidden', 'clip', 'scroll', 'auto'],
    overflowY: ['visible', 'hidden', 'clip', 'scroll', 'auto'],
    flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
    whiteSpace: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
    overflowWrap: ['normal', 'anywhere', 'break-word'],
  }
  const rect = value => Object.fromEntries(['left', 'right', 'top', 'bottom', 'width', 'height'].map(key => [key, number(value[key])]))
  const measure = element => {
    if (!element) return { present: false }
    known.add(element)
    const style = getComputedStyle(element)
    return { present: true, rect: rect(element.getBoundingClientRect()),
      clientWidth: number(element.clientWidth), scrollWidth: number(element.scrollWidth),
      styles: Object.fromEntries(Object.entries(styleValues).map(([key, values]) => {
        const observed = style[key]
        return [key, values.find(value => value === observed) ?? 'other']
      })) }
  }
  const sections = [
    ['about-shell', 'main.about-shell'],
    ['about-header', 'main.about-shell > .section-site-header'],
    ['about-intro-video', 'main.about-shell > #psychic-alchemy-video'],
    ['about-intro-slot', 'main.about-shell > [data-video-slot="about-intro"]'],
    ['about-introduction', 'main.about-shell > .about-introduction'],
    ['about-portrait', 'main.about-shell > .about-introduction > .about-portrait'],
    ['about-introduction-copy', 'main.about-shell > .about-introduction > .about-introduction-copy'],
    ['about-biography', 'main.about-shell > .about-biography'],
    ['about-explore', 'main.about-shell > .about-explore'],
    ['about-gallery', 'main.about-shell > #about-testimonials[data-personal-testimonials="about"]'],
    ['about-gallery-row', 'main.about-shell > #about-testimonials > [role="region"]'],
    ['about-consultation-video', 'main.about-shell > [data-video-slot="consultation"]'],
    ['about-consultation', 'main.about-shell > .about-consultation'],
    ['about-consultation-capture', 'main.about-shell > .about-consultation > [data-consultation-capture]'],
    ['about-cabinet-entry', 'main.about-shell > .about-client-cabinet'],
  ].map(([alias, selector]) => {
    const elements = document.querySelectorAll(selector)
    return { alias, count: count(elements.length, 2), ...measure(elements[0]) }
  })
  const indexed = (elements, prefix, cap) => Array.from({ length: cap }, (_, index) => ({
    alias: `${prefix}-${String(index + 1).padStart(2, '0')}`, ...measure(elements[index]),
  }))
  const shellChildren = document.querySelector('main.about-shell')?.children ?? []
  const bodyChildren = document.body?.children ?? []
  const cards = document.querySelectorAll('main.about-shell > #about-testimonials [data-testimonial-video-id]')
  const snapshot = { status: 'captured', viewportWidth,
    roots: [{ alias: 'document-root', ...measure(document.documentElement) }, { alias: 'body-root', ...measure(document.body) }],
    sections, shellChildCount: count(shellChildren.length, 13), shellChildren: indexed(shellChildren, 'shell-child', 12),
    bodyChildCount: count(bodyChildren.length, 13), bodyChildren: indexed(bodyChildren, 'body-child', 12),
    cardCount: count(cards.length, 11), cards: indexed(cards, 'gallery-card', 10) }
  // Unknown wide nodes have no selectors, tag/class/id, content, attributes or URLs.
  // Rectangles may include descendants clipped by a scroll container: not a cause verdict.
  const walker = document.body ? document.createTreeWalker(document.body, 1) : null
  let wideCount = 0, scanned = 0
  const wideRects = []
  while (scanned < 2048) {
    const element = walker?.nextNode()
    if (!element) break
    scanned++
    if (known.has(element)) continue
    const bounds = rect(element.getBoundingClientRect())
    if (bounds.width !== null && bounds.width > 0 && viewportWidth !== null &&
        ((bounds.right !== null && bounds.right > viewportWidth + 2) || (bounds.left !== null && bounds.left < -2))) {
      wideCount = Math.min(wideCount + 1, 33)
      if (wideRects.length < 12) wideRects.push(bounds)
    }
  }
  const scanLimited = scanned === 2048 && Boolean(walker?.nextNode())
  return { ...snapshot, unknown: { elementCount: scanned + (scanLimited ? 1 : 0), scanned,
    scanLimited, wideCount, wideRects } }
}

// Independent Node boundary: page data is untrusted even when the reader above
// produced it. Only own data descriptors are read; aliases are never read from DOM.
function canonicalAboutOverflowDiagnostic(raw, path) {
  const caseAlias = path === '/en/about' ? 'about-en-overflow' : path === '/ru/about' ? 'about-ru-overflow' : null
  if (!caseAlias) return null
  const invalid = () => { throw new Error('Invalid bounded observation') }
  const own = (value, key) => {
    if (!value || typeof value !== 'object' || nodeTypes.isProxy(value)) return invalid()
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return invalid()
    return descriptor.value
  }
  const boolean = value => typeof value === 'boolean' ? value : invalid()
  const numeric = value => value === null ? null : typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-100000, Math.min(100000, value)) * 10) / 10 : invalid()
  const count = (value, cap) => typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? Math.min(value, cap) : invalid()
  const arrayLength = value => {
    if (nodeTypes.isProxy(value) || !Array.isArray(value)) return invalid()
    return count(own(value, 'length'), 4294967295)
  }
  const rect = value => Object.fromEntries(['left', 'right', 'top', 'bottom', 'width', 'height'].map(key => [key, numeric(own(value, key))]))
  const styleValues = {
    display: ['none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'flow-root', 'table', 'other'],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky', 'other'],
    boxSizing: ['border-box', 'content-box', 'other'],
    overflowX: ['visible', 'hidden', 'clip', 'scroll', 'auto', 'other'],
    overflowY: ['visible', 'hidden', 'clip', 'scroll', 'auto', 'other'],
    flexWrap: ['nowrap', 'wrap', 'wrap-reverse', 'other'],
    whiteSpace: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces', 'other'],
    overflowWrap: ['normal', 'anywhere', 'break-word', 'other'],
  }
  const styles = value => Object.fromEntries(Object.entries(styleValues).map(([key, values]) => {
    const observed = own(value, key)
    const canonical = values.find(value => value === observed)
    if (canonical === undefined) return invalid()
    return [key, canonical]
  }))
  const row = (value, alias, section = false) => {
    const result = { alias, present: boolean(own(value, 'present')) }
    if (section) result.count = count(own(value, 'count'), 2)
    if (result.present) {
      result.rect = rect(own(value, 'rect'))
      result.clientWidth = numeric(own(value, 'clientWidth'))
      result.scrollWidth = numeric(own(value, 'scrollWidth'))
      result.styles = styles(own(value, 'styles'))
    }
    return result
  }
  const rows = (value, aliases, section = false) => {
    if (arrayLength(value) < aliases.length) return invalid()
    return aliases.map((alias, index) => row(own(value, String(index)), alias, section))
  }
  const aliases = (prefix, length) => Array.from({ length }, (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`)
  let measurement = { status: 'unavailable' }
  try {
    if (own(raw, 'status') !== 'captured') return { schemaVersion: 1, caseAlias, measurement }
    const unknown = own(raw, 'unknown')
    const wideRects = own(unknown, 'wideRects')
    const rectCount = Math.min(arrayLength(wideRects), 12)
    measurement = {
      status: 'captured', viewportWidth: numeric(own(raw, 'viewportWidth')),
      roots: rows(own(raw, 'roots'), ['document-root', 'body-root']),
      sections: rows(own(raw, 'sections'), ['about-shell', 'about-header', 'about-intro-video', 'about-intro-slot',
        'about-introduction', 'about-portrait', 'about-introduction-copy', 'about-biography', 'about-explore',
        'about-gallery', 'about-gallery-row', 'about-consultation-video', 'about-consultation', 'about-consultation-capture', 'about-cabinet-entry'], true),
      shellChildCount: count(own(raw, 'shellChildCount'), 13), shellChildren: rows(own(raw, 'shellChildren'), aliases('shell-child', 12)),
      bodyChildCount: count(own(raw, 'bodyChildCount'), 13), bodyChildren: rows(own(raw, 'bodyChildren'), aliases('body-child', 12)),
      cardCount: count(own(raw, 'cardCount'), 11), cards: rows(own(raw, 'cards'), aliases('gallery-card', 10)),
      unknown: { elementCount: count(own(unknown, 'elementCount'), 2049), scanned: count(own(unknown, 'scanned'), 2048),
        scanLimited: boolean(own(unknown, 'scanLimited')), wideCount: count(own(unknown, 'wideCount'), 33),
        wideRects: Array.from({ length: rectCount }, (_, index) => rect(own(wideRects, String(index)))) },
    }
  } catch { /* Malformed/accessor/proxy observations have no reportable payload. */ }
  return { schemaVersion: 1, caseAlias, measurement }
}

async function withAboutOverflowDiagnostic(operation, diagnose) {
  try { return await operation() }
  catch (error) {
    let active = true, timer
    try {
      const deadline = nodePerformance.now() + 1000
      const isActive = () => active && nodePerformance.now() < deadline
      await Promise.race([
        Promise.resolve().then(() => diagnose(isActive)),
        new Promise(resolve => { timer = setTimeout(resolve, 1000) }),
      ])
    } catch { /* Diagnostics must never replace the original failure. */ }
    finally {
      active = false
      try { if (timer !== undefined) clearTimeout(timer) } catch { /* Preserve the original failure. */ }
    }
    throw error
  }
}
// END bounded About overflow diagnostics.

// BEGIN bounded public detail-video contract (source-tested, no browser/provider calls).
// These literals are independent of the renderer and registry. Update only with
// source-routing plus independent delivery/isolation evidence; not registry self-comparison.
const detailVideoCases = [
  {"alias": "alchemy-en", "route": "/en/services/alchemy-of-soul", "canonicalPath": "/en/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "en", "audioLanguage": "en", "provider": "heygen", "videoId": "7c6b243f048b9c0581ae29619a4a89fc"},
  {"alias": "hypnotherapy-en", "route": "/en/services/hypnotherapy-course", "canonicalPath": "/en/services/hypnotherapy-course", "selector": "[data-service-video=\"hypnotherapy\"]", "locale": "en", "audioLanguage": "en", "provider": "heygen", "videoId": "8c1634ce904434a91931429b6a7eefe1"},
  {"alias": "alchemy-ru", "route": "/ru/services/alchemy-of-soul", "canonicalPath": "/ru/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "ru", "audioLanguage": "ru", "provider": "youtube", "videoId": "Cz6SxXJNZbw"},
  {"alias": "hypnotherapy-ru", "route": "/ru/services/hypnotherapy-course", "canonicalPath": "/ru/services/hypnotherapy-course", "selector": "[data-service-video=\"hypnotherapy\"]", "locale": "ru", "audioLanguage": "ru", "provider": "youtube", "videoId": "eLsjFaKCBhI"},
  {"alias": "alchemy-legacy-en", "route": "/en/services/psychohomeopathy", "canonicalPath": "/en/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "en", "audioLanguage": "en", "provider": "heygen", "videoId": "7c6b243f048b9c0581ae29619a4a89fc"},
  {"alias": "alchemy-legacy-ru", "route": "/ru/services/psychohomeopathy", "canonicalPath": "/ru/services/alchemy-of-soul", "selector": "[data-alchemy-panel=\"video\"]", "locale": "ru", "audioLanguage": "ru", "provider": "youtube", "videoId": "Cz6SxXJNZbw"},
  {"alias": "imagery-es", "route": "/es/services/imagery-therapy", "canonicalPath": "/es/services/imagery-therapy", "selector": "[data-service-video=\"hypnotherapy\"]", "locale": "es", "audioLanguage": "en", "provider": "heygen", "videoId": "8c1634ce904434a91931429b6a7eefe1"},
  {"alias": "constellations-en", "route": "/en/services/systemic-constellations", "canonicalPath": "/en/services/systemic-constellations", "selector": "[data-service-video=\"constellation-case\"]", "locale": "en", "audioLanguage": "en", "provider": "youtube", "videoId": "sfVFOQNr2qk"},
  {"alias": "free-review-en", "route": "/en/services/free-situation-review", "canonicalPath": "/en/services/free-situation-review", "selector": "[data-free-review-intro-video][data-intro-audio-language=\"en\"]", "locale": "en", "audioLanguage": "en", "provider": "youtube", "videoId": "s30Y42IwPcg"},
]

function detailVideoWatchUrl(contract) {
  return contract.provider === 'heygen'
    ? `https://app.heygen.com/share/${contract.videoId}`
    : `https://www.youtube.com/watch?v=${contract.videoId}`
}

function classifyDetailVideoSource(raw, contract) {
  if (typeof raw !== 'string' || !raw) return 'missing'
  if (raw.length > 2048 || raw !== raw.trim()) return 'invalid'
  let url
  try { url = new URL(raw) } catch { return 'invalid' }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return 'invalid'
  const origin = contract.provider === 'heygen' ? 'https://app.heygen.com' : 'https://www.youtube-nocookie.com'
  if (url.origin !== origin) return 'wrong-origin'
  const path = contract.provider === 'heygen' ? `/embeds/${contract.videoId}` : `/embed/${contract.videoId}`
  if (url.pathname !== path) return 'wrong-video'
  if (contract.provider === 'heygen') return url.search ? 'wrong-parameters' : 'match'
  const parameters = { autoplay: '1', playsinline: '1', rel: '0', hl: contract.locale, cc_lang_pref: contract.audioLanguage }
  if ([...url.searchParams].length !== Object.keys(parameters).length) return 'wrong-parameters'
  for (const [name, value] of Object.entries(parameters)) {
    if (url.searchParams.getAll(name).length !== 1 || url.searchParams.get(name) !== value) return 'wrong-parameters'
  }
  return 'match'
}
// END bounded public detail-video contract.

// BEGIN bounded About gallery contract (public identity/rendering metadata only).
// The About archive is not the compact home/services preview. Keep these ten
// independently pinned IDs in EN-first order, including each original audio language.
const aboutTestimonialVideos = [
  ['Dk0LBmOivQo', 'en'], ['aUJde6A-9p0', 'en'], ['fE6sD1zr1Js', 'en'],
  ['itjo2_z2NGk', 'en'], ['4NrryHcEF1A', 'en'], ['hYwRNMxIMjc', 'en'],
  ['MIVLm1GUTtM', 'ru'], ['ttQxUHopaUM', 'ru'], ['VABgpmn4ZYA', 'ru'], ['muOnIHllI7E', 'ru'],
]
function aboutPosterIdentityMatches(raw, id, configuredOrigin) {
  // Next 15.5.21 reassigns img.src = img.src when onError is present. Its
  // resolved URL can replace the original relative content attribute.
  // Accept only these two exact representations under the configured origin;
  // no parsing/normalization, optimizer URLs, fallbacks or suffixes are allowed.
  if (!['http://127.0.0.1:3100', 'https://holistichouse.vercel.app'].includes(configuredOrigin)) return false
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id)) return false
  const relative = `/images/holistic-house/testimonial-posters/${id}.webp`
  return raw === relative || raw === configuredOrigin + relative
}
function classifyAboutGallery(snapshot, configuredOrigin) {
  if (!snapshot || !Array.isArray(snapshot.cards)) return 'invalid'
  if (snapshot.galleryCount !== 1) return 'gallery-count'
  if (snapshot.locale !== 'en') return 'gallery-locale'
  if (snapshot.cards.length !== aboutTestimonialVideos.length) return 'card-count'
  if (snapshot.playerCount !== aboutTestimonialVideos.length) return 'player-count'
  if (snapshot.iframeCount !== 0) return 'eager-iframe'
  if (snapshot.watchLinkCount !== 0) return 'external-watch-link'
  for (const [index, [id, language]] of aboutTestimonialVideos.entries()) {
    const card = snapshot.cards[index]
    if (!card || card.id !== id) return 'video-order-or-identity'
    if (card.playerCount !== 1) return 'card-player-count'
    if (card.playerLocale !== 'en') return 'player-locale'
    if (card.audioLanguage !== language) return 'audio-language'
    if (card.playCount !== 1 || card.playDisabled !== false) return 'poster-not-ready'
    if (!aboutPosterIdentityMatches(card.posterSrc, id, configuredOrigin)) return 'poster-identity'
  }
  return 'match'
}
// END bounded About gallery contract.

// BEGIN bounded About poster diagnostics (measurement only; never an acceptance rule).
function aboutPosterDiagnosticSnapshot(galleries, { ids, origin }) {
  function sourceKind(raw, id) {
    if (typeof raw !== 'string' || !raw) return 'absent'
    if (raw.length > 2048 || raw !== raw.trim()) return 'invalid'
    const expected = `/images/holistic-house/testimonial-posters/${id}.webp`
    if (raw === expected) return 'expected-relative'
    if (raw === origin + expected) return 'expected-absolute'
    let url
    try { url = new URL(raw, origin) } catch { return 'invalid' }
    if (url.username || url.password) return 'credentials-present'
    if (url.protocol === 'data:') return 'data-source'
    if (url.protocol === 'blob:') return 'blob-source'
    if (!['http:', 'https:'].includes(url.protocol)) return 'other-scheme'
    if (url.origin === origin) {
      if (url.pathname === expected) return url.search || url.hash ? 'same-path-with-suffix' : 'same-path-other-form'
      if (url.pathname === '/_next/image' && url.searchParams.get('url') === expected) return 'same-id-next-image'
      if (/^\/images\/holistic-house\/testimonial-posters\/[A-Za-z0-9_-]{11}\.webp$/.test(url.pathname)) return 'other-local-testimonial'
      return 'other-same-origin'
    }
    if (url.origin === 'https://i.ytimg.com' && !url.search && !url.hash
      && [`/vi/${id}/hqdefault.jpg`, `/vi/${id}/maxresdefault.jpg`].includes(url.pathname)) return 'same-id-provider-thumbnail'
    return 'other-origin'
  }
  function imageState(node, id) {
    return {
      present: Boolean(node),
      source: sourceKind(node?.getAttribute('src'), id),
      currentSource: sourceKind(node?.currentSrc, id),
      complete: node?.complete === true,
      hasNaturalWidth: typeof node?.naturalWidth === 'number' && Number.isFinite(node.naturalWidth) && node.naturalWidth > 0,
    }
  }
  const gallery = galleries[0]
  const cards = gallery ? [...gallery.querySelectorAll('[data-testimonial-video-id]')].slice(0, 11) : []
  return {
    status: 'captured', galleryCount: Math.min(galleries.length, 2), cardCount: cards.length,
    cards: Array.from({ length: 10 }, (_, index) => {
      const card = cards[index]
      const id = ids[index]
      const player = card?.querySelector('.site-video-player')
      const fallback = player ? [...player.querySelectorAll('img.site-video-fallback-poster')].slice(0, 2) : []
      const posters = player ? [...player.querySelectorAll('img.site-video-poster')].slice(0, 2) : []
      return {
        alias: `about-video-${String(index + 1).padStart(2, '0')}`,
        present: Boolean(card), idMatches: Boolean(card) && card.getAttribute('data-testimonial-video-id') === id,
        fallbackCount: fallback.length, posterCount: posters.length,
        fallback: imageState(fallback[0], id), primary: imageState(posters[0], id),
      }
    }),
  }
}
async function withAboutPosterDiagnostic(operation, diagnose) {
  try { return await operation() } catch (error) {
    try { await diagnose() } catch { /* Measurement must never replace the original failure. */ }
    throw error
  }
}
// END bounded About poster diagnostics.

try {
  if (!live) {
    assert.equal(process.env.CI, 'true', 'Isolated tests must run in CI')
    server = createServer({ key: readFileSync('/tmp/video-test-key.pem'), cert: readFileSync('/tmp/video-test-cert.pem') }, async (request, response) => {
      try {
        assert.equal(request.method, 'POST')
        assert.equal(request.headers.authorization, `Bearer ${testToken}`)
        let raw = ''
        for await (const part of request) { raw += part; assert.ok(raw.length < 400000) }
        const command = JSON.parse(raw)
        assert.ok(Array.isArray(command))
        assert.ok(['HGET', 'HGETALL', 'EVAL'].includes(command[0]))
        assert.equal(command[command[0] === 'EVAL' ? 3 : 1], namespace)
        const { stdout } = await exec('redis-cli', ['-h', '127.0.0.1', '-p', '6379', '--json', ...command.map(String)], { maxBuffer: 4 * 1024 * 1024 })
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ result: JSON.parse(stdout) }))
      } catch (error) {
        console.error('Isolated Redis adapter:', error.message)
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Invalid isolated test command' }))
      }
    })
    // Match production HTTPS validation without weakening the application rule.
    server.listen(443, '127.0.0.1')
    await once(server, 'listening')
    const log = createWriteStream(`${evidence}/local-app.log`)
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3100', '-H', '127.0.0.1'], {
      env: { ...process.env, PRESCRIPTIONS_ADMIN_TOKEN: testToken, PRESCRIPTIONS_ADMIN_PIN: '', PRESCRIPTIONS_KV_REST_API_URL: 'https://127.0.0.1', PRESCRIPTIONS_KV_REST_API_TOKEN: testToken },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    app.stdout.pipe(log); app.stderr.pipe(log)
    for (let i = 0; ; i++) {
      try { if ((await fetch(origin)).ok) break } catch { /* starting */ }
      if (i > 90 || app.exitCode !== null) throw new Error('Local application did not start')
      await pause(1000)
    }
  }
  browser = await chromium.launch({ headless: true })
  await verifyAboutVideoCaptionLayout(browser, expect)
  pass('Anonymous minimal-caption fixture: baseline overflow reproduced; contained with accessible names and unchanged normal flow at 1365/390px')
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, serviceWorkers: 'block' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push({ message: error.message, url: page.url() }))
  async function navigate(target) {
    const options = { waitUntil: 'domcontentloaded', timeout: 60000 }
    let response = await page.goto(new URL(target, origin).href, options)
    // Different placements can be anchors on the same Services page. A hash-only
    // navigation makes no HTTP request and returns null. Reload to inspect the
    // newly published server snapshot rather than the old document already open.
    if (!response) response = await page.reload(options)
    assert.ok(response, `No document response for ${target}`)
    assert.equal(response.status(), 200, target)
    // Archived source books may contain a nested main landmark of their own.
    // Readiness concerns the outer application page, not imported source markup.
    await expect(page.locator('main').first()).toBeVisible()
  }
  async function recordAboutOverflowDiagnostic(path, isActive) {
    if (path !== '/en/about' && path !== '/ru/about') return
    if (typeof isActive !== 'function' || !isActive()) return
    let observed = null
    try { observed = await page.evaluate(aboutOverflowDiagnosticSnapshot) }
    catch { /* No error details or DOM content are emitted. */ }
    if (!isActive()) return
    const diagnostic = canonicalAboutOverflowDiagnostic(observed, path)
    const serialized = JSON.stringify(diagnostic)
    if (!isActive()) return
    try { writeFileSync(`${evidence}/about-overflow-diagnostic.json`, serialized) }
    catch { /* The original overflow assertion remains primary if writing fails. */ }
    if (!isActive()) return
    console.error('OBSERVATION: about-overflow', serialized)
  }
  async function recordAboutPosterDiagnostic() {
    let measurement = { status: 'unavailable' }
    try {
      measurement = await page.locator('#about-testimonials[data-personal-testimonials="about"]')
        .evaluateAll(aboutPosterDiagnosticSnapshot, { ids: aboutTestimonialVideos.map(([id]) => id), origin })
    } catch { /* No error text, URLs or DOM contents are emitted. */ }
    const diagnostic = { schemaVersion: 1, caseAlias: 'about-en-gallery', ...measurement }
    try { writeFileSync(`${evidence}/about-poster-diagnostic.json`, JSON.stringify(diagnostic, null, 2)) }
    catch { /* Still report the bounded measurement when artifact writing fails. */ }
    console.error('OBSERVATION: about-poster', JSON.stringify(diagnostic))
  }
  async function readAboutGallery() {
    // Read only public identity/cardinality attributes. No titles, narratives,
    // transcripts, frame URLs, HTML dumps or client information enter diagnostics.
    return page.locator('#about-testimonials[data-personal-testimonials="about"]').evaluateAll(galleries => {
      const gallery = galleries[0]
      const cards = gallery ? [...gallery.querySelectorAll('[data-testimonial-video-id]')].slice(0, 11) : []
      return {
        galleryCount: Math.min(galleries.length, 2), locale: gallery?.getAttribute('lang') ?? null,
        playerCount: gallery ? Math.min(gallery.querySelectorAll('.site-video-player').length, 11) : 0,
        iframeCount: gallery ? Math.min(gallery.querySelectorAll('iframe').length, 1) : 0,
        watchLinkCount: gallery ? Math.min(gallery.querySelectorAll('.site-video-watch-link').length, 1) : 0,
        cards: cards.map(card => {
          const player = card.querySelector('.site-video-player')
          const play = player?.querySelector('button.site-video-play')
          return {
            id: card.getAttribute('data-testimonial-video-id'),
            playerCount: Math.min(card.querySelectorAll('.site-video-player').length, 2),
            playerLocale: player?.getAttribute('lang') ?? null,
            audioLanguage: player?.querySelector('.site-video-caption [lang]')?.getAttribute('lang') ?? null,
            playCount: player ? Math.min(player.querySelectorAll('button.site-video-play').length, 2) : 0,
            playDisabled: play ? play.disabled : null,
            posterSrc: player?.querySelector('.site-video-fallback-poster')?.getAttribute('src') ?? null,
          }
        }),
      }
    })
  }
  if (live) {
    for (let i = 0; ; i++) {
      await navigate('/en/about')
      if (classifyAboutGallery(await readAboutGallery(), origin) === 'match') break
      if (i >= 40) await withAboutPosterDiagnostic(async () => {
        throw new Error('Updated module not observed on production')
      }, recordAboutPosterDiagnostic)
      await pause(5000)
    }
  }
  for (const [target, slot, locale, id, youtubeId] of [
    ['/en/services', 'services-intro', 'en', '48105a2f2228e7cb3a67391e97acaf8b', 's30Y42IwPcg'],
    ['/en/homeopathy', 'homeopathy-intro', 'en', '34df311e461509433b45929908a9097a', 'ILyRWyHtJoE'],
    ['/ru/services', 'services-intro', 'ru', '79c2845577865979cd95ac40a08fc01a', 'Cz6SxXJNZbw'],
    ['/ru/homeopathy', 'homeopathy-intro', 'ru', '0f984780d06948b1e78166e6e553e4e9', 'Q9NvYECKWuc'],
  ]) {
    await navigate(target)
    if (slot === 'services-intro' && await page.locator('#method-videos').count()) {
      // Videos are visible by default; old production may still use a closed disclosure.
      if (await page.locator('#method-videos').getAttribute('open') === null) {
        await page.locator('#method-videos > summary').click()
      }
      await expect(page.locator('#method-videos')).toHaveAttribute('open', '')
    }
    const block = page.locator(`[data-video-slot="${slot}"][data-video-locale="${locale}"]`)
    await expect(block).toHaveCount(1)
    assert.equal(await block.locator('iframe').count(), 0)
    const play = block.getByRole('button', { name: /^(Watch video|Open video|Смотреть видео):/ })
    if (live) await pause(1200)
    await play.click()
    if (live && await block.locator('iframe').count() === 0) {
      // A very fast synthetic click can land before Next hydration has attached
      // client handlers to SSR markup. Retry once after hydration rather than
      // treating that test-timing race as a playback failure.
      await pause(1200)
      if (await play.count()) await play.click()
    }
    await expect(block.locator('iframe')).toHaveAttribute('src', new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${youtubeId}\\?`), { timeout: 10000 })
    await expect(block.locator('iframe')).toHaveAttribute('data-video-playback', 'youtube')
  }
  for (const home of ['/', '/ru']) {
    await navigate(home)
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
  }
  pass(`${live ? 'Production' : 'Local'}: EN/RU AI home intros hidden; Services and Homeopathy approved videos remain playable`)

  // Regressions reported by the owner: the Services videos were buried inside
  // a collapsed block, while the detailed service pages contained no players.
  // These checks run against built/served pages in an isolated local environment.
  if (!live) {
    for (const locale of ['en', 'ru']) {
      await navigate('/' + locale + '/services')
      const visibleGallery = page.locator('#method-videos')
      await expect(visibleGallery).toHaveAttribute('open', '')
      // Services introduction is a sibling of #method-videos after the studio layout revision.
      // Verify the real poster is present without an eagerly mounted YouTube iframe.
      const intro = page.locator(`[data-services-meet] [data-video-slot="services-intro"][data-video-locale="${locale}"]`)
      await expect(intro.locator('button.site-video-play')).toBeVisible()
      await expect(intro.locator('iframe')).toHaveCount(0)
      // Keep the current production's additional EN method-poster acceptance.
      if (locale === 'en') {
        await expect(visibleGallery.locator('[data-video-slot="method-hypnotherapy"] .site-video-play')).toBeVisible()
        await expect(visibleGallery.locator('[data-video-slot="method-constellations"] .site-video-play')).toBeVisible()
      }
      const offers = page.locator('[data-services-studio-paid] [data-services-studio-card]')
      const expectedPaidOfferIds = ["monthly-support", "alchemy", "hypnotherapy", "constellations", "business", "remote-energy-support"]
      await expect(offers).toHaveCount(expectedPaidOfferIds.length)
      const paidOfferIds = await offers.evaluateAll(cards => cards.map(card => card.getAttribute('data-services-studio-card')))
      assert.deepEqual(paidOfferIds, expectedPaidOfferIds, 'Services paid catalogue changed: ' + locale)
      for (const [id, suffix] of [['alchemy', 'alchemy-of-soul'], ['hypnotherapy', 'hypnotherapy-course']]) {
        // The offer itself is the matching card, not an obsolete direct-video link.
        const hrefs = await page.locator('[data-services-studio-card="' + id + '"] a[href]')
          .evaluateAll(links => links.map(link => link.getAttribute('href')))
        assert.ok(hrefs.includes('/' + locale + '/services/' + suffix), id + ' route not reachable from Services')
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(intro.locator('button.site-video-play')).toBeVisible()
      await expect(visibleGallery).toHaveAttribute('open', '')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Services mobile overflow: ' + locale)
      await page.screenshot({ path: `${evidence}/services-${locale}-mobile-video.png`, fullPage: true })
      await page.setViewportSize({ width: 1365, height: 1000 })
    }
    pass('EN/RU Services galleries are open on load, video links work, and mobile width is safe')

    for (const contract of detailVideoCases) {
      const { alias, route, selector, locale, audioLanguage, provider } = contract
      let block, phase = 'navigate'
      console.log(`CHECK: video-detail ${alias}`)
      try {
        await navigate(route)
        assert.equal(new URL(page.url()).pathname, contract.canonicalPath, `Video detail ${alias}: canonical route`)
        await expect(page.locator('main').first()).toHaveAttribute('lang', locale)
        phase = 'poster'
        block = page.locator(selector)
        await expect(block).toHaveCount(1)
        await block.scrollIntoViewIfNeeded()
        await expect(block.locator('.site-video-player')).toHaveAttribute('lang', locale)
        await expect(block.locator('.site-video-caption [lang]').first()).toHaveAttribute('lang', audioLanguage)
        await expect(block.locator('.site-video-play')).toBeVisible()
        assert.equal(await block.locator('iframe').count(), 0, `Video detail ${alias}: eager third-party iframe`)
        const transcript = block.locator('details.site-video-transcript')
        if (await transcript.count() && !(await transcript.evaluate(node => node.open))) await transcript.locator('summary').click()
        // Check the independently pinned original identity without printing unknown hrefs.
        await expect.poll(async () => (await block.locator('.site-video-watch-link').first().getAttribute('href')) === detailVideoWatchUrl(contract),
          { message: `Video detail ${alias}: original watch identity` }).toBe(true)
        phase = 'play'
        await block.locator('.site-video-play').click()
        await expect(block.locator('iframe')).toHaveCount(1)
        // Parse exact origin/path and language parameters, not a permissive URL prefix.
        // Failures report only a fixed category, never an unknown iframe URL/query.
        await expect.poll(async () => classifyDetailVideoSource(await block.locator('iframe').getAttribute('src'), contract),
          { timeout: 10000, message: `Video detail ${alias}: approved embed identity` }).toBe('match')
        await expect.poll(async () => (await block.locator('iframe').getAttribute('data-video-playback')) === provider,
          { message: `Video detail ${alias}: playback provider` }).toBe(true)
        assert.equal(await block.locator('.site-video-play').count(), 0, `Video detail ${alias}: poster remained after Play`)
        console.log(`PASS: video-detail ${alias}`)
      } catch (error) {
        let snapshot = { status: 'unavailable' }
        try {
          const frames = block ? await block.locator('iframe').evaluateAll(nodes => nodes.slice(0, 2).map(node => ({
            src: node.getAttribute('src'), provider: node.getAttribute('data-video-playback'),
          }))) : []
          snapshot = {
            status: 'captured', canonicalPathMatches: new URL(page.url()).pathname === contract.canonicalPath,
            blockCount: block ? Math.min(await block.count(), 2) : 0,
            frameCount: block ? Math.min(await block.locator('iframe').count(), 2) : 0,
            frames: frames.map(frame => ({ source: classifyDetailVideoSource(frame.src, contract), providerMatches: frame.provider === provider })),
          }
        } catch { /* Diagnostic failure must not replace the original assertion. */ }
        const failure = { schemaVersion: 1, caseAlias: alias, phase, ...snapshot }
        writeFileSync(`${evidence}/detail-route-failure.json`, JSON.stringify(failure, null, 2))
        console.error('FAIL: video-detail', JSON.stringify(failure))
        throw error
      }
    }
    // Wu Xing is now a focused free entry and consented enquiry, not a
    // separate automatic method-video promotion. Preserve the approved flow.
    await navigate('/ru/services/dao-health-profile')
    await expect(page.locator('main[data-free-entry-landing="dao"] [data-compact-lead-form]')).toHaveCount(1)
    assert.equal(await page.locator('[data-service-video="overview"]').count(), 0,
      'The separate Dao free start must not imply a video consultation')
    pass('Nine video service routes and the separate Dao free entry preserve exact approved formats')
  }

  await navigate('/en/about')
  await expect(page.locator('#psychic-alchemy-video')).toBeVisible()
  assert.equal(await page.locator('iframe').count(), 0)
  await withAboutPosterDiagnostic(async () => {
    await expect.poll(async () => classifyAboutGallery(await readAboutGallery(), origin),
      { timeout: 10000, message: 'About EN gallery: exact ten locale-first identities, local posters and opt-in players' }).toBe('match')
  }, recordAboutPosterDiagnostic)
  await expect(page.locator('#personal-consultation-title')).toBeVisible()
  pass(`${live ? 'Production' : 'Local'}: approved About intro, ten exact locale-first testimonials, form; no eager iframe`)
  await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-about-desktop.png`, fullPage: true })
  await navigate('/en/homeopathy/remedies')
  const remedyPath = await page.locator('a[href^="/en/homeopathy/remedies/"]').first().getAttribute('href')
  assert.ok(remedyPath)
  await navigate('/en/books')
  const bookPath = await page.locator('a[href^="/en/books/"]').first().getAttribute('href')
  assert.ok(bookPath)
  const paths = ['/?lang=en', '/?lang=ru', '/en/about', '/ru/about', '/en/services', '/ru/services', '/en/homeopathy', '/ru/homeopathy', '/en/homeopathy/remedies', '/ru/homeopathy/remedies', '/en/books', '/ru/books', remedyPath, bookPath]
  for (const width of [1365, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of paths) {
      await navigate(path)
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }))
      await withAboutOverflowDiagnostic(async () => {
      assert.ok(sizes.document <= sizes.viewport + 2, `Overflow on ${path}: ${JSON.stringify(sizes)}`)
      }, isActive => recordAboutOverflowDiagnostic(path, isActive))
    }
    pass(`${live ? 'Production' : 'Local'}: ${paths.length} routes, HTTP 200 and no overflow at ${width}px`)
  }
  await navigate('/en/about')
  await page.screenshot({ path: `${evidence}/${live ? 'live' : 'local'}-about-mobile.png`, fullPage: true })
  await page.goto(`${origin}/admin/videos`)
  await expect(page).toHaveURL(/\/admin\/login/)
  assert.equal(await page.locator('.site-video-editor').count(), 0)
  pass('Guest cannot access video editor')
  if (live) {
    await page.setViewportSize({ width: 1365, height: 1000 })
    await navigate('/en/about')
    const intro = page.locator('#psychic-alchemy-video')
    await intro.getByRole('button', { name: /^Open video:/ }).click()
    await expect(intro.locator('iframe')).toHaveAttribute('src', 'https://app.heygen.com/embeds/fd5fcead9b067f9a0649862675a38771')
    pass('Production: correct existing HeyGen iframe loads only on click')
    await page.screenshot({ path: `${evidence}/live-player-open.png` })
    const frame = page.frames().find(item => item.url().startsWith('https://app.heygen.com/embeds/'))
    if (frame) console.log('OBSERVATION: HeyGen video elements:', await frame.locator('video').count())
  } else {
    const adminContext = await browser.newContext({ viewport: { width: 1365, height: 1000 }, serviceWorkers: 'block' })
    await adminContext.addCookies([{ name: 'prescriptions_admin', value: createHmac('sha256', testToken).update('prescriptions-admin-v1').digest('base64url'), domain: '127.0.0.1', path: '/admin', httpOnly: true, sameSite: 'Strict' }])
    const editor = await adminContext.newPage()
    editor.on('pageerror', error => pageErrors.push(error.message))
    async function openEditor(target = editor) {
      await target.goto(`${origin}/admin/videos`)
      await target.locator('.prescription-admin-header button[lang="en"]').click()
      await expect(target.locator('.site-video-manager')).toHaveAttribute('lang', 'en')
      // All 16 canonical site-video slots are selectable in the same editor.
      await expect(target.locator('.site-video-placement-list button')).toHaveCount(16)
      assert.equal(await target.getByText('Video storage is currently unavailable.', { exact: false }).count(), 0)
    }
    async function choose(slot, locale = 'en', target = editor) {
      await target.locator('.site-video-language-picker button').nth(locale === 'en' ? 0 : 1).click()
      await target.locator('.site-video-placement-list button').filter({ hasText: slot.label.en }).click()
      if (slot.entityType) await target.locator('.site-video-field select').first().selectOption({ index: 1 })
    }
    async function fill(title, target = editor) {
      await target.locator('input[name="youtubeUrl"]').fill('https://youtu.be/OkLEN8Zb-sY?si=test-tracker')
      await target.locator('input[name="title"]').fill(title)
    }
    async function save(intent, target = editor) {
      if (intent === 'publish') {
        await target.locator('input[name="reviewed"]').check()
        await target.locator('.site-video-admin-button--primary').click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Video published to the selected page.')
      } else if (intent === 'draft') {
        await target.getByRole('button', { name: 'Save draft', exact: true }).click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Draft saved.')
      } else {
        await target.getByRole('button', { name: 'Hide from website', exact: true }).click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Video hidden from the website.')
      }
    }
    await openEditor()
    await fill('QA unpublished private-to-editor title')
    await save('draft')
    await openEditor()
    await expect(editor.locator('input[name="title"]')).toHaveValue('QA unpublished private-to-editor title')
    await navigate('/?lang=en')
    assert.ok(!(await page.content()).includes('QA unpublished private-to-editor title'))
    pass('Draft persists across reload and stays out of public output')
    await editor.locator('input[name="youtubeUrl"]').fill('https://drive.google.com/file/d/invalid-playback/view')
    await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
    pass('Drive playback URL rejected')
    for (const locale of ['en', 'ru']) {
      const publicSlots = SITE_VIDEO_SLOTS.filter(slot => locale === 'en' || !slot.id.startsWith('method-'))
      for (const slot of publicSlots) {
        console.log(`CHECK: publish ${slot.id}:${locale}`)
        await choose(slot, locale)
        const title = `QA ${slot.id} ${locale}`
        await fill(title)
        await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
        await save('publish')
        const destination = await editor.locator('.site-video-editor-heading > a').getAttribute('href')
        await navigate(destination)
        if (slot.id === 'thank-you') {
          // The thank-you page deliberately hides every video before a valid
          // tab-local enquiry receipt. Seed only an isolated synthetic browser
          // receipt; no real lead, payment, private account or session is touched.
          assert.equal(await page.locator('.site-video-player').filter({ hasText: title }).count(), 0)
          await page.evaluate(key => {
            window.sessionStorage.setItem(key, JSON.stringify({
              referenceCode: 'HH-0123456789AB', createdAt: Date.now(),
            }))
          }, RECEIPT_SESSION_KEY)
          await page.reload({ waitUntil: 'domcontentloaded' })
        }
        await expect(page.locator('.site-video-player').filter({ hasText: title })).toHaveCount(1)
      }
      pass(`All ${publicSlots.length} ${locale.toUpperCase()} public placements publish via real server actions and isolated Redis`)
    }
    await choose(SITE_VIDEO_SLOTS[0])
    await editor.screenshot({ path: `${evidence}/editor-desktop.png`, fullPage: true })
    await editor.setViewportSize({ width: 390, height: 844 })
    assert.ok(await editor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await editor.screenshot({ path: `${evidence}/editor-mobile.png`, fullPage: true })
    pass('Authenticated mobile editor has no overflow')
    await editor.setViewportSize({ width: 1365, height: 1000 })
    await fill('QA newer draft preserves publication')
    await save('draft')
    await navigate('/?lang=en')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    assert.ok(!(await page.content()).includes('QA newer draft preserves publication'))
    await navigate('/?lang=ru')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    pass('Draft changes preserve published snapshot; EN/RU are isolated')
    const second = await adminContext.newPage()
    await openEditor(second)
    await fill('QA editor A accepted')
    await save('publish')
    await fill('QA editor B retained edits', second)
    await second.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(second.locator('[aria-live="polite"]')).toContainText('changed in another window')
    await second.getByRole('button', { name: 'Refresh list and keep edits', exact: true }).click()
    await expect(second.locator('[aria-live="polite"]')).toContainText('List refreshed.')
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    await expect(second.locator('input[name="reviewed"]')).not.toBeChecked()
    await save('publish', second)
    await navigate('/?lang=en')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    pass('Concurrent edit rejected; refresh keeps edits and resets review; republish works')
    assert.equal(await page.locator('iframe').count(), 0)
    // Owner withdrew approval: even a newly published archived home intro cannot
    // leak back onto the public homepage. Testimonial videos remain independent.
    await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
    pass('Archived unpublished-quality home introduction cannot reappear in public')
    await save('hide', second)
    await navigate('/?lang=en')
    // Hiding a managed intro should leave independently published testimonials intact.
    assert.equal(await page.locator('[data-video-slot="home-intro"] .site-video-player').count(), 0)
    await navigate('/?lang=ru')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    await openEditor(second)
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    pass('Hide persists, retains draft and leaves other language unchanged')
    await editor.locator('.site-video-language-picker button').filter({ hasText: 'Spanish' }).click()
    await expect(editor.locator('.site-video-placement-list button')).toHaveCount(1)
    await expect(editor.locator('.site-video-editor-heading > a')).toHaveAttribute('href', '/es/about')
    await fill('QA Spanish About independent publication')
    await save('publish')
    await navigate('/es/about')
    await expect(page.getByText('QA Spanish About independent publication', { exact: true })).toHaveCount(1)
    await save('hide')
    await navigate('/es/about')
    await expect(page.locator('[data-video-slot="about-intro"]')).toHaveCount(0)
    await navigate('/en/about')
    await expect(page.getByText('QA about-intro en', { exact: true })).toHaveCount(1)
    await navigate('/ru/about')
    await expect(page.getByText('QA about-intro ru', { exact: true })).toHaveCount(1)
    await openEditor()
    await editor.locator('.site-video-language-picker button').filter({ hasText: 'Spanish' }).click()
    await expect(editor.locator('input[name="title"]')).toHaveValue('QA Spanish About independent publication')
    pass('Spanish About publish/hide/reload via real actions preserves EN/RU and never falls back to English')
    await adminContext.close()
  }
  assert.deepEqual(pageErrors, [], 'Unexpected page JavaScript errors')
  pass('No page JavaScript errors')
  writeFileSync(`${evidence}/${live ? 'live' : 'local'}-results.json`, JSON.stringify({ mode: live ? 'read-only production' : 'isolated Redis browser', passed: results }, null, 2))
  console.log(`VERIFIED: ${results.length} scenario groups`)
} catch (error) {
  if (!live) { try { console.error('Isolated application log:', readFileSync(`${evidence}/local-app.log`, 'utf8')) } catch { /* not started */ } }
  throw error
} finally {
  if (browser) await browser.close()
  if (app) app.kill('SIGTERM')
  if (server) server.close()
}
