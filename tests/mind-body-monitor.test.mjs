import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  MIND_BODY_MONITOR_REGISTRY,
  MONITOR_AREAS,
  PRODUCT_MONITOR_MODULES,
  RIGHTS_STATUS,
  registryCount,
} from '../data/assessments/mind-body-monitor-registry.js'

test('Mind–Body Monitor registry contains exactly 73 unique research instruments', () => {
  assert.equal(registryCount(), 73)
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length, 73)
  assert.equal(new Set(MIND_BODY_MONITOR_REGISTRY.map((item) => item.key)).size, 73)
  assert.equal(MONITOR_AREAS.length, 14)
})

test('research registry is metadata-gated and cannot silently publish questionnaires', () => {
  assert.ok(MIND_BODY_MONITOR_REGISTRY.every((item) => item.enabled === false))
  assert.ok(
    MIND_BODY_MONITOR_REGISTRY.every((item) =>
      Object.values(RIGHTS_STATUS).includes(item.rightsStatus),
    ),
  )
  assert.equal(
    MIND_BODY_MONITOR_REGISTRY.find((item) => item.key === 'phq-9')?.rightsStatus,
    RIGHTS_STATUS.MANAGED_SAFETY_ONLY,
  )
  assert.equal(
    MIND_BODY_MONITOR_REGISTRY.find((item) => item.key === 'c-ssrs-screener')?.rightsStatus,
    RIGHTS_STATUS.MANAGED_SAFETY_ONLY,
  )
  for (const key of ['mmpi-3', 'pai', 'mini-interview']) {
    assert.equal(
      MIND_BODY_MONITOR_REGISTRY.find((item) => item.key === key)?.rightsStatus,
      RIGHTS_STATUS.CLINICIAN_ONLY,
    )
  }
})

test('existing runnable modules remain separate from the 73-instrument research registry', () => {
  assert.deepEqual(
    PRODUCT_MONITOR_MODULES.filter((item) => item.enabled).map((item) => item.key),
    ['hh-current-state', 'mini-ipip-20'],
  )
  const wuXing = PRODUCT_MONITOR_MODULES.find((item) => item.key === 'wu-xing-personal-profile')
  assert.equal(wuXing.enabled, false)
  assert.equal(wuXing.blockedReason, 'source_and_scoring_spec_required')
})

test('public monitor discovery is wired without adding a seventh main navigation item', async () => {
  const [header, home, wuXing, navigation] = await Promise.all([
    readFile('components/public-site-header.tsx', 'utf8'),
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('app/[locale]/wu-xing/page.tsx', 'utf8'),
    readFile('lib/site-navigation-model.js', 'utf8'),
  ])
  assert.match(header, /MindBodyMonitorStrip/)
  assert.match(home, /MindBodyMonitorHome/)
  assert.match(home, /MindBodyMonitorStrip/)
  assert.match(wuXing, /automated personal Wu Xing scoring model is not live yet/)
  assert.doesNotMatch(navigation, /mind-body|monitor|wu-xing/i)
})

test('public and signed-in monitor surfaces expose only real runnable tests', async () => {
  const [landing, workspace] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
  ])
  assert.match(landing, /Current State Check/)
  assert.match(landing, /Personality Baseline/)
  assert.match(landing, /MONITOR_AREAS\.slice\(0, 8\)/)
  assert.match(workspace, /Recommended/)
  assert.match(workspace, /All available/)
  assert.match(workspace, /By area/)
  assert.match(workspace, /Completed/)
  assert.doesNotMatch(workspace, /getAssessmentDefinition\('phq-9'/)
  assert.doesNotMatch(workspace, /getAssessmentDefinition\('c-ssrs/)
})
