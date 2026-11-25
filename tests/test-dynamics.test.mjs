import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { verifiedHistoryResult } from '../lib/assessments/verified-history.js'
import { buildTestDynamicsGroups, visibleTestDynamicsBand } from '../lib/assessments/test-dynamics.js'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const base = (id, at, value, extra = {}) => {
  const definition = getAssessmentDefinition(extra.definitionKey || 'hh-current-state', 'v1', 'en')
  const scored = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question =>
    [question.id, question.min ?? definition.answerScale.min])))
  return { ...scored, id, accountId: 'private-account-1', measurementAt: at,
    dimensions: scored.dimensions.map((dimension, index) => index === 0 ? { ...dimension, value } : dimension),
    ...extra }
}

test('dynamics defaults to all time and shows first/last values and retake data for every test', () => {
  const one = base('one', '2026-08-01T12:00:00Z', 8)
  const two = base('two', '2026-10-13T12:00:00Z', 4)
  const other = base('other', '2026-10-10T12:00:00Z', 3, {
    definitionKey: 'hh-weekly-pulse',
  })
  const view = buildTestDynamicsGroups([two, other, one], 'ru')
  assert.equal(view.valid, true)
  assert.equal(view.groups.length, 2)
  assert.equal(view.attempts, 3)
  assert.equal(view.repeated, 1)
  const repeated = view.groups.find(group => group.key === 'hh-current-state')
  assert.equal(repeated.count, 2)
  assert.equal(repeated.first.id, 'one')
  assert.equal(repeated.latest.id, 'two')
  assert.equal(repeated.scales[0].firstValue, 8)
  assert.equal(repeated.scales[0].lastValue, 4)
  assert.equal(repeated.scales[0].delta, -4)
  assert.equal(repeated.scales[0].track.length, 2)
  assert.equal(repeated.scales[0].gaugeDimension.value, 4)
  assert.equal(repeated.scales[0].gaugeDimension.min, 0)
  assert.equal(repeated.scales[0].gaugeDimension.max, 10)
  const baseline = view.groups.find(group => group.key === 'hh-weekly-pulse')
  assert.equal(baseline.count, 1)
  assert.equal(baseline.scales[0].firstValue, 3)
  assert.equal(baseline.scales[0].lastValue, null, 'do not repeat the first score as the missing retake')
  assert.equal(baseline.scales[0].delta, null)
  assert.equal(baseline.scales[0].gaugeDimension.value, 3, 'speedometer uses actual baseline score')
})

test('period limits comparisons to available results without losing older values in all time', () => {
  const old = base('old', '2026-08-01T12:00:00Z', 8)
  const recent = base('recent', '2026-10-13T12:00:00Z', 4)
  const now = new Date('2026-10-14T12:00:00Z')
  const currentWeek = buildTestDynamicsGroups([old, recent], 'en', 'week', '', '', now)
  assert.equal(currentWeek.groups.length, 1)
  assert.equal(currentWeek.groups[0].count, 1)
  assert.equal(currentWeek.groups[0].scales[0].delta, null)
  assert.equal(currentWeek.groups[0].scales[0].firstValue, 4)
  assert.equal(currentWeek.groups[0].scales[0].lastValue, null, 'a period with one attempt has no second comparison')
  const all = buildTestDynamicsGroups([old, recent])
  assert.equal(all.groups[0].count, 2)
  assert.equal(all.groups[0].scales[0].delta, -4)
  assert.equal(buildTestDynamicsGroups([old, recent], 'en', 'custom', '2026-10-14', '2026-10-01').valid, false)
})

test('a change in test definition never produces a fabricated comparable delta', () => {
  const first = base('first', '2026-09-01T12:00:00Z', 4)
  const changed = base('new', '2026-10-01T12:00:00Z', 8, { contentHash: 'new-hash' })
  const view = buildTestDynamicsGroups([first, changed])
  assert.equal(view.groups[0].scales[0].firstValue, null, 'invalid latest source must not have a verified baseline')
  assert.equal(view.groups[0].scales[0].lastValue, null, 'never pair a valid prior with a rejected latest')
  assert.equal(view.groups[0].scales[0].gaugeDimension.value, 8, 'historical raw record is retained')
  assert.equal(view.groups[0].scales[0].delta, null)
  assert.equal(view.groups[0].scales[0].track.length, 0)
  assert.equal(view.repeated, 0)
})

