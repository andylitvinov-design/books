import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
    assert.match(textOf(find(h.tree, 'data-antistress-start-first-test')), /Use saved results & continue/)
    assert.match(textOf(find(h.tree, 'data-course-baseline-explanation')), /not a diagnosis or proof/i)
    h.unmount()
  } finally {
    tests[0] = original
  }
})

test('one-screen starting check-in keeps the real choices and CTA visible without tall step cards', async () => {
  const h = render('en')
  await h.settle()
  assert.ok(find(h.tree, 'data-course-baseline-one-screen'))
  const hero = find(h.tree, 'data-course-baseline-explanation')
  assert.ok(hero)
  assert.doesNotMatch(JSON.stringify(hero), /baselineStep|baselineNumber/)
  const picker = find(h.tree, 'data-course-antistress-pretests')
  assert.ok(picker)
  const rows = nodes(picker).filter(node => node.props?.['data-checked'] !== undefined)
  assert.equal(rows.length, 3, 'weekly, anxiety and resource check-ins remain')
  assert.deepEqual(rows.map(row => row.props['data-checked']), [true, true, true],
    'all three short tests are preselected for a new OPORA course')
  assert.ok(textOf(hero).includes('3 free short tests'), 'the value proposition appears in the hero')
  assert.match(textOf(find(h.tree, 'data-course-baseline-reused')), /saved.*do not need to repeat/i)

  assert.ok(find(h.tree, 'data-antistress-start-first-test'), 'primary CTA remains')
  h.unmount()

  const css = readFileSync(new URL('../components/app/course-r3-steps.module.css', import.meta.url), 'utf8')
  const parent = readFileSync(new URL('../components/app/my-course.jsx', import.meta.url), 'utf8')
  const parentCss = readFileSync(new URL('../components/app/my-course.module.css', import.meta.url), 'utf8')
  assert.ok(css.includes('.compactTests .shortTestList{gap:6px;margin:0;max-height:clamp('))
  assert.ok(css.includes('overflow-y:auto;overscroll-behavior:contain'))
  assert.ok(css.includes('.compactTests .fastTestButton{min-height:47px'))
  assert.match(parent, /data-opora-baseline-compact-nav/)
  assert.match(parent, /!compactBaselineNav && <footer/)
  assert.ok(parentCss.includes('.compactBaselineNav{display:flex'))
})


test('when no starter check-in is saved, one primary action offers all three free tests', async () => {
  const original = tests.slice()
  try {
    tests.splice(0, tests.length, ...original.map(item => ({...item, completed:false, completedAt:null})))
    const h = render('en')
    await h.settle()
    assert.equal(find(h.tree, 'data-course-baseline-reused'), undefined)
    assert.match(textOf(find(h.tree, 'data-antistress-start-first-test')), /Start my 3 free check-ins/)
    h.unmount()
  } finally {
    tests.splice(0, tests.length, ...original)
  }
})

test('three free check-ins are preselected yet both optional choices remain removable', async () => {
  const h = render('en')
  await h.settle()
  const initialRows = nodes(find(h.tree, 'data-course-antistress-pretests'))
    .filter(node => node.props?.['data-checked'] !== undefined)
  assert.deepEqual(initialRows.map(row => row.props['data-checked']), [true, true, true])
  const initialInputs = initialRows.map(row => nodes(row).find(node => node.type === 'input'))
  assert.ok(initialInputs[0].props.disabled, 'required Weekly Pulse is protected')
  assert.equal(initialInputs[1].props.disabled, false)
  assert.equal(initialInputs[2].props.disabled, false)
  initialInputs[1].props.onChange(false)
  await h.settle()
  const changedRows = nodes(find(h.tree, 'data-course-antistress-pretests'))
    .filter(node => node.props?.['data-checked'] !== undefined)
  assert.deepEqual(changedRows.map(row => row.props['data-checked']), [true, false, true])
  assert.equal(nodes(changedRows[1]).find(node => node.type === 'input').props.checked, false)
  h.unmount()
})

test('hero accurately describes the free offer in all supported course languages', async () => {
  for (const [locale, match] of [
    ['en', /3 free short tests/i],
    ['ru', /бесплатно пройти 3 коротких теста/i],
    ['es', /3 pruebas breves y gratuitas/i],
  ]) {
    const h = render(locale)
    await h.settle()
    const hero = find(h.tree, 'data-course-baseline-explanation')
    assert.match(textOf(hero), match, locale + ' should state the free three-test offer')
    assert.match(textOf(hero), /~6|3 TESTS|3 ТЕСТА|3 PRUEBAS/, 'duration or test count is visible')
    assert.ok(find(h.tree, 'data-antistress-start-first-test'))
    h.unmount()
  }
})
