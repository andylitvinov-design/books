import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../scripts/verify-relationships-assessments.mjs', import.meta.url), 'utf8')
const start = source.indexOf("  const actions=journey.locator('[data-topic-action]')")
const end = source.indexOf("  const testsAction=journey.locator('button[data-topic-action=\"tests\"]')", start)
assert.ok(start > 0 && end > start, 'Extract the actual native action checks, not a duplicate implementation')
const block = source.slice(start, end)
const verify = new (Object.getPrototypeOf(async function () {}).constructor)('journey', 'expect', 'assert', 'locale', block)
const identities = ['tests', 'browse', 'course', 'review', 'consultation']
const copy = {
  en: {
    label: 'Discuss this topic with Andrey',
    detail: 'Optional personal session, independent of your test scores. €50 / 30 min or €100 / 60 min.',
  },
  ru: {
    label: 'Обсудить тему лично с Андреем',
    detail: 'Необязательная сессия независимо от баллов теста: €50 / 30 мин или €100 / 60 мин.',
  },
}

async function run(locale, { sequence = identities, ...overrides } = {}) {
  const consultation = {
    tag: 'a', visible: true, service: 'relationships', href: '/' + locale + '/services/systemic-constellations',
    label: copy[locale].label, detail: copy[locale].detail, ...overrides,
  }
  const actions = sequence.map(id => ({ dataset: { topicAction: id }, ...(id === 'consultation' ? consultation : {}) }))
  const collection = nodes => ({ nodes,
    async evaluateAll(fn) { return fn(nodes) },
    locator(selector) {
      assert.ok(['strong', 'small'].includes(selector), selector)
      return collection(nodes.map(node => ({ text: selector === 'strong' ? node.label : node.detail })))
    },
    click() { assert.fail('The correction must not navigate or submit the consultation') },
  })
  const journey = { locator(selector) {
    if (selector === '[data-topic-action]') return collection(actions)
    assert.equal(selector, 'a[data-topic-action="consultation"]')
    return collection(actions.filter(node => node.dataset.topicAction === 'consultation' && node.tag === 'a'))
  } }
  const expect = target => ({
    async toHaveCount(count) { assert.equal(target.nodes.length, count) },
    async toBeVisible() { assert.equal(target.nodes.length, 1); assert.equal(target.nodes[0].visible, true) },
    async toHaveAttribute(name, value) {
      assert.equal(target.nodes.length, 1)
      assert.ok(['data-topic-service', 'href'].includes(name), name)
      assert.equal(target.nodes[0][name === 'href' ? 'href' : 'service'], value)
    },
    async toHaveText(value) { assert.equal(target.nodes.length, 1); assert.equal(target.nodes[0].text, value) },
  })
  await verify(journey, expect, assert, locale)
}

for (const locale of ['en', 'ru']) {
  test(`actual ${locale} verifier retains five distinct ordered actions and exact optional consultation`, () => run(locale))

  test(`${locale} missing, duplicate, extra or reordered action identities fail`, async () => {
    for (const id of identities) {
      await assert.rejects(run(locale, { sequence: identities.filter(value => value !== id) }), undefined, 'missing ' + id)
      await assert.rejects(run(locale, { sequence: [...identities, id] }), undefined, 'duplicate ' + id)
    }
    await assert.rejects(run(locale, { sequence: [...identities, 'payment'] }))
    for (let index = 1; index < identities.length; index++) {
      const sequence = [...identities]
      ;[sequence[index - 1], sequence[index]] = [sequence[index], sequence[index - 1]]
      await assert.rejects(run(locale, { sequence }), undefined, 'wrong order ' + identities[index])
    }
    await assert.rejects(run(locale, { sequence: ['tests', 'browse', 'course', 'review', 'payment'] }))
  })

  test(`${locale} consultation cannot silently become another service, locale, price or free-review action`, async () => {
    const wrongLocale = locale === 'ru' ? 'en' : 'ru'
    for (const bad of [
      { tag: 'button' }, { visible: false }, { service: undefined }, { service: 'business' },
      { href: '/' + wrongLocale + '/services/systemic-constellations' },
      { href: '/' + locale + '/services/alchemy-of-soul' },
      { href: '/' + locale + '/services/free-situation-review' },
      { href: '/' + locale + '/services/systemic-constellations?score=10' },
      { label: copy[wrongLocale].label }, { label: 'Free review' },
      { detail: '' }, { detail: copy[locale].detail.replace('€50', '€0') },
      { detail: 'Required session based on your test scores.' },
    ]) await assert.rejects(run(locale, bad), undefined, JSON.stringify(bad))
  })
}

test('correction remains read-only and retains the following test/browse/course/free-review gates', () => {
  assert.doesNotMatch(block, /\.click\(|\.fill\(|\.press\(|\.goto\(/)
  for (const fragment of [
    "await expect(testsAction).toHaveAttribute('type','button')",
    "await expect(testsAction).toBeEnabled()",
    "await expect(journey.locator('[data-recommended-test]')).toHaveCount(2)",
    "await expect(journey.locator('[data-topic-action=\"review\"]')).toHaveAttribute('href','/'+locale+'/services/free-situation-review')",
    "await expect(browseAction).toHaveAttribute('href','/'+locale+'/client/tests?focus=relationships%2Cintimacy&journey=relationships&topics=&catalog=full')",
    "await expect(courseAction).toHaveAttribute('href','/'+locale+'/client/tests?focus=relationships%2Cintimacy&journey=relationships&topics=&mode=course')",
  ]) assert.ok(source.includes(fragment), fragment)
})
