import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { getTopicJourney } from '../lib/assessments/topic-journeys.js'
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from '../lib/site-navigation-model.js'

test('Legacy Energy / Love / Business categories remain available in More but not fixed bottom tabs', () => {
  assert.equal(getTopicJourney('love').id, 'relationships', 'No second questionnaire or course catalog')
  for (const locale of ['en', 'ru', 'es']) {
    const primary = getSiteNavigation(locale)
    const bottom = getCompactNavigation(locale)
    assert.deepEqual(bottom.map(item => item.id), ['profile','courses','home','analysis','alchemy','pro','temple'])
    assert.equal(bottom.find(item => item.id === 'alchemy')?.href, '/' + locale + '/services/alchemy-of-soul')
    assert.equal(activeCompactNavigationId('/' + locale + '/services/alchemy-of-soul'), 'alchemy')
    assert.ok(!bottom.some(item => item.id === 'coaching'), 'The old Coaching bottom tab must not return')
    for (const [id, slug] of [['energy','energy'],['love','love'],['business','business']]) {
      assert.equal(primary.find(item => item.id === id).href, '/' + locale + '/explore/' + slug)
      assert.ok(!bottom.some(item => item.id === id), 'Topic remains outside fixed bottom bar')
      assert.equal(activeCompactNavigationId('/' + locale + '/explore/' + slug), undefined)
    }
    assert.equal(activeCompactNavigationId('/' + locale + '/explore/relationships'), undefined)
  }
})

test('Public discovery reuses photo assets and existing catalog routes', async () => {
  const card = await readFile('components/direction-offers.tsx','utf8')
  const styles = await readFile('components/direction-offers.module.css','utf8')
  const route = await readFile('app/[locale]/explore/[theme]/page.tsx','utf8')
  const home = await readFile('components/homepage-topic-journeys.tsx','utf8')
  const more = await readFile('components/home-more-disclosure.tsx','utf8')
  const site = await readFile('components/site-navigation.tsx','utf8')
  const spanish = await readFile('app/es/page.tsx','utf8')
  for (const token of [
    'data-offer-type', 'data-offer-action', 'data-direction-filter', 'journeyFocusForTopics',
    'client/tests?focus=', 'courses/antistress', 'services/', 'business-consulting',
    'systemic-constellations', 'prefetch={false}', "direction === 'relationships' ? 'love'",
  ]) assert.ok(card.includes(token), token)
  for (const token of [
    '@media(max-width:430px)', '@media(max-width:350px)',
    'grid-template-columns:92px minmax(0,1fr)',
  ]) assert.ok(styles.includes(token), token)
  assert.ok(route.includes("theme === 'relationships') redirect"))
  assert.ok(route.includes('<DirectionExtras'))
  assert.ok(route.includes('<TopicJourneySelector'))
  assert.ok(home.includes("direction.id === 'relationships' ? 'love'"))
  assert.ok(spanish.includes('<HomeMoreDisclosure locale="es" />'))
  assert.ok(!more.includes('<HomepageTopicJourneys locale='))
  assert.ok(more.includes('data-home-topic-filter="energy"'))
  assert.ok(more.includes('data-home-topic-filter="business"'))
  assert.ok(site.includes("id: 'services'"))
  // The old hard-coded Academy nav item was replaced by the canonical
  // Courses item; it still resolves to the Academy catalog.
  const model = await readFile('lib/site-navigation-model.js', 'utf8')
  assert.ok(site.includes("'library', 'events'"))
  assert.ok(site.includes("getCompactNavigation(activeLocale)"))
  assert.ok(model.includes("courses: 'academy'"))
})


test('all course CTAs open a real existing learning route, not the tests picker again', async () => {
  const cards = await readFile('components/direction-offers.tsx','utf8')
  assert.match(cards, /direction === 'business'\s*\?\s*'\/' \+ locale \+ '\/coaching'/)
  assert.match(cards, /: '\/' \+ locale \+ '\/courses\/antistress'/)
  assert.doesNotMatch(cards, /testHref \+ '&mode=course'/)
  assert.match(cards, /OPORA · Inner support/)
  assert.match(cards, /ОПОРА · Внутренняя поддержка/)
  assert.match(cards, /OPORA · Apoyo interior/)
  assert.doesNotMatch(cards, /course: 'Practices for trust and boundaries'/)
  // These URLs are already implemented, so do not introduce a second course
  // or falsely promise a specialized relationships syllabus.
  const en = await readFile('app/[locale]/courses/antistress/page.tsx','utf8')
  const business = await readFile('app/[locale]/app/[[...path]]/page.jsx','utf8')
  assert.ok(en.length > 100)
  assert.ok(business.length > 100)
})

test('Energy, Love and Business share compact translucent tabs at the hero top right', async () => {
  const cards = await readFile('components/direction-offers.tsx', 'utf8')
  const css = await readFile('components/direction-offers.module.css', 'utf8')
  assert.match(cards, /<nav className=\{styles\.switcher\}/)
  assert.match(cards, /directionIds\.map\(id => <Link/)
  assert.match(cards, /aria-current=\{id === direction \? 'page' : undefined\}/)
  assert.match(cards, /directionCopy\[id\]\[locale\]\.name/)
  const shell = css.match(/\.switcher\{([^}]*)\}/)?.[1]
  assert.ok(shell, 'shared segmented switcher has its own styles')
  assert.match(shell, /right:20px/, 'align the switcher to the top right')
  assert.doesNotMatch(shell, /left:/, 'do not anchor it to the left')
  assert.match(shell, /background:rgb\(24 35 43 \/ 36%\)/, 'a subtle translucent dark glass backdrop')
  assert.match(shell, /backdrop-filter:blur\(12px\)/)
  assert.match(css, /\.switcher a\[aria-current="page"\]\{[^}]*background:rgb\(255 252 247 \/ 95%\)/)
  assert.match(css, /\.switcher a:hover:not\(\[aria-current="page"\]\)/)
  assert.match(css, /@media\(max-width:480px\)\{[\s\S]*?\.switcher\{top:10px;right:11px;/)
  assert.match(css, /\.switcher a\{min-height:40px;padding:7px 11px;font-size:11px\}/)
})