test('retained histories remain visible even when there is no active test plan', () => {
  const result = base('saved', '2026-06-01T12:00:00Z', 7)
  const view = buildTestDynamicsGroups([result], 'en')
  assert.equal(view.groups.length, 1)
  assert.equal(view.groups[0].latest.definitionId, getAssessmentDefinition('hh-current-state','v1','en').id)
})

test('test dynamics shows only the current published score interval and hides its peers', () => {
  const phq4 = base('phq4', '2026-10-17T12:00:00Z', 6, { definitionKey: 'phq-4' })
  const current = visibleTestDynamicsBand(phq4.dimensions[0], phq4, 'ru')
  assert.ok(current, 'the published PHQ-4 result must have an active range')
  assert.equal(current.kind, 'published')
  assert.equal(current.current.from, 6)
  assert.equal(current.current.to, 8)
  assert.equal(current.others.length, 3)
  assert.ok(current.others.every(band => band.code !== current.current.code))
  const low = visibleTestDynamicsBand({ ...phq4.dimensions[0], value: 0 }, phq4, 'ru')
  assert.equal(low.current.from, 0)
  assert.equal(low.current.to, 2)
})

test('unpublished reading aids remain explicitly descriptive and current-only', () => {
  const cbi = base('cbi', '2026-10-17T12:00:00Z', 50, { definitionKey: 'cbi-personal' })
  const current = visibleTestDynamicsBand(cbi.dimensions[0], cbi, 'en')
  assert.equal(visibleTestDynamicsBand({...cbi.dimensions[0],value:45},cbi,'en'),null,'Off-lattice CBI values cannot acquire an interpretation')
  assert.equal(current?.kind, 'descriptive')
  assert.equal(current?.others.length, 4)
  assert.ok(current.caveat.includes('not published norms'))
})

test('Results mobile view collapses extra measured scales and score intervals by default', () => {
  const view = readFileSync(new URL('../components/app/test-dynamics.jsx', import.meta.url), 'utf8')
  assert.match(view, /group\.scales\.slice\(0,1\)/)
  assert.match(view, /group\.scales\.slice\(1\)/)
  assert.match(view, /showLegend=\{false\}/)
  assert.match(view, /data-current-score-band/)
  assert.match(view, /<details className=\{styles\.levelDetails\} data-other-score-bands>/)
})

test('unverified saved history is labelled and cannot masquerade as a validated score', () => {
  const verified = base('verified', '2026-09-20T12:00:00Z', 4)
  const rejected = { ...base('rejected', '2026-10-15T12:00:00Z', 7), contentHash: 'wrong-sha' }
  const view = buildTestDynamicsGroups([verified, rejected], 'ru')
  assert.equal(view.groups.length, 1)
  assert.equal(view.groups[0].count, 2, 'the original raw records remain visible')
  assert.equal(view.groups[0].unverifiedCount, 1, 'the rejected record is explicitly marked')
  assert.equal(view.groups[0].scales[0].delta, null, 'invalid source must not establish a trend')
  assert.equal(buildTestDynamicsGroups([verified], 'en').groups[0].unverifiedCount, 0)
  const page = readFileSync(new URL('../components/app/test-dynamics.jsx', import.meta.url), 'utf8')
  assert.match(page, /data-dynamics-unverified-history/)
  assert.match(page, /не считаются подтверждёнными психологическими измерениями/)
})

