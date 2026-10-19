import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCrmSearchQuery,parseCrmSearchStage,contactMatchesSearch,
 CRM_SEARCH_SCAN_CAP,CRM_SEARCH_RESULTS_CAP } from '../lib/crm/contact-search.js'
import { exportCrmContactsCsv,CRM_EXPORT_MAX_CONTACTS } from '../lib/crm/contact-csv.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('owner contact search normalizes Unicode and phone digits',()=>{
 assert.equal(parseCrmSearchQuery('  María  '),'maría')
 assert.equal(parseCrmSearchStage('all'),null)
 assert.equal(parseCrmSearchStage('lead'),'lead')
 const record={displayName:'Мария Иванова',email:'Hello@Example.test',phone:'+1 (416) 555-1234'}
 assert.equal(contactMatchesSearch(record,'мария'),true)
 assert.equal(contactMatchesSearch(record,'EXAMPLE.TEST'),true)
 assert.equal(contactMatchesSearch(record,'416555'),true)
 assert.equal(contactMatchesSearch(record,'1416'),true)
 assert.equal(contactMatchesSearch(record,'Random Name'),false)
})
test('search rejects unbounded or unsafe terms and unsupported stage',()=>{
 for(const s of ['', 'a','x'.repeat(81),'abc\nxyz','abc\u0000def'])
  assert.throws(()=>parseCrmSearchQuery(s))
 for(const stage of ['unknown','booked','client;drop table',null])
  assert.throws(()=>parseCrmSearchStage(stage))
 assert.equal(CRM_SEARCH_SCAN_CAP,3000)
 assert.equal(CRM_SEARCH_RESULTS_CAP,80)
})
test('CSV has safe formula cells and excludes clinical fields',()=>{
 const csv=exportCrmContactsCsv([{
  id:'11111111-1111-4111-8111-111111111111',
  displayName:'=HYPERLINK("https://bad.test","Click")',
  email:'danger@example.test',phone:'+14165551234',locale:'ru',
  lifecycle:'lead',source:'manual',emailVerified:false,suppressed:true,
  createdAt:'2026-10-18T12:00:00.000Z',
 }])
 assert.match(csv,/"'=HYPERLINK\(""https:\/\/bad.test"",""Click""\)"/)
 assert.match(csv,/"'\+14165551234"/)
 assert.match(csv,/danger@example.test/)
 assert.match(csv,/do_not_contact/)
 assert.doesNotMatch(csv,/diagnosis|assessment_score|medical_records|report_content/)
 assert.ok(csv.endsWith('\r\n'))
 assert.equal(CRM_EXPORT_MAX_CONTACTS,5000)
})
test('CSV neutralizes linebreak and rejects unbounded export',()=>{
 const sample={id:'123',displayName:'Joe\nMal',email:'hello@example.test',phone:'',locale:'en',
  lifecycle:'lead',source:'manual',emailVerified:false,suppressed:false,createdAt:''}
 assert.ok(exportCrmContactsCsv([sample]).includes('"Joe Mal"'))
 assert.throws(()=>exportCrmContactsCsv({}))
 assert.throws(()=>exportCrmContactsCsv(Array.from({length:5001},()=>sample)))
})
test('private search and export endpoints are legacy owner-scoped',()=>{
 for(const file of ['app/api/app/crm/search/route.js','app/api/app/crm/export/route.js']) {
  const s=read(file)
  assert.match(s,/await auth\.verified\(\)/)
  assert.match(s,/practitionerEmailAllowed\(actor\)/)
  assert.match(s,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
  assert.match(s,/PRIVATE_HEADERS/)
  assert.match(s,/crmEnabled\(\)/)
  assert.match(s,/createCrmRepository\(config\)\.withOwner\(actor/)
 }
 const exportRoute=read('app/api/app/crm/export/route.js')
 assert.match(exportRoute,/requireSameOrigin\(request,config\)/)
 assert.match(exportRoute,/body\.scope!=='business_contacts'/)
 assert.match(exportRoute,/Content-Disposition/)
 assert.doesNotMatch(exportRoute,/export async function GET/)
 const search=read('app/api/app/crm/search/route.js')
 assert.doesNotMatch(search,/export async function POST/)
 assert.match(search,/params\.getAll\('q'\)\.length!==1/)
})
test('owner search and export are bounded, decrypted only by owner transaction',()=>{
 const code=read('lib/crm/contact-operations-store.js')
 assert.match(code,/from app\.crm_contacts where owner_id=\$1/)
 assert.match(code,/CRM_SEARCH_SCAN_CAP\+1/)
 assert.match(code,/openSealed\(row\.contact_ciphertext/)
 assert.match(code,/CRM_SEARCH_RESULTS_CAP/)
 assert.match(code,/listEmailEligibility\(visible\)/)
 assert.match(code,/CRM_EXPORT_MAX_CONTACTS\+1/)
 assert.match(code,/CRM_EXPORT_TOO_LARGE/)
 assert.match(code,/insert into app\.crm_data_exports/)
 assert.doesNotMatch(code,/assessment_results|assessment_runs|medical_notes|service_role/)
})
test('owner-only export audit is append-only and FORCE RLS',()=>{
 const sql=read('supabase/migrations/20261019004500_hh_crm_data_exports_audit.sql')
 assert.match(sql,/CREATE TABLE app\.crm_data_exports/)
 assert.match(sql,/scope='business_contacts'/)
 assert.match(sql,/format='csv'/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON app\.crm_data_exports FROM public,anon,authenticated/)
 assert.match(sql,/GRANT SELECT,INSERT ON app\.crm_data_exports TO hh_crm_backend/)
 assert.match(sql,/owner_id=\(SELECT auth\.uid\(\)\)/)
 assert.doesNotMatch(sql,/GRANT UPDATE|GRANT DELETE|SECURITY DEFINER/)
})
test('UI search and CSV are explicit and do not remove CRM tabs',()=>{
 const ui=read('components/app/crm-manager.jsx')
 const exportUi=read('components/app/crm-export-tools.jsx')
 assert.match(ui,/<CrmExportTools/)
 assert.match(ui,/activeSection==='messages'/)
 assert.match(ui,/activeSection==='overview'/)
 assert.match(ui,/activeSection==='contacts'/)
 assert.match(ui,/setServerResults\(result\)/)
 assert.match(ui,/Search is unavailable; retry/)
 assert.match(exportUi,/window\.confirm\(t\.confirm\)/)
 assert.match(exportUi,/method:'POST',credentials:'same-origin',cache:'no-store'/)
 assert.match(exportUi,/URL\.createObjectURL\(blob\)/)
 assert.match(exportUi,/URL\.revokeObjectURL\(href\)/)
})
