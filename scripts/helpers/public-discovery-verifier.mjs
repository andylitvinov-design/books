import assert from 'node:assert/strict'
import { PORTRAIT_SECTORS } from '../../lib/assessments/portrait-sectors.js'
import { availableTestCollections } from '../../lib/assessments/test-collections.js'
import { buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches, searchPublicTestEntries, TEST_EXPLORER_AXES } from '../../lib/assessments/test-explorer.js'
import { groupViaRecommendations } from '../../lib/assessments/via-family.js'
import { getCompactNavigation } from '../../lib/site-navigation-model.js'

const COPY = {
  en: { collections: 'Test collections by topic (optional)', more: 'Show all collections', less: 'Show fewer collections', browse: 'Prioritize collection', raysMore: 'Show 7 more scales', raysLess: 'Show fewer scales' },
  ru: { collections: 'Подборки тестов по темам (необязательно)', more: 'Показать все подборки', less: 'Свернуть подборки', browse: 'Повысить приоритет подборки', raysMore: 'Показать ещё 7 шкал', raysLess: 'Свернуть остальные шкалы' },
  es: { collections: 'Colecciones de pruebas por tema (opcional)', more: 'Mostrar todas las colecciones', less: 'Mostrar menos', browse: 'Priorizar colección', raysMore: 'Ver 7 escalas más', raysLess: 'Mostrar menos escalas' },
}
const selectedKeys = picker => picker.locator('[data-public-selected-tests] [data-selected-test-key]')
const readSelection = picker => selectedKeys(picker).evaluateAll(nodes => nodes.map(node => node.dataset.selectedTestKey))

export async function assertPublicDiscoveryChrome(page, expect, locale) {
  const bar = page.locator('.ia222-bottom-navigation')
  const ribbon = page.locator('[data-sitewide-personal-review-banner]')
  if (locale === 'es') await expect(ribbon).toHaveCount(0)
  else await expect(ribbon).toBeVisible()
  await expect(bar).toHaveCount(1)
  await expect(bar).toBeVisible()
  const destinations = getCompactNavigation(locale)
  const links = bar.locator(':scope > a')
  await expect(links).toHaveCount(6)
  assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-nav-item'), href: node.getAttribute('href'), label: node.textContent.trim() }))), destinations.map(({ id, href, label }) => ({ id, href, label })))
  await expect(bar.locator('a[aria-current="page"]')).toHaveCount(1)
  await expect(bar.locator('a[aria-current="page"]')).toHaveAttribute('data-nav-item', 'tests')
}

export async function assertPublicCollectionChips(root, expect, locale, collections, width) {
  const copy = COPY[locale]
  assert.ok(Number.isFinite(width) && width > 0, 'Use the actual viewport for collapsed collection visibility')
  const collapsedCount = Math.min(2, collections.length)
  await expect(root).toBeVisible()
  await expect(root).toHaveAttribute('data-expanded', 'false')
  await expect(root).toHaveAttribute('aria-labelledby', 'hh-test-curated-heading')
  await expect(root).toHaveAccessibleName(copy.collections)
  const heading = root.getByRole('heading', { name: copy.collections, level: 2, exact: true })
  await expect(heading).toHaveCount(1)
  await expect(heading).toBeVisible()
  await expect(heading).toHaveAttribute('id', 'hh-test-curated-heading')
  const cards = root.locator('[data-test-collection]')
  await expect(cards).toHaveCount(collections.length)
  await expect(root.locator('[data-test-collection]:visible')).toHaveCount(collapsedCount)
  const names = []
  for (const [index, collection] of collections.entries()) {
    const card = cards.nth(index)
    const count = collection.count
    const unit = locale === 'ru'
      ? count % 10 === 1 && count % 100 !== 11 ? 'тест' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'теста' : 'тестов'
      : locale === 'es' ? count === 1 ? 'prueba' : 'pruebas' : count === 1 ? 'test' : 'tests'
    await expect(card).toHaveAttribute('data-test-collection', collection.id)
    const name = `${collection.title[locale]}. ${count} ${unit}. ${copy.browse}`
    names.push(name)
    // CSS-collapsed cards retain source attributes but have no accessible name.
    await expect(card).toHaveAttribute('aria-label', name)
    if (index < collapsedCount) {
      await expect(card).toBeVisible()
      await expect(card).toHaveAccessibleName(name)
    } else await expect(card).toBeHidden()
    await expect(card.locator('strong')).toHaveText(collection.title[locale])
    await expect(card.locator('span[aria-hidden="true"] > span')).toHaveText(String(count))
    await expect(card.locator('small')).toHaveCount(0)
  }
  const more = root.locator('button[aria-controls="hh-test-curated-grid"]')
  await expect(more).toHaveCount(1)
  await expect(more).toHaveAccessibleName(copy.more)
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await more.click()
  await expect(root).toHaveAttribute('data-expanded', 'true')
  await expect(more).toHaveAccessibleName(copy.less)
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  await expect(root.locator('[data-test-collection]:visible')).toHaveCount(collections.length)
  for (const [index, name] of names.entries()) {
    await expect(cards.nth(index)).toBeVisible()
    await expect(cards.nth(index)).toHaveAccessibleName(name)
  }
  await more.click()
  await expect(root).toHaveAttribute('data-expanded', 'false')
  await expect(more).toHaveAccessibleName(copy.more)
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await expect(root.locator('[data-test-collection]:visible')).toHaveCount(collapsedCount)
}

