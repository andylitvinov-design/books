import { homeFixture, assertDeferredHome, readHomeSource } from './helpers/home-source-render-fixture.mjs';
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const home = read('components/holistic-house-home.tsx')
const spanishHome = read('app/es/page.tsx')
const journeys = read('components/homepage-topic-journeys.tsx')

// The owner explicitly removed the obsolete blue marketing block.
// Keep this regression guard so future homepage redesigns cannot revive it.
test('broken legacy free-test promo is absent from all home locales and source', () => {
  for (const page of [home, spanishHome]) {
    assert.doesNotMatch(page, /HomeFreeTestsBanner|home-free-tests-banner|data-home-free-tests-banner/)
  }
  assert.equal(existsSync(new URL('../components/home-free-tests-banner.tsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/home-free-tests-banner.module.css', import.meta.url)), false)
})

test('visible Energy Love Business directions precede the deferred photo-led services', async () => {
  for (const locale of ['en', 'ru']) await assertDeferredHome(homeFixture({ locale }), locale)
  assert.match(journeys, /id="hh-topic-journeys"/)
  assert.ok(journeys.includes('directions.map'))
  assert.ok(journeys.includes("direction.id === 'relationships' ? 'love' : direction.id"))
  assert.match(home, /data-hero-cta": "free-tests"/)
  assert.match(home, /event="self_check_start"/)
  assert.ok(home.includes('<HomepageContactCta locale={locale} />'))
})

test('the rendered-home contract rejects disconnected, hidden and misrouted source graphs', async () => {
  const cases = [
    ['components/holistic-house-home.tsx', '<HomeMoreDisclosure locale={locale}>', '<div>', '</HomeMoreDisclosure>', '</div>'],
    ['components/home-more-disclosure.tsx', '<ServicesSolutions locale={locale} variant="home" />', 'null'],
    ['components/home-more-disclosure.tsx', '{expanded ? (locale === "es"', '{false ? (locale === "es"'],
    ['components/home-more-disclosure.tsx', 'useState(false)', 'useState(true)'],
    ['components/home-more-disclosure.tsx', 'onToggle={event => setExpanded(event.currentTarget.open)}', 'onToggle={() => {}}'],
    ['components/home-more-disclosure.tsx', '"/" + locale + "/client/tests"', '"/" + locale + "/client/private-results"'],
    ['components/homepage-topic-journeys.tsx', "'/explore/'", "'/missing-explore/'"],
    ['components/services-solutions.tsx', 'allOffers.filter((offer) => offer.id !== "business")', 'allOffers.filter((offer) => offer.id !== "business" && offer.id !== "dao")'],
  ];
  for (const [file, from, to, extraFrom, extraTo] of cases) {
    const original = readHomeSource(file);
    assert.ok(original.includes(from), file + ': mutation target');
    let changed = original.replace(from, to);
    if (extraFrom) { assert.ok(changed.includes(extraFrom)); changed = changed.replace(extraFrom, extraTo); }
    await assert.rejects(() => assertDeferredHome(homeFixture({ overrides: { [file]: changed } }), 'en'), { name: 'AssertionError' }, file);
  }
});
