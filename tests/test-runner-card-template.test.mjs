import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const guest = file('components/app/cabinet-landing.jsx')
const account = file('components/app/app-workspace.jsx')
const progress = file('components/app/guest-test-journey-progress.jsx')
const css = file('components/app/test-runner-cards.css')
const guestCss = file('components/app/guest-test-journey-progress.module.css')

test('both canonical public and private questionnaire routes import the SAME scoped card system', () => {
  const guestRoute = file('app/[locale]/client/page.tsx')
  const accountRoute = file('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(guestRoute, /import ["']@\/components\/app\/test-runner-cards\.css["']/)
  assert.match(accountRoute, /import ["']@\/components\/app\/test-runner-cards\.css["']/)
  for (const source of [guest, account]) {
    assert.match(source, /data-test-card-system="v1"/)
    assert.match(source, /hh-test-experience/)
    assert.match(source, /hh-test-question-card/)
    assert.match(source, /hh-test-question-caption/)
    assert.match(source, /hh-test-question-number/)
    assert.match(source, /hh-test-question-check/)
    assert.match(source, /data-answer-state=\{.*?\}/)
    assert.match(source, /lang=\{(?:def|definition)\.instrumentLocale\}/)
  }
  assert.ok(!css.includes('position: fixed'), 'shared skin must not occlude page or controls')
})

test('Quick renders individual question fieldsets and Guided retains one accessible question fieldset', () => {
  assert.match(guest, /definition\.questions\.map\(\(item, step\) => \(\s*<fieldset[^>]+hh-test-question-card/)
  assert.match(account, /def\.questions\.map\(\(item, step\) => \(\s*<fieldset[^>]+hh-test-question-card/)
  assert.match(guest, /<fieldset className="cabinet-guided-question hh-test-question-card/)
  assert.match(account, /<fieldset className="hh-runner-question hh-test-question-card/)
  assert.match(guest, /<legend className="hh-test-question-caption">/)
  assert.match(account, /<legend className="hh-test-question-caption">/)
  assert.match(guest, /<h3 lang=\{definition\.instrumentLocale\}>\{item\.text\}<\/h3>/)
  assert.match(account, /<h2 lang=\{def\.instrumentLocale\}>\{item\.text\}<\/h2>/)
  assert.match(account, /<h1 lang=\{def\.instrumentLocale\}>\{question\.text\}<\/h1>/)
})

test('user-provided answers, zero day-count, validated scoring and server persistence remain unchanged', () => {
  for (const source of [guest, account]) {
    assert.match(source, /inputType === 'day-count'/)
    assert.match(source, /<option value="" disabled>/)
    assert.match(source, /onChoose\(Number\(event\.target\.value\)\)/)
    assert.match(source, /selected \?\? ''/)
    assert.match(source, /responseAnchors/)
    assert.match(source, /asrs6ChoiceClass/)
    assert.match(source, /TraumaSectionInstructions/)
    assert.match(source, /'cdc-hrqol-4'/)
    assert.match(source, /'hrqol4\.02'\] === 0/)
    assert.match(source, /'hrqol4\.03'\] === 0/)
    assert.match(source, /TestFinishActions/)
    assert.match(source, /expectedRevision:/)
    assert.match(source, /operationId:/)
  }
  assert.match(guest, /saveGuestRun\(/)
  assert.match(guest, /guest\/runs\//)
  assert.match(account, /appFetch\(`runs\/\$\{id\}\/save`/)
  assert.match(account, /appFetch\(`runs\/\$\{id\}\/submit`/)
})

test('mobile visual contract has readable original questions, responsive answers and touch controls', () => {
  assert.match(css, /--test-green: #376b56/)
  assert.match(css, /border-radius: 21px/)
  assert.match(css, /min-height: 53px/)
  assert.match(css, /min-height: 52px/)
  assert.match(css, /font: 500 16px\/1\.35/)
  assert.match(css, /min-height: 48px/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /@media \(max-width: 350px\)/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /hh-test-heading-accessible/)
  assert.match(guestCss, /conic-gradient\(/)
  assert.doesNotMatch(guestCss, /position:\s*sticky/)
  assert.match(progress, /style=\{\{ '--hh-complete': metrics\.percent \+ '%' \}\}/)
  assert.match(progress, /styles\.stepDot/)
})

test('real synthetic browser pathway enforces guest/Cabinet mobile screenshots alongside scoring', () => {
  const browser = file('scripts/verify-mhc-sf.mjs')
  const helper = file('scripts/helpers/assessment-card-visual-verifier.mjs')
  assert.match(browser, /verifyAssessmentCardLayout\(page,\{guest,mode,output,locale,name:d\.key,expect\}\)/)
  assert.match(helper, /\[320, 354, 390, 430\]/)
  assert.match(helper, /document\.documentElement\.scrollWidth/)
  assert.match(helper, /page\.screenshot/)
  assert.match(helper, /mode === 'quick'/)
  assert.match(helper, /mode === 'guided'/)
  assert.match(helper, /answer\.height >= 43/)
})
