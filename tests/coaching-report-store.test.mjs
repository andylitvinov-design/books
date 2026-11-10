import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {randomUUID} from 'node:crypto'
import {AppError,onlyKeys,requireUUID} from '../lib/assessments/contracts.js'
import {seal,openSealed,operationHash} from '../lib/app/crypto.js'
import {buildCoachingReportV2Draft,validateCoachingReportV2} from '../lib/personal-coaching/report-v2.js'
import {reviewCoachingReportDraft} from '../lib/personal-coaching/report-review.mjs'

const owner={id:'10000000-0000-4000-8000-000000000001'}
const other={id:'10000000-0000-4000-8000-000000000002'}
const sessionId='20000000-0000-4000-8000-000000000001'
const reportId='30000000-0000-4000-8000-000000000001'
const versionId='30000000-0000-4000-8000-000000000002'
const confirmedAt='2026-11-09T20:00:00.000Z'
const config={encryptionKey:Buffer.alloc(32,42),encryptionKeyId:'test'}

function fixture(){
 const draft=buildCoachingReportV2Draft({session:{id:sessionId,status:'completed',answers:{goal:'Rest more',action:'Take a walk'},reflections:{}},questions:[{id:'goal',stepKey:'goal'},{id:'action',stepKey:'action'}],sourceRevision:7})
 const report=reviewCoachingReportDraft(draft,[{candidateId:draft.actionCandidates[0].candidateId,status:'accepted'}],confirmedAt)
 const row={report_id:reportId,session_id:sessionId,created_at:confirmedAt,confirmed_at:confirmedAt,report_status:'confirmed',locale:'en',version_id:versionId,revision:1,
  report_ciphertext:seal(report,{accountId:owner.id,recordId:versionId,field:'coaching.report'},config),
  current_ciphertext:seal(report,{accountId:owner.id,recordId:reportId,field:'coaching.report'},config),
  evidence_ciphertext:seal(report.evidence,{accountId:owner.id,recordId:versionId,field:'coaching.evidence'},config),
  current_evidence_ciphertext:seal(report.evidence,{accountId:owner.id,recordId:reportId,field:'coaching.evidence'},config),
  content_hash:operationHash(report,config),current_hash:operationHash(report,config)}
 const source=readFileSync(new URL('../lib/app/coaching-report-store.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const factory=runInNewContext('(deps)=>{const {randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReportDraft,reviewCoachingReportDraft,validateCoachingReportV2}=deps;'+source+';return {readCoachingReport,listCoachingReports}}')
 const transaction=async(_config,actor,fn)=>fn({query:async(sql,args)=>({rows:sql.startsWith('select id from app.accounts')?[{id:actor.id}]:args[0]===owner.id?[row]:[]})})
 return {row,service:factory({randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReportDraft:null,reviewCoachingReportDraft,validateCoachingReportV2})}
}

test('stored report reads authenticate ciphertext and bind owner, source revision and consent time',async()=>{
 const {row,service}=fixture()
 assert.equal((await service.readCoachingReport(config,owner,reportId)).report.report.sessionId,sessionId)
 await assert.rejects(()=>service.readCoachingReport(config,other,reportId),err=>err.code==='COACHING_REPORT_NOT_FOUND')
 for(const [field,value] of [['session_id','20000000-0000-4000-8000-000000000003'],['confirmed_at','2026-11-09T20:00:01.000Z'],['version_id','30000000-0000-4000-8000-000000000003'],['report_ciphertext',null],['current_hash','b'.repeat(64)],['report_status','withdrawn'],['locale','ru']]){
  const original=row[field];row[field]=value
  await assert.rejects(()=>service.readCoachingReport(config,owner,reportId),err=>err.code==='PRIVATE_DATA_UNAVAILABLE',field)
  row[field]=original
 }
 const context={accountId:owner.id,recordId:versionId,field:'coaching.report'}
 const forged=openSealed(row.report_ciphertext,context,config)
 forged.reportId='coaching-report:another-session'
 row.report_ciphertext=seal(forged,context,config)
 await assert.rejects(()=>service.readCoachingReport(config,owner,reportId),err=>err.code==='PRIVATE_DATA_UNAVAILABLE')
})

test('save rebuilds the source while holding the session lock in the same transaction',async()=>{
 const report=buildCoachingReportV2Draft({session:{id:sessionId,status:'completed',answers:{goal:'Rest more',action:'Walk'},reflections:{}},questions:[{id:'goal',stepKey:'goal'},{id:'action',stepKey:'action'}],sourceRevision:7})
 const calls=[];let lockedDb=null
 const transaction=async(_config,_actor,fn)=>{const db={query:async(sql)=>{
  calls.push(sql)
  if(sql.startsWith('select id from app.accounts'))return {rows:[{id:owner.id}]}
  if(sql.startsWith('select report_id,report_revision'))return {rows:[]}
  if(sql.startsWith('select revision from app_private.personal_coaching_sessions')){lockedDb=db;return {rows:[{revision:7}]}}
  if(sql.startsWith('select model_key,estimated_minutes'))return {rows:[{model_key:'grow_v1',estimated_minutes:10}]}
  if(sql.startsWith('select (select count'))return {rows:[{reports:0,receipts:0}]}
  if(sql.startsWith('select id from app_private.coaching_reports'))return {rows:[]}
  if(sql.startsWith('select scheme_key,model_key,status'))return {rows:[{scheme_key:'grow_quick_v1',model_key:'grow_v1',status:'completed',started_at:confirmedAt,completed_at:confirmedAt}]}
  if(sql.startsWith('insert into'))return {rows:[]}
  throw Error('Unexpected query: '+sql)
 }};return fn(db)}
 const readCoachingReportDraft=async(_config,_actor,_input,db)=>{assert.ok(lockedDb,'source must be read after acquiring the session lock');assert.equal(db,lockedDb);return {report,sourceSession:{id:sessionId,schemeKey:'grow_quick_v1',modelKey:'grow_v1',startedAt:confirmedAt,completedAt:confirmedAt}}}
 const source=readFileSync(new URL('../lib/app/coaching-report-store.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const factory=runInNewContext('(deps)=>{const {randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReportDraft,reviewCoachingReportDraft,validateCoachingReportV2}=deps;'+source+';return saveCoachingReport}')
 const save=factory({randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReportDraft,reviewCoachingReportDraft,validateCoachingReportV2})
 const result=await save(config,owner,{sessionId,revision:7,locale:'en',operationId:randomUUID(),saveConsent:true,decisions:[{candidateId:report.actionCandidates[0].candidateId,status:'accepted'}]})
 assert.equal(result.saved,true)
 assert.ok(calls.some(sql=>sql.includes('personal_coaching_sessions')&&sql.includes('for update')))
})
