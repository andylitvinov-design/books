import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PSYCHOTHERAPY_CORE_100,
  PSYCHOTHERAPY_CORE_BY_KEY,
  PSYCHOTHERAPY_CORE_CATEGORIES,
  NEW_PSYCHOTHERAPY_REFERENCES,
} from '../data/assessments/psychotherapy-core-100.js'
import { MIND_BODY_MONITOR_REGISTRY, RIGHTS_STATUS } from '../data/assessments/mind-body-monitor-registry.js'
import { MONITORING_CATALOG, activeMonitoringTestCounts } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'

test('the core list is exactly 100 nonduplicated professional instruments across ten domains', () => {
  const keys = PSYCHOTHERAPY_CORE_100.map((item) => item.key)
  assert.equal(keys.length, 100)
  assert.equal(new Set(keys).size, 100)
  assert.equal(Object.keys(PSYCHOTHERAPY_CORE_CATEGORIES).length, 10)
  assert.deepEqual(
    Object.fromEntries(Object.keys(PSYCHOTHERAPY_CORE_CATEGORIES).map(
      (category) => [category, PSYCHOTHERAPY_CORE_100.filter((item) => item.category === category).length],
    )),
    { mood: 15, wellbeing: 10, trauma: 10, anxiety: 10, personality: 12, relationships: 10, function: 10, neuro: 9, substances: 8, therapy: 6 },
  )
  for (const item of PSYCHOTHERAPY_CORE_100) {
    assert.equal(PSYCHOTHERAPY_CORE_BY_KEY[item.key], item)
    assert.ok(item.summary.en.length > 22, item.key)
    assert.ok(item.summary.ru.length > 22, item.key)
    assert.ok(item.order >= 1 && item.order <= 100)
  }
})

test('fifteen new professional references expand registry without publishing copyrighted questionnaires', () => {
  assert.equal(NEW_PSYCHOTHERAPY_REFERENCES.length, 15)
  const allKeys = new Set(MIND_BODY_MONITOR_REGISTRY.map((item) => item.key))
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length, 386)
  assert.equal(allKeys.size, 386)
  for (const reference of NEW_PSYCHOTHERAPY_REFERENCES) {
    const row = MIND_BODY_MONITOR_REGISTRY.find((item) => item.key === reference.key)
    assert.ok(row, reference.key)
    assert.equal(row.enabled, false)
    assert.ok([RIGHTS_STATUS.RIGHTS_REVIEW, RIGHTS_STATUS.PERMISSION_REQUIRED, RIGHTS_STATUS.LICENSED_ONLY, RIGHTS_STATUS.CLINICIAN_ONLY, RIGHTS_STATUS.MANAGED_SAFETY_ONLY].includes(row.rightsStatus))
    assert.ok(row.rightsNote.includes('No protected items'))
    assert.equal(ASSESSMENT_DEFINITIONS.some((definition) => definition.key === reference.key), false)
  }
  for (const key of ['mmpi-3','pai','ados-2','caps-5','diva-5','scoff-5']) {
    assert.ok(allKeys.has(key))
  }
})

test('core catalog is bilingual, searchable, deduplicated, and never makes unavailable tools startable', () => {
  const validKeys = new Set([...MIND_BODY_MONITOR_REGISTRY.map((item) => item.key), ...MONITORING_CATALOG.map((item) => item.key)])
  for (const item of PSYCHOTHERAPY_CORE_100) {
    assert.ok(validKeys.has(item.key), 'Orphan psychotherapy core entry: ' + item.key)
  }
  for (const locale of ['en','ru']) {
    const all = buildExplorerEntries({ locale, audience: 'account' })
    assert.equal(new Set(all.map((entry) => entry.key)).size, all.length)
    const core = filterExplorerEntries(all, { availability: 'core' })
    assert.equal(core.length, 100)
    assert.ok(core.every((entry) => entry.psychotherapyCore))
    for (const item of core) {
      const reference = PSYCHOTHERAPY_CORE_BY_KEY[item.key]
      assert.equal(item.psychotherapyCoreCategory, reference.category)
      assert.equal(item.psychotherapyCoreSummary, reference.summary[locale])
      if (item.source === 'research') {
        assert.equal(item.selectable, false, item.key)
        assert.equal(item.definition, null, item.key)
        assert.equal(item.startable, false, item.key)
      }
    }
    for (const key of ['mmpi-3','caps-5','ados-2','scoff-5']) {
      const item = core.find((entry) => entry.key === key)
      assert.ok(item, key)
      assert.equal(item.selectable, false, key)
    }
    assert.equal(filterExplorerEntries(all, { availability: 'core', search: 'QIDS' }).length, 1)
    assert.ok(filterExplorerEntries(all, { availability: 'available' }).every((item) => item.selectable))
    assert.equal(activeMonitoringTestCounts().total, MONITORING_CATALOG.filter((item) => item.startable).length)
  }
})

test('selected non-core tests are kept visible by the established editor preservation rule', () => {
  const entries = buildExplorerEntries({ locale:'en', audience:'account' })
  const filtered = filterExplorerEntries(entries, { availability:'core', selectedKeys:['hh-weekly-pulse'] })
  assert.equal(filtered.length, 101)
  assert.ok(filtered.some((item) => item.key === 'hh-weekly-pulse'))
})
