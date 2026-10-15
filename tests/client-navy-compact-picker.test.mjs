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


const fullExplorerCss = read('components/app/test-explorer.module.css')

test('simple test picker uses navy choice states and reserves wine for launching tests', () => {
  assert.match(css, /Test picker 2026-10-15: all selection actions navy/)
  assert.match(css, /--choice-navy:#173957/)
  assert.match(css, /\.shell :is\(\.topic,\.problemChip,\.depthOption\)\[aria-pressed=true\]/)
  assert.match(css, /\.shell \.kindChoice\[data-checked=true\]/)
  assert.match(css, /\.shell \.modeSwitch button\[aria-pressed=true\]\{background:var\(--choice-navy\)/)
  assert.match(css, /\.shell \.timeButtons button\[aria-pressed=true\]/)
  assert.match(css, /\.shell \.themeRefinements button\{background:var\(--choice-navy\)/)
  assert.match(css, /\.shell \.promoAction,\.shell \.cta\[data-test-start-mode=course\]/)
  assert.match(css, /\.shell \.takeTest,\.shell \.cta\[data-test-start-mode=tests\]/)
  assert.match(picker, /data-test-start-mode=\{journeyMode\}/)
  assert.match(picker, /onClick=\{journeyMode === 'course' \? onStartCourse : onStart\}/)
  assert.match(picker, /onClick=\{\(\) => onStartSingle\?\.\(entry\)\}/)
  assert.match(routeCss, /My Tests site chrome: navy for navigation\/sign-in/)
  assert.match(routeCss, /site-cabinet-link:hover/)
})

test('full test catalog differentiates selection and save buttons from actual test start', () => {
  assert.equal((explorer.match(/data-test-action=\{explicitSelectionOnly \? 'save' : 'start'\}/g) || []).length, 2)
  assert.match(fullExplorerCss, /Full test selection: navy choices, burgundy test starts only/)
  assert.match(fullExplorerCss, /\.explorer \.guidedResults,\.explorer \.databaseHeader button/)
  assert.match(fullExplorerCss, /\.explorer \.quickPrimary\[data-test-action=save\]/)
  assert.match(fullExplorerCss, /\.explorer \.quickPrimary\[data-test-action=start\]/)
  assert.match(fullExplorerCss, /\.explorer \.battery \.primary\[data-test-action=start\]/)
  assert.match(explorer, /onStart\(\[entry\]/)
})


test('each recommended test has a single visible test-kind badge, not a duplicate hidden in details', () => {
  assert.equal((picker.match(/<KindBadge entry=\{entry\} locale=\{locale\} \/>/g) || []).length, 1)
  assert.match(picker, /<div className=\{styles\.testFacts\}>/)
})


test('editorial polish reduces top-of-page bulk without losing the three-step picker', () => {
  assert.match(css, /My Tests editorial spacing & mobile card readability/)
  assert.match(css, /\.shell \.benefits>div\{/)
  assert.match(css, /\.shell \.promoImage\{/)
  assert.match(css, /\.shell \.promoCopy h2\{/)
  assert.match(css, /\.shell \.sectionHeader\{/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /\.shell \.promoImage\{width:76px;height:100px/)
  assert.match(css, /\.shell \.benefits>div\{min-height:37px/)
  assert.match(picker, /id="hh-simple-topic-title"/)
  assert.match(picker, /id="hh-simple-recommendations"/)
  assert.match(picker, /data-client-tests-promo/)
})

test('mobile cards give full width to labels and keep a 44px burgundy launch button below metadata', () => {
  assert.match(css, /\.shell \.testEntry \.testRow\{\s*grid-template-columns:20px 50px minmax\(0,1fr\);\s*grid-template-rows:auto auto/)
  assert.match(css, /\.shell \.testInfo,\.shell \.testEntry \.testInfo\{\s*grid-column:3;grid-row:1/)
  assert.match(css, /\.shell \.takeTest\{\s*grid-column:3;grid-row:2;justify-self:end;min-height:44px/)
  assert.match(css, /\.shell \.testInfo>small\{font-size:\.73rem;line-height:1\.35;-webkit-line-clamp:2/)
  assert.match(css, /\.shell \.testDetails>summary\{padding:9px 12px;min-height:44px/)
  assert.match(css, /@media\(max-width:370px\)/)
  assert.match(css, /\.shell \.testInfo \.testKindBadge span\{display:inline\}/)
  assert.match(picker, /onClick=\{\(\) => onStartSingle\?\.\(entry\)\}/)
  assert.match(picker, /<details className=\{styles\.researchDetails\}>/)
  assert.match(css, /\.shell \.takeTest,\.shell \.cta\[data-test-start-mode=tests\]/)
})

test('brief introductions remain localized and their topic action still jumps to the real picker', () => {
  assert.match(picker, /promoTitle:'Start with what matters to you'/)
  assert.match(picker, /promoTitle:'Начните с того, что важно вам'/)
  assert.match(picker, /promoTitle:'Empieza por lo que te importa'/)
  assert.match(picker, /href="#hh-simple-topic-title"/)
  assert.match(picker, /aria-pressed=\{checked\}/)
  assert.match(picker, /onToggleFocus\(key\)/)
  assert.match(picker, /data-test-start-mode=\{journeyMode\}/)
})
