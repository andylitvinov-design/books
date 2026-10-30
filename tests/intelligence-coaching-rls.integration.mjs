// Real restricted-role PostgreSQL test, guarded by the existing isolated setup.
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getAppConfig } from '../lib/app/config.js'
import { createAppRepository } from '../lib/app/repository.js'
import { closeDatabase } from '../lib/app/database.js'
import { seal } from '../lib/app/crypto.js'
import { readPersonalCoaching } from '../lib/app/personal-coaching.js'
import { listVideoProgress, matchingMarkedVideoIds, markVideoProgress } from '../lib/app/video-progress.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { projectVerifiedCompletedTestKeys } from '../lib/holistic-support/intelligence-result-history.js'
import { buildIntelligenceTestCatalog } from '../lib/holistic-support/intelligence-test-catalog.js'
import { planIntelligenceRequest } from '../lib/holistic-support/intelligence-plan.mjs'
import { A, B, SB, actor, setup, adminClient, rawAs } from './helpers/app-db-setup.mjs'

const a=actor(), b=actor(B,SB), config=getAppConfig(), repo=createAppRepository(config)
const body={requestId:'d4502108-a8b8-4d3b-813f-c255b452bde4',surface:'cabinet',intent:{language:'en'},
  preflight:{immediateDanger:'no',selfHarmThoughts:'no'},profileFocus:'confirmed_coaching_topic'}
const videos=JSON.parse(await readFile(new URL('../data/academy/meditation-catalog-candidates-20261028.json',import.meta.url),'utf8')).videos
// Synthetic metadata ensures distinct outcomes while running the real ranker.
const source={...videos.find(video=>video.youtube_id==='HqfixazXqRY'),goals:['money'],goal_weights:{money:90}}
const loadCatalog=async()=>({videos:[source],publishedSourceIds:['HqfixazXqRY']})

before(async()=>{
  await setup() // Refuses anything except an empty, isolated loopback DB in CI.
  const db=await adminClient()
  try {
    await db.query(await readFile(new URL('../supabase/migrations/20261023183700_hh_personal_coaching_sessions.sql',import.meta.url),'utf8'))
    await db.query(await readFile(new URL('../supabase/migrations/20261029013946_hh_my_progress_video_marks_20261028.sql',import.meta.url),'utf8'))
  }
  finally {await db.end()}
  for(const who of [a,b]) {
    await repo.ensureAccount(who)
    await repo.onboarding(who,{adult:true,necessary:true,marketing:false,displayName:'Synthetic',uiLocale:'en',timezone:'America/Toronto',goal:'explore'})
  }
  const admin=await adminClient()
  try {
    for(const [who,topic] of [[a,'money'],[b,'relationships']]) {
      const payload={version:1,template:'hh-personal-coaching-v1',current:{status:'completed',clientTopic:topic,
        actionPlan:{goal:`private synthetic ${topic}`,approvedAt:'2026-01-01T00:00:00Z'}},history:[]}
      const cipher=seal(payload,{accountId:who.id,recordId:who.id,field:'personal.coaching'},config)
      await admin.query('insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext,revision) values($1,$2,1)',[who.id,cipher])
    }
  } finally {await admin.end()}
})
after(closeDatabase)

test('restricted backend role can see only its owner coaching record',async()=>{
  const rows=await rawAs(a,'hh_app_backend',db=>db.query('select account_id from app_private.personal_coaching_sessions order by account_id'))
  assert.deepEqual(rows.rows.map(row=>row.account_id),[A])
  const changed=await rawAs(a,'hh_app_backend',db=>db.query('delete from app_private.personal_coaching_sessions where account_id=$1 returning account_id',[B]))
  assert.equal(changed.rowCount,0)
  assert.equal((await readPersonalCoaching(config,b)).course.current.clientTopic,'relationships')
})
test('planning reads only the authenticated owner and never returns private plan text',async()=>{
  const first=await planIntelligenceRequest(body,{loadCatalog,loadCoaching:()=>readPersonalCoaching(config,a)})
  const second=await planIntelligenceRequest(body,{loadCatalog,loadCoaching:()=>readPersonalCoaching(config,b)})
  assert.equal(first.status,'recommend')
  assert.equal(second.status,'no_match')
  for(const result of [first,second]) {
    const json=JSON.stringify(result)
    assert.ok(!json.includes('private synthetic'))
    assert.ok(!json.includes(A)&&!json.includes(B))
  }
})
test('explicit video marks affect only the owner who saved them',async()=>{
  await markVideoProgress(config,a,{videoId:'HqfixazXqRY',title:'Synthetic private title',status:'watched'})
  const admin=await adminClient()
  try {
    await admin.query("insert into app_private.learning_video_progress(account_id,video_id,title,status,marked_at,updated_at) select $1,'A'||lpad(i::text,10,'0'),'Synthetic','watched',now()+interval '1 second',now()+interval '1 second' from generate_series(1,251) i",[A])
  } finally {await admin.end()}
  assert.equal((await listVideoProgress(config,a)).records.some(row=>row.videoId==='HqfixazXqRY'),false)
  const visible=await rawAs(b,'hh_app_backend',db=>db.query('select account_id from app_private.learning_video_progress'))
  assert.equal(visible.rowCount,0)
  const request={...body,profileFocus:undefined,videoHistory:'avoid_marked',intent:{language:'en',selectedTopics:['money'],formats:['video']}}
  const first=await planIntelligenceRequest(request,{loadCatalog,loadVideoHistory:ids=>matchingMarkedVideoIds(config,a,ids)})
  const second=await planIntelligenceRequest(request,{loadCatalog,loadVideoHistory:ids=>matchingMarkedVideoIds(config,b,ids)})
  assert.equal(first.status,'no_match')
  assert.equal(second.status,'recommend')
  assert.equal(JSON.stringify(first).includes('Synthetic private title'),false)
  assert.equal(JSON.stringify(second).includes('Synthetic private title'),false)
})
test('verified completed test affects only its owner after explicit consent',async()=>{
  const def=getAssessmentDefinition('hh-resource-pulse','v1','en')
  const run=await repo.startRun(a,{definitionKey:def.key,definitionVersion:def.version,instrumentLocale:def.instrumentLocale,operationId:randomUUID()})
  const saved=await repo.saveRun(a,run.id,{answers:Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min])),context:{},progress:def.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
  await repo.submitRun(a,run.id,{expectedRevision:saved.revision})
  const ownerRows=await repo.intelligenceResults(a), otherRows=await repo.intelligenceResults(b)
  assert.equal(ownerRows.length,1)
  assert.equal(otherRows.length,0)
  const loadFor=who=>async()=>projectVerifiedCompletedTestKeys({results:await repo.intelligenceResults(who),accountId:who.id})
  const request={...body,profileFocus:undefined,testHistory:'avoid_completed',intent:{language:'en',selectedTopics:['energy'],formats:['test']}}
  const first=await planIntelligenceRequest(request,{loadTests:buildIntelligenceTestCatalog,loadTestHistory:loadFor(a)})
  const second=await planIntelligenceRequest(request,{loadTests:buildIntelligenceTestCatalog,loadTestHistory:loadFor(b)})
  assert.equal(first.primary.id,'test:hh-current-state')
  assert.equal(second.primary.id,'test:hh-resource-pulse')
  for(const response of [first,second]) assert.equal(JSON.stringify(response).includes(ownerRows[0].id),false)
})
