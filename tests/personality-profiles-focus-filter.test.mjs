import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PROFILE_FOCUS_AREAS, PROFILE_AREA_AXES } from '../lib/profile/profile-scale-selection.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const builder = read('components/personality-profiles-builder.tsx')
const css = read('components/personality-profiles-builder.module.css')

const focusAreas = PROFILE_FOCUS_AREAS
const optionsFor = focuses => [...new Set(focuses.flatMap(focus => focusAreas[focus]))]

test('each focus on slide one exposes only source-backed scales on slide two', () => {
  assert.deepEqual(Object.keys(focusAreas), ['wellbeing', 'relationships', 'work', 'identity', 'goal'])
  assert.deepEqual(optionsFor(['wellbeing']), ['emotions', 'recovery', 'body'])
  assert.deepEqual(optionsFor(['relationships']), ['connection'])
  assert.deepEqual(optionsFor(['work']), ['work', 'money'])
  assert.deepEqual(optionsFor(['identity']), ['traits', 'support', 'meaning'])
  assert.deepEqual(optionsFor(['goal']), ['goal'])
  assert.deepEqual(optionsFor(['wellbeing', 'relationships']), ['emotions', 'recovery', 'body', 'connection'])
  assert.deepEqual(optionsFor(['wellbeing', 'wellbeing']), ['emotions', 'recovery', 'body'])
  assert.deepEqual(optionsFor(Object.keys(focusAreas)).length, 10)
  assert.deepEqual(optionsFor([]), [])
})

test('slide two independently selects only source-backed research scales and clears stale drafts', () => {
  assert.doesNotMatch(builder, /extraProfile|extraGroups|areasFor\(/)
  assert.match(builder, /const visibleAreas = profileAreasWithTests\(tests, focuses\) as Area\[\];/)
  assert.match(builder, /const activeAreas = visibleAreas\.filter\(area =>/)
  assert.match(builder, /selectedResearchIds\.some\(id => id\.startsWith\(area \+ "::"\)\)/)
  assert.match(builder, /const selectedAxes = selectedProfileAxes\(scaleGroups, selectedScaleIds\) as string\[\]/)
  assert.match(builder, /if \(!visibleScaleGroups\.some\(group => group\.researchAxes\.some\(axis => axis\.id === id\)\)\) return;/)
  const stepTwo = builder.split('{step === 1 && <section')[1]?.split('{step === 2 && <section')[0]
  assert.ok(stepTwo, 'research scales screen must exist')
  assert.match(stepTwo, /visibleScaleGroups\.map\(group =>/)
  assert.doesNotMatch(stepTwo, /allAreas\.map/)
  assert.match(stepTwo, /data-profile-research-scale-options/)
  assert.match(stepTwo, /data-profile-research-choice=\{axis\.id\}/)
  assert.match(stepTwo, /data-profile-selected-focus/)
  assert.match(builder, /else if \(step === 1 && selectedResearchIds\.length && scaleGroups\.some/)
  assert.match(builder, /disabled=\{selectedResearchIds\.length === 0\}/)
  const onFocusChange = builder.split('function toggleFocus(focus: Focus) {')[1]?.split('function toggleResearchAxis(id: string) {')[0]
  assert.ok(onFocusChange)
  for (const stale of ['setSelectedResearchIds([])', 'setSelectedScaleIds([])', 'setShowMore(false)'])
    assert.ok(onFocusChange.includes(stale), 'reset on focus change: ' + stale)
})

test('filtered focus summary is localized and scales offer mobile full-width tap targets', () => {
  for (const phrase of [
    'focusContext: "Selected interests"',
    'focusContext: "Выбранные направления"',
    'focusContext: "Áreas elegidas"',
  ]) assert.ok(builder.includes(phrase), phrase)
  assert.match(builder, /focuses\.map\(focus => t\.focuses\[focus\]\[0\]\)/)
  assert.match(css, /\.focusContext \{/)
  assert.match(css, /\.researchChoice\{[^}]*min-height:49px/)
  assert.match(css, /@media\(max-width:450px\)\{[\s\S]*?\.researchChoices\{grid-template-columns:minmax\(0,1fr\)\}/)
})

test('research scales are separate; third screen contains topics and no full questionnaires', () => {
  assert.ok(Object.values(PROFILE_AREA_AXES).flat().includes('anxiety'))
  assert.match(builder, /group\.researchAxes\.map\(axis =>/)
  assert.match(builder, /researchLabel\(axis\.id, locale\)/)
  assert.match(builder, /data-profile-scale-selection-step/)
  assert.match(builder, /data-profile-topics-step/)
  assert.match(builder, /data-profile-scales-by-topic/)
  assert.match(builder, /data-profile-topic-choice=\{scale\.id\}/)
  assert.match(builder, /data-profile-confirm-scales/)
  const topicStep = builder.split('{step === 2 && <section')[1]?.split('{step === 3 && <section')[0]
  assert.ok(topicStep)
  assert.doesNotMatch(topicStep, /scale\.testTitle|scale\.scaleQuestions|scale\.questions|scale\.minutes/)
  for (const stages of [
    '["Focus", "Scales", "Topics", "Tests", "Ready"]',
    '["Запрос", "Шкалы", "Темы", "Тесты", "Начало"]',
    '["Interés", "Escalas", "Temas", "Pruebas", "Inicio"]',
  ]) assert.ok(builder.includes(stages), stages)
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
})
