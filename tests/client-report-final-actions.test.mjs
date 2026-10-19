import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('client report ends with Cabinet save, recommended tests and PDF actions in that order',()=>{
  const report=source('components/client-session-page.jsx')
  const css=source('components/client-session.module.css')
  const save=source('components/save-client-session-to-account.jsx')
  const materials=report.indexOf('id="session-materials-title"')
  const actions=report.indexOf('data-hh-report-next-actions')
  const tests=report.indexOf('id="session-recommended-tests"')
  const pdf=report.indexOf("id={hasFullReport?'session-download':'session-report'}")
  const privacy=report.indexOf('<footer className={styles.clientFooter}>')
  assert.ok(materials>=0&&materials<actions&&actions<tests&&tests<pdf&&pdf<privacy,
    'Expected Materials → Cabinet save → recommended tests → PDF → privacy footer')
  assert.match(report,/<nav className=\{styles\.sessionBottomActions\} data-hh-report-next-actions/)
  assert.doesNotMatch(report,/mode!=='owner'&&<nav/,'owner preview must show CTA layout')
  assert.match(report,/mode==='owner'&&<button className=\{styles\.sessionBottomPrimary\} type="button" disabled>/)
  assert.match(report,/mode!=='saved'&&mode!=='owner'&&<SaveClientSessionToAccount/)
  assert.match(report,/mode==='saved'&&<a href=/)
  assert.match(report,/Пройти дополнительное тестирование \(бонус\)/)
  assert.match(report,/href=\{'\/'\+locale\+'\/client'\}/,'bonus opens guest-accessible test catalog')
  assert.match(save,/Войти в мой кабинет и сохранить отчёт/)
  assert.match(save,/navigation\?\.requestSave\(\)/,'preserves existing secure save consent')
  assert.match(css,/\.cabinetSessionPage \.sessionBottomActions\{/)
  assert.match(css,/@media\(max-width:700px\)/)
  assert.match(css,/@media print\{\.cabinetSessionPage \.sessionBottomActions\{display:none!important\}\}/)
})

test('older private report links also end with a real save and bonus action, not a decorative button',()=>{
  const footer=source('components/report-final-actions.jsx')
  const legacy=source('components/app/save-private-document-control.jsx')
  const sourceRoutes=[
    'app/[locale]/prescriptions/[selector]/page.js',
    'app/[locale]/client/[selector]/documents/[id]/page.js',
    'app/[locale]/app/document-view/[id]/page.jsx',
    'app/admin/documents/[id]/view/page.js',
  ]
  for(const route of sourceRoutes)assert.match(source(route),/ReportFinalActions/,route)
  assert.match(footer,/Войти в мой кабинет и сохранить отчёт/)
  assert.match(footer,/Пройти дополнительное тестирование \(бонус\)/)
  assert.match(footer,/mode==='saved'/)
  assert.match(footer,/mode==='preview'\|\|!saveControl/)
  assert.match(footer,/\{saveControl\}/,'the real validated save flow occupies the first button')
  assert.match(legacy,/compact = false/)
  assert.match(legacy,/sourceKind: 'legacy_document'/)
  assert.match(legacy,/Войти в мой кабинет и сохранить отчёт/)
  assert.match(legacy,/operationId: crypto\.randomUUID\(\)/)
  assert.match(source('app/admin/documents/[id]/view/page.js'),/query\.print!=='1'/,
    'no action controls inside printed or PDF output')
  assert.match(source('app/[locale]/prescriptions/[selector]/page.js'),
    /viewPdfHref=\{record\.kind==='payment'\?/,
    'legacy report invitation must open HTML with bottom CTAs, not jump directly to PDF')
})

test('owner preview stays read-only and never saves private client reports in the practitioner Google account',()=>{
  const page=source('app/admin/documents/[id]/session-preview/page.js')
  const report=source('components/client-session-page.jsx')
  const footer=source('components/report-final-actions.jsx')
  assert.match(page,/ClientSessionPage mode="owner"/)
  assert.match(page,/appAvailable=\{false\}/)
  assert.match(report,/mode==='owner'&&<button className=\{styles\.sessionBottomPrimary\} type="button" disabled>/)
  assert.match(footer,/mode==='preview'\|\|!saveControl/)
  assert.doesNotMatch(footer,/action:'publish'|sourceKind:\s*'client_session'/)
})


test('PDF preview is inline for authorized client routes, while download stays an attachment',()=>{
  const report=source('components/client-session-page.jsx')
  assert.match(report,/href=\{pdfPath\+'&preview=1&layout=a4'\}/)
  assert.match(report,/target="_blank" rel="noopener noreferrer"/)
  assert.match(report,/href=\{pdfPath\} className=\{styles\.downloadButton\} download/)
  assert.match(report,/Просмотреть PDF-отчёт/)
  assert.match(report,/Скачать отчёт/)
  for(const path of [
    'app/api/client-session-viewer/[selector]/pdf/route.js',
    'app/api/client/[selector]/documents/[id]/pdf/route.js',
    'app/api/app/saved-sessions/[id]/pdf/route.js',
    'app/admin/api/documents/[id]/pdf/route.js',
  ]){
    const pdf=source(path)
    assert.match(pdf,/searchParams\.get\('preview'\)/,path)
    assert.match(pdf,/inline/,path)
    assert.match(pdf,/attachment/,path)
    assert.match(pdf,/privateHeaders|PRIVATE_HEADERS/,path)
  }
  assert.match(source('app/api/client-session-viewer/[selector]/pdf/route.js'),/authorizeSessionGuest/)
  assert.match(source('app/api/client/[selector]/documents/[id]/pdf/route.js'),/authorizeCabinetRequest/)
  assert.match(source('app/api/app/saved-sessions/[id]/pdf/route.js'),/await readSavedSession/)
  assert.match(source('app/admin/api/documents/[id]/pdf/route.js'),/requireAdminRequest/)
})
