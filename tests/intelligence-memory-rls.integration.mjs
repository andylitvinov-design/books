// Runs only on the existing empty, isolated loopback PostgreSQL fixture.
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { getAppConfig } from '../lib/app/config.js'
import { createAppRepository } from '../lib/app/repository.js'
import { closeDatabase } from '../lib/app/database.js'
import { seal, openSealed } from '../lib/app/crypto.js'
import { saveIntelligenceFeedback, editIntelligenceFeedback, exportIntelligenceFeedback, deleteIntelligenceFeedback, matchingUnhelpfulFeedback, intelligenceFeedbackStatus } from '../lib/app/intelligence-feedback.js'
import { A, B, SB, actor, setup, adminClient, rawAs } from './helpers/app-db-setup.mjs'

const a=actor(), b=actor(B,SB), config=getAppConfig(), repo=createAppRepository(config)
const context=(who,id)=>({accountId:who.id,recordId:id,field:'intelligence.feedback'})
const first=randomUUID(), second=randomUUID()
before(async()=>{
  await setup()
  const db=await adminClient()
  try {await db.query(await readFile(new URL('../supabase/migrations/20261029231000_hh_intelligence_feedback_memory.sql',import.meta.url),'utf8'))}
  finally {await db.end()}
  for(const who of [a,b]) {
    await repo.ensureAccount(who)
    await repo.onboarding(who,{adult:true,necessary:true,marketing:false,displayName:'Synthetic',uiLocale:'en',timezone:'America/Toronto',goal:'explore'})
  }
})
after(closeDatabase)

