import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PRIORITY_METHODS_2026, PRIORITY_METHODS_RIGHTS_COUNTS } from '../data/assessments/priority-methods-2026.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'

test('exactly 15 unique methodology metadata records and conservative commercial licence statuses', () => {
  assert.equal(PRIORITY_METHODS_2026.length, 15)
  assert.equal(new Set(PRIORITY_METHODS_2026.map((item) => item.key)).size, 15)
  assert.deepEqual(PRIORITY_METHODS_RIGHTS_COUNTS, { open_reuse: 1, permission_required: 8, rights_review: 6 })
  assert.equal(PRIORITY_METHODS_2026.find((item) => item.status === 'open_reuse').abbr, 'CFPB FWBS (10)')
  for (const item of PRIORITY_METHODS_2026) {
    assert.ok(item.questions > 0 && item.questions <= 15, item.key)
    assert.ok(item.name.en && item.name.ru && item.topic.en && item.topic.ru, item.key)
    assert.ok(item.minutes && item.scales.en && item.scales.ru, item.key)
    assert.ok(item.scoring.en && item.scoring.ru, item.key + ': scoring reference')
    assert.ok(item.rights.en && item.rights.ru, item.key)
    assert.ok(item.source === null || /^https:\/\//.test(item.source), item.key)
    assert.ok(!('items' in item) && !('definition' in item) && !('scoringKey' in item), 'no copyrighted items or executable scorer: ' + item.key)
  }
})

test('CFPB full 10-item form is not misrepresented as separately prepared five-item form', () => {
  const full = PRIORITY_METHODS_2026.find((item) => item.key === 'cfpb-fwbs-10')
  assert.equal(full.questions, 10)
  assert.equal(full.relatedRunnableKey, 'cfpb-financial-wellbeing-5')
  assert.match(full.scales.en, /two additional age/i)
  assert.match(full.rights.en, /short 5-item forms must not be conflated/i)
})

test('sensitive screens remain research only until safety and publication rights review', () => {
  for (const key of ['audit-10','dast-10','scoff-5']) {
    const item = PRIORITY_METHODS_2026.find((value) => value.key === key)
    assert.ok(item.sensitive, key)
    assert.notEqual(item.status, 'open_reuse')
  }
  assert.ok(PRIORITY_METHODS_2026.find((item)=>item.key==='ecr-s-12').rights.en.includes('not ECR-RS'))
})

test('research review cards do not add any startable definition, change old registry or trigger score/history migration', async () => {
  assert.ok(MIND_BODY_MONITOR_REGISTRY.length >= 154)
  assert.ok(MONITORING_CATALOG.filter((item)=>item.startable && item.rightsStatus==='cleared').length >= 137)
  const catalogKeys = new Set(MONITORING_CATALOG.map((item) => item.key))
  for (const priority of PRIORITY_METHODS_2026) assert.equal(catalogKeys.has(priority.key), false, priority.key + ' is research metadata only')
  const entries = buildExplorerEntries({locale:'ru',audience:'account'})
  assert.ok(entries.find((item)=>item.key==='who-5' && !item.selectable))
  const jsx = await readFile('components/app/priority-methods-review.jsx','utf8')
  const explorer = await readFile('components/app/test-explorer.jsx','utf8')
  assert.match(explorer, /availability === 'full' && <PriorityMethodsReview/)
  assert.match(jsx, /data-priority-methods-review/)
  assert.match(jsx, /item\.status !== 'open_reuse'/)
  assert.doesNotMatch(jsx, /scoreAssessment|saveAssessment|createRun|setSelectedKeys|auth\/start/)
})
