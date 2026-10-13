// Synthetic React SSR and controlled-handler checks; not browser or database acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { COURSE_GOAL_STATEMENTS_V1 } from '../data/inner-growth/course-goal-statements-v1.js'
import { createCourseGoalObservationSnapshot, recordCourseGoalObservations, buildCourseGoalWeeklyReports } from '../lib/inner-growth/course-goal-observations.js'

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '')
const require = createRequire(`${root}/package.json`)
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const source = fs.readFileSync(`${root}/components/app/course-goal-observations.jsx`, 'utf8')
const css = fs.readFileSync(`${root}/components/app/course-goal-observations.module.css`, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
})
assert.equal(compiled.diagnostics.length, 0)
function load(react = React, runtime = require('react/jsx-runtime')) {
  const mod = { exports: {} }
  vm.runInNewContext(compiled.outputText, {
    module: mod, exports: mod.exports, Intl, console,
    require: name => name === 'react' ? react : name === 'react/jsx-runtime' ? runtime : name.endsWith('.module.css') ?
      { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) } : require(name),
  })
  return mod.exports
}
function visit(node, fn) {
  if (node == null || node === false) return
  if (Array.isArray(node)) return node.forEach(child => visit(child, fn))
  if (typeof node !== 'object') return
  if (typeof node.type === 'function') return visit(node.type(node.props), fn)
  fn(node)
  visit(node.props?.children, fn)
}
function text(node) {
  if (node == null || node === false) return ''
  if (Array.isArray(node)) return node.map(text).join('')
  if (typeof node !== 'object') return String(node)
  return text(typeof node.type === 'function' ? node.type(node.props) : node.props?.children)
}
function harness(initialProps) {
  let props = initialProps, tree
  const runtime = { jsx: (type, props) => ({ type, props: props || {} }), jsxs: (type, props) => ({ type, props: props || {} }) }
  const Component = load({ useId: () => 'test-id' }, runtime).GoalObservationFields
  function render() { tree = Component(props) }
  function nodes(predicate) { const found = []; visit(tree, node => { if (predicate(node)) found.push(node) }); return found }
  render()
  return { nodes, get tree() { return tree }, update(patch) { props = { ...props, ...patch }; render() } }
}

const statements = COURSE_GOAL_STATEMENTS_V1.slice(0, 3)
const goals = statements.map(statement => {
  const identity = statement.identities.find(identity => identity.instrumentLocale === 'en')
  return { scaleId: `${identity.definitionId}/${identity.dimensionKey}`, identity }
})
function slot(day, { goal = goals[0], contentLocale = 'en', kind = 'practice', planRevision = 0 } = {}) {
  return { day, status: 'ready', kind, planRevision, practice: { contentLocale },
    selectedScaleId: kind === 'practice' ? goal.scaleId : null,
    ...(kind === 'review' ? { reviewScaleIds: goals.map(goal => goal.scaleId) } : {}),
    provenanceBinding: kind === 'practice' ? { identity: goal.identity, contentLocale } : { coversAllSelectedGoals: true, goals, contentLocale },
  }
}
const snapshot = createCourseGoalObservationSnapshot({ day: 1, slot: slot(1) })
const reviewSnapshot = createCourseGoalObservationSnapshot({ day: 7, slot: slot(7, { kind: 'review' }) })
const row = snapshot.rows[0]
const choice = (row, rating) => ({ goalId: row.goalId, statementId: row.statementId, statementKey: row.statementKey, seriesId: row.seriesId, rating })
const components = load()
const render = (name, props = {}) => renderToStaticMarkup(React.createElement(components[name], props))

