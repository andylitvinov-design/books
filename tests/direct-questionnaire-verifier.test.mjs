import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { assertQuestionnaireMode, enterGuestQuestionnaireMode } from '../scripts/helpers/direct-questionnaire-verifier.mjs'

const definition = { questions: [{ text: 'First exact question?' }, { text: 'Second exact question?' }, { text: 'Third exact question?' }] }

function fixture({ guest = false, mode = 'quick', runnerCount = 1, visible = true, preflight = 0, questionCount, questionTexts, guidedText, wrongPressed = false, brokenSwitch = false } = {}) {
  const state = { mode, clicks: [] }
  const base = guest ? 'cabinet-guest-runner' : 'hh-runner'
  const quick = guest ? '.cabinet-quick-question' : '.hh-quick-question'
  const guided = guest ? '.cabinet-guided-question' : '.hh-runner-question'
  const nodes = {
    preflight: { count: () => preflight },
    runner: { count: () => runnerCount, visible: () => visible && runnerCount === 1, className: () => 'panel ' + base + '--' + state.mode + ' ' + base,
      locator(selector) {
        if (selector === quick) return nodes.quick
        if (selector === guided) return nodes.guided
        assert.equal(selector, '.hh-test-mode-toggle')
        return nodes.choices
      } },
    quick: { count: () => state.mode === 'quick' ? questionCount ?? definition.questions.length : 0,
      getByRole(role, { level }) {
        assert.equal(role, 'heading'); assert.equal(level, guest ? 3 : 2)
        return { text: () => questionTexts ?? definition.questions.map(question => question.text), first: () => ({ visible: () => visible && nodes.quick.count() > 0 }) }
      } },
    guided: { count: () => state.mode === 'guided' ? 1 : 0,
      getByRole(role, { name, exact, level }) {
        assert.equal(role, 'heading'); assert.equal(exact, true); assert.equal(level, guest ? 3 : 1)
        return { visible: () => visible && state.mode === 'guided' && name === (guidedText ?? definition.questions[0].text) }
      } },
    choices: { getByRole(role, options) {
      assert.equal(role, 'button')
      if (!options) return { count: () => 2 }
      const requested = options.name.test('Quick') ? 'quick' : 'guided'
      assert.equal(options.name.test(requested === 'quick' ? 'Quick' : 'Guided'), true)
      return { attribute: key => { assert.equal(key, 'aria-pressed'); return String(wrongPressed ? state.mode !== requested : state.mode === requested) },
        async click() { state.clicks.push(requested); if (!brokenSwitch) state.mode = requested } }
    } },
  }
  const page = { locator(selector) {
    if (selector === '.' + base) return nodes.runner
    if (selector === '.cabinet-guest-runner .hh-test-mode-toggle') { assert.equal(guest, true); return nodes.choices }
    assert.equal(selector, '.hh-test-mode-picker, .hh-runner-mode-picker, .hh-test-mode-grid')
    return nodes.preflight
  } }
  const expect = node => ({
    async toHaveCount(count) { assert.equal(node.count(), count) },
    async toBeVisible() { assert.equal(node.visible(), true) },
    async toHaveClass(pattern) { assert.match(node.className(), pattern) },
    async toHaveText(text) { assert.deepEqual(node.text(), text) },
    async toHaveAttribute(key, value) { assert.equal(node.attribute(key), value) },
  })
  return { page, expect, state }
}

for (const guest of [false, true]) for (const mode of ['quick', 'guided']) {
  test(`${guest ? 'guest' : 'account'} asserts the actual ${mode} questionnaire without a click`, async () => {
    const { page, expect, state } = fixture({ guest, mode })
    await assertQuestionnaireMode(page, expect, { mode, guest, definition })
    assert.deepEqual(state.clicks, [])
  })
}

