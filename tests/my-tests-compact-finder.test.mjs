import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const picker = read('components/app/simple-test-picker.jsx')
const css = read('components/app/simple-test-picker.module.css')
const battery = read('components/app/account-test-battery.jsx')
const dashboard = read('components/app/my-tests-dashboard.jsx')

test('signed-in My Tests uses a compact, accessible finder, not the navy public marketing hero', () => {
  assert.match(picker, /data-account-test-picker=\{authenticated \? 'true' : undefined\}/)
  assert.match(picker, /className=\{authenticated \? styles\.accountFinder : academyStyles\.hero\}/)
  assert.match(picker, /\{!authenticated && <div className=\{academyStyles\.topline\}>/)
  assert.doesNotMatch(picker, /\{!authenticated && <div className=\{\x60\$\{academyStyles\.suggestions\}/)
  assert.match(picker, /\? <h2 className=\{styles\.accountFinderTitle\}>\{c\.finderTitle\}<\/h2>/)
  assert.match(picker, /: <h1>\{c\.heroHeadline\}<\/h1>/)
  assert.match(picker, /finderTitle: 'Find the right tests'/)
  assert.match(picker, /finderTitle: 'Подобрать подходящие тесты'/)
  assert.match(picker, /finderTitle: 'Encuentra tus pruebas'/)
  assert.match(battery, /simpleMode=\{!fromCourse && !recommendedKey && !openFromInsights\}/)
  assert.match(battery, /authenticated/)
  assert.match(dashboard, /id="my-tests-picker-toggle"/)
})

test('the same functional local search and topic/type selectors remain in the compact finder', () => {
  assert.match(picker, /<form className=\{authenticated \? styles\.accountFinderSearch : academyStyles\.form\} role="search"/)
  assert.match(picker, /setSubmittedHeroSearch\(heroSearch\.trim\(\)\)/)
  assert.match(picker, /id="hh-test-hero-search"/)
  assert.match(picker, /value=\{heroSearch\}/)
  assert.match(picker, /setHeroSearch\(event\.target\.value\)/)
  assert.match(picker, /setVisibleCount\(5\)/)
  assert.match(picker, /searchPublicTestEntries\(/)
  assert.match(picker, /\{authenticated && <div className=\{styles\.accountFinderFilters\}>/)
  assert.match(picker, /if \(chosen !== 'all'\) onToggleFocus\(chosen\)/)
  assert.match(picker, /onSelectTestKind\?\.\(event\.target\.value === 'all' \? null : event\.target\.value\)/)
  assert.match(picker, /<div className=\{styles\.topicGrid\} role="group"/)
  assert.match(picker, /onClick=\{onBrowseFull\}/)
})

test('account picker uses a single full-width cream panel, iPhone safe search, and two compact controls', () => {
  assert.match(css, /\.shell\[data-account-test-picker\]\{/)
  assert.match(css, /\.shell\[data-account-test-picker\] \.accountFinder\{/)
  assert.match(css, /background:linear-gradient\(125deg,#fffefb 0%,#faf6ee 100%\)/)
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto/)
  assert.match(css, /font:400 16px\/1\.3 system-ui/)
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /@media\(max-width:360px\)/)
  assert.match(css, /\.shell\[data-account-test-picker\] \.accountFinderSearch:focus-within/)
  assert.match(css, /\.shell\[data-account-test-picker\] \.accountFinderFilters select:focus-visible/)
  assert.doesNotMatch(picker, /data-account-test-picker=\{!authenticated/)
  assert.ok(picker.includes('data-public-test-picker={!authenticated'), 'Public visual remains a different variant')
})
