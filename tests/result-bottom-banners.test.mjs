import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('test-result banners keep history, booking and privacy separate', () => {
  const page = read('components/app/app-workspace.jsx')
  const styles = read('app/[locale]/app/[[...path]]/assessment-dashboard.css')
  const history = page.slice(page.indexOf('<section className="hh-result-comparison"'))
  const cta = page.slice(page.indexOf('function ResultConsultationCta('), page.indexOf('function ResultPage('))

  assert.match(history, /hh-result-comparison-icon/)
  assert.match(history, /hh-result-comparison-copy/)
  assert.match(history, /href=\{\`\/\$\{locale\}\/app\/portfolio\`\}/)
  assert.match(cta, /hh-result-consultation-icon/)
  assert.match(cta, /hh-result-consultation-privacy/)
  assert.match(cta, /Your result stays private and is not shared automatically/)
  assert.match(cta, /не передаются автоматически/)
  assert.match(cta, /Заказать консультацию специалиста/)
  assert.match(cta, /href=\{\`\/\$\{locale\}\/services\`\}/)
  assert.match(styles, /\.hh-app \.hh-result-consultation-action/)
  assert.match(styles, /\.hh-app \.hh-result-comparison-action/)
  assert.match(styles, /@media\(max-width:760px\)/)
  assert.match(styles, /grid-column:1 \/ -1;max-width:none;width:100%/)
})
