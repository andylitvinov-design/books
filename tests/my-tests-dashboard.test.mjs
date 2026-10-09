import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getSiteNavigation, activeNavigationId } from '../lib/site-navigation-model.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('public navigation calls the pre-login test picker My tests, not Cabinet', () => {
  assert.equal(getSiteNavigation('en').find((item) => item.id === 'cabinet').label, 'My tests')
  assert.equal(getSiteNavigation('ru').find((item) => item.id === 'cabinet').label, 'Мои тесты')
  assert.equal(getSiteNavigation('en').find((item) => item.id === 'cabinet').href, '/en/client')
  assert.equal(getSiteNavigation('ru').find((item) => item.id === 'cabinet').href, '/ru/client')
  assert.equal(getSiteNavigation('es').find((item) => item.id === 'cabinet').href, '/es/client')
  assert.equal(activeNavigationId('/en/app'), 'cabinet')
  assert.equal(activeNavigationId('/ru/app/portrait'), 'cabinet')
})

test('authenticated home opens the test dashboard and keeps profile accessible', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const route = read('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(workspace, /path\[0\] \|\| 'tests'/)
  assert.match(workspace, /\['portrait', c\.portrait, '\/portrait'\]/)
  assert.match(route, /\['portrait','monitoring','tests'/)
  assert.match(workspace, /<AccountTestBattery/)
  assert.match(workspace, /<Portrait data=\{data\} locale=\{locale\}/)
})

test('My tests dashboard computes progress from saved account data rather than mockup figures', () => {
  const dashboard = read('components/app/my-tests-dashboard.jsx')
  const battery = read('components/app/account-test-battery.jsx')
  assert.match(dashboard, /rows\.length \? Math\.round\(\(completed \/ rows\.length\) \* 100\) : 0/)
  assert.match(battery, /const rows = useMemo\(\(\) => planRows\(currentPlan, data, locale\)/)
  assert.match(battery, /const completed = rows\.filter\(\(row\) => Boolean\(row\.result\)\)\.length/)
  assert.match(battery, /results=\{data\.results\}/)
  assert.match(dashboard, /onClick=\{onStart\}/)
  assert.doesNotMatch(dashboard, /38%|3\s*\/\s*8/)
})

test('start action reveals existing test battery with filters, real runs and results', () => {
  const battery = read('components/app/account-test-battery.jsx')
  assert.match(battery, /setShowList\(true\)/)
  assert.match(battery, /\{showList && <div className=\{styles\.listArea\}/)
  assert.match(battery, /statusFilter !== 'all'/)
  assert.match(battery, /openTest\(row\)/)
  assert.match(battery, /row\.result \? c\.repeat/)
  assert.match(battery, /api\('runs'/)
  assert.match(battery, /<details className=\{styles\.portraitDetails\}>/)
})

test('report uses completed saved measurements and recommendations use established deterministic guidance', () => {
  const dashboard = read('components/app/my-tests-dashboard.jsx')
  const reportActions = read('components/app/client-report-actions.jsx')
  const reportModel = read('lib/profile/client-report.js')
  const pdf = read('lib/profile/client-report-pdf.js')
  assert.match(dashboard, /<ClientReportActions data=\{data\} locale=\{locale\}/)
  assert.match(reportActions, /generateClientPdf/)
  assert.match(reportModel, /latest\.dimensions\.map/)
  assert.match(reportModel, /snapshot/)
  assert.match(pdf, /application\/pdf/)
  assert.match(dashboard, /nextPersonalRecommendation\(\{ results: results \|\| \[\], snapshot, locale \}\)/)
  assert.match(dashboard, /not a diagnosis or treatment recommendation/)
})
