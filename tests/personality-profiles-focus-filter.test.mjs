import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const builder = read('components/personality-profiles-builder.tsx')
const css = read('components/personality-profiles-builder.module.css')

const match = builder.match(/const focusAreas: Record<Focus, Area\[]> = \{([\s\S]*?)\n\};/)
assert.ok(match, 'the focus-to-topic map must be declared explicitly')
const focusAreas = Object.fromEntries(
  [...match[1].matchAll(/^\s+(\w+): (\[[^\n]*\]),?$/gm)]
    .map(([, focus, topics]) => [focus, JSON.parse(topics)]),
)
const optionsFor = focuses => [...new Set(focuses.flatMap(focus => focusAreas[focus]))]

test('each focus on slide one exposes only its own topics on slide two', () => {
  assert.deepEqual(Object.keys(focusAreas), ['wellbeing', 'relationships', 'work', 'identity'])
  assert.deepEqual(optionsFor(['wellbeing']), ['emotions', 'recovery', 'body'])
  assert.deepEqual(optionsFor(['relationships']), ['connection'])
  assert.deepEqual(optionsFor(['work']), ['work', 'money'])
  assert.deepEqual(optionsFor(['identity']), ['traits', 'support', 'meaning'])
  assert.deepEqual(optionsFor(['wellbeing', 'relationships']), ['emotions', 'recovery', 'body', 'connection'])
  assert.deepEqual(optionsFor(['wellbeing', 'wellbeing']), ['emotions', 'recovery', 'body'])
  assert.deepEqual(optionsFor(Object.keys(focusAreas)).length, 9)
  assert.deepEqual(optionsFor([]), [])
})

test('slide two renders only the filtered topics; downstream scales and tests cannot carry stale direction choices', () => {
  assert.match(builder, /const areasFor = \(focuses: Focus\[\]\) => \[\.\.\.new Set\(focuses.flatMap\(focus => focusAreas\[focus\]\)\)\]/)
  assert.match(builder, /const visibleAreas = areasFor\(focuses\);/)
  assert.match(builder, /const activeAreas = areas.filter\(area => visibleAreas.includes\(area\)\);/)
  assert.match(builder, /const availableAxes = allAxesFor\(activeAreas\);/)
  assert.match(builder, /if \(!visibleAreas.includes\(area\)\) return;/)
  const stepTwo = builder.split('{step === 1 && <section')[1]?.split('{step === 2 && <section')[0]
  assert.ok(stepTwo, 'topic slide must exist')
  assert.match(stepTwo, /\{visibleAreas\.map\(area =>/)
  assert.doesNotMatch(stepTwo, /allAreas\.map/)
  assert.match(stepTwo, /data-profile-topic-options/)
  assert.match(stepTwo, /data-profile-selected-focus/)
  assert.match(builder, /if \(step === 1 && activeAreas.length\) setStep\(2\)/)
  assert.match(builder, /disabled=\{step === 1 \? activeAreas.length === 0/)
  const onFocusChange = builder.split('function toggleFocus(focus: Focus) {')[1]?.split('function toggleArea(area: Area) {')[0]
  assert.ok(onFocusChange)
  for (const stale of ['setAreas([])', 'setSelectedAxes([])', 'setSelectedKeys([])', 'setShowMore(false)']) {
    assert.ok(onFocusChange.includes(stale), 'reset on focus change: ' + stale)
  }
})

test('filtered focus summary is localized and mobile topics use compact full-width rows', () => {
  for (const phrase of [
    'focusContext: "Selected interests"',
    'focusContext: "Выбранные направления"',
    'focusContext: "Áreas elegidas"',
  ]) assert.ok(builder.includes(phrase), phrase)
  assert.match(builder, /focuses\.map\(focus => t\.focuses\[focus\]\[0\]\)/)
  assert.match(css, /\.focusContext \{/)
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.areaGrid \{ grid-template-columns: 1fr; gap: 7px; \}/)
  assert.match(css, /\.areaCard \{ min-height: 64px; align-items: center; padding: 10px 12px; gap: 10px; \}/)
})
