import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { HOME_TEST_TOPICS } from '../lib/assessments/insights-categories.js'
import { TEST_RECOMMENDATION_FOCUS } from '../lib/assessments/test-recommendations.js'
import { buildExplorerEntries, filterExplorerEntries, rankPublicTestMatches } from '../lib/assessments/test-explorer.js'
import { problemsForTopics, normalizeProblemsForTopics } from '../lib/assessments/test-problems.js'
import { normalizeTestPreferences, makeTestSelectionIntent, readTestSelectionIntent } from '../lib/app/test-selection-intent.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const picker = read('components/app/simple-test-picker.jsx')
const css = read('components/app/simple-test-picker.module.css')

test('mobile picker shows 10 accessible topics in 5 rows of 2, with all three languages', () => {
  const keys = [...HOME_TEST_TOPICS.map((x) => x.key), 'function', 'health']
  assert.equal(keys.length, 10)
  assert.equal(new Set(keys).size, 10)
  assert.match(picker, /key: 'function', en: 'Work & daily life'/)
  assert.match(picker, /key: 'health', en: 'Health', ru: 'Здоровье', es: 'Salud'/)
  assert.match(picker, /health: CirclePlus/)
  assert.match(picker, /TOPICS\.map\(\(\{ key, Icon, \.\.\.labels \}\) =>/)
  assert.match(picker, /aria-pressed=\{checked\}/)
  assert.match(picker, /onToggleFocus\(key\)/)
  assert.match(picker, /TOPICS\.every\(\(\{key\}\) => focus\.includes\(key\)\)/)
  assert.match(css, /approved mockup: 10 topics \(2 columns on phone\)/)
  assert.match(css, /@media\(max-width:760px\)\{\s*\.shell \.topicGrid\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /@media\(max-width:370px\)\{\s*\.shell \.topicGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /\.shell \.topic span:not\(\.topicCheck\)\{min-width:0;overflow-wrap:break-word\}/)
})

test('Health is a real non-diagnostic wellbeing filter, not a duplicate Energy checkbox', () => {
  const health = TEST_RECOMMENDATION_FOCUS.find((item) => item.key === 'health')
  assert.ok(health)
  assert.ok(health.label.en && health.label.ru && health.label.es)
  assert.deepEqual(normalizeTestPreferences({ focus: ['body', 'health'] }), { focus: ['body', 'health'] })
  const candidates = filterExplorerEntries(buildExplorerEntries(), { availability: 'available', focus: ['health'] })
  assert.ok(candidates.length > 0, 'Health must yield real selectable questionnaires')
  assert.ok(candidates.every((item) => item.selectable), 'No metadata-only instruments are returned')
  assert.ok(candidates.some((item) => item.topics.some((topic) => ['body', 'sleep', 'recovery', 'energy'].includes(topic))))
  const recommendations = rankPublicTestMatches(candidates, { focus: ['health'], depth: 'balanced' })
  assert.ok(recommendations.length > 0)
  assert.ok(recommendations.every((item) => Number.isInteger(item.matchPercent) && item.matchPercent >= 0 && item.matchPercent <= 99))
  const concerns = problemsForTopics(['health'])
  assert.ok(concerns.some((item) => item.key === 'physical-discomfort'))
  assert.ok(normalizeProblemsForTopics([concerns[0].key], ['health']).includes(concerns[0].key))
  const timestamp = Date.now()
  const intent = makeTestSelectionIntent([recommendations[0].key], timestamp, { focus: ['health'] })
  const restored = readTestSelectionIntent(intent, timestamp)
  assert.deepEqual(restored.preferences.focus, ['health'])
  assert.deepEqual(restored.keys, [recommendations[0].key])
})

test('burgundy is reserved for important CTA buttons and selected recommendation controls', () => {
  assert.match(css, /--action-wine:#8b3151/)
  assert.match(css, /\.shell \.promoAction,\s*\.shell \.cta\[data-test-start-mode=tests\]/)
  assert.match(css, /\.shell \.takeTest,\.shell \.viaFamilyActions \.takeTest/)
  assert.match(css, /\.shell \.browseTabs button\[aria-pressed=true\]\{/)
  assert.match(css, /\.shell \.testEntry\[data-selected=true\]\{/)
  assert.match(css, /\.shell \.testChips \.matchBadge\{/)
  assert.match(css, /\.shell \.topic\[aria-pressed=true\]\{/)
  assert.match(picker, /onClick=\{\(\) => onStartSingle\?\.\(entry\)\}/)
  assert.match(picker, /data-test-start-mode=\{journeyMode\}/)
  assert.match(picker, /onClick=\{journeyMode === 'course' \? onStartCourse : onStart\}/)
})
