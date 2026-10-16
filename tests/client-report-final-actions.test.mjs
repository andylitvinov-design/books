import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('every authorized consultation reader displays the two explicit actions at the report end',()=>{
  const report=source('components/client-session-page.jsx')
  const css=source('components/client-session.module.css')
  const save=source('components/save-client-session-to-account.jsx')
  const materials=report.indexOf('id="session-materials-title"')
  const actions=report.indexOf('data-hh-report-next-actions')
  const privacy=report.indexOf('<footer className={styles.clientFooter}>')
  assert.ok(materials>=0&&materials<actions&&actions<privacy,'CTAs follow Materials and precede tiny-print footer')
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
