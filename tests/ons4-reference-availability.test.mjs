import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { MONITORING_CATALOG, monitoringCatalogItem } from '../data/assessments/catalog.js'
import { ADDITIONAL_PROFESSIONAL_CATALOG } from '../data/assessments/professional-additions-2026.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { canonicalJSON, AppError, onlyKeys, requireUUID } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches, buildPublicStarterBattery, buildStarterBattery } from '../lib/assessments/test-explorer.js'
import { rankAssessmentDefinitions } from '../lib/assessments/test-recommendations.js'
import { validateTestPlanInput } from '../lib/app/test-plans.js'
import { ONS4_KEY, ONS4_ATTRIBUTION, ONS4_LICENCE_URL, withOns4ReferenceAvailability } from '../lib/assessments/ons4-availability.js'

const definition = getAssessmentDefinition(ONS4_KEY, 'v1', 'en')
const operationId = '10000000-0000-4000-8000-000000000001'
const input = { definitionKey: ONS4_KEY, definitionVersion: 'v1', instrumentLocale: 'en' }
const answers = value => Object.fromEntries(definition.questions.map(q => [q.id, value]))
const ipipKeys = ['ipip-emotion-decision-making-9', 'ipip-responsive-joy-10', 'ipip-responsive-distress-10', 'ipip-empathic-concern-10']

test('the availability overlay changes only exact ONS v1/en and leaves every other catalog entry untouched', () => {
  const item = monitoringCatalogItem(ONS4_KEY)
  for (const flag of ['startable', 'guestEligible', 'starterEligible']) assert.equal(item[flag], false, flag)
  for (const flag of ['registrationRequired', 'explicitOptIn']) assert.equal(item[flag], true, flag)
  assert.equal(item.availability, 'reference-only')
  assert.deepEqual(MONITORING_CATALOG.filter(row => row.availability === 'reference-only').map(row => row.key), [ONS4_KEY])
  for (const row of MONITORING_CATALOG.filter(row => row.key !== ONS4_KEY)) assert.equal(withOns4ReferenceAvailability(row), row, row.key)
  for (const row of ADDITIONAL_PROFESSIONAL_CATALOG.filter(row => row.key !== ONS4_KEY)) assert.equal(monitoringCatalogItem(row.key), row, row.key)
  for (const altered of [{ ...item, version: 'v2' }, { ...item, instrumentLocale: 'ru' }, { ...item, key: 'not-ons4' }]) assert.equal(withOns4ReferenceAvailability(altered), altered)
  assert.equal(MONITORING_CATALOG.filter(row => row.startable).length, 149)
  assert.ok(ipipKeys.every(key => monitoringCatalogItem(key).startable))
})

test('ONS remains a source-attributed reference in EN/RU/ES and never enters public/account launch recommendations', () => {
  for (const locale of ['en', 'ru', 'es']) for (const audience of ['guest', 'account']) {
    const entries = buildExplorerEntries({ locale, audience })
    const entry = entries.find(row => row.key === ONS4_KEY)
    assert.ok(entry)
    assert.equal(entry.selectable, false)
    assert.equal(entry.definition, null)
    assert.equal(entry.testKind, 'professional')
    assert.equal(entry.keyAudit.status, 'reference')
    assert.equal(entry.methodologyStatus, 'reference')
    assert.ok(entry.methodology.includes(ONS4_ATTRIBUTION))
    assert.match(entry.description, /Reference only|Только справочная|Solo referencia/)
    assert.ok(filterExplorerEntries(entries, { availability: 'full' }).includes(entry))
    for (const picked of [filterExplorerEntries(entries), rankPublicTestMatches(entries), buildPublicStarterBattery(entries), buildStarterBattery(entries)]) assert.ok(picked.every(row => row.key !== ONS4_KEY))
    assert.ok(ipipKeys.every(key => entries.find(row => row.key === key)?.selectable))
  }
  const ranked = rankAssessmentDefinitions([definition, ...ipipKeys.map(key => getAssessmentDefinition(key, 'v1', 'en'))])
  assert.equal(ranked.length, 4)
  assert.ok(ranked.every(row => row.definition.key !== ONS4_KEY))
  for (const audience of ['account', 'guest']) assert.throws(() => validateTestPlanInput({ operationId, items: [input] }, { audience }), { code: 'UNKNOWN_INSTRUMENT' })
})

