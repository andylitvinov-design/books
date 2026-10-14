import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const picker = read('components/app/simple-test-picker.jsx')
const css = read('components/app/simple-test-picker.module.css')
const explorer = read('components/app/test-explorer.jsx')
const publicFlow = read('components/app/public-test-explorer.jsx')
const routeCss = read('app/[locale]/client/client-teal.css')

test('recommendation cards stay compact with separate selection, disclosure and start actions', () => {
  assert.match(picker, /<article className=\{styles\.testEntry\}/)
  assert.match(picker, /<label htmlFor=\{inputId\} className=\{styles\.testInfo\}>/)
  assert.match(picker, /onToggleTest\(entry\.key\)/)
  assert.match(picker, /className=\{styles\.takeTest\}/)
  assert.match(picker, /onClick=\{\(\) => onStartSingle\?\.\(entry\)\}/)
  assert.match(picker, /<details className=\{styles\.testDetails\}>/)
  assert.match(picker, /<TestScaleGuide guide=\{entry\.scaleGuide\}/)
  assert.match(picker, /entry\.matchPercent/)
  assert.match(picker, /entry\.durationMinutes/)
  assert.match(picker, /loading="lazy" decoding="async"/)
})

test('each Take Test button submits only that test via the existing account or Google workflow', () => {
  assert.match(explorer, /const start = async \(battery = activeBattery\)/)
  assert.match(explorer, /await onStart\(battery, \{/)
  assert.match(explorer, /onStartSingle=\{\(entry\) => start\(\[entry\]\)\}/)
  assert.match(explorer, /onStart=\{\(\) => start\(\)\}/)
  assert.match(publicFlow, /makeTestSelectionIntent\(entries\.map\(\(entry\) => entry\.key\)/)
  assert.match(publicFlow, /request\('test-plans'/)
  assert.match(publicFlow, /request\('auth\/start'/)
  assert.match(picker, /data-test-course-switch/)
  assert.match(picker, /onClick=\{journeyMode === 'course' \? onStartCourse : onStart\}/)
})

test('the public client page uses navy text, burgundy controls, and narrow-screen card sizes', () => {
  assert.match(css, /Navy and burgundy editorial refresh/)
  assert.match(css, /--ink:#173a53/)
  assert.match(css, /background:linear-gradient\(105deg,#994a62,#7d3249\)/)
  assert.match(css, /\.testDetails\[open\] summary svg/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /@media\(max-width:370px\)/)
  assert.match(routeCss, /\.client-entry-shell \.house-header/)
  assert.doesNotMatch(routeCss, /\.client-cabinet\s*\{/)
})