// These controls only filter real, cleared catalog entries. The synthetic page
// never starts a questionnaire, authenticates, or writes an account while browsing.
export function assertPublicCollectionMatches(shown, entries, collection, selectedKeys, preferences = {}) {
  const ranked = rankPublicTestMatches(filterExplorerEntries(entries, {
    availability:'available', selectedKeys, kinds:preferences.kinds || [], maxMinutes:preferences.maxMinutes || 0,
  }), { ...preferences, depth:preferences.depth || 'balanced',
    focus:[...new Set([...(preferences.focus || []), ...collection.focus])],
    collectionId:collection.id, collectionFocus:collection.focus })
  const expected = groupViaRecommendations(ranked,new Set(selectedKeys),false).visible.slice(0,5).map(entry=>entry.key)
  assert.ok(expected.length > 0)
  assert.equal(new Set(shown).size,shown.length,'Collection cards remain unique')
  assert.deepEqual(shown,expected,'The standard list uses the exact collection ranking, not a separate card layout or hard topic subset')
}

export async function exercisePublicCollections(page, expect, locale, initialPreferences = {}) {
  const picker = page.locator('[data-prelogin-test-picker]')
  const root = picker.locator('[data-test-topic-collections]')
  const entries = buildExplorerEntries({ locale: locale === 'es' ? 'en' : locale, audience: 'guest' })
  const collections = availableTestCollections(entries, initialPreferences)
  await expect(root).toHaveCount(1)
  const width = await page.evaluate(() => innerWidth)
  await assertPublicCollectionChips(root, expect, locale, collections, width)
  const more = root.locator('button[aria-controls="hh-test-curated-grid"]')

  const initial = await readSelection(picker)
  const manual = picker.locator('[data-test-match] input[type="checkbox"]:not(:checked)').first()
  await expect(manual).toBeVisible()
  await manual.check()
  await expect.poll(async () => (await readSelection(picker)).length).toBe(initial.length + 1)
  const preserved = await readSelection(picker)
  const currentUrl = page.url()
  const writes = []
  const observe = request => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/app/') && request.method() !== 'GET') writes.push(url.pathname)
  }
  page.on('request', observe)
  try {
    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(root.locator('[data-test-collection]:visible')).toHaveCount(collections.length)
    for (const id of ['stress', 'relationships', 'tantra', 'sexuality']) {
      const collection = collections.find(item => item.id === id)
      assert.ok(collection)
      const card = root.locator(`[data-test-collection="${id}"]`)
      // Clicking an already active collection clears it; select it explicitly.
      if (await card.getAttribute('aria-pressed') === 'true') await card.click()
      await card.click()
      await expect(card).toHaveAttribute('aria-pressed', 'true')
      await expect(root.locator('[data-test-collection][aria-pressed="true"]')).toHaveCount(1)
      const matches = picker.locator('[data-test-match]')
      await expect(matches.first()).toBeVisible()
      const shown = await matches.evaluateAll(nodes => nodes.map(node => node.dataset.testMatch))
      assertPublicCollectionMatches(shown, entries, collection, preserved, initialPreferences)
      assert.deepEqual(await readSelection(picker), preserved, 'Changing collections preserves only the manually selected battery')
      await expect(page).toHaveURL(currentUrl)
    }
    const active = root.locator('[data-test-collection="sexuality"]')
    await active.click()
    await expect(root.locator('[data-test-collection][aria-pressed="true"]')).toHaveCount(0)
    assert.deepEqual(await readSelection(picker), preserved, 'Clearing a collection does not auto-enroll intimate questionnaires')
    // Catalog search must cross an unrelated topic while preserving that topic
    // for recommendations and retaining every explicitly selected test.
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    const sleep = root.locator('[data-test-collection="sleep"]')
    await sleep.click()
    await expect(sleep).toHaveAttribute('aria-pressed', 'true')
    const search = picker.locator('#hh-test-hero-search')
    const query = locale === 'ru' ? 'Любовь' : locale === 'es' ? 'amor' : 'Love'
    await search.fill(query)
    await search.press('Enter')
    const sleepCollection = collections.find(item=>item.id==='sleep')
    const searchable = rankPublicTestMatches(filterExplorerEntries(entries, { availability: 'available', kinds: [], maxMinutes: 0 }), { depth: initialPreferences.depth || 'balanced', focus: sleepCollection.focus, collectionId:'sleep', collectionFocus:sleepCollection.focus })
    const expectedSearch = searchPublicTestEntries(groupViaRecommendations(searchable, new Set(preserved), false).visible, query).slice(0, 5).map(entry => entry.key)
    assert.ok(expectedSearch.length > 0)
    await expect.poll(() => picker.locator('[data-test-match]').evaluateAll(nodes => nodes.map(node => node.dataset.testMatch))).toEqual(expectedSearch)
    await expect(picker.locator('[data-via-family]')).toHaveCount(0)
    await expect(sleep).toHaveAttribute('aria-pressed', 'true')
    assert.deepEqual(await readSelection(picker), preserved, 'Love search does not auto-select intimate questionnaires')
    await expect(page).toHaveURL(currentUrl)
    await root.locator('[data-test-collection="sexuality"]').click()
    await expect(search).toHaveValue('')
    await expect(root.locator('[data-test-collection="sexuality"]')).toHaveAttribute('aria-pressed', 'true')
    assert.deepEqual(await readSelection(picker), preserved)
    await root.locator('[data-test-collection="sexuality"]').click()
    await more.click()
    assert.deepEqual(writes, [], 'Collection browsing must not create runs, save intents or account writes')
  } finally { page.off('request', observe) }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), locale + ' collection picker fits the viewport')
}

