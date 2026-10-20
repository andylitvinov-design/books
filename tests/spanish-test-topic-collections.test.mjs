import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Spanish test route uses the same expandable simple picker as EN/RU without changing the questionnaire language contract', () => {
  const spanish = read('app/es/client/tests/page.tsx')
  const common = read('app/[locale]/client/tests/page.tsx')
  const picker = read('components/app/simple-test-picker.jsx')
  assert.match(spanish, /<PublicTestExplorer locale="es" embedded\b/)
  assert.match(spanish, /initialPreferences=\{focus\.length/)
  assert.match(common, /<PublicTestExplorer locale=\{locale\} embedded/)
  assert.match(spanish, /idioma original/)
  assert.match(spanish, /continuará en inglés/)
  assert.match(picker, /Colecciones de pruebas por tema/)
  assert.match(picker, /Mostrar todas las colecciones/)
})