for (const locale of ['en', 'ru']) {
  const html = render('GoalObservationFields', { snapshot, locale, onChange() {} })
  assert(html.includes('data-course-goal-observations'))
  assert.equal((html.match(/type="radio"/g) || []).length, 6)
  assert(!html.includes('checked=""'))
  assert(!html.includes('required=""'))
  assert(!html.includes('undefined'))
  assert(html.includes('lang="en"'))
  assert(html.includes(row.statementText))
  assert(html.includes(row.statementVersion))
  assert(html.includes('3 · Neither agree nor disagree'))
  assert(html.indexOf(locale === 'en' ? 'saved privately in your account' : 'приватно сохраняются в вашем аккаунте') < html.indexOf('type="radio"'))
  assert(html.includes(locale === 'en' ? 'separate from your formal test results' : 'отдельно от результатов формальных тестов'))
}
const russianSnapshot = createCourseGoalObservationSnapshot({ day: 2, slot: slot(2, { contentLocale: 'ru' }) })
const russianHtml = render('GoalObservationFields', { snapshot: russianSnapshot, locale: 'en', onChange() {} })
assert(russianHtml.includes(russianSnapshot.rows[0].statementText))
assert(russianHtml.includes('3 · Ни согласия, ни несогласия'))
assert(!russianHtml.includes('3 · Neither agree nor disagree'))
assert.equal(render('GoalObservationFields'), '')
assert.equal(render('GoalObservationFields', { snapshot: { ...snapshot, anchors: [] } }), '')
assert.equal(render('GoalObservationFields', { snapshot: { ...snapshot, rows: [{ ...row, seriesId: null }] } }), '')
console.log('PASS EN/RU real React SSR: private storage disclosed before optional ratings, no preselection, neutral anchor 3, pinned statement/anchor language')

let calls = []
const h = harness({ snapshot, answers: [], onChange: answer => calls.push(answer) })
assert.equal(calls.length, 0)
let radios = h.nodes(node => node.type === 'input')
assert(radios.every(node => node.props.checked === false))
assert(h.nodes(node => node.type === 'button')[0].props.disabled)
for (const rating of [1, 2, 3, 4, 5, 'skip']) {
  const radio = h.nodes(node => node.type === 'input' && node.props.value === rating)[0]
  // A caller-controlled event value cannot inject text or a different rating.
  radio.props.onChange({ target: { value: 'ARBITRARY PRIVATE TEXT' } })
  const latest = JSON.parse(JSON.stringify(calls.at(-1)))
  assert.deepEqual(latest, choice(row, rating))
  assert.deepEqual(Object.keys(latest).sort(), ['goalId', 'rating', 'seriesId', 'statementId', 'statementKey'])
  // Controlled means onChange alone cannot update the field.
  assert(h.nodes(node => node.type === 'input').every(node => node.props.checked === false))
}
h.update({ answers: [choice(row, 3)] })
assert.equal(h.nodes(node => node.type === 'input' && node.props.checked).length, 1)
assert.equal(h.nodes(node => node.type === 'input' && node.props.checked)[0].props.value, 3)
h.nodes(node => node.type === 'button')[0].props.onClick()
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), choice(row, 'missing'))
h.update({ answers: [choice(row, 'missing')] })
assert(h.nodes(node => node.type === 'input').every(node => node.props.checked === false))
for (const mismatch of [{ seriesId: 'new-series' }, { statementId: 'new-statement' }, { statementKey: 'new-wording-key' }, { goalId: 'other-goal' }, { rating: 0 }, { rating: '3' }, { rating: 6 }]) {
  h.update({ answers: [{ ...choice(row, 3), ...mismatch }] })
  assert(h.nodes(node => node.type === 'input').every(node => node.props.checked === false))
}
h.update({ answers: [choice(row, 3), choice(row, 5)] })
assert(h.nodes(node => node.type === 'input').every(node => node.props.checked === false))
h.update({ answers: [choice(row, 'skip')], locale: 'ru' })
assert.equal(h.nodes(node => node.type === 'input' && node.props.checked)[0].props.value, 'skip')
assert(text(h.tree).includes(row.statementText))
const beforeDisabled = calls.length
h.update({ disabled: true })
assert(h.nodes(node => node.type === 'input').every(node => node.props.disabled))
h.nodes(node => node.type === 'input')[0].props.onChange()
h.nodes(node => node.type === 'button')[0].props.onClick()
assert.equal(calls.length, beforeDisabled)
h.update({ disabled: false, onChange: undefined })
assert(h.nodes(node => node.type === 'input').every(node => node.props.disabled))
console.log('PASS controlled handlers: bounded identity-only payloads, clear/skip, unchanged drafts, stale identities ignored, disabled/no-callback guards')

const review = harness({ snapshot: reviewSnapshot, answers: [choice(reviewSnapshot.rows[1], 2)], onChange: answer => calls.push(answer) })
assert.equal(review.nodes(node => node.type === 'fieldset').length, 3)
assert.equal(review.nodes(node => node.type === 'input').length, 18)
assert.equal(new Set(review.nodes(node => node.type === 'input').map(node => node.props.name)).size, 3)
assert.equal(review.nodes(node => node.type === 'input' && node.props.checked).length, 1)
review.nodes(node => node.type === 'input' && node.props.value === 5)[2].props.onChange()
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), choice(reviewSnapshot.rows[2], 5))
const ids = new Set(review.nodes(node => typeof node.props.id === 'string').map(node => node.props.id))
for (const fieldset of review.nodes(node => node.type === 'fieldset')) {
  assert(fieldset.props['aria-describedby'].split(' ').every(id => ids.has(id)))
}
console.log('PASS whole-goal review: all selected snapshot rows, independent named groups, accessible disclosure/identity descriptions')