// Exercise the current measured-axis and four-sector contract through real controls.
// Restore the original fine selection and all sectors before the report journey resumes.
export async function exercisePortraitRays(portrait, expect, locale) {
  const options = portrait.locator('[data-portrait-ray-options]')
  const inputs = options.locator('input[type="checkbox"]')
  const rays = portrait.locator('svg[role="img"] > g:has(> line[x1="180"][y1="182"])')
  const sectors = portrait.locator('[data-portrait-sectors]')
  const defaultSector = sectors.locator('[data-portrait-sector-all]')
  const originals = new Map()
  await expect(sectors.locator('[data-portrait-sector]')).toHaveCount(4)
  await expect(defaultSector).toHaveAttribute('aria-pressed', 'true')
  await expect(defaultSector).toHaveCount(1)
  await expect(inputs).toHaveCount(0)
  await expect(rays).toHaveCount(4)
  await sectors.locator('[data-portrait-sector="body"]').click()
  await expect(inputs).toHaveCount(PORTRAIT_SECTORS[0].axes.length)
  let total = 0
  for (const sector of PORTRAIT_SECTORS) {
    const button = sectors.locator(`[data-portrait-sector="${sector.key}"]`)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    for (const other of PORTRAIT_SECTORS.filter(item => item.key !== sector.key)) await expect(sectors.locator(`[data-portrait-sector="${other.key}"]`)).toHaveAttribute('aria-pressed', 'false')
    await expect(portrait.locator('[data-sector-point]')).toHaveCount(0)
    await expect(inputs).toHaveCount(sector.axes.length)
    const initial = await inputs.evaluateAll(nodes => nodes.map(node => ({checked: node.checked, score: node.parentElement.querySelector('strong')?.textContent.trim()})))
    for (const item of initial) assert.ok(item.score === '—' || /^\d+(?:\.\d+)? \/ \d+(?:\.\d+)?$/.test(item.score))
    const original = initial.map(item => item.checked)
    assert.deepEqual(original, initial.map(() => true), 'All sector axes are selectable by default; unmeasured scores remain explicit dashes')
    originals.set(sector.key, original)
    await expect(rays).toHaveCount(original.filter(Boolean).length)
    for (let index = 0; index < sector.axes.length; index++) await inputs.nth(index).check()
    await expect(inputs).toHaveCount(sector.axes.length)
    await expect(options.locator('input:checked')).toHaveCount(sector.axes.length)
    await expect(options.locator('input:disabled')).toHaveCount(0)
    await expect(rays).toHaveCount(sector.axes.length)
    total += sector.axes.length
  }
  assert.equal(total, 17, 'All 17 fine choices remain selectable across four sectors')
  for (const sector of PORTRAIT_SECTORS) {
    const button = sectors.locator(`[data-portrait-sector="${sector.key}"]`)
    await button.click()
    await expect(options.locator('input:checked')).toHaveCount(sector.axes.length)
    await inputs.nth(sector.axes.length - 1).uncheck()
    const other = PORTRAIT_SECTORS.find(item => item.key !== sector.key)
    await sectors.locator(`[data-portrait-sector="${other.key}"]`).click()
    await expect(inputs).toHaveCount(other.axes.length)
    await button.click()
    assert.equal((await inputs.evaluateAll(nodes => nodes.map(node => node.checked)))[sector.axes.length - 1], false, 'Sector switches preserve fine choices')
    const original = originals.get(sector.key)
    for (let index = 0; index < original.length; index++) {
      if (original[index]) await inputs.nth(index).check(); else await inputs.nth(index).uncheck()
    }
    assert.deepEqual(await inputs.evaluateAll(nodes => nodes.map(node => node.checked)), original)
    await expect(rays).toHaveCount(original.filter(Boolean).length)
  }
  await defaultSector.click()
  await expect(defaultSector).toHaveAttribute('aria-pressed', 'true')
  await expect(defaultSector).toHaveCount(1)
  await expect(inputs).toHaveCount(0)
  await expect(rays).toHaveCount(4)
}
