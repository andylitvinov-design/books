import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { TEST_KINDS, HOBBY_TEST_KEYS, testKindFor, auditTestKey } from '../lib/assessments/test-kinds.js'

const answersFor = (def, extreme) => Object.fromEntries(def.questions.map(q => [
  q.id, extreme === 'min' ? (q.min ?? def.answerScale?.min) : (q.max ?? def.answerScale?.max),
]))

test('every catalogue record has exactly one stable display kind; research stays non-runnable', () => {
  assert.deepEqual(TEST_KINDS.map(x => x.key), ['professional', 'monitoring', 'hobby'])
  const kinds = new Set(TEST_KINDS.map(x => x.key))
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'account' })
    assert.equal(new Set(entries.map(e => e.key)).size, entries.length)
    for (const entry of entries) {
      assert.ok(kinds.has(entry.testKind), entry.key)
      assert.equal(entry.testKind, testKindFor(entry), entry.key)
      assert.ok(entry.keyAudit && entry.keyAudit.status, entry.key)
      if (entry.testKind === 'professional' && entry.source === 'product') {
        assert.ok(entry.definition?.source?.url?.startsWith('https://'), entry.key + ': professional requires a named source')
      }
      if (entry.source === 'research') {
        assert.equal(entry.selectable, false)
        assert.equal(entry.keyAudit.status, 'reference')
      }
    }
    for (const key of HOBBY_TEST_KEYS) assert.equal(entries.find(e => e.key === key)?.testKind, 'hobby', key)
    assert.equal(entries.find(e => e.key === 'hh-current-state')?.testKind, 'monitoring')
    assert.equal(entries.find(e => e.key === 'phq-4')?.testKind, 'professional')
    assert.equal(entries.find(e => e.key === 'mini-ipip-20')?.testKind, 'professional')
  }
})

test('all active scoring keys match immutable registered versions and yield full EN/RU result sections', () => {
  const registered = new Set(ASSESSMENT_DEFINITIONS.map(def => def.key + '/' + def.version + '/' + def.instrumentLocale))
  const runnable = MONITORING_CATALOG.filter(item => item.startable)
  assert.equal(new Set(runnable.map(item => item.key)).size, runnable.length)
  assert.ok(runnable.length >= 109)
  for (const item of runnable) {
    for (const locale of (item.instrumentLocale === 'dynamic' ? ['en','ru'] : [item.instrumentLocale])) {
      const def = getAssessmentDefinition(item.key, item.version, locale)
      assert.ok(registered.has(def.key + '/' + def.version + '/' + def.instrumentLocale))
      const audit = auditTestKey({ catalog: item, definition: def })
      assert.equal(audit.status, 'ready', item.key + '/' + locale + ': ' + audit.status)
      assert.ok(def.translationVersion && def.contentHash?.startsWith('sha256:'), item.key)
      for (const extreme of ['min', 'max']) {
        const scored = scoreAssessment(def, answersFor(def, extreme))
        assert.ok(scored.dimensions.length > 0, item.key)
        for (const language of ['en', 'ru']) {
          const report = buildAssessmentResultReport(scored, language)
          assert.equal(report.sections.length, scored.dimensions.length, item.key + '/' + language)
          assert.ok(report.sections.every(s => s.meaning?.length > 40 && s.followUp?.length > 20 && s.steps?.length >= 2), item.key + '/' + language)
        }
      }
    }
  }
})

test('type checkboxes filter by OR, combine with other criteria and preserve manually selected tests', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const available = filterExplorerEntries(entries, { availability: 'available' })
  for (const kind of TEST_KINDS.map(x => x.key)) {
    const filtered = filterExplorerEntries(entries, { availability: 'available', kinds: [kind] })
    assert.ok(filtered.length > 0, kind)
    assert.ok(filtered.every(e => e.testKind === kind), kind)
  }
  const combined = filterExplorerEntries(entries, { availability: 'available', kinds: ['hobby','professional'] })
  assert.ok(combined.length > 0 && combined.length <= available.length)
  assert.ok(combined.every(e => ['hobby','professional'].includes(e.testKind)))
  const professionalShort = filterExplorerEntries(entries, { availability: 'available', kinds:['professional'], lengths:['short'] })
  assert.ok(professionalShort.every(e => e.testKind === 'professional' && e.testLength === 'short'))
  const preserved = filterExplorerEntries(entries, { availability: 'available', kinds:['hobby'], selectedKeys:['phq-4'] })
  assert.ok(preserved.some(e => e.key === 'phq-4'), 'selected test must remain visible even when its type is filtered out')
  assert.ok(filterExplorerEntries(entries,{ availability:'available', kinds:['unknown-kind'] }).length === available.length,
    'unknown type values must not hide all tests')
})

test('public and full explorer expose actual checkboxes and type icon labels', async () => {
  const [simple, full, intent] = await Promise.all([
    readFile(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/app/test-selection-intent.js', import.meta.url), 'utf8'),
  ])
  assert.match(simple, /data-test-kind-checkbox/)
  assert.match(full, /data-test-kind-checkbox/)
  assert.match(simple, /data-test-kind-badge/)
  assert.match(full, /data-test-kind-badge/)
  assert.match(intent, /kinds: TEST_KINDS\.map/)
  assert.match(intent, /'kinds'/)
})


// ASRS is a discrete source-pinned screening count, not a generic sum or course goal.
test('ASRS6 EN/RU versions are source-documented and supported by the key audit', () => {
  const catalog = MONITORING_CATALOG.find(item => item.key === 'asrs-6')
  assert.ok(catalog?.startable)
  for (const locale of ['en', 'ru']) {
    const definition = getAssessmentDefinition('asrs-6', 'v1', locale)
    assert.equal(testKindFor({ key: catalog.key, source: 'product', catalog, definition }), 'professional')
    assert.deepEqual(auditTestKey({ catalog, definition }), {
      status: 'ready', basis: 'source_documented', scorer: 'asrs-v1-6-classic:v1', reportReady: true,
    })
    const unsupported = { ...definition, scoringVersion: 'unsupported-test-version' }
    assert.equal(auditTestKey({ catalog, definition: unsupported }).status, 'key_review')
  }
})
