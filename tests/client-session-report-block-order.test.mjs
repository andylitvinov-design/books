import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('client tests appear in separate cards after Materials and before the next steps', () => {
  const page = read('components/client-session-page.jsx')
  const materials = page.indexOf('id="session-materials-title"')
  const tests = page.indexOf('id="session-recommended-tests"')
  const actions = page.indexOf('data-hh-report-next-actions')
  assert.ok(materials > -1 && materials < tests && tests < actions)
  assert.equal(page.split('id="session-recommended-tests"').length - 1, 1)
  assert.ok(page.includes('recommendedTests.map(test=><a key={test.key} className={styles.reportRecommendedTestCard}'))
  assert.ok(page.includes('href={test.href}'), 'preserves validated catalogue targets')
  const css = read('components/client-session.module.css')
  assert.ok(css.includes('.reportRecommendedTestList{'))
  assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'), 'single column on mobile')
  assert.ok(css.includes('.reportRecommendedTestCard:focus-visible'))
})

test('appendix shows an instruction and original photos, then the signed footer', () => {
  const document = read('components/prescription-document.jsx')
  assert.ok(document.includes('Нажмите на карточку, чтобы прочесть описание препарата.'))
  assert.ok(document.includes("{locale === 'ru' ? 'Приложение.' : 'Appendix.'}"))
  assert.ok(document.includes('className="canonical-remedy-profile-thumb"'))
  assert.ok(document.includes('img src={remedy.primary_image} alt=""'))
  assert.ok(document.indexOf('className="canonical-remedy-profiles"') < document.lastIndexOf('<DocumentSignature'))
  assert.ok(document.includes('!embedded && recommendedTests.length > 0'))
  const css = read('components/consultation-report.css')
  assert.ok(css.includes('.canonical-remedy-profile-thumb img'))
  assert.ok(css.includes('.canonical-remedy-appendix-print-hint {display:none;}'))
  assert.ok(css.includes('.canonical-remedy-profile-thumb {display:none!important;}'))
})

test('existing guest, cabinet, saved and preview routes keep their shared document renderer', () => {
  const routes = [
    'app/[locale]/client/session/[shareSelector]/page.js',
    'app/[locale]/client/[selector]/sessions/[sessionId]/page.js',
    'app/[locale]/app/sessions/[id]/page.jsx',
    'app/admin/documents/[id]/session-preview/page.js',
  ]
  for (const route of routes) assert.ok(read(route).includes('<PrescriptionDocument'),route)
  assert.ok(read('lib/prescriptions/pdf.js').includes('recommendedTests'))
})