for (const mode of ['quick', 'guided']) test(`guest enters Quick directly before optional ${mode} selection`, async () => {
  const { page, expect, state } = fixture({ guest: true })
  await enterGuestQuestionnaireMode(page, expect, { mode, definition })
  assert.equal(state.mode, mode)
  assert.deepEqual(state.clicks, mode === 'guided' ? ['guided'] : [])
})

for (const [name, options] of [
  ['missing runner', { runnerCount: 0 }],
  ['duplicate runner', { runnerCount: 2 }],
  ['hidden runner', { visible: false }],
  ['obsolete preflight', { preflight: 1 }],
  ['wrong mode', { mode: 'guided' }],
  ['missing Quick question', { questionCount: 2 }],
  ['wrong exact question text', { questionTexts: ['Not the exact question', 'Second exact question?', 'Third exact question?'] }],
  ['wrong toggle state', { wrongPressed: true }],
]) test(`actual Quick assertion rejects ${name}`, async () => {
  const { page, expect } = fixture(options)
  await assert.rejects(assertQuestionnaireMode(page, expect, { mode: 'quick', guest: false, definition }))
})

test('Guided assertion rejects a different first question', async () => {
  const { page, expect } = fixture({ mode: 'guided', guidedText: 'A different question?' })
  await assert.rejects(assertQuestionnaireMode(page, expect, { mode: 'guided', guest: false, definition }))
})

test('a broken optional Guided toggle cannot pass on Quick questionnaire presence', async () => {
  const { page, expect } = fixture({ guest: true, brokenSwitch: true })
  await assert.rejects(enterGuestQuestionnaireMode(page, expect, { mode: 'guided', definition }))
})

test('guest Guided entry cannot silently start in Guided or bypass the direct Quick assertion', async () => {
  const { page, expect, state } = fixture({ guest: true, mode: 'guided' })
  await assert.rejects(enterGuestQuestionnaireMode(page, expect, { mode: 'guided', definition }))
  assert.deepEqual(state.clicks, [])
})

for (const name of ['verify-compassion-assessments.mjs', 'verify-asrs6.mjs', 'verify-personality-types.mjs', 'verify-mhc-sf.mjs', 'verify-relationships-assessments.mjs']) {
  test(`${name} uses the direct-runner helpers and retains both full answer journeys`, () => {
    const source = readFileSync(new URL('../scripts/' + name, import.meta.url), 'utf8')
    assert.match(source, /import \{ assertQuestionnaireMode, enterGuestQuestionnaireMode \} from '\.\/helpers\/direct-questionnaire-verifier\.mjs'/)
    assert.doesNotMatch(source, /hh-test-mode-grid|selectMode\(/)
    assert.match(source, /await assertQuestionnaireMode\(page,\s*expect,\s*\{\s*mode,\s*guest:\s*false,\s*definition(?::d)?\s*\}\)/)
    assert.match(source, /await enterGuestQuestionnaireMode\(page,\s*expect,\s*\{\s*mode,\s*definition(?::d)?\s*\}\)/)
    assert.match(source, /await fill\(page,\s*(?:d|definition),\s*mode,\s*false,\s*locale/)
    assert.match(source, /await fill\(page,\s*(?:d|definition),\s*mode,\s*true,\s*locale/)
    assert.match(source, /assertGuestScaleResult/)
    assert.match(source, /assert\.deepEqual\(errors,\s*\[\]\)/)
  })
}

test('ASRS6 reload verifies Quick directly and retains zero, missing-answer and original-date checks', () => {
  const source = readFileSync(new URL('../scripts/verify-asrs6.mjs', import.meta.url), 'utf8')
  assert.match(source, /await target\.reload\(\)\s+await assertQuestionnaireMode\(target, expect, \{ mode: 'quick', guest, definition \}\)/)
  assert.match(source, /assert\.equal\(await sourceNotice\(target, definition, guest, locale\), initialDate\)/)
  assert.match(source, /for \(let prior = 0; prior <= index; prior\+\+\)/)
  assert.match(source, /nth\(3\)\.locator\('\[aria-pressed="true"\]'\)\)\.toHaveCount\(0\)/)
})