test('Results dynamics reuses the exact authored subscale intervals from full reports', () => {
  const definition = getAssessmentDefinition('hh-money-pressure','v2','ru')
  const answers = Object.fromEntries(definition.questions.map((q,i) =>
    [q.id, i===0 ? 3 : i===1 ? 2 : i===2 ? 1 : 2]))
  const result = scoreAssessment(definition,answers)
  for (const dimension of result.dimensions) {
    const active = visibleTestDynamicsBand(dimension,result,'ru')
    assert.equal(active.kind,'answers')
    assert.equal(active.current.code,'hh-score-cluster-3')
    assert.deepEqual([active.current.from,active.current.to],[1.67,2.33])
    assert.equal(active.others.length,4)
    assert.equal(active.others[0].displayRange,'0–0,33')
    assert.match(active.current.note,/среднему ответу/)
    assert.match(active.caveat,/не медицинские нормы/)
  }
})

test('original v1 and revised v2 are not two comparable measurements even if their numeric bounds match', () => {
  const scored = (version, id, at, value) => {
    const def = getAssessmentDefinition('hh-current-state', version, 'en')
    const answers = Object.fromEntries(def.questions.map(q => [q.id, q.min ?? def.answerScale.min]))
    answers[def.questions[0].id] = value
    return { ...scoreAssessment(def, answers), id, accountId: 'private-account-1', measurementAt: at }
  }
  const archived = scored('v1', 'archived', '2026-09-01T12:00:00Z', 9)
  const current = scored('v2', 'current', '2026-10-01T12:00:00Z', 7)
  const view = buildTestDynamicsGroups([archived, current])
  const scale = view.groups[0].scales.find(item => item.key === current.dimensions[0].key)
  assert.equal(view.groups[0].count, 2, 'both raw attempts are kept in the history')
  assert.equal(view.repeated, 0, 'a version change is not a comparable retest')
  assert.deepEqual(scale.track.map(item => item.id), ['current'])
  assert.equal(scale.firstValue, 7, 'the new version starts its own baseline')
  assert.equal(scale.lastValue, null)
  assert.equal(scale.delta, null)
})

test('the first comparable baseline is from the current version, never an older version', () => {
  const scored = (version, id, at, value) => {
    const def = getAssessmentDefinition('hh-current-state', version, 'en')
    const answers = Object.fromEntries(def.questions.map(q => [q.id, q.min ?? def.answerScale.min]))
    answers[def.questions[0].id] = value
    return { ...scoreAssessment(def, answers), id, accountId: 'private-account-1', measurementAt: at }
  }
  const archived = scored('v1', 'archived', '2026-09-01T12:00:00Z', 9)
  const firstCurrent = scored('v2', 'first-current', '2026-10-01T12:00:00Z', 2)
  const lastCurrent = scored('v2', 'last-current', '2026-10-14T12:00:00Z', 6)
  const view = buildTestDynamicsGroups([lastCurrent, archived, firstCurrent], 'ru')
  const scale = view.groups[0].scales.find(item => item.key === lastCurrent.dimensions[0].key)
  assert.equal(view.groups[0].count, 3)
  assert.equal(view.repeated, 1)
  assert.deepEqual(scale.track.map(item => item.id), ['first-current', 'last-current'])
  assert.equal(scale.firstValue, 2)
  assert.equal(scale.lastValue, 6)
  assert.equal(scale.delta, 4)
})

test('the dynamics UI bases each repeat indicator on comparable scale history', () => {
  const component = readFileSync(new URL('../components/app/test-dynamics.jsx', import.meta.url), 'utf8')
  assert.match(component, /hasRepeat=\{item\.track\.length > 1\}/)
  assert.doesNotMatch(component, /hasRepeat=\{group\.count > 1\}/)
  assert.match(component, /Первый сопоставимый балл/)
  assert.match(component, /First comparable score/)
})

