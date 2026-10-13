import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildInsightsSummary } from '../lib/assessments/insights-summary.js'

test('summary counts all attempts, unique tests and numeric scales, without mixing test scores', () => {
  const a = { key: 'stress', history: [{ id: 'old' }, { id: 'new' }], latest: {
    measurementAt: '2026-10-11T12:00:00Z', dimensions: [
      { key: 'scale', value: 45 }, { key: 'scale', value: 45 }, { key: 'resources', value: 8 },
      { key: 'missing', value: null },
    ] } }
  const b = { key: 'mood', history: [{ id: 'third' }], latest: {
    measurementAt: '2026-10-13T12:00:00Z', dimensions: [{ key: 'scale', value: 4 }] } }
  assert.deepEqual(buildInsightsSummary([a, b, { latest: null }]), {
    tests: 2, attempts: 3, scales: 3, latestAt: '2026-10-13T12:00:00Z',
  })
  assert.deepEqual(buildInsightsSummary([]), { tests: 0, attempts: 0, scales: 0, latestAt: null })
})
test('filter is native closed disclosure after summary, all report and picker links remain', () => {
  const src = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const part = src.slice(src.indexOf('function PortfolioPage('), src.indexOf('function ProfileOverview('))
  assert.match(part, /buildInsightsSummary\(allGroups\)/)
  assert.ok(part.indexOf('data-testid="insights-summary"') < part.indexOf('data-testid="insights-filters"'))
  assert.match(part, /<details className="hh-insights-filter-disclosure" data-testid="insights-filters">/)
  assert.match(part, /aria-pressed=\{selectedCategories\.includes\(category\.key\)\}/)
  assert.match(part, /explore=1&filters=topics&category=/)
  assert.match(part, /<ScoreGauge dimension=\{main\}/)
  assert.match(part, /<ScoreTrend current=\{latest\} previous=\{group\.periodPrior\}/)
  assert.match(part, /<ClientReportActions data=\{data\}/)
  assert.doesNotMatch(part, /hh-insights-add-mark/)
  const route = readFileSync(new URL('../app/[locale]/app/[[...path]]/page.jsx', import.meta.url), 'utf8')
  assert.match(route, /import '\.\/insights-compact\.css'/)
})
