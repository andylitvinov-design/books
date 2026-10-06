import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import {
  TEST_LENGTH_FILTERS,
  TEST_RECOMMENDATION_FOCUS,
  TEST_STYLE_FILTERS,
  filterAssessmentDefinitions,
  rankAssessmentDefinitions,
} from '../lib/assessments/test-recommendations.js'

function availableDefinitions() {
  return [
    getAssessmentDefinition('hh-current-state', 'v2', 'en'),
    getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en'),
    getAssessmentDefinition('mini-ipip-20', 'v1', 'en'),
  ]
}

test('short stress concerns rank the Current State check first', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['stress'],
    depth: 'quick',
  })
  assert.equal(ranked[0].definition.key, 'hh-current-state')
  assert.deepEqual(ranked[0].matchedFocus, ['stress'])
})

test('balanced stress monitoring ranks Weekly Pulse first', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['stress', 'sleep'],
    depth: 'balanced',
  })
  assert.equal(ranked[0].definition.key, 'hh-weekly-pulse')
  assert.deepEqual(ranked[0].matchedFocus, ['stress', 'sleep'])
})

test('theme relevance outranks a shorter but unrelated test', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['attention'],
    depth: 'quick',
  })
  assert.equal(ranked[0].definition.key, 'mini-ipip-20')
  assert.deepEqual(ranked[0].matchedFocus, ['attention'])
})

test('relationship concerns with deeper preference rank the personality baseline first', () => {
  const ranked = rankAssessmentDefinitions(availableDefinitions(), {
    focus: ['relationships'],
    depth: 'deep',
  })
  assert.equal(ranked[0].definition.key, 'mini-ipip-20')
  assert.deepEqual(ranked[0].matchedFocus, ['relationships'])
})

test('recommendation ranking is deterministic, ignores unknown focus values and does not mutate definitions', () => {
  const definitions = availableDefinitions()
  const before = definitions.map((definition) => definition.id)
  const first = rankAssessmentDefinitions(definitions, {
    focus: ['stress', 'stress', 'not-a-real-area'],
    depth: 'balanced',
  })
  const second = rankAssessmentDefinitions(definitions, {
    focus: ['stress', 'not-a-real-area'],
    depth: 'balanced',
  })
  assert.deepEqual(definitions.map((definition) => definition.id), before)
  assert.deepEqual(first.map((item) => item.definition.id), second.map((item) => item.definition.id))
  assert.equal(first.length, definitions.length)
})

test('recommendation focus options cover practical monitoring themes in both languages', () => {
  for (const key of ['anxiety', 'stress', 'clarity', 'body', 'mood', 'sleep', 'relationships', 'resources']) {
    const item = TEST_RECOMMENDATION_FOCUS.find((candidate) => candidate.key === key)
    assert.ok(item)
    assert.ok(item.label.en)
    assert.ok(item.label.ru)
  }
})

test('personal Cabinet exposes both assessment actions and privacy-preserving ranked recommendations', async () => {
  const workspace = await readFile('components/app/app-workspace.jsx', 'utf8')
  assert.match(workspace, /Take a free state analysis and get recommendations/)
  assert.match(workspace, /Build a personal test battery/)
  assert.match(workspace, /monitoring\/hh-current-state/)
  assert.match(workspace, /mode=recommendations/)
  assert.match(workspace, /TEST_RECOMMENDATION_FOCUS/)
  assert.match(workspace, /rankAssessmentDefinitions/)
  assert.match(workspace, /not saved to your profile/)
  assert.match(workspace, /Ваш рекомендуемый порядок/)
  assert.match(workspace, /hh-weekly-pulse/)
  assert.doesNotMatch(workspace, /MIND_BODY_MONITOR_REGISTRY\.map/)
})


