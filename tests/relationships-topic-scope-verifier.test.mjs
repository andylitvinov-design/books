import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source = readFileSync(new URL('../scripts/verify-relationships-assessments.mjs', import.meta.url), 'utf8')
const helper = source.slice(0, source.indexOf('\n}', source.indexOf('async function publicTopicButton')) + 2)
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
