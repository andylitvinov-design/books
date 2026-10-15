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
  assert.match(explorer, /const startSingle = async \(entry\)/)
  assert.match(explorer, /await onStart\(activeBattery, \{/)
  assert.match(explorer, /await onStart\(\[entry\], \{/)
  assert.match(explorer, /onStartSingle=\{startSingle\}/)
  assert.match(explorer, /onStart=\{start\}/)
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

test('compact navy/wine test details show type, time and measured scales before optional methodology', () => {
  assert.match(picker, /const COMPACT_KIND_LABELS/)
  assert.match(picker, /data-test-kind-badge/)
  assert.match(picker, /data-compact-test-scales/)
  assert.match(picker, /entry\.scaleGuide\.scales\.slice\(0, 3\)/)
  assert.match(picker, /<details className=\{styles\.researchDetails\}>/)
  assert.match(picker, /entry\.methodology/)
  assert.match(picker, /methodDetails:'Method & sources'/)
  assert.match(picker, /methodDetails:'Методика и источники'/)
  assert.match(picker, /methodDetails:'Método y fuentes'/)
  assert.match(picker, /<TestScaleGuide guide=\{entry\.scaleGuide\}/)
  assert.match(picker, /<ListChecks size=\{14\}/)
  assert.match(css, /\.testDetailsBody\{padding:12px/)
  assert.match(css, /\.testInfo \.testKindBadge\{display:inline-flex\}/)
  assert.doesNotMatch(css, /\.testInfo \.testKindBadge\{display:none\}/)
  assert.match(css, /\.scalePills\{/)
  assert.match(css, /\.researchDetails\{/)
});

test('softer palette does not remove the original single-test action or its authenticated flow', () => {
  assert.match(css, /Soft navy & burgundy My Tests/)
  assert.match(css, /--ink:#172f4b/)
  assert.match(picker, /onClick=\{\(\) => onStartSingle\?\.\(entry\)\}/)
  assert.match(explorer, /await onStart\(\[entry\], \{/)
  assert.match(publicFlow, /request\('auth\/start'/)
});