test('public Cabinet exposes the weighted recommender before registration and keeps safety-gated PHQ-9 out of guest starts', async () => {
  const [landing, styles] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])

  assert.match(landing, /Подобрать комплект тестов под ваш запрос/)
  assert.match(landing, /TEST_RECOMMENDATION_FOCUS\.map/)
  assert.match(landing, /rankAssessmentDefinitions\(publicRecommendationDefinitions\(locale\)/)
  assert.match(landing, /className="cabinet-test-recommender"/)
  assert.match(landing, /className="cabinet-test-recommender-build"/)
  assert.match(landing, /className="cabinet-ranked-tests"/)
  assert.match(landing, /onClick=\{\(\) => begin\(item\.definition\.key\)\}/)
  assert.match(landing, /PUBLIC_GUEST_BLOCKED_KEYS = new Set\(\['phq-9'\]\)/)
  assert.doesNotMatch(landing, /MONITOR_AREAS/)
  assert.match(landing, /not saved unless you explicitly consent to a test/)
  assert.match(landing, /не сохраняется без вашего явного согласия/)
  assert.match(styles, /Public Cabinet weighted test recommender/)
  assert.match(styles, /\.cabinet-test-focus-grid button\[aria-pressed="true"\]/)
})


test('active assessment inventory is classified for style and length filters', () => {
  const active = MONITORING_CATALOG.filter((item) => item.startable)
  assert.equal(active.length, 42)
  assert.equal(active.filter((item) => item.testStyle === 'engaging').length, 30)
  assert.equal(active.filter((item) => item.testStyle === 'professional').length, 12)
  assert.equal(active.filter((item) => item.testLength === 'short').length, 25)
  assert.equal(active.filter((item) => item.testLength === 'medium').length, 12)
  assert.equal(active.filter((item) => item.testLength === 'comprehensive').length, 5)
  assert.ok(active.every((item) => TEST_STYLE_FILTERS.some((filter) => filter.key === item.testStyle)))
  assert.ok(active.every((item) => TEST_LENGTH_FILTERS.some((filter) => filter.key === item.testLength)))
})

test('style and length filters combine before recommendation ranking', () => {
  const definitions = MONITORING_CATALOG
    .filter((item) => item.startable)
    .map((item) =>
      getAssessmentDefinition(
        item.key,
        item.version,
        item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale,
      ),
    )

  const professionalMedium = filterAssessmentDefinitions(definitions, {
    styles: ['professional'],
    lengths: ['medium'],
  })
  assert.deepEqual(
    professionalMedium.map((definition) => definition.key).sort(),
    ['gad-7', 'phq-9'].sort(),
  )

  const engagingComprehensive = rankAssessmentDefinitions(definitions, {
    focus: ['relationships'],
    styles: ['engaging'],
    lengths: ['comprehensive'],
  })
  assert.deepEqual(engagingComprehensive.map((item) => item.definition.key), ['hh-monthly-profile'])
  assert.deepEqual(engagingComprehensive[0].matchedFocus, ['relationships'])
})

test('public and signed-in recommenders expose style and length switch groups', async () => {
  const [landing, workspace] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
  ])
  for (const source of [landing, workspace]) {
    assert.match(source, /TEST_STYLE_FILTERS/)
    assert.match(source, /TEST_LENGTH_FILTERS/)
    assert.match(source, /testStyles/)
    assert.match(source, /testLengths/)
  }
  assert.match(landing, /Лёгкие \/ игровые/)
  assert.match(landing, /Профессиональные/)
  assert.match(landing, /Комплексные/)
  assert.match(workspace, /Fun \/ engaging/)
  assert.match(workspace, /Comprehensive/)
})


test('expanded battery includes cleared professional quick screens and original playful checks', () => {
  const activeKeys = new Set(MONITORING_CATALOG.filter((item) => item.startable).map((item) => item.key))
  for (const key of ['phq-2','gad-2','k10','hh-social-battery','hh-focus-mode','hh-stress-weather','hh-recharge-decoder','hh-boundary-radar','hh-tiny-joys']) assert.ok(activeKeys.has(key), key)
  for (const key of ['hh-social-battery','hh-focus-mode','hh-stress-weather','hh-recharge-decoder','hh-boundary-radar','hh-tiny-joys']) {
    assert.ok(getAssessmentDefinition(key, 'v1', 'en'))
    assert.ok(getAssessmentDefinition(key, 'v1', 'ru'))
  }
  for (const key of ['phq-2','gad-2','k10']) assert.equal(getAssessmentDefinition(key, 'v1', 'en').instrumentLocale, 'en')
})
