import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('five-step profile lets people choose nested scales, then launch tests or save via Google', () => {
  const source = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  const testsStart = source.indexOf('{step === 3 && <section')
  const readyStart = source.indexOf('{step === 4 && <section')
  const readyEnd = source.indexOf('      </section>}', readyStart)
  assert.ok(testsStart > 0 && readyStart > testsStart && readyEnd > readyStart)
  const testsPanel = source.slice(testsStart, readyStart)
  const readyPanel = source.slice(readyStart, readyEnd)
  assert.ok(testsPanel.indexOf('data-profile-recommended-tests') <
    testsPanel.indexOf('data-profile-start-tests'), 'guest action follows recommended tests')
  assert.ok(testsPanel.indexOf('data-profile-start-tests') <
    testsPanel.indexOf('data-profile-additional-tests'), 'extra filters remain below direct CTA')
  for (const term of [
    'data-profile-review-test={test.key}',
    'data-profile-google-cabinet-offer',
    'data-profile-google-signin',
    'onClick={saveSelectionWithGoogle}',
    't.accountTitle', 't.accountDescription', 't.accountPrivacy',
    'disabled={accountBusy || selectedKeys.length === 0}',
  ]) assert.ok(readyPanel.includes(term), term)
  assert.equal((readyPanel.match(/<button\b/g) || []).length, 1, 'only Google action on Ready')
  assert.doesNotMatch(readyPanel, /data-profile-start-tests|t.guestChoice|t.readyFoot|reviewFoot|<Link\b/)
  assert.match(source, /step < 4 && <div className=\{styles.actions\}>/)
  assert.match(source, /step < 4 && <aside className=\{styles.privateInfo\}>/)
  assert.ok(source.includes('makeTestSelectionIntent(selectedKeys)'))
  assert.ok(source.includes('No guest answers or guest results are imported'))
  assert.match(source, /encodeURIComponent\(selectedKeys.join\(","\)\)/)
  for (const cta of ['Take tests', 'Пройти тесты', 'Realizar pruebas',
    'Continue with Google — Free', 'Продолжить через Google — бесплатно', 'Continuar con Google — Gratis'])
    assert.ok(source.includes(cta), cta)
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
  for (const sel of ['.reviewTests', '.reviewTest', '.reviewNumber', '.accountOfferHeading',
    '.accountPrivacy', '.googleButton', '.extraFilters'])
    assert.ok(css.includes(sel), sel)
  assert.match(css, /@media \(max-width: 640px\)/)
  assert.match(css, /@media \(max-width: 350px\)/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('profile TSX parses with real JSX and preserves privacy/route invariants', () => {
  const ts = require('typescript')
  const source = read('components/personality-profiles-builder.tsx')
  const parsed = ts.transpileModule(source, {
    fileName: 'personality-profiles-builder.tsx', reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const errors = (parsed.diagnostics || []).filter(error => error.category === ts.DiagnosticCategory.Error)
  assert.deepEqual(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')), [])
  assert.doesNotMatch(source, /localStorage|navigator.sendBeacon|payment_success|autoEnroll/)
  assert.match(source, /makeTestSelectionIntent\(selectedKeys\)/)
  assert.match(source, /PENDING_TEST_SELECTION_KEY/)
  assert.match(source, /window\.sessionStorage\.setItem/)
  assert.match(source, /auth\/contact-profile/)
  assert.match(source, /continueTo: "tests"/)
  assert.match(source, /app\/tests\?selection=pending/)
  assert.doesNotMatch(source, /results\/import|guestAnswers/)
})
