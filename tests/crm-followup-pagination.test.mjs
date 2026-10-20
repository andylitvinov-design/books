import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {CRM_OPEN_FOLLOWUP_PAGE_SIZE,makeCrmFollowupCursor,readCrmFollowupCursor}
 from '../lib/crm/followup-pagination.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const stranger='33333333-3333-4333-8333-333333333333'
const id='22222222-2222-4222-8222-222222222222'
const input={ownerId:owner,dueOn:'2026-10-20',
 createdAt:'2026-10-19T19:52:20.123456Z',id,key:randomBytes(32)}

test('signed cursor preserves PostgreSQL microseconds and binds owner identity',()=>{
 const token=makeCrmFollowupCursor(input)
 assert.ok(token.length>40&&token.length<512)
 assert.equal(token.includes('2026-10'),false)
 assert.deepEqual(readCrmFollowupCursor(token,{ownerId:owner,key:input.key}),{
  dueOn:input.dueOn,createdAt:input.createdAt,id})
 assert.equal(CRM_OPEN_FOLLOWUP_PAGE_SIZE,100)
})
test('reject other owner, wrong key, malformed and modified cursors',()=>{
 const token=makeCrmFollowupCursor(input)
 for(const bad of [
  {ownerId:stranger,key:input.key},{ownerId:owner,key:randomBytes(32)},
 ])assert.throws(()=>readCrmFollowupCursor(token,bad),/INVALID_FOLLOWUP_CURSOR/)
 for(const bad of ['',token+'extra',token.slice(0,-1)+'!', 'a'.repeat(513),'!!!!'])
  assert.throws(()=>readCrmFollowupCursor(bad,{ownerId:owner,key:input.key}))
 for(const bad of [{...input,dueOn:'2026-10-20T12:00:00Z'},
  {...input,createdAt:'2026-10-19T19:52:20.123Z'},
  {...input,id:'contact-name'}])assert.throws(()=>makeCrmFollowupCursor(bad))
})
test('open task pagination uses lookahead, owner scope and stable order',()=>{
 const src=read('lib/crm/workflow-store.js')
 assert.match(src,/async listFollowupsSnapshot\(\)/)
 assert.match(src,/rows\.length>300&&rows\[300\]\.status==='open'/)
 assert.match(src,/async listOpenFollowupsPage\(rawCursor\)/)
 assert.match(src,/readCrmFollowupCursor\(rawCursor,\{ownerId:actor\.id,key:config\.encryptionKey\}\)/)
 assert.match(src,/where f\.owner_id=\$1 and f\.status='open'/)
 assert.match(src,/f\.due_on>\$2::date/)
 assert.match(src,/f\.created_at<\$3::timestamptz/)
 assert.match(src,/f\.id<\$4::uuid/)
 assert.match(src,/order by f\.due_on asc,f\.created_at desc,f\.id desc limit \$5/)
 assert.match(src,/CRM_OPEN_FOLLOWUP_PAGE_SIZE\+1/)
 assert.doesNotMatch(src,/medical_history|assessment_results|service_role/)
})
test('followup endpoint rechecks owner, same origin and bounded private body',()=>{
 const route=read('app/api/app/crm/followups/route.js')
 const main=read('app/api/app/crm/route.js')
 assert.match(route,/requestOrigin\(request,config\)/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/readBody\(request,768\)/)
 assert.match(route,/onlyKeys\(input,\['cursor'\]\)/)
 assert.match(route,/store=>store\.listOpenFollowupsPage\(input\.cursor\)/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(main,/followupsNextCursor:followupPage\.nextCursor/)
 assert.match(main,/followups:followupPage\.followups/)
 assert.doesNotMatch(route,/api\.twilio|sendEmail|sendSms|service_role/)
})
test('CRM task list fetches all pages, dedupes late data and rolls date on focus',()=>{
 const manager=read('components/app/crm-manager.jsx')
 const ui=read('components/app/crm-workflow.jsx')
 assert.match(manager,/loadVersionRef\.current/)
 assert.match(manager,/version!==loadVersionRef\.current/)
 assert.match(manager,/const load=useCallback/)
 assert.match(manager,/followupsNextCursor/)
 assert.match(manager,/taskPageAbortRef\.current\?\.abort\(\)/)
 assert.match(manager,/method:'POST',credentials:'same-origin',cache:'no-store'/)
 assert.match(manager,/previous\.followupsNextCursor!==cursor/)
 assert.match(manager,/!known\.has\(task\.id\)/)
 assert.match(manager,/setTaskPageError\(true\)/)
 assert.match(ui,/nextCursor&&onLoadMore/)
 assert.match(ui,/open\.slice\(0,mode==='tasks'\?open\.length:/)
 assert.match(ui,/pageError&&<p role="alert"/)
 assert.match(ui,/loadingTasks/)
 assert.match(manager,/timeZone:'America\/Toronto'/)
 assert.match(manager,/document\.addEventListener\('visibilitychange',check\)/)
})
