import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { ALCHEMY_PANEL_IDS, assertAlchemyPanelGeometry, collectAlchemyReviewGeometry, assertAlchemyReviewFeed } from '../scripts/helpers/alchemy-panel-contract.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const registry = read('components/personal-testimonials.tsx')
const sourceVideos = locale => {
  const block = registry.match(new RegExp('  ' + locale + ': \\[([\\s\\S]*?)\\n  \\]'))
  assert.ok(block)
  return [...block[1].matchAll(/id: "([A-Za-z0-9_-]{11})", title: "[^"]+", language: "(en|ru)"/g)]
    .map(([, id, audio]) => ({ id, audio }))
}
const panels = () => ALCHEMY_PANEL_IDS.map(name => ({ name, height: name === 'reviews' ? 5000 : 500, max: 764 }))
function feed(locale = 'en', width = 390) {
  const videos = [...sourceVideos(locale), ...sourceVideos(locale === 'ru' ? 'en' : 'ru')]
  return { cards: videos.map((video, i) => ({ ...video, top: 100 + i * 210, bottom: 300 + i * 210,
    width: Math.min(width - 30, 760), videoWidth: Math.min(width - 34, 756) })),
  clientWidth: Math.min(width - 30, 760), scrollWidth: Math.min(width - 30, 760), topGap: 20, bottomGap: 20 }
}
function publicDom(data) {
  const rect = card => ({ top: card.top, bottom: card.bottom, width: card.width })
  const cards = data.cards.map(card => ({
    getAttribute(name) {
      assert.ok(['data-testimonial-video-id', 'data-testimonial-original-audio'].includes(name), 'No private attribute may be read')
      return name === 'data-testimonial-video-id' ? card.id : card.audio
    },
    getBoundingClientRect: () => rect(card),
    querySelector(name) { assert.equal(name, '.site-video-frame'); return { getBoundingClientRect: () => ({ width: card.videoWidth }) } },
    get textContent() { throw Error('Text collection is forbidden') },
  }))
  const stack = { clientWidth: data.clientWidth, scrollWidth: data.scrollWidth, firstElementChild: cards[0],
    querySelectorAll(name) { assert.equal(name, '[data-testimonial-video-id]'); return cards } }
  const sectionBottom = data.cards.at(-1).bottom + 60
  return { getBoundingClientRect: () => ({ bottom: sectionBottom }), querySelector(name) {
    if (name === '[data-alchemy-review-stack]') return stack
    if (name === 'header') return { getBoundingClientRect: () => ({ bottom: data.cards[0].top - data.topGap }) }
    assert.equal(name, '[data-alchemy-review-note]')
    return { getBoundingClientRect: () => ({ bottom: sectionBottom - data.bottomGap }) }
  } }
}

test('actual landing keeps the approved ten chapter identities/order and unchanged source video registry', () => {
  const landing = read('components/alchemy-soul-landing.tsx')
  assert.deepEqual([...landing.matchAll(/data-alchemy-panel="([a-z-]+)"/g)].map(match => match[1]), ALCHEMY_PANEL_IDS)
  for (const locale of ['en', 'ru', 'es']) assert.equal(sourceVideos(locale).length, 6)
  assert.match(landing, /const reviews = \[\.\.\.testimonialVideos\[locale\], \.\.\.testimonialVideos\[locale === "ru" \? "en" : "ru"\]\]/)
})

test('exact ten panels retain nine one-screen caps and a separate long review feed', () => {
  const input = panels(), before = structuredClone(input)
  assertAlchemyPanelGeometry(input)
  assert.deepEqual(input, before)
  for (const panel of input) if (panel.name !== 'reviews') panel.height = panel.max
  assertAlchemyPanelGeometry(input)
})
for (const name of ALCHEMY_PANEL_IDS) test('rejects missing chapter ' + name, () => {
  assert.throws(() => assertAlchemyPanelGeometry(panels().filter(panel => panel.name !== name)), { code: 'ERR_ASSERTION' })
})
for (const name of ALCHEMY_PANEL_IDS.filter(name => name !== 'reviews')) test('retains exact height limit for ' + name, () => {
  const input = panels(); input.find(panel => panel.name === name).height = 765
  assert.throws(() => assertAlchemyPanelGeometry(input), { code: 'ERR_ASSERTION' })
})
test('rejects duplicate, unknown, reordered, extra and missing geometry even when count is ten', () => {
  for (const change of [p => { p[0].name = 'hero' }, p => { p[0].name = 'unknown' },
    p => { [p[0], p[1]] = [p[1], p[0]] }, p => p.push({ ...p[0] }),
    p => { p[0].height = 0 }, p => { p[0].height = NaN }, p => { p[0].max = Infinity }]) {
    const input = panels(); change(input)
    assert.throws(() => assertAlchemyPanelGeometry(input), { code: 'ERR_ASSERTION' })
  }
})
for (const locale of ['en', 'ru', 'es']) for (const width of [320, 360, 390, 430, 1280]) {
  test(locale + ' twelve approved original-language reviews at ' + width, () => {
    const data = feed(locale, width), before = structuredClone(data)
    assertAlchemyReviewFeed(data, { locale, width })
    assert.deepEqual(data, before)
  })
}
const feedMutations = {
  missing: d => d.cards.pop(), duplicate: d => { d.cards[1] = { ...d.cards[1], id: d.cards[0].id } },
  unapproved: d => { d.cards[0].id = 'xxxxxxxxxxx' }, audio: d => { d.cards[0].audio = 'ru' },
  order: d => { [d.cards[0], d.cards[1]] = [d.cards[1], d.cards[0]] },
  overlap: d => { d.cards[1].top = d.cards[0].bottom - 1 },
  narrow: d => { d.cards[0].width = 324; d.cards[0].videoWidth = 324 },
  inset: d => { d.cards[0].videoWidth = d.cards[0].width - 13 },
  hidden: d => { d.cards[0].bottom = d.cards[0].top },
  frame: d => { d.cards[0].videoWidth = 0 },
  overflow: d => { d.scrollWidth = d.clientWidth + 2 },
  topGap: d => { d.topGap = 56 }, bottomGap: d => { d.bottomGap = 56 }, missingNote: d => { d.bottomGap = null },
}
for (const [name, mutate] of Object.entries(feedMutations)) test('rejects malformed review feed: ' + name, () => {
  const data = feed(); mutate(data)
  assert.throws(() => assertAlchemyReviewFeed(data, { locale: 'en', width: 390 }), { code: 'ERR_ASSERTION' })
})
test('collector reads only public media identifiers/audio and geometry from an inert DOM', () => {
  const data = feed()
  assert.deepEqual(collectAlchemyReviewGeometry(publicDom(data)), data)
})

// Execute only the actual bounded geometry assertions, never the browser/DB
// script imports, setup, navigation, payments or enquiry callbacks.
test('actual core browser geometry block accepts current source but rejects oversize and malformed feeds', async () => {
  const script = read('scripts/verify-app-r1.mjs')
  const marker = 'max:window.innerHeight-80})))\n'
  const start = script.indexOf(marker) + marker.length
  assert.ok(start >= marker.length)
  const end = script.indexOf('     await assertAlchemyPaymentsExpanded(servicePage,expect,width)', start)
  assert.ok(end > start)
  const block = script.slice(start, end)
  const run = async (measurements, reviewData) => {
    const servicePage = { locator(selector) { assert.equal(selector, '[data-alchemy-panel="reviews"]'); return {
      evaluate(fn) { assert.equal(fn, collectAlchemyReviewGeometry); return fn(publicDom(reviewData)) },
    } } }
    return runInNewContext('(async () => {' + block + '\n})()', { assert, measurements, servicePage,
      locale: 'en', width: 390, assertAlchemyPanelGeometry, collectAlchemyReviewGeometry, assertAlchemyReviewFeed }, { timeout: 1000 })
  }
  await run(panels(), feed())
  const tall = panels(); tall.find(panel => panel.name === 'report').height = 765
  await assert.rejects(run(tall, feed()), { code: 'ERR_ASSERTION' })
  const overlapping = feed(); feedMutations.overlap(overlapping)
  await assert.rejects(run(panels(), overlapping), { code: 'ERR_ASSERTION' })
  assert.match(script, /assert\.equal\(await servicePage\.locator\('\[data-alchemy-payment-disclosure\]'\)\.count\(\),0,\s*'Payment methods are absent until the practitioner confirms the session'\)/)
  assert.match(script, /await assertAlchemyPaymentsExpanded\(servicePage,expect,width\)/)
  assert.match(script, /await assertPublicViewportFits\(servicePage,locale\+'\/'\+slug\+'\/'\+width\)/)
})
