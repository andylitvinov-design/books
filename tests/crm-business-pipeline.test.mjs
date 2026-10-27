import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  BUSINESS_PIPELINE_STAGES, BUSINESS_PIPELINE_PAGE_LIMIT, buildBusinessPipeline,
} from '../lib/crm/business-pipeline.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const lead=(id,status,day)=>({id,status,createdAt:day,name:'Example'+id})

test('pipeline uses existing persisted business request statuses only',()=>{
 const board=buildBusinessPipeline([
  lead('late','new','2026-10-25T13:00:00Z'),
  lead('early','new','2026-10-23T13:00:00Z'),
  lead('followed','contacted','2026-10-24T13:00:00Z'),
  lead('manual','booked','2026-10-22T13:00:00Z'),
  lead('done','closed','2026-10-21T13:00:00Z'),
 ])
 assert.deepEqual([...BUSINESS_PIPELINE_STAGES],['new','contacted','booked','closed'])
 assert.deepEqual(board.buckets.new.map(x=>x.id),['early','late'])
 assert.deepEqual(board.counts,{new:2,contacted:1,booked:1,closed:1})
 assert.equal(board.loaded,5)
 assert.equal(board.partial,false)
 assert.equal(board.unknown,0)
 assert.equal(buildBusinessPipeline(null).loaded,0)
})

test('invalid statuses never masquerade as new or paid deals',()=>{
 const board=buildBusinessPipeline([lead('ok','new','2026-10-26'),lead('bad','paid','2026-10-26'),null])
 assert.equal(board.counts.new,1)
 assert.equal(board.unknown,2)
 for(const stage of BUSINESS_PIPELINE_STAGES)assert.equal(board.buckets[stage].some(x=>x.status==='paid'),false)
})

test('100 newest limit is presented as partial, not an all-time deal count',()=>{
 const board=buildBusinessPipeline(Array.from({length:BUSINESS_PIPELINE_PAGE_LIMIT},
  (_,i)=>lead('r'+i,'contacted','2026-10-25T13:00:00Z')))
 assert.equal(board.loaded,100)
 assert.equal(board.partial,true)
 assert.equal(board.counts.contacted,100)
})

test('Kanban is an additional view of existing owner CRM actions and has no dispatch',()=>{
 const manager=read('components/app/crm-manager.jsx')
 const component=read('components/app/crm-business-enquiries.jsx')
 const store=read('lib/business-consulting/enquiry-store.js')
 const api=read('app/api/app/crm/route.js')
 const css=read('components/app/crm-business-enquiries.module.css')
 assert.match(manager,/'pipeline'/)
 assert.match(manager,/mode="board"/)
 assert.match(manager,/CrmBusinessEnquiries/)
 assert.match(component,/buildBusinessPipeline\(enquiries\)/)
 assert.match(component,/data-business-pipeline-stage=\{stage\}/)
 assert.match(component,/onAction\("update_business_enquiry",\{id:item\.id,status:event\.target\.value,expectedRevision:item\.revision\}\)/)
 assert.match(component,/aria-label=\{t\.status\+" — "\+\(item\.name\|\|"—"\)\}/)
 assert.match(store,/owner_id=\$2 for update/)
 assert.match(store,/current\.revision!==raw\.expectedRevision/)
 assert.match(api,/practitionerEmailAllowed\(actor\)/)
 assert.match(css,/@media\s*\(max-width:\s*600px\)/)
 assert.doesNotMatch(component,/fetch\(|localStorage|sessionStorage|sendEmail|sendCrmSms|payment_received|booking_confirmed/)
})

test('privacy and evidence boundaries survive across EN RU ES',()=>{
 const component=read('components/app/crm-business-enquiries.jsx')
 const manager=read('components/app/crm-manager.jsx')
 for(const lang of ['en','ru','es'])assert.match(component,new RegExp('\\b'+lang+':\\{'))
 assert.match(component,/manualOnly/)
 assert.match(component,/partial/)
 assert.match(component,/replyBlocked|BusinessEnquirySmsReply/)
 assert.match(manager,/activeSection==='overview'/)
})
