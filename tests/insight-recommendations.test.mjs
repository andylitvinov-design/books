import test from 'node:test'
import assert from 'node:assert/strict'
import {buildDailyInsight} from '../lib/app/insight-recommendations.mjs'

const service=(impressions=31,orders=0)=>({
  id:'a',title:'Practice',week:{impressions,orders,whatsapp:0,telegram:0}
})
const base=()=>({
  practitioner:{id:'owner',status:'approved',profile:{displayName:'Master',photoPath:'/images/master.jpg'}},
  services:[{id:'a',status:'published',active:true,copy:{description:'A complete description'}}],
  requests:[{needsReply:true},{needsReply:false}],
  practitionerTaskSummary:{requests:[{overdueCount:1}]},
  serviceAnalytics:{yesterday:'2026-11-06',weekStart:'2026-10-31',services:[service()]},
  registrationStats:{last7:2,last30:6}
})
test('real tracked totals are differentiated from submitted enquiries',()=>{
  const r=buildDailyInsight({practice:base(),locale:'ru'})
  assert.deepEqual(r.analytics.totals,{impressions:31,orders:0,whatsapp:0,telegram:0})
  assert.equal(r.registration.last7,2)
  assert.equal(r.requests.waiting,1)
  assert.equal(r.requests.overdue,1)
  assert.equal(r.recommendations[0].id,'clients-reply')
  assert.ok(r.recommendations.some(x=>x.id==='marketing-view-to-click'))
})
test('unavailable source is unknown, never fabricated zero traffic',()=>{
  const r=buildDailyInsight({practice:{...base(),serviceAnalytics:undefined}})
  assert.equal(r.analytics,null)
  assert.equal(r.recommendations.some(x=>x.id==='marketing-view-to-click'),false)
  assert.equal(buildDailyInsight().analytics,null)
})
test('personal history is excluded by default even when supplied',()=>{
  const input={practice:base(),journey:{testsCompleted:0,courseCompleted:false},goals:{revision:1,goals:{targets:{}}}}
  const r=buildDailyInsight(input)
  assert.equal(r.personal,null)
  assert.equal(r.recommendations.some(x=>x.category==='personal'),false)
  const permitted=buildDailyInsight({...input,personalEnabled:true})
  assert.ok(permitted.recommendations.some(x=>x.category==='personal'))
})
test('only actual published and active services count as live offers',()=>{
  const p={...base(),services:[{id:'a',active:false,status:'published'}]}
  const r=buildDailyInsight({practice:p})
  assert.equal(r.services.published,0)
  assert.ok(r.recommendations.some(x=>x.id==='service-publish'))
})
test('no cross-account client identities appear in recommendations',()=>{
  const r=buildDailyInsight({practice:{...base(),requests:[{
    needsReply:true,email:'private@example.com',message:'confidential name',id:'123456'
  }]}})
  assert.equal(JSON.stringify(r).includes('private@example.com'),false)
  assert.equal(JSON.stringify(r).includes('confidential name'),false)
})
test('locales stay within the three supported translations',()=>{
  const r=buildDailyInsight({practice:base(),locale:'es'})
  assert.equal(r.recommendations[0].title,'Responder solicitudes')
  assert.equal(buildDailyInsight({practice:base(),locale:'unknown'}).recommendations[0].title,'Reply to enquiries')
})
