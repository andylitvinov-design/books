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

test('private voice message appears once after the signed cover in all four client views',()=>{
  const report=read('components/client-session-page.jsx')
  const document=read('components/prescription-document.jsx')
  const cover=document.indexOf('className="canonical-report-cover"')
  const audio=document.indexOf('{afterCover}')
  const analysis=document.indexOf('className="canonical-report-analysis"')
  assert.ok(cover>=0&&audio>cover&&analysis>audio)
  assert.equal((report.match(/id="session-message"/g)||[]).length,1)
  assert.match(report,/export function ClientSessionVoiceMessage/)
  assert.match(report,/audioEmbedded/)
  for(const path of [
    'app/[locale]/client/session/[shareSelector]/page.js',
    'app/[locale]/client/[selector]/sessions/[sessionId]/page.js',
    'app/[locale]/app/sessions/[id]/page.jsx',
    'app/admin/documents/[id]/session-preview/page.js',
  ]){
    const source=read(path)
    assert.match(source,/afterCover=\{<ClientSessionVoiceMessage/,path)
    assert.match(source,/audioEmbedded=/,path)
  }
})
test('practitioner report editor places audio before analysis and library at the bottom',()=>{
  const edit=read('app/admin/consultations/[id]/edit/page.js')
  assert.ok(edit.indexOf('placement="audio"')<edit.indexOf('id="edit-recommendation"'))
  assert.ok(edit.indexOf('placement="materials"')>edit.indexOf('id="edit-recommendation"'))
  const editor=read('components/report-video-materials-editor.jsx')
  assert.match(editor,/placement='all'/)
  assert.ok(editor.indexOf("placement==='audio'")<editor.indexOf('id="report-video-materials-editor"'))
  const studio=read('components/admin-session-studio.jsx')
  assert.ok(studio.indexOf('Private session recordings')<studio.indexOf('Shared library materials'))
  assert.ok(studio.indexOf('Shared library materials')<studio.indexOf('id="session-publication"'))
})
