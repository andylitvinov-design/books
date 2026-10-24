import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('profile confirmation is a separate fifth slide, with explicit Yes before any guest launch', () => {
  const source = read('components/personality-profiles-builder.tsx')
  const css = read('components/personality-profiles-builder.module.css')
  const expected = [
    'data-profile-review-tests',
    'data-profile-test-review-slide',
    'data-profile-review-test={test.key}',
    'step === 4',
    't.readyHelp', 't.readyFoot',
    'selectedKeys.flatMap',
    'data-profile-start-tests',
  ]
  for (const term of expected) assert.ok(source.includes(term), term)
  const review = source.indexOf('data-profile-test-review-slide')
  const confirmedLink = source.indexOf('data-profile-start-tests')
  assert.ok(review > 0 && confirmedLink > review, 'start action appears only after confirmation slide')
  assert.match(source, /step === 3[\s\S]*?data-profile-review-tests/)
  assert.match(source, /step === 4[\s\S]*?data-profile-start-tests/)
  assert.match(source, /disabled={selectedKeys.length === 0}/)
  assert.match(source, /startTests=/)
  for (const stage of ['"Ready"', '"Начало"', '"Inicio"'])
    assert.ok(source.includes(stage), stage)
  for (const cta of ['Yes, take these tests', 'Да, пройти эти тесты', 'Sí, empezar estas pruebas'])
    assert.ok(source.includes(cta), cta)
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
  for (const sel of ['.reviewTests', '.reviewTest', '.reviewNumber', '.reviewFoot'])
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
  assert.match(source, /encodeURIComponent\(selectedKeys.join\(","\)\)/)
})