test('separately consented records are isolated by owner and direct clients have no access',async()=>{
  for(const [who,id] of [[a,first],[b,second]]) await rawAs(who,'hh_app_backend',db=>db.query(
    "insert into app_private.intelligence_feedback_memory(account_id,operation_id,consent_version,payload_ciphertext) values($1,$2,'intelligence-feedback-v1',$3)",[who.id,id,seal({version:1,itemId:'youtube:HqfixazXqRY',feedback:'useful'},context(who,id),config)]))
  const rows=await rawAs(a,'hh_app_backend',db=>db.query('select operation_id,payload_ciphertext from app_private.intelligence_feedback_memory order by operation_id'))
  assert.deepEqual(rows.rows.map(row=>row.operation_id),[first])
  assert.equal(rows.rows[0].payload_ciphertext.includes('HqfixazXqRY'),false)
  assert.deepEqual(openSealed(rows.rows[0].payload_ciphertext,context(a,first),config),{version:1,itemId:'youtube:HqfixazXqRY',feedback:'useful'})
  assert.throws(()=>openSealed(rows.rows[0].payload_ciphertext,context(b,first),config),/PRIVATE_DATA_UNAVAILABLE/)
  const removed=await rawAs(a,'hh_app_backend',db=>db.query('delete from app_private.intelligence_feedback_memory where account_id=$1',[B]))
  assert.equal(removed.rowCount,0)
  await assert.rejects(rawAs(a,'authenticated',db=>db.query('select * from app_private.intelligence_feedback_memory')),/permission denied/)
  await assert.rejects(rawAs(a,'hh_app_backend',db=>db.query("insert into app_private.intelligence_feedback_memory(account_id,operation_id,consent_version,payload_ciphertext) values($1,$2,'intelligence-feedback-v1',$3)",[B,randomUUID(),seal({feedback:'test'},context(b,second),config)])),/row-level security/)
})
test('invalid consent, malformed ciphertext and duplicate operations fail closed',async()=>{
  const cipher=seal({feedback:'test'},context(a,first),config)
  const insert=(id,consent,payload)=>rawAs(a,'hh_app_backend',db=>db.query('insert into app_private.intelligence_feedback_memory(account_id,operation_id,consent_version,payload_ciphertext) values($1,$2,$3,$4)',[A,id,consent,payload]))
  await assert.rejects(insert(randomUUID(),'marketing',cipher),/check constraint/)
  await assert.rejects(insert(randomUUID(),'intelligence-feedback-v1','short'),/check constraint/)
  await assert.rejects(insert(randomUUID(),'intelligence-feedback-v1','x'.repeat(80)),/json/)
  await assert.rejects(insert(first,'intelligence-feedback-v1',cipher),/unique constraint/)
})
test('explicit save is default off, idempotent, owner scoped and deletable even when disabled',async()=>{
  const off={...config,intelligenceMemoryEnabled:false}, on={...config,intelligenceMemoryEnabled:true}
  assert.equal(config.intelligenceMemoryEnabled,false)
  assert.deepEqual(await intelligenceFeedbackStatus(off,a),{managementAvailable:true,saveEnabled:false})
  assert.deepEqual(await intelligenceFeedbackStatus(on,a),{managementAvailable:true,saveEnabled:true})
  const operationId=randomUUID(), input={operationId,consent:true,expectedRevision:0,itemId:'youtube:w2BN-HYmHUk',feedback:'not_useful'}
  await assert.rejects(saveIntelligenceFeedback(off,a,input),/INTELLIGENCE_MEMORY_DISABLED/)
  await assert.rejects(saveIntelligenceFeedback(on,a,{...input,consent:false}),/CONSENT_REQUIRED/)
  await assert.rejects(saveIntelligenceFeedback(on,a,{...input,ownerId:B}),/UNKNOWN_FIELD/)
  await assert.rejects(saveIntelligenceFeedback(on,a,{...input,itemId:'private free text'}),/INVALID/)
  const retries=await Promise.all([saveIntelligenceFeedback(on,a,input),saveIntelligenceFeedback(on,a,input)])
  assert.ok(retries.every(result=>result.saved===true))
  await assert.rejects(saveIntelligenceFeedback(on,a,{...input,feedback:'useful'}),/CONFLICT/)
  const owner=await exportIntelligenceFeedback(off,a), other=await exportIntelligenceFeedback(off,b)
  assert.equal(owner.records.length,2)
  assert.equal(other.records.length,1)
  assert.equal(owner.records.some(record=>record.itemId===input.itemId),true)
  assert.equal(other.records.some(record=>record.itemId===input.itemId),false)
  assert.deepEqual(await matchingUnhelpfulFeedback(on,a,[input.itemId,'youtube:HqfixazXqRY']),{dismissedIds:[input.itemId]})
  assert.deepEqual(await matchingUnhelpfulFeedback(on,b,[input.itemId,'youtube:HqfixazXqRY']),{dismissedIds:[]})
  await assert.rejects(matchingUnhelpfulFeedback(off,a,[input.itemId]),/INTELLIGENCE_MEMORY_DISABLED/)
  assert.equal((await deleteIntelligenceFeedback(off,a,{operationId,expectedRevision:0})).deleted,true)
  await assert.rejects(deleteIntelligenceFeedback(off,a,{operationId,expectedRevision:0}),/INTELLIGENCE_MEMORY_STALE/)
  await assert.rejects(saveIntelligenceFeedback(on,a,input),/INTELLIGENCE_MEMORY_STALE/)
  assert.equal((await exportIntelligenceFeedback(off,a)).records.some(record=>record.itemId===input.itemId),false)
  const retryWithNewConsent={...input,operationId:randomUUID(),expectedRevision:1}
  await saveIntelligenceFeedback(on,a,retryWithNewConsent)
  await assert.rejects(deleteIntelligenceFeedback(off,a,{all:true,expectedRevision:0}),/INTELLIGENCE_MEMORY_STALE/)
  assert.equal((await exportIntelligenceFeedback(off,a)).records.some(record=>record.itemId===input.itemId),true)
  await deleteIntelligenceFeedback(off,a,{operationId:retryWithNewConsent.operationId,expectedRevision:1})
  const foreignState=await rawAs(b,'hh_app_backend',db=>db.query('select revision from app_private.intelligence_feedback_state where account_id=$1',[A]))
  assert.equal(foreignState.rowCount,0)
  await assert.rejects(rawAs(a,'authenticated',db=>db.query('select * from app_private.intelligence_feedback_state')),/permission denied/)
  assert.equal((await exportIntelligenceFeedback(off,b)).revision,0)
  assert.equal((await exportIntelligenceFeedback(off,b)).records.length,1)
})
test('editing feedback is explicit, owner scoped and invalidates stale operations',async()=>{
  const on={...config,intelligenceMemoryEnabled:true}, off={...config,intelligenceMemoryEnabled:false}
  const snapshot=await exportIntelligenceFeedback(on,a)
  const edit={operationId:first,expectedRevision:snapshot.revision,consent:true,feedback:'not_useful'}
  await assert.rejects(editIntelligenceFeedback(off,a,edit),/INTELLIGENCE_MEMORY_DISABLED/)
  await assert.rejects(editIntelligenceFeedback(on,a,{...edit,consent:false}),/CONSENT_REQUIRED/)
  await assert.rejects(editIntelligenceFeedback(on,b,{...edit,expectedRevision:0}),/NOT_FOUND/)
  const changed=await editIntelligenceFeedback(on,a,edit)
  assert.equal(changed.revision,snapshot.revision+1)
  assert.deepEqual(await matchingUnhelpfulFeedback(on,a,['youtube:HqfixazXqRY']),{dismissedIds:['youtube:HqfixazXqRY']})
  await assert.rejects(editIntelligenceFeedback(on,a,edit),/INTELLIGENCE_MEMORY_STALE/)
  await assert.rejects(deleteIntelligenceFeedback(on,a,{operationId:first,expectedRevision:snapshot.revision}),/INTELLIGENCE_MEMORY_STALE/)
  await editIntelligenceFeedback(on,a,{...edit,expectedRevision:changed.revision,feedback:'useful'})
  assert.deepEqual(await matchingUnhelpfulFeedback(on,a,['youtube:HqfixazXqRY']),{dismissedIds:[]})
  assert.equal((await exportIntelligenceFeedback(on,b)).records[0].feedback,'useful')
})
test('owner deletion removes only own feedback, and account deletion cascades',async()=>{
  const removed=await rawAs(a,'hh_app_backend',db=>db.query('delete from app_private.intelligence_feedback_memory where account_id=$1',[A]))
  assert.equal(removed.rowCount,1)
  const revision=(await exportIntelligenceFeedback(config,a)).revision
  const pending={operationId:randomUUID(),consent:true,expectedRevision:revision,itemId:'course:reiki-preview',feedback:'useful'}
  await saveIntelligenceFeedback({...config,intelligenceMemoryEnabled:true},a,pending)
  assert.equal((await deleteIntelligenceFeedback(config,a,{all:true,expectedRevision:revision})).deleted,true)
  assert.equal((await exportIntelligenceFeedback(config,a)).records.length,0)
  await assert.rejects(saveIntelligenceFeedback({...config,intelligenceMemoryEnabled:true},a,pending),/INTELLIGENCE_MEMORY_STALE/)
  assert.equal((await exportIntelligenceFeedback(config,a)).records.length,0)
  assert.equal((await rawAs(b,'hh_app_backend',db=>db.query('select 1 from app_private.intelligence_feedback_memory'))).rowCount,1)
  await deleteIntelligenceFeedback(config,b,{operationId:randomUUID(),expectedRevision:0})
  const db=await adminClient()
  try {
    await db.query('delete from app.accounts where id=$1',[B])
    assert.equal((await db.query('select 1 from app_private.intelligence_feedback_memory where account_id=$1',[B])).rowCount,0)
    assert.equal((await db.query('select 1 from app_private.intelligence_feedback_state where account_id=$1',[B])).rowCount,0)
  } finally {await db.end()}
})
