import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, nodes, textOf, account, courseA, courseView } from './helpers/course-ui-harness.mjs'
import * as programs from '../lib/inner-growth/course-programs.js'

const today = new Date().toISOString()
const tests = [
  { key: 'hh-weekly-pulse', title: 'Weekly Pulse', definitionVersion: 1, instrumentLocale: 'en', completed: true, completedAt: today, durationMinutes: 2 },
  { key: 'gad-7', title: 'Anxiety Deep Dive', definitionVersion: 1, instrumentLocale: 'en', completed: true, completedAt: today, durationMinutes: 2 },
  { key: 'hh-resource-pulse', title: 'Resources & Inner Support', definitionVersion: 1, instrumentLocale: 'en', completed: true, completedAt: today, durationMinutes: 2 },
]
const extraModules = {
  '@/lib/inner-growth/course-strategy': {
    courseMeasuredProfile: () => ({ eligible: [], scales: [] }),
    courseRecommendedTests: () => tests,
    courseSuggestedFocus: () => [],
  },
  '@/lib/inner-growth/course-programs': { ...programs, suggestCourseProgramScales: () => [] },
  './course-completion-review': { default: () => null },
  './course-focus-picker': { default: () => null },
}
const current = { ...courseA, stage: 2, presetId: null, focusTags: ['stress', 'mood', 'energy'], testKeys: [] }
const view = () => courseView(current, { assessments: { selectedTests: [], planKeys: [] } })
const find = (tree, attribute) => nodes(tree).find(node => node.props?.[attribute] !== undefined)
const render = locale => mount('course-r3-steps', {
  props: {
    stage: 2, locale, data: account('owner-a'), state: view(), busy: false,
    root: '/' + locale + '/app', quickEntry: true, onAct() {}, onCourseCommand() {},
    onCourseRead() {}, isCourseCurrent: () => true, onState() {}, onError() {},
  },
  extraModules,
  fetcher: () => assert.fail('Explanation must not send a request'),
})

test('OPORA starting screen explains before/after measurement clearly in EN, RU and ES', async () => {
  for (const [locale, words] of [
    ['en', ['BEFORE LESSON 1', 'AFTER LESSON 14', 'not a diagnosis']],
    ['ru', ['ДО ПЕРВОГО УРОКА', 'ПОСЛЕ 14 УРОКОВ', 'не является диагнозом']],
    ['es', ['ANTES DE LA LECCIÓN 1', 'DESPUÉS DE 14 LECCIONES', 'no es un diagnóstico']],
  ]) {
    const h = render(locale)
    await h.settle()
    const explainer = find(h.tree, 'data-course-baseline-explanation')
    assert.ok(explainer, locale + ' baseline explainer is visible')
    const copy = textOf(explainer)
    for (const phrase of words) assert.ok(copy.includes(phrase), locale + ' must explain ' + phrase)
    assert.ok(find(h.tree, 'data-course-antistress-pretests'), 'test picker remains visible')
    h.unmount()
  }
})

test('existing recent Weekly Pulse remains saved and primary action offers to continue', async () => {
  const h = render('en')
  await h.settle()
  const alreadySaved = find(h.tree, 'data-course-baseline-reused')
  assert.ok(alreadySaved)
  assert.match(textOf(alreadySaved), /do not need to repeat/i)
  const action = find(h.tree, 'data-antistress-start-first-test')
  assert.ok(action)
  assert.match(textOf(action), /Use saved results & continue/)
  assert.equal(action.props.disabled, false)
  assert.equal(find(h.tree, 'data-course-required-baseline')?.props?.['data-course-required-baseline'], 'true')
  h.unmount()
})

test('missing baseline offers a check-in without claiming the course has measured change', async () => {
  const original = tests[0]
  tests[0] = { ...original, completed: false, completedAt: null }
  try {
    const h = render('en')
    await h.settle()
    assert.equal(find(h.tree, 'data-course-baseline-reused'), undefined)
    assert.match(textOf(find(h.tree, 'data-antistress-start-first-test')), /Start my starting check-in/)
    assert.match(textOf(find(h.tree, 'data-course-baseline-explanation')), /not a diagnosis or proof/i)
    h.unmount()
  } finally {
    tests[0] = original
  }
})