function session(day, options = {}) {
  const actualSlot = slot(day, options), actualSnapshot = createCourseGoalObservationSnapshot({ day, slot: actualSlot })
  const observedAt = `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`, localDate = observedAt.slice(0, 10)
  return { day, status: 'completed', at: observedAt, localDate, slot: actualSlot,
    goalObservations: recordCourseGoalObservations({ snapshot: actualSnapshot, choices: options.choices?.(actualSnapshot) || [], observedAt, localDate }),
  }
}
const sessions = [
  session(1, { choices: snapshot => [choice(snapshot.rows[0], 1)] }),
  session(2, { choices: snapshot => [choice(snapshot.rows[0], 3)] }),
  session(3, { contentLocale: 'ru', planRevision: 1, choices: snapshot => [choice(snapshot.rows[0], 2)] }),
  { day: 4, status: 'skipped', at: '2026-10-04T12:00:00Z', localDate: '2026-10-04' },
  { day: 5, status: 'completed', at: '2026-10-05T12:00:00Z', localDate: '2026-10-05' },
  session(7, { kind: 'review', choices: snapshot => [choice(snapshot.rows[0], 1), choice(snapshot.rows[1], 'skip')] }),
]
const reports = buildCourseGoalWeeklyReports({ sessions, resolvedThroughDay: 7 })
assert.equal(reports.length, 1)
assert.equal(reports[0].series.length, 4)
const initialReportBytes = JSON.stringify(reports)
const rotatingSeries = reports[0].series.find(series => series.goalId === row.goalId && series.contentLocale === 'en')
assert.equal(rotatingSeries.count, 3)
assert(new Set(rotatingSeries.observations.map(point => point.statementText)).size > 1)
for (const locale of ['en', 'ru']) {
  const html = render('CourseGoalWeeklyReports', { reports, locale })
  assert(html.includes('data-course-goal-weekly-report="7"'))
  assert(html.includes('data-course-goal-period="week"'))
  assert(html.includes('data-course-goal-period="course-to-date"'))
  assert(!html.includes('data-course-goal-weekly-report="14"'))
  assert.equal((html.match(/data-course-goal-series=""/g) || []).length, 8)
  assert(html.includes('lang="en"'))
  assert(html.includes('lang="ru"'))
  assert(html.includes('UTC'))
  assert(/datetime="2026-10-01"/i.test(html))
  assert(/datetime="2026-10-07T12:00:00Z"/i.test(html))
  assert(html.includes('<strong>0</strong>'))
  assert(!html.includes('undefined'))
  assert(!html.includes('<button'))
  assert(!html.includes('<meter'))
  assert(!html.includes('<progress'))
  assert(html.includes(locale === 'en' ? 'One rating is available' : 'Сохранена одна оценка'))
  assert(html.includes(locale === 'en' ? 'No rating was recorded for this series' : 'В этой серии нет сохранённых оценок'))
  assert(html.includes(locale === 'en' ? 'Explicitly skipped' : 'Явно пропущено'))
  assert(html.includes(locale === 'en' ? 'Completed learning days without saved statements' : 'Выполненные учебные дни без сохранённых утверждений'))
  assert(html.includes(locale === 'en' ? 'Learning days without a saved session' : 'Учебные дни без сохранённого занятия'))
  assert(html.includes(locale === 'en' ? 'Since the course began' : 'С начала курса'))
  assert(html.includes(locale === 'en' ? 'equivalence as a measurement has not been established' : 'измерительная эквивалентность не установлена'))
  for (const series of reports[0].series) for (const point of series.observations) {
    assert(html.includes(point.statementText))
    assert(html.includes(point.statementId))
    assert(html.includes(point.statementVersion))
  }
}
assert.equal(JSON.stringify(reports), initialReportBytes)
console.log('PASS backend DTO real SSR: paraphrases grouped with exact point wording, separate language series and weekly/course-to-date scopes, neutral zero delta, complete dates and missing/skip/one-point states')

