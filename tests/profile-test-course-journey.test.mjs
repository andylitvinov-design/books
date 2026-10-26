import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('fifth profile review slide offers exactly one Google continuation, not competing guest buttons', () => {
  const source = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  const start = source.indexOf('data-profile-test-review-slide')
  const end = source.indexOf('      </section>}', start)
  assert.ok(start > 0 && end > start)
  const review = source.slice(start, end)
  for (const term of [
    'data-profile-review-test={test.key}',
    'data-profile-google-cabinet-offer',
    'data-profile-google-signin',
    'onClick={saveSelectionWithGoogle}',
    't.accountTitle', 't.accountDescription', 't.accountPrivacy',
    'disabled={accountBusy || selectedKeys.length === 0}',
  ]) assert.ok(review.includes(term), term)
  assert.equal((review.match(/<button\b/g) || []).length, 1, 'one action only on the final screen')
  assert.doesNotMatch(review, /data-profile-start-tests|t.guestChoice|t.readyFoot|reviewFoot|<Link\b/)
  assert.match(source, /step === 3[\s\S]*?data-profile-review-tests/)
  assert.match(source, /step < 4 && <div className={styles.actions}>/)
  assert.match(source, /step < 4 && <aside className={styles.privateInfo}>/)
  assert.doesNotMatch(source, /startTests=|data-profile-start-tests/)
  for (const stage of ['"Ready"', '"Начало"', '"Inicio"'])
    assert.ok(source.includes(stage), stage)
  for (const cta of ['Continue with Google — Free', 'Продолжить через Google — бесплатно', 'Continuar con Google — Gratis'])
    assert.ok(source.includes(cta), cta)
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
  for (const sel of ['.reviewTests', '.reviewTest', '.reviewNumber', '.accountOfferHeading', '.accountPrivacy', '.googleButton'])
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
