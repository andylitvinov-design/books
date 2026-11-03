import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const player = read('components/app/course-slide-player.jsx')
const css = read('components/app/course-slide-player.module.css')

test('lesson-entry measure asks for presence and uses its own positive anchors in EN/RU', () => {
  assert.match(player, /baselineResourceQuestion: 'Насколько вы сейчас ощущаете в себе ресурс и внутреннюю опору\?'/)
  assert.match(player, /baselineLow: '0 · Совсем не ощущаю', baselineHigh: '10 · Ощущаю в полной мере'/)
  assert.match(player, /baselineLow: '0 · Not at all', baselineHigh: '10 · Fully present'/)
  assert.match(player, /resourceFocus \? words\.baselineResourceQuestion : words\.baselineQuestion/)
  assert.match(player, /data-course-baseline-presence>\{baselinePrompt\}/)
  assert.match(player, /lowLabel=\{words\.baselineLow\}/)
  assert.match(player, /highLabel=\{words\.baselineHigh\}/)
  const intro = player.slice(player.indexOf("{slide.kind === 'baseline' && <>"), player.indexOf("{slide.kind === 'checkin' && ("))
  assert.doesNotMatch(intro, /<IllustratedMoment/)
  assert.match(intro, /value=\{entryNow\}/)
})

test('legacy discomfort measures remain unchanged to avoid reversing persisted scores', () => {
  assert.match(player, /checkinQuestion: 'Оцените силу беспокойства за последние 24 часа\.'/)
  assert.match(player, /practicePrePrompt: 'Прямо перед упражнением: насколько трудно/)
  assert.match(player, /practicePostPrompt: 'Сразу после упражнения: насколько трудно/)
  assert.match(player, /feedback:legacyFeedback,beforeNow,afterNow,reflection/)
})

test('baseline shows the entire landscape picture in a fullscreen accessible background', () => {
  assert.match(player, /data-course-baseline-background/)
  assert.match(player, /scenicBaseline && <div className=\{styles\.fullscreenScene\} aria-hidden="true"/)
  assert.match(player, /className=\{styles\.fullscreenScenePhoto\}/)
  assert.match(css, /\.overlay \.fullscreenScenePhoto\{/)
  assert.match(css, /object-fit:contain/)
  assert.match(css, /\.overlay \.sceneFrame > \.content\{/)
  assert.match(css, /env\(safe-area-inset-top\)/)
  assert.match(css, /@media\(max-width:540px\)/)
})