for (const locale of ['en', 'ru']) {
  const record = sessions.at(-1).goalObservations
  const html = render('SavedCourseGoalObservations', { record: { ...record, comment: 'DO NOT RENDER NOTE' }, locale })
  assert(html.includes('data-course-saved-goal-observations'))
  assert(html.includes('lang="en"'))
  assert(html.includes('UTC'))
  assert(html.includes(locale === 'en' ? 'Explicitly skipped' : 'Явно пропущено'))
  assert(html.includes(locale === 'en' ? 'Not answered' : 'Без ответа'))
  assert(html.includes('1 / 5'))
  assert(!/<input|<button|<select|<textarea/.test(html))
  assert(!html.includes('DO NOT RENDER NOTE'))
  for (const savedRow of record.rows) {
    assert(html.includes(savedRow.statementText))
    assert(html.includes(savedRow.statementId))
    assert(html.includes(savedRow.statementVersion))
  }
}
assert.equal(render('SavedCourseGoalObservations'), '')
assert.equal(render('SavedCourseGoalObservations', { record: { rows: [] } }), '')
console.log('PASS saved history: exact archived statement/variant/language, rating/skip/missing, saved date, no editable controls or unrelated private notes')

for (const checkpointDay of [7, 14, 21]) {
  const valid = { ...reports[0], checkpointDay, learningDays: { from: checkpointDay - 6, to: checkpointDay } }
  assert(render('CourseGoalWeeklyReports', { reports: [valid] }).includes(`data-course-goal-weekly-report="${checkpointDay}"`))
}
for (const invalid of [
  { ...reports[0], status: 'pending' }, { ...reports[0], checkpointDay: 6 },
  { ...reports[0], learningDays: { from: 1, to: 14 } }, { ...reports[0], anchors: [] },
]) {
  const html = render('CourseGoalWeeklyReports', { reports: [invalid] })
  assert(!html.includes('data-course-goal-weekly-report="'))
  assert(html.includes('No weekly observation report is available yet.'))
}
assert(render('CourseGoalWeeklyReports').includes('No weekly observation report is available yet.'))
assert(render('CourseGoalWeeklyReports', { reports: [{ ...reports[0], series: [] }] }).includes('No statement observations were saved for this learning week.'))
for (const rawDelta of [-4, 0, 4]) {
  const report = { ...reports[0], series: [{ ...reports[0].series[0], rawDelta }] }
  assert(render('CourseGoalWeeklyReports', { reports: [report] }).includes(`<strong>${rawDelta > 0 ? '+' : ''}${rawDelta}</strong>`))
}
console.log('PASS release boundaries: only available day 7/14/21 DTOs; no timer/calendar unlocking or client-calculated trend')

const attack = '<script>alert("private")</script>'
const hostileRow = { ...row, statementText: attack, statementVersion: attack, goalLabel: { en: attack, ru: attack } }
const hostileDaily = render('GoalObservationFields', { snapshot: { ...snapshot, rows: [hostileRow] }, onChange() {} })
const hostileSeries = { ...reports[0].series[0],
  first: { ...reports[0].series[0].first, statementText: attack },
  observations: reports[0].series[0].observations.map(point => ({ ...point, statementText: attack, comment: 'DO NOT RENDER NOTE' })),
}
const hostileWeekly = render('CourseGoalWeeklyReports', { reports: [{ ...reports[0], series: [hostileSeries] }] })
const hostileSaved = render('SavedCourseGoalObservations', { record: { ...sessions[0].goalObservations, rows: [{ ...hostileRow, status: 'rated', rating: 2, comment: 'DO NOT RENDER NOTE' }] } })
for (const html of [hostileDaily, hostileWeekly, hostileSaved]) {
  assert(html.includes('&lt;script&gt;'))
  assert(!html.includes('<script>'))
  assert(!html.includes('DO NOT RENDER NOTE'))
}
assert(!/appFetch|localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|dangerouslySetInnerHTML|useEffect|setInterval|setTimeout/.test(source))
require('postcss').parse(css)
assert(css.includes('min-inline-size:0'))
assert(css.includes('grid-template-columns:minmax(0,1fr)'))
assert(css.includes('max-width:360px'))
assert(css.includes('min-height:44px'))
assert(css.includes(':focus-visible'))
assert(css.includes('forced-colors:active'))
console.log('PASS escaped content, private-note omission, no transport/storage/effects, CSS parse and 320px-oriented structural safeguards')
