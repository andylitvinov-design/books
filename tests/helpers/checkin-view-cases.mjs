import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DOMParser } from '@xmldom/xmldom'
import { testRoot, fromModel, sources, current, compileView, assertClientDirective, digest } from './checkin-view-loader.mjs'

const { HH_CORE_CHECKIN_DEFINITIONS: candidates } = await fromModel('data/assessments/hh-core-checkins-v3.js')
const { getAssessmentDefinition } = await fromModel('lib/assessments/definitions.js')
const { scoreAssessment } = await fromModel('lib/assessments/scoring.js')
const { createProfileSnapshot, compareResults } = await fromModel('lib/profile/history.js')
const { profileCompletionRecommendations } = await fromModel('lib/profile/summary.js')
const { monitoringCatalogItem } = await fromModel('data/assessments/catalog.js')
const { checkinComparisonNote } = await fromModel('lib/assessments/checkin-result-analysis.js')
const baseline = JSON.parse(readFileSync(resolve(testRoot, 'tests/fixtures/checkin-view-legacy-source.json'), 'utf8'))
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const parse = markup => new DOMParser({ onError: (level, message) => { throw new Error(level + ': ' + message) } }).parseFromString(markup, 'text/html')
const all = (root, tag = '*') => Array.from(root.getElementsByTagName(tag))
const withClass = (root, name) => all(root).filter(node => (node.getAttribute('class') || '').split(/\s+/).includes(name))
const accountId = '10000000-0000-4000-8000-000000000001'
function fixture(definition) {
  const results = [1, 8, 15].map((day, index) => ({
    ...scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => {
      const min = question.min ?? definition.answerScale.min
      const max = question.max ?? definition.answerScale.max
      return [question.id, index === 0 ? min : index === 1 ? Math.min(min + 1, max) : max]
    }))),
    accountId, id: `20000000-0000-4000-8000-${String(day).padStart(12, '0')}`,
    measurementAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`,
  }))
  const snapshot = createProfileSnapshot({ id: '30000000-0000-4000-8000-000000000003', accountId,
    generatedResult: results.at(-1), carriedResults: results.slice(0, -1), createdAt: '2026-10-15T12:00:00.000Z' })
  const data = { results, snapshot, runs: [], requests: [], contextEvents: [], moodCheckins: [], savedReports: [], savedSessions: [], savedDocuments: [] }
  // Candidate catalog activation is deliberately not performed. This local
  // item fixture selects the inactive exact version for rendering its route.
  const item = { ...monitoringCatalogItem(definition.key), version: definition.version, instrumentLocale: definition.instrumentLocale }
  return { results, snapshot, data, item }
}
function noIdentityLeak(markup, results) {
  // Result IDs belong in existing route links; account/definition identity and
  // source hashes never belong in the visual profile or trend markup.
  for (const result of results) for (const value of [result.accountId, result.definitionId, result.contentHash]) assert.ok(!markup.includes(value))
}
for (const kind of ['workspace', 'monitoring']) test(`${kind} keeps use client in the directive prologue`, () => assertClientDirective(sources[kind]))
test('legacy fixtures are extracted from exact canonical source, unchanged helpers are byte-identical', () => {
  assert.equal(baseline.workspace.sourceSha256, '4cb38f1fbde8866dd4784a93bf31a42ceb64ad4c6d12d43de00958ca6a2322e4')
  assert.equal(baseline.monitoring.sourceSha256, '4526ef82bd9c378e1ccc87524f637da8cc6eaa04e7643fc3b227b1e14e279130')
  for (const kind of Object.keys(current)) for (const name of Object.keys(current[kind])) if (!['HistoryView', 'ProfileOverview', 'InstrumentTrend'].includes(name)) {
    assert.equal(digest(current[kind][name]), digest(baseline[kind].declarations[name]), name + ' must remain unchanged')
  }
})

for (const definition of candidates) {
  const f = fixture(definition)
  for (const locale of ['en', 'ru']) {
    test(`ProfileOverview retains raw facets without normalized bars ${definition.key}/${definition.instrumentLocale}/${locale}`, () => {
      const profile = profileCompletionRecommendations({ results: f.results, snapshot: f.snapshot, locale })
      assert.equal(profile.rows.length, definition.questions.length)
      const { ProfileOverview } = compileView('workspace')
      const markup = render(ProfileOverview, { profile, locale, results: f.results })
      const document = parse(markup)
      const rows = withClass(document, 'hh-profile-chart-row')
      assert.equal(rows.length, definition.questions.length)
      for (const question of definition.questions) {
        const row = rows.find(row => all(withClass(row, 'hh-profile-chart-label')[0], 'strong')[0]?.textContent === question.label)
        assert.ok(row, 'The original-language facet label must be shown: ' + question.label)
        assert.equal(all(row).filter(node => node.hasAttribute('data-checkin-profile-observation')).length, 1)
        assert.equal(withClass(row, 'hh-profile-chart-track').length, 0)
        assert.ok(all(row).every(node => !/%/.test(node.getAttribute('style') || '')))
        assert.doesNotMatch(row.textContent, /\d\s*%/)
        const model = profile.rows.find(row => row.key === question.id)
        assert.equal(model.currentPercent, null)
        assert.equal(model.priorPercent, null)
        if (['state.problem_intensity', 'state.current_interference'].includes(question.id)) {
          assert.equal(model.priorValue, null)
          assert.equal(model.delta, null)
          assert.ok(row.textContent.includes(checkinComparisonNote(f.results.at(-1), question.id, locale)))
        } else {
          const expected = compareResults(f.results.at(-1), f.results.at(-2)).find(row => row.key === question.id)
          assert.equal(model.priorValue, expected.prior)
          assert.equal(model.delta, expected.delta)
          assert.ok(row.textContent.includes((locale === 'ru' ? 'было ' : 'was ') + expected.prior + ' · +' + expected.delta))
        }
      }
      noIdentityLeak(markup, f.results)
    })
    for (const question of definition.questions) test(`actual history/trend selection respects facet comparability ${definition.key}/${definition.instrumentLocale}/${question.id}/${locale}`, () => {
      const before = JSON.stringify(f)
      const subject = ['state.problem_intensity', 'state.current_interference'].includes(question.id)
      const workspace = compileView('workspace', question.id)
      const historyMarkup = render(workspace.HistoryView, { data: f.data, locale, reload: () => {} })
      const history = parse(historyMarkup)
      const monitoring = compileView('monitoring', question.id)
      const trendMarkup = render(monitoring.InstrumentTrend, { item: f.item, data: f.data, locale, c: monitoring.UI[locale], onStarted: () => {} })
      const trend = parse(trendMarkup)
      for (const document of [history, trend]) {
        const option = all(document, 'option').find(node => node.getAttribute('value') === question.id)
        assert.ok(option?.hasAttribute('selected'))
        assert.equal(option.textContent, question.label)
      }
      assert.ok(all(history, 'caption').some(node => node.textContent.startsWith(question.label)))
      if (subject) {
        assert.equal(withClass(history, 'hh-change').length, 0)
        assert.equal(withClass(trend, 'hh-psi-comparison').length, 0)
        assert.equal(all(history, 'polyline').length, 0)
        assert.equal(all(trend, 'polyline').length, 0)
        assert.ok(history.documentElement.textContent.includes(checkinComparisonNote(f.results.at(-1), question.id, locale)))
        assert.ok(trend.documentElement.textContent.includes(checkinComparisonNote(f.results.at(-1), question.id, locale)))
        // Only the current raw observation remains in each chart's table.
        for (const document of [history, trend]) {
          const table = withClass(document, 'hh-table')[0]
          assert.equal(all(all(table, 'tbody')[0], 'tr').length, 1)
        }
      } else {
        const expected = compareResults(f.results.at(-1), f.results.at(-2)).find(row => row.key === question.id)
        assert.ok(expected)
        assert.equal(withClass(history, 'hh-change').length, 1)
        assert.equal(withClass(trend, 'hh-psi-comparison').length, 1)
        assert.equal(all(history, 'polyline').length, 1)
        assert.equal(all(trend, 'polyline').length, 1)
        for (const [document, className] of [[history, 'hh-change'], [trend, 'hh-psi-comparison']]) {
          const text = withClass(document, className)[0].textContent
          assert.ok(text.includes(`${expected.prior} → ${expected.current}`))
          assert.ok(text.includes(`+${expected.delta}`))
          assert.ok(text.includes(question.label))
          assert.doesNotMatch(text, /improv|deterior|declin|улучш|ухудш|здоров/i)
          const table = withClass(document, 'hh-table')[0]
          assert.equal(all(all(table, 'tbody')[0], 'tr').length, 3)
        }
      }
      noIdentityLeak(historyMarkup, f.results)
      noIdentityLeak(trendMarkup, f.results)
      assert.equal(JSON.stringify(f), before)
    })
  }
}

for (const [key, version] of [['hh-current-state', 'v1'], ['hh-current-state', 'v2'], ['hh-weekly-pulse', 'v1'], ['hh-resource-pulse', 'v1'], ['hh-monthly-profile', 'v1'], ['hh-screen-saturation', 'v2'], ['phq-4', 'v1'], ['gad-7', 'v1'], ['asrs-6', 'v1'], ['hh-socionics-32', 'v1'], ['hh-bach-flower-profile', 'v2']]) for (const locale of ['en', 'ru']) {
  test(`legacy three-view React output is identical ${key}/${version}/${locale}`, () => {
    const definition = getAssessmentDefinition(key, version, key === 'phq-4' ? 'en' : locale)
    const f = fixture(definition)
    const selected = f.results.at(-1).dimensions.at(-1).key
    const profile = profileCompletionRecommendations({ results: f.results, snapshot: f.snapshot, locale })
    const currentWorkspace = compileView('workspace', selected)
    const formerWorkspace = compileView('workspace', selected, baseline.workspace.declarations)
    assert.equal(render(currentWorkspace.HistoryView, { data: f.data, locale }), render(formerWorkspace.HistoryView, { data: f.data, locale }))
    assert.equal(render(compileView('workspace').ProfileOverview, { profile, locale, results: f.results }), render(compileView('workspace', null, baseline.workspace.declarations).ProfileOverview, { profile, locale, results: f.results }))
    const currentMonitoring = compileView('monitoring', selected)
    const formerMonitoring = compileView('monitoring', selected, baseline.monitoring.declarations)
    const props = { item: f.item, data: f.data, locale, c: currentMonitoring.UI[locale], onStarted: () => {} }
    assert.equal(render(currentMonitoring.InstrumentTrend, props), render(formerMonitoring.InstrumentTrend, props))
  })
}
