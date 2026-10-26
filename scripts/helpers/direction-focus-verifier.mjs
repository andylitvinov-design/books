import assert from 'node:assert/strict'
import { getTopicJourney } from '../../lib/assessments/topic-journeys.js'
import { buildTopicTestSuggestions } from '../../lib/assessments/topic-test-suggestions.js'
import { buildExplorerEntries } from '../../lib/assessments/test-explorer.js'

// Public, source-defined catalog only. No client records or questionnaire answers.
export function directionTestContract(locale, direction, ids) {
  const journey = getTopicJourney(direction)
  assert.ok(journey, 'Known direction journey: ' + direction)
  assert.deepEqual(journey.topics.map(topic => topic.id), ids, 'Current topic IDs')
  assert.ok(['en', 'ru', 'es'].includes(locale), 'Supported public locale')
  const runnerLocale = locale === 'es' ? 'en' : locale
  return {
    locale, direction: journey.id, ids, runnerLocale,
    suggestions: buildTopicTestSuggestions(journey, locale),
    catalog: new Map(buildExplorerEntries({ locale: runnerLocale, audience: 'guest' })
      .map(entry => [entry.key, entry])),
  }
}

// Read each identified article separately: neither a global single-link locator
// nor a first-match fallback may hide extra cards, duplicate IDs or multiple actions in a card.
export async function assertDirectionTestState(page, contract, { topicId = '', expanded = false } = {}) {
  const { locale, direction, ids, runnerLocale, suggestions, catalog } = contract
  assert.ok(!topicId || ids.includes(topicId), 'Known selected topic')
  const name = locale + '/' + direction + '/' + (topicId || 'all')
  const root = page.locator('[data-direction-offers="' + direction + '"]')
  assert.equal(await root.count(), 1, 'Exactly one direction root: ' + name)
  const section = root.locator('[data-direction-section="test"]')
  assert.equal(await section.count(), 1, 'Exactly one test group: ' + name)
  const expectedIds = (topicId ? [topicId, ...ids.filter(id => id !== topicId)]
    : ['all-topics', ...ids.slice(0, 3)]).slice(0, expanded ? 4 : 2)
  const cards = section.locator('article[data-offer-type="test"]')
  assert.equal(await cards.count(), expanded ? 4 : 2, 'Exactly two initial cards or four expanded cards: ' + name)
  assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-offer-id'))),
    expectedIds, 'Selected topic is first; reset restores the overview: ' + name)
  assert.equal(await section.locator('[data-offer-action="test"]').count(), expectedIds.length,
    'Exactly one test action per visible card: ' + name)

  const hrefs = []
  for (const [index, id] of expectedIds.entries()) {
    const card = section.locator('article[data-offer-type="test"][data-offer-id="' + id + '"]')
    assert.equal(await card.count(), 1, 'Unique topic article: ' + name + '/' + id)
    assert.equal(await card.getAttribute('data-offer-index'), String(index + 1), 'Stable displayed card order: ' + name)
    const action = card.locator('[data-offer-action="test"]')
    assert.equal(await action.count(), 1, 'Exactly one scoped test action: ' + name + '/' + id)
    const href = await action.getAttribute('href')
    assert.equal(typeof href, 'string', 'Test destination is present: ' + name)
    const url = new URL(href, 'http://127.0.0.1')
    const key = url.searchParams.get('startTests')
    assert.ok(key, 'Suggested card starts one questionnaire, not a second picker: ' + name)
    assert.equal(href, '/' + runnerLocale + '/client?startTests=' + encodeURIComponent(key),
      'Exact supported guest locale and public key only: ' + name)
    const entry = catalog.get(key)
    assert.ok(entry?.selectable === true && entry.guestEligible === true && entry.startable === true && entry.starterEligible !== false &&
      entry.rightsStatus === 'cleared' && entry.definition?.key === key,
    'Questionnaire is guest-startable and rights-cleared: ' + name + '/' + id)
    const relevant = suggestions[id === 'all-topics' ? '' : id] ?? []
    assert.ok(relevant.some(item => item.key === key), 'Questionnaire belongs to this topic: ' + name + '/' + id)
    if (index === 0) assert.equal(key, relevant[0]?.key, 'First card uses the current primary suggestion: ' + name)
    hrefs.push(href)
  }
  assert.equal(new Set(hrefs.slice(0, 2)).size, 2, 'First two questionnaire destinations are distinct: ' + name)

  const more = section.locator('button[data-direction-show-more="test"]')
  assert.equal(await more.count(), 1, 'One inline expansion control: ' + name)
  assert.equal(await more.getAttribute('aria-expanded'), String(expanded), 'Accurate expansion state: ' + name)
  assert.equal(await more.getAttribute('aria-controls'), 'hh-direction-offers-test', 'Expansion controls its test list: ' + name)
  assert.equal(await section.locator('[id="hh-direction-offers-test"][role="list"]').count(), 1,
    'Expansion target is the one test list: ' + name)
  const all = section.locator('[data-direction-all="test"]')
  assert.equal(await all.count(), expanded ? 1 : 0, 'Catalog handoff appears only after expansion: ' + name)
  if (expanded) assert.equal(await all.getAttribute('href'), '/' + locale + '/client/tests?catalog=full',
    'Full catalog keeps the public locale, including Spanish: ' + name)
  for (const kind of ['course', 'session']) {
    const other = root.locator('[data-direction-section="' + kind + '"]')
    assert.equal(await other.count(), 1, 'Other offer group remains available: ' + name)
    assert.equal(await other.locator('article[data-offer-type="' + kind + '"]').count(), 2,
      'Test expansion must not expand another group: ' + name + '/' + kind)
    assert.equal(await other.locator('[data-direction-show-more="' + kind + '"]').getAttribute('aria-expanded'), 'false',
      'Other group expansion state stays independent: ' + name + '/' + kind)
  }
  return hrefs
}
