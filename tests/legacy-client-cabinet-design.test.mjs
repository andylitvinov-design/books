import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const component = read('components/client-cabinet.jsx')
const route = read('app/[locale]/client/[selector]/page.js')
const style = read('app/[locale]/client/[selector]/cabinet-modern.css')
test('existing legacy private client data/auth remains, no duplicate account', () => {
  assert.match(route, /authorizeCabinetRequest/)
  assert.match(route, /PrescriptionAccessGate/)
  assert.match(route, /listClientSessions/)
  assert.match(component, /ProfileDomains/)
  assert.match(component, /PersonalAnalysisPanel/)
  assert.match(component, /client-cabinet--modern/)
  assert.match(component, /Only the document you confirm will be saved/)
})
test('existing client session, report, PDF and sign out controls survive', () => {
  assert.match(component, /client-cabinet-document-actions/)
  assert.match(component, /\/pdf\?locale=/)
  assert.match(component, /\/api\/client-access\/logout/)
  assert.match(component, /client-cabinet-filters/)
  assert.match(component, /setFilter/)
  assert.match(component, /sessions\.map/)
})
test('route-scoped modern palette and responsive accessibility', () => {
  assert.match(route, /import '\.\/cabinet-modern\.css'/)
  assert.match(style, /\.client-cabinet\.client-cabinet--modern/)
  assert.match(style, /min-height:44px/)
  assert.match(style, /max-width:590px/)
  assert.match(style, /max-width:354px/)
  assert.match(style, /:focus-visible/)
  assert.match(style, /prefers-reduced-motion/)
})
test('optional Google bridge is secondary to original private documents', () => {
  assert.ok(component.indexOf('client-cabinet-google-bridge') > component.indexOf('<ClientAssessments records='))
})
