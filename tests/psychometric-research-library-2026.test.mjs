import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
import { PSYCHOMETRIC_LIBRARY_2026 } from '../data/assessments/psychometric-library-2026.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'

test('232 new research-only instruments extend the existing registry, without duplicates or activation', () => {
  const keys = PSYCHOMETRIC_LIBRARY_2026.map((item) => item.key)
  const canonicalKeys = MIND_BODY_MONITOR_REGISTRY.map((item) => item.key)
  assert.equal(keys.length, 232)
  assert.equal(new Set(keys).size, keys.length)
  assert.equal(canonicalKeys.length, 386)
  assert.equal(new Set(canonicalKeys).size, 386)
  assert.ok(keys.every((key) => canonicalKeys.includes(key)))
  for (const item of PSYCHOMETRIC_LIBRARY_2026) {
    assert.equal(item.enabled, false, item.key)
    assert.ok(['rights_review', 'permission_required', 'licensed_only', 'clinician_only'].includes(item.rightsStatus), item.key)
    assert.ok(item.sourceUrl.startsWith('https://'), item.key)
    assert.ok(item.scales.length > 0, item.key)
    assert.ok(item.scales.every((domain) => domain.length > 2), item.key)
    assert.ok(!MONITORING_CATALOG.some((test) => test.key === item.key && test.startable), item.key)
  }
  for (const item of MIND_BODY_MONITOR_REGISTRY) {
    assert.ok(Array.isArray(item.scales) && item.scales.length > 0, item.key + ': missing scale inventory')
  }
})

test('full database exposes measured domains as searchable references, never as scored tests', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    const full = filterExplorerEntries(entries, { availability: 'full' })
    const available = filterExplorerEntries(entries, { availability: 'available' })
    assert.equal(full.length, entries.length)
    assert.equal(new Set(full.map((item) => item.key)).size, full.length)
    for (const key of ['cerq-36', 'ffmq-39', 'scid-5-cv', 'ipip-neo-120', 'whodas-36']) {
      const item = full.find((entry) => entry.key === key)
      assert.ok(item, key)
      assert.equal(item.source, 'research', key)
      assert.equal(item.selectable, false, key)
      assert.equal(item.startable, false, key)
      assert.equal(item.definition, null, key)
      assert.ok(item.measuredScales.length >= 1, key)
      assert.ok(item.scaleSearch.length >= 1, key)
      assert.equal(available.some((entry) => entry.key === key), false, key)
    }
    assert.ok(filterExplorerEntries(entries, { availability: 'full', search: 'rumination' }).some((item) => item.key === 'cerq-36'))
    assert.ok(filterExplorerEntries(entries, { availability: 'full', search: 'physical functioning' }).some((item) => item.key === 'whodas-36') === false)
    assert.ok(filterExplorerEntries(entries, { availability: 'full', search: 'mobility' }).some((item) => item.key === 'whodas-36'))
  }
})

test('research scale labels are visibly disclosed without a quiz Start control', async () => {
  const source = await readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  assert.match(source, /entry\.source === 'research'/)
  assert.match(source, /entry\.measuredScales\.map/)
  assert.match(source, /Измеряемые шкалы и области/)
  assert.match(source, /Reference only|Research reference only/)
})
