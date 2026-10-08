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
  assert.match(home, /entry\.selfCheck\.href/)
  assert.match(home, /Check how you’re doing/)
  assert.match(home, /Проверить своё состояние/)
  assert.doesNotMatch(home, /<MindBodyMonitorHome/)
  assert.doesNotMatch(home, /<MindBodyMonitorStrip/)
  assert.match(wuXing, /DAOIST ALCHEMY/)
  assert.match(wuXing, /18 resource stages/)
  assert.match(wuXing, /author-developed symbolic resource and development model/)
  assert.match(wuXing, /client\/tests/)
  assert.match(wuXing, /https:\/\/t\.me\/AndyTherapist/)
  assert.doesNotMatch(wuXing, /services#available-services/)
  assert.doesNotMatch(navigation, /mind-body|monitor|wu-xing/i)
})

test('public and signed-in monitor surfaces expose only real runnable tests', async () => {
  const [landing, workspace] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
  ])
  assert.match(landing, /Current State Check/)
  assert.match(landing, /Personality Baseline/)
  assert.match(landing, /MONITORING_CATALOG/)
  assert.match(landing, /guest\/test-plans/)
  assert.match(landing, /PUBLIC_GUEST_BLOCKED_KEYS = new Set\(\['phq-9'\]\)/)
  assert.doesNotMatch(landing, /MONITOR_AREAS\.slice/)
  assert.match(workspace, /Recommended/)
  assert.match(workspace, /All available/)
  assert.match(workspace, /By area/)
  assert.match(workspace, /Completed/)
  assert.doesNotMatch(workspace, /getAssessmentDefinition\('phq-9'/)
  assert.doesNotMatch(workspace, /getAssessmentDefinition\('c-ssrs/)
})


test('homepage monitor offers soft focus choices and recommendation framing', async () => {
  const homeMonitor = await readFile('components/mind-body-monitor-home.tsx', 'utf8')
  for (const focus of ['anxiety', 'stress', 'clarity', 'body', 'mood', 'sleep']) {
    assert.match(homeMonitor, new RegExp(`key: ["']${focus}["']`))
  }
  assert.match(homeMonitor, /Start free monitoring/)
  assert.match(homeMonitor, /Начать бесплатный мониторинг/)
  assert.match(homeMonitor, /activeMonitoringTestCounts\(\)/)
  assert.match(homeMonitor, /inventoryEngaging/)
  assert.match(homeMonitor, /inventoryProfessional/)
  assert.match(homeMonitor, /Фильтр по теме, стилю и длине/)
  assert.match(homeMonitor, /next-step recommendations/)
  assert.match(homeMonitor, /not a diagnosis/)
  assert.match(homeMonitor, /data-monitor-focus/)
})


test('public state-check strip stays compact and softly carded on mobile', async () => {
  const [strip, styles] = await Promise.all([
    readFile('components/mind-body-monitor-strip.tsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])

  assert.match(strip, /Проверьте своё состояние — бесплатно/)
  assert.match(styles, /\.mind-body-monitor-strip__inner\s*\{[^}]*border-radius:\s*18px/)
  assert.match(styles, /\.mind-body-monitor-strip__actions a\s*\{[^}]*min-height:\s*35px/)
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.mind-body-monitor-strip__actions a\s*\{[^}]*min-height:\s*34px/)
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?font-size:\s*10\.5px/)
})