// Render the real component/model/gauge in ordinary Node so the test also works
// when its parent runs with --conditions=react-server. Only framework links,
// CSS and decorative icons are substituted; all data is synthetic.
const renderDynamics = String.raw`
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import * as dynamics from './lib/assessments/test-dynamics.js'
import * as gauges from './lib/assessments/dashboard-gauges.js'
import * as changes from './lib/assessments/score-change-reading.js'
import * as copy from './components/app/copy.js'
const require = createRequire(import.meta.url)
const empty = () => null
const styles = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
const imports = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'next/link': ({ children, href }) => React.createElement('a', { href }, children),
  'lucide-react': { ArrowRight: empty, BarChart3: empty, CalendarDays: empty, RotateCcw: empty, TrendingUp: empty },
  '@/lib/assessments/test-dynamics': dynamics,
  '@/lib/assessments/dashboard-gauges': gauges,
  '@/lib/assessments/score-change-reading': changes,
  './copy': copy,
  './test-dynamics.module.css': styles,
  './assessment-gauge.module.css': styles,
}
const load = (path, source = readFileSync(path, 'utf8')) => {
  const exports = {}
  const compiled = ts.transpileModule(source, { fileName: path, compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  runInNewContext(compiled, { exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), 'Unexpected render dependency: ' + name)
    return imports[name]
  } })
  return exports
}
imports['./assessment-gauge'] = load('components/app/assessment-gauge.jsx')
const input = JSON.parse(readFileSync(0, 'utf8'))
const before = JSON.stringify(input.cases)
const component = load('components/app/test-dynamics.jsx', input.source).TestDynamics
const output = input.cases.map(({ results, locale }) => renderToStaticMarkup(React.createElement(component, {
  results, locale, canRetake: () => false,
  onRetake: () => { throw new Error('Rendering must not start a retake') },
})))
assert.equal(JSON.stringify(input.cases), before, 'Rendering must not mutate raw history')
process.stdout.write(JSON.stringify(output))
`
const renderCases = (cases, source) => JSON.parse(execFileSync(process.execPath,
  ['--input-type=module', '-e', renderDynamics], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    input: JSON.stringify({ cases, source }), encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
  }))
const scoredAttempt = (version, id, day, value) => {
  const definition = getAssessmentDefinition('hh-current-state', version, 'en')
  const answers = Object.fromEntries(definition.questions.map(q => [q.id, q.min ?? definition.answerScale.min]))
  answers[definition.questions[0].id] = value
  return { ...scoreAssessment(definition, answers), id, accountId: 'synthetic-private-owner',
    measurementAt: day + 'T12:00:00Z' }
}
const archivedAttempt = scoredAttempt('v1', 'archived', '2026-09-01', 9)
const baselineAttempt = scoredAttempt('v2', 'baseline', '2026-10-01', 2)
const latestAttempt = scoredAttempt('v2', 'latest', '2026-10-14', 6)
const rejectedAttempt = { ...latestAttempt, id: 'rejected', contentHash: 'unverified-source' }
const renderFixtures = ['en', 'ru'].flatMap(locale => [
  { locale, comparable: 0, results: [archivedAttempt, baselineAttempt, rejectedAttempt] },
  { locale, comparable: 1, results: [archivedAttempt, baselineAttempt] },
  { locale, comparable: 2, results: [latestAttempt, archivedAttempt, baselineAttempt] },
])
const dateLabel = (value, locale) => new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA',
  { dateStyle: 'medium' }).format(new Date(value))