test('actual account/guest startRun methods reject ONS before transport and still admit the four IPIP forms to transport', async () => {
  // Execute the unchanged AST-extracted methods with real validation/catalog
  // dependencies. The transport is a throwing sentinel: no database, environment,
  // credentials, network or customer data is available to this synthetic fixture.
  for (const [path, code] of [['repository.js', 'TEST_UNAVAILABLE'], ['guest-repository.js', 'GUEST_TEST_UNAVAILABLE']]) {
    const source = readFileSync(new URL('../lib/app/' + path, import.meta.url), 'utf8')
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    assert.equal(file.parseDiagnostics.length, 0)
    const methods = []
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name?.getText(file) === 'startRun') methods.push(node)
      ts.forEachChild(node, visit)
    }
    visit(file)
    assert.equal(methods.length, 1)
    let transactions = 0
    const config = new Proxy({}, { get() { throw new Error('DATABASE_CONFIG_MUST_NOT_BE_READ') } })
    const bindings = { AppError, onlyKeys, requireUUID, getAssessmentDefinition, monitoringCatalogItem, config,
      transaction() { transactions++; throw new Error('SYNTHETIC_TRANSPORT_REACHED') } }
    const startRun = new Function(...Object.keys(bindings), 'return ({' + methods[0].getText(file) + '}).startRun')(...Object.values(bindings))
    await assert.rejects(startRun({}, { ...input, operationId }), { code, status: 403 })
    assert.equal(transactions, 0)
    for (const key of ipipKeys) await assert.rejects(startRun({}, { ...input, definitionKey: key, operationId }), /SYNTHETIC_TRANSPORT_REACHED/)
    assert.equal(transactions, 4)
  }
})

test('immutable ONS identity, full definition, single-item arithmetic and historical report endpoints remain intact', () => {
  assert.equal(definition.id, '78e257f3-7d2d-5feb-a317-d39f8c2a8e19')
  assert.equal(definition.contentHash, 'sha256:8597bc30247ea6505a7521df9f0dd4d51c13cb86776a5abc6d493fc170df6689')
  assert.equal(createHash('sha256').update(canonicalJSON(definition)).digest('hex'), '994f3982b9e91875db39d55b974da73b41351c5713434b0a6ac3705ed7cac76f')
  for (let value = 0; value <= 10; value++) {
    const result = scoreAssessment(definition, answers(value))
    assert.deepEqual(result.dimensions.map(d => d.value), [value, value, value, value])
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(result, locale)
      assert.equal(report.verified, true)
      assert.equal(report.sections.length, 4)
      assert.ok(report.methodology.includes(ONS4_ATTRIBUTION))
      assert.ok(report.methodology.includes(ONS4_LICENCE_URL))
      for (const [index, section] of report.sections.entries()) {
        assert.equal(section.value, value)
        assert.equal(section.bandBasis, 'descriptive')
        assert.deepEqual(section.responseAnchors, { low: definition.questions[index].responseAnchors[0], high: definition.questions[index].responseAnchors[10] })
        assert.match(section.meaning, locale === 'ru' ? /один выбранный ответ/ : /one selected rating/)
        assert.doesNotMatch(section.meaning + section.steps.join(' '), /an aggregate can hide|The total does not|the aggregate cannot|общий показатель может|Сумма не объясняет|общий балл не показывает/)
      }
    }
  }
  const mixed = scoreAssessment(definition, Object.fromEntries(definition.questions.map((q, i) => [q.id, [0, 3, 7, 10][i]])))
  assert.deepEqual(mixed.dimensions.map(d => d.value), [0, 3, 7, 10])
  assert.equal(mixed.dimensions[3].direction, 'lower-reported-difficulty')
  for (const value of [-1, 11, 0.5, '5', null, undefined]) assert.throws(() => scoreAssessment(definition, { ...answers(5), 'ons4.01': value }))
})

test('forged provenance and fractional values cannot gain ONS wording or endpoints', () => {
  const result = scoreAssessment(definition, answers(5))
  for (const forged of [
    { ...result, definitionVersion: 'v2' },
    { ...result, instrumentLocale: 'ru' },
    { ...result, contentHash: 'sha256:' + '0'.repeat(64) },
    { ...result, dimensions: result.dimensions.map((d, i) => i === 0 ? { ...d, value: 5.5 } : d) },
  ]) {
    const report = buildAssessmentResultReport(forged, 'en')
    assert.equal(report.verified, false)
    assert.ok(report.sections.every(section => section.bandBasis === 'unavailable' && section.responseAnchors === null))
  }
})

test('existing reference and historical report surfaces render the corrected methodology', () => {
  const explorer = readFileSync(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  const compact = readFileSync(new URL('../components/app/compact-assessment-report.jsx', import.meta.url), 'utf8')
  assert.match(explorer, /\{entry\.methodology\}/)
  assert.match(explorer, /entry\.catalog\?\.availability === 'reference-only' \|\| entry\.source === 'research' \? c\.metadata/)
  assert.match(compact, /\{report\.methodology\}/)
})
