import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source = readFileSync(new URL('../scripts/verify-relationships-assessments.mjs', import.meta.url), 'utf8')
const helperStart = source.indexOf('async function publicTopicButton')
assert.ok(helperStart >= 0)
const helper = source.slice(helperStart, source.indexOf('\n}', helperStart) + 2)
assert.ok(helper.includes('return button'))
function harness(locale, { groupCount = 1, buttonCount = 1, visible = true, filterOnly = false } = {}) {
  const title = locale === 'ru' ? 'Отношения' : 'Relationships'
  const topicName = locale === 'ru' ? 'Что вы хотите исследовать?' : 'What would you like to explore?'
  const button = { count: filterOnly ? 0 : buttonCount, visible, pressed: 'true', role: 'topic' }
  const group = { count: groupCount, getByRole(role, options) { assert.equal(role, 'button'); assert.deepEqual(options, { name: title, exact: true }); return button } }
  const picker = { getByRole(role, options) { assert.equal(role, 'group'); assert.deepEqual(options, { name: topicName, exact: true }); return group } }
  const expect = target => ({
    async toHaveCount(count) { assert.equal(target.count, count) },
    async toBeVisible() { assert.equal(target.visible, true) },
  })
  const select = new Function('expect', `${helper}; return publicTopicButton`)(expect)
  return { select: () => select(picker, locale, title), button }
}
for (const locale of ['en', 'ru']) {
  test(`actual ${locale} helper selects unique visible topic rather than same-named filter`, async () => {
    const h = harness(locale); assert.equal(await h.select(), h.button)
    for (const bad of [{groupCount:0},{groupCount:2},{buttonCount:2},{visible:false},{filterOnly:true}])
      await assert.rejects(harness(locale,bad).select())
  })
}
test('focused relationship state and boundary/consent assertions remain strict', () => {
  assert.match(source, /expect\(await publicTopicButton\(focusedPicker,locale,locale==='ru'\?'Отношения':'Relationships'\)\)\.toHaveAttribute\('aria-pressed','true'\)/)
  assert.match(source, /data-problem-key="boundaries"/)
  assert.match(source, /data-problem-key="consent-pressure"/)
  assert.doesNotMatch(helper, /\.first\(|\.nth\(|force:/)
})

// Exercise the exact hosted verifier block without any network or account data.
const courseStart = source.indexOf("  const directCourseAction=")
const courseEnd = source.indexOf('  await assertBoundaryConcerns()', courseStart)
assert.ok(courseStart > 0 && courseEnd > courseStart)
const verifyCourse = new (Object.getPrototypeOf(async function () {}).constructor)(
  'focusedPicker', 'expect', 'locale', source.slice(courseStart, courseEnd))
async function directCourse(locale, overrides = {}) {
  const action = { count: 1, mode: 'course', visible: true, enabled: true,
    text: locale === 'ru' ? 'Начать персональный курс' : 'Start my personal course', ...overrides }
  const focusedPicker = { locator(selector) { assert.equal(selector, '[data-test-start-mode]'); return action } }
  const expect = actual => ({
    async toHaveCount(value) { assert.equal(actual.count, value) },
    async toHaveAttribute(name, value) { assert.equal(name, 'data-test-start-mode'); assert.equal(actual.mode, value) },
    async toBeVisible() { assert.equal(actual.visible, true) },
    async toBeEnabled() { assert.equal(actual.enabled, true) },
    async toContainText(value) { assert.ok(actual.text.includes(value)) },
  })
  await verifyCourse(focusedPicker, expect, locale)
}
for (const locale of ['en', 'ru']) test(`direct ${locale} course handoff remains unique, visible, enabled and exact`, async () => {
  await directCourse(locale)
  for (const bad of [{ count: 0 }, { count: 2 }, { mode: 'tests' }, { visible: false }, { enabled: false }, { text: 'Wrong action' }])
    await assert.rejects(directCourse(locale, bad))
})
test('hosted journey verifies distinct tests/course routes and absence of removed switch', () => {
  assert.ok(source.includes(".toHaveAttribute('data-test-start-mode','tests')"))
  assert.ok(source.includes(".toHaveAttribute('data-test-start-mode','course')"))
  assert.ok(source.includes("expect(focusedPicker.locator('[data-test-course-switch]')).toHaveCount(0)"))
  assert.doesNotMatch(source, /testsMode\.click|courseMode\.click/)
})
