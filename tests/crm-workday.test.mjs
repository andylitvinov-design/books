import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildCrmWorkday,filterCrmWorkdayTasks,CRM_WORKDAY_BUCKETS} from '../lib/crm/workday.js'
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const id=(suffix)=>'22222222-2222-4222-8222-'+String(suffix).padStart(12,'0')
const rows=[
 {id:id(1),contactId:id(11),contactName:'Ana',kind:'call',dueOn:'2026-10-19',status:'open'},
 {id:id(2),contactId:id(12),contactName:'Boris',kind:'reply',dueOn:'2026-10-20',status:'open'},
 {id:id(3),contactId:id(13),contactName:'Carl',kind:'booking',dueOn:'2026-10-25',status:'open'},
 {id:id(4),contactId:id(14),contactName:'Done',kind:'call',dueOn:'2026-10-19',status:'completed'},
]
test('CRM day queue prioritizes due and overdue tasks without counting closed records',()=>{
 const board=buildCrmWorkday({asOf:'2026-10-20',followups:{open:3,overdue:1,today:1}},rows)
 assert.equal(board.partial,false)
 assert.deepEqual(board.counts,{open:3,overdue:1,today:1,upcoming:1,urgent:2})
 assert.deepEqual(filterCrmWorkdayTasks(board).map(t=>t.contactName),['Ana','Boris'])
 assert.deepEqual(filterCrmWorkdayTasks(board,{bucket:'overdue'}).map(t=>t.kind),['call'])
 assert.deepEqual(filterCrmWorkdayTasks(board,{bucket:'today'}).map(t=>t.kind),['reply'])
 assert.deepEqual(filterCrmWorkdayTasks(board,{bucket:'upcoming'}).map(t=>t.kind),['booking'])
 assert.equal(filterCrmWorkdayTasks(board,{bucket:'all'}).length,3)
 assert.deepEqual(CRM_WORKDAY_BUCKETS,['urgent','overdue','today','upcoming','all'])
})
test('summary remains complete when details are truncated; no fabricated task rows',()=>{
 const board=buildCrmWorkday({asOf:'2026-10-20',followups:{open:301,overdue:7,today:12}},rows)
 assert.equal(board.partial,true)
 assert.equal(board.loaded,3)
 assert.equal(board.counts.open,301)
 assert.equal(board.counts.upcoming,282)
 assert.equal(filterCrmWorkdayTasks(board,{bucket:'all'}).length,3)
})
test('search is bounded, excludes closed and invalid IDs and ignores malformed state',()=>{
 const board=buildCrmWorkday({asOf:'2026-10-20',followups:{open:2,today:1}},[
  rows[0],rows[1],rows[3],
  {...rows[2],id:'bad-id',contactId:owner},
  {...rows[1],id:id(7),contactId:'not-a-contact'},
 ])
 assert.deepEqual(filterCrmWorkdayTasks(board,{bucket:'all',query:'BORIS'}).map(t=>t.kind),['reply'])
 assert.deepEqual(filterCrmWorkdayTasks(board,{bucket:'all',query:'call'}).map(t=>t.contactName),['Ana'])
 assert.deepEqual(filterCrmWorkdayTasks(board,{bucket:'nonexistent'}).map(t=>t.contactName),['Ana','Boris'])
 assert.deepEqual(filterCrmWorkdayTasks(null),[])
})
test('contact lookup rechecks owner authentication and restricted RLS for every requested UUID',()=>{
 const route=read('app/api/app/crm/contact/route.js')
 const repo=read('lib/crm/repository.js')
 assert.match(route,/requestOrigin\(request,config\)/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/readBody\(request,256\)/)
 assert.match(route,/onlyKeys\(input,\['contactId'\]\)/)
 assert.match(route,/store=>store\.getContactById\(input\.contactId\)/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(repo,/SET LOCAL ROLE hh_crm_backend/)
 assert.match(repo,/async getContactById\(id\)/)
 assert.match(repo,/requireUUID\(id\)/)
 assert.match(repo,/from app\.crm_contacts where id=\$1 and owner_id=\$2 limit 1/)
 assert.match(repo,/throw new AppError\('NOT_FOUND',404\)/)
 assert.match(repo,/listEmailEligibility\(\[contact\]\)/)
 assert.match(repo,/listSmsEligibility\(withEmail\)/)
 const exact=repo.slice(repo.indexOf('async getContactById'),repo.indexOf('async listContacts()',repo.indexOf('async getContactById')))
 assert.doesNotMatch(exact,/assessment_|clinical_|service_role|recipient_account_id|crm_consent_ledger/)
})