function assertRenderedDynamics(html, fixture) {
  const { locale, comparable, results } = fixture
  const ru = locale === 'ru'
  const firstLabel = ru ? 'Первый сопоставимый балл' : 'First comparable score'
  const lastLabel = ru ? 'Последний сопоставимый балл' : 'Latest comparable score'
  const firstAttemptLabel = ru ? 'Первое сохранённое прохождение' : 'First recorded attempt'
  const lastAttemptLabel = ru ? 'Последнее сохранённое прохождение' : 'Latest recorded attempt'
  const latest = [...results].sort((a, b) => a.measurementAt.localeCompare(b.measurementAt)).at(-1)
  const history = html.match(/<div class="dateRow">([\s\S]*?)<\/div>/)?.[1]
  assert.ok(history, 'historical date row remains available')
  assert.ok(history.includes(firstAttemptLabel + ': ' + dateLabel(archivedAttempt.measurementAt, locale)))
  assert.ok(history.includes(lastAttemptLabel + ': ' + dateLabel(latest.measurementAt, locale)))
  assert.ok(!history.includes(firstLabel) && !history.includes(lastLabel), 'raw dates cannot claim comparable scores')
  const values = html.match(/<div class="values">([\s\S]*?)<\/div>/)?.[1]
  assert.ok(values)
  assert.ok(values.includes('<small>' + firstLabel + '</small><strong>' + (comparable ? '2' : '—') + '</strong>'))
  if (comparable > 1) {
    assert.ok(values.includes('<small>' + lastLabel + '</small><strong>6</strong>'))
    assert.match(values, /class="delta"[^>]*>\+4<\/span>/)
    assert.match(html, /class="sparkline"[^>]*role="img" aria-label="2 → 6"/)
    assert.doesNotMatch(values, /aria-label="(?:No retest|Повторного замера)/)
  } else {
    assert.match(values, /<strong class="awaiting" aria-label="[^"]+">\?<\/strong>/)
    assert.doesNotMatch(html, /class="sparkline"|class="delta"/)
  }
  const repeatedLabel = ru ? 'Сопоставимых повторов' : 'Comparable retests'
  assert.ok(html.includes('<strong>' + (comparable > 1 ? 1 : 0) + '</strong><span>' + repeatedLabel + '</span>'))
  assert.ok(html.includes('<strong>' + results.length + '</strong><span>' + (ru ? 'Всего прохождений' : 'Total attempts') + '</span>'))
  assert.ok(html.includes('href="/' + locale + '/app/results/' + latest.id + '"'), 'raw latest report remains accessible')
  assert.equal(html.includes('data-dynamics-unverified-history'), comparable === 0)
  assert.doesNotMatch(html, /synthetic-private-owner|unverified-source/, 'private provenance is not rendered')
}
const renderedFixtures = renderCases(renderFixtures)
for (const [index, fixture] of renderFixtures.entries()) {
  test(`real ${fixture.locale} dynamics render separates raw dates with ${fixture.comparable} comparable measurements`, () => {
    assertRenderedDynamics(renderedFixtures[index], fixture)
  })
}
test('a single raw attempt renders one historical date without inventing a latest retest date in EN/RU', () => {
  const cases = ['en', 'ru'].map(locale => ({ locale, results: [baselineAttempt] }))
  renderCases(cases).forEach((html, index) => {
    const locale = cases[index].locale
    const history = html.match(/<div class="dateRow">([\s\S]*?)<\/div>/)?.[1]
    assert.ok(history)
    assert.equal([...history.matchAll(/<time\b/g)].length, 1)
    const label = locale === 'ru' ? 'Первое сохранённое прохождение' : 'First recorded attempt'
    assert.ok(history.includes(label + ': ' + dateLabel(baselineAttempt.measurementAt, locale)))
    assert.doesNotMatch(history, /Latest recorded attempt|Последнее сохранённое прохождение|\?/)
    assert.match(html, /<strong class="awaiting" aria-label="[^"]+">\?<\/strong>/)
    assert.doesNotMatch(html, /class="sparkline"|class="delta"/)
  })
})
test('render checks reject comparable date labels on raw history and raw-attempt repeat indicators', () => {
  const source = readFileSync(new URL('../components/app/test-dynamics.jsx', import.meta.url), 'utf8')
  for (const mutation of [
    text => text.replaceAll('{c.firstAttempt}:', '{c.first}:').replaceAll('{c.latestAttempt}:', '{c.latest}:'),
    text => text.replaceAll('hasRepeat={item.track.length > 1}', 'hasRepeat={group.count > 1}'),
  ]) {
    const changed = mutation(source)
    assert.notEqual(changed, source, 'negative mutation must alter the rendered component')
    const cases = renderFixtures.filter(fixture => fixture.comparable === 1)
    const html = renderCases(cases, changed)
    cases.forEach((fixture, index) => assert.throws(() => assertRenderedDynamics(html[index], fixture)))
  }
})


// Verification and the latest-record exception must use object identity. A
// duplicated storage ID must not borrow another record's validity or ownership.
const identityResult = (version, at, value, extra = {}) => {
  const definition = getAssessmentDefinition('hh-current-state', version, 'en')
  const answers = Object.fromEntries(definition.questions.map(question =>
    [question.id, question.min ?? definition.answerScale.min]))
  answers[definition.questions[0].id] = value
  return { ...scoreAssessment(definition, answers), id: 'duplicate-id',
    accountId: 'synthetic-owner-a', measurementAt: at, ...extra }
}
const freezeHistory = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeHistory(child)
    Object.freeze(value)
  }
  return value
}
for (const locale of ['en', 'ru']) {
  for (const scenario of ['invalid earlier', 'invalid latest', 'different owner', 'different version', 'equal timestamp']) {
    test(`${locale} duplicate IDs cannot bypass ${scenario} verification or comparison gates`, () => {
      const earlier = identityResult(scenario === 'different version' ? 'v1' : 'v2',
        scenario === 'equal timestamp' ? '2026-10-14T12:00:00Z' : '2026-09-01T12:00:00Z', 2,
        scenario === 'different owner' ? { accountId: 'synthetic-owner-b' } : {})
      const latest = identityResult('v2', '2026-10-14T12:00:00Z', 6)
      if (scenario === 'invalid earlier') earlier.contentHash = 'rejected-source'
      if (scenario === 'invalid latest') latest.contentHash = 'rejected-source'
      assert.equal(verifiedHistoryResult(earlier), scenario !== 'invalid earlier')
      assert.equal(verifiedHistoryResult(latest), scenario !== 'invalid latest')
      const input = [earlier, latest], before = structuredClone(input)
      freezeHistory(input)
      const view = buildTestDynamicsGroups(input, locale), group = view.groups[0]
      assert.equal(view.attempts, 2, 'both raw records remain counted')
      assert.equal(group.count, 2)
      assert.equal(group.first, earlier, 'the original historical record remains available')
      assert.equal(group.latest, latest)
      assert.equal(group.unverifiedCount, scenario.startsWith('invalid') ? 1 : 0)
      assert.equal(view.repeated, 0)
      for (const scale of group.scales) {
        assert.deepEqual(scale.track.map(point => point.at), scenario === 'invalid latest' ? [] : [latest.measurementAt])
        assert.equal(scale.firstValue, scenario === 'invalid latest' ? null : latest.dimensions.find(row => row.key === scale.key).value)
        assert.equal(scale.lastValue, null)
        assert.equal(scale.delta, null)
      }
      assert.deepEqual(input, before, 'no raw record, dimension or ordering is rewritten')
    })
  }
  test(`${locale} fully compatible duplicate IDs still require and pass the non-self comparison gate`, () => {
    const earlier = identityResult('v2', '2026-09-01T12:00:00Z', 2)
    const latest = identityResult('v2', '2026-10-14T12:00:00Z', 6)
    const input = [latest, earlier], before = structuredClone(input)
    freezeHistory(input)
    const view = buildTestDynamicsGroups(input, locale), scale = view.groups[0].scales[0]
    assert.equal(view.attempts, 2)
    assert.equal(view.groups[0].unverifiedCount, 0)
    assert.equal(view.repeated, 1)
    assert.deepEqual(scale.track.map(point => point.at), [earlier.measurementAt, latest.measurementAt])
    assert.deepEqual([scale.firstValue, scale.lastValue, scale.delta], [2, 6, 4])
    assert.deepEqual(input, before)
  })
  test(`${locale} absent or empty result IDs retain the existing exclusion contract without mutating history`, () => {
    const latest = identityResult('v2', '2026-10-14T12:00:00Z', 6)
    const malformed = [undefined, null, ''].map(id => identityResult('v2', '2026-09-01T12:00:00Z', 2, { id }))
    delete malformed[0].id
    const input = [...malformed, latest], before = structuredClone(input)
    freezeHistory(input)
    const view = buildTestDynamicsGroups(input, locale)
    assert.equal(view.attempts, 1)
    assert.equal(view.groups[0].count, 1)
    assert.equal(view.groups[0].latest, latest)
    assert.equal(view.groups[0].unverifiedCount, 0)
    assert.equal(view.repeated, 0)
    assert.ok(view.groups[0].scales.every(scale => scale.track.length === 1 && scale.lastValue === null && scale.delta === null))
    assert.deepEqual(input, before)
  })
}
