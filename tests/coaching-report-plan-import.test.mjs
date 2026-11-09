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
const startedAt='2026-11-09T20:00:00.000Z'
const confirmedAt='2026-11-09T20:20:00.000Z'
const config={encryptionKey:Buffer.alloc(32,42),encryptionKeyId:'test'}
const questions=[{id:'goal',stepKey:'goal'},{id:'reality',stepKey:'reality'},{id:'action',stepKey:'action'}]

function fixture(status='accepted'){
 const draft=buildCoachingReportV2Draft({session:{
  id:sessionId,status:'completed',schemeKey:'grow_quick_v1',modelKey:'grow_v1',
  startedAt,completedAt:confirmedAt,answers:{goal:'Choose a new direction',reality:'Two options remain',action:'Compare both options on Friday'},reflections:{},
 },questions,sourceRevision:7})
 const report=reviewCoachingReportDraft(draft,[{candidateId:draft.actionCandidates[0].candidateId,status}],confirmedAt)
 const row={
  report_id:reportId,session_id:sessionId,created_at:confirmedAt,confirmed_at:confirmedAt,
  report_status:'confirmed',locale:'en',version_id:versionId,revision:1,
  report_ciphertext:seal(report,{accountId:owner.id,recordId:versionId,field:'coaching.report'},config),
  current_ciphertext:seal(report,{accountId:owner.id,recordId:reportId,field:'coaching.report'},config),
  evidence_ciphertext:seal(report.evidence,{accountId:owner.id,recordId:versionId,field:'coaching.evidence'},config),
  current_evidence_ciphertext:seal(report.evidence,{accountId:owner.id,recordId:reportId,field:'coaching.evidence'},config),
  content_hash:operationHash(report,config),current_hash:operationHash(report,config),
 }
 const source=readFileSync(new URL('../lib/app/coaching-report-store.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const factory=runInNewContext('(deps)=>{const {randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReportDraft,reviewCoachingReportDraft,validateCoachingReportV2}=deps;'+source+';return importAcceptedReportActions}')
 let activeActor=owner.id
 const calls=[],captured={goals:[],actions:[],changes:[]}
 const planId='40000000-0000-4000-8000-000000000001'
 const areaId='50000000-0000-4000-8000-000000000001'
 const db={query:async(sql,args=[])=>{
  calls.push({sql,args})
  if(sql.startsWith('select id from app.accounts'))return {rows:[{id:activeActor}]}
  if(sql.includes('from app_private.coaching_reports')&&sql.includes('for update of r'))return {rows:activeActor===owner.id?[row]:[]}
  if(sql.includes('from app_private.coaching_session_consents'))return {rows:[{accepted:true,revoked_at:null}]}
  if(sql.includes('from app_private.coaching_action_items a where'))return {rows:captured.existing||[]}
  if(sql.startsWith('insert into app_private.coaching_life_plans'))return {rows:[{id:planId,plan_version:1,status:'active'}]}
  if(sql.startsWith('select id,plan_version,status from app_private.coaching_life_plans'))return {rows:[{id:planId,plan_version:1,status:'active'}]}
  if(sql.startsWith('insert into app_private.coaching_life_plan_areas'))return {rows:[]}
  if(sql.startsWith('select id,revision,status from app_private.coaching_life_plan_areas'))return {rows:[{id:areaId,revision:1,status:'active'}]}
  if(sql.startsWith('insert into app_private.coaching_goals')){captured.goals.push({args});return {rows:[]}}
  if(sql.startsWith('insert into app_private.coaching_action_items')){captured.actions.push({args,sql});return {rows:[{id:args[0]}]}}
  if(sql.startsWith('update app_private.coaching_life_plans'))return {rows:[]}
  if(sql.startsWith('insert into app_private.coaching_life_plan_changes')){captured.changes.push({args});return {rows:[]}}
  throw new Error('Unexpected query: '+sql)
 }}
 const transaction=async(_config,actor,fn)=>{activeActor=actor.id;return fn(db)}
 const service=factory({randomUUID,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReportDraft:null,reviewCoachingReportDraft,validateCoachingReportV2})
 return {service,row,report,db,calls,captured,planId,areaId}
}

test('only an owner may import actions, and the selected area must be an approved domain',async()=>{
 const {service}=fixture()
 await assert.rejects(()=>service(config,other,reportId,{areaKey:'personal_growth',confirmed:true}),err=>err.code==='COACHING_REPORT_NOT_FOUND')
 await assert.rejects(()=>service(config,owner,reportId,{areaKey:'unknown',confirmed:true}),err=>err.code==='COACHING_PLAN_AREA_INVALID')
 await assert.rejects(()=>service(config,owner,reportId,{areaKey:'personal_growth',confirmed:false}),err=>err.code==='COACHING_PLAN_IMPORT_CONFIRMATION_REQUIRED')
})

test('confirmed report action imports transactionally into the existing owner Life Plan with encryption and provenance',async()=>{
 const {service,captured,planId,areaId,report}=fixture()
 const result=await service(config,owner,reportId,{areaKey:'career_business',confirmed:true})
 assert.equal(result.imported,true)
 assert.equal(result.count,1)
 assert.equal(result.planId,planId)
 assert.equal(result.areaKey,'career_business')
 assert.equal(captured.goals.length,1)
 assert.equal(captured.actions.length,1)
 assert.equal(captured.changes.length,4)
 const goalArgs=captured.goals[0].args
 const goalId=goalArgs[0]
 assert.equal(goalArgs[1],areaId)
 assert.equal(goalArgs[4],reportId)
 assert.equal(openSealed(goalArgs[5],{accountId:owner.id,recordId:goalId,field:'coaching.goal.title'},config),'Choose a new direction')
 const actionArgs=captured.actions[0].args
 assert.equal(actionArgs[1],goalId)
 assert.equal(actionArgs[4],reportId)
 assert.equal(actionArgs[5],report.actionCandidates[0].candidateId)
 assert.match(captured.actions[0].sql,/'accepted'/)
 assert.equal(actionArgs[8],confirmedAt)
 assert.equal(openSealed(actionArgs[6],{accountId:owner.id,recordId:actionArgs[0],field:'coaching.action.description'},config),'Compare both options on Friday')
 assert.equal(captured.changes[0].args[8].length>20,true)
 assert.ok(captured.changes.every(item=>item.args[8].length>20),'life-plan audit snapshots are encrypted')
})

test('a replay returns the existing imported action instead of creating a second goal or action',async()=>{
 const {service,captured,report}=fixture()
 captured.existing=[{id:'60000000-0000-4000-8000-000000000001',source_action_key:report.actionCandidates[0].candidateId}]
 const result=await service(config,owner,reportId,{areaKey:'career_business',confirmed:true})
 assert.equal(result.imported,false)
 assert.equal(result.alreadyImported,true)
 assert.equal(result.count,1)
 assert.deepEqual(captured.goals,[])
 assert.deepEqual(captured.actions,[])
})

test('deferred or declined candidates are never added to the Life Plan',async()=>{
 const {service,captured}=fixture('deferred')
 const result=await service(config,owner,reportId,{areaKey:'personal_growth',confirmed:true})
 assert.equal(result.imported,false)
 assert.equal(result.count,0)
 assert.equal(result.reason,'NO_ACCEPTED_ACTIONS')
 assert.deepEqual(captured.goals,[])
 assert.deepEqual(captured.actions,[])
})

test('storage consent revocation blocks Life Plan import',async()=>{
 const {service,db,captured}=fixture()
 const query=db.query
 db.query=async(sql,args)=>{
  if(sql.includes('from app_private.coaching_session_consents'))return {rows:[{accepted:false,revoked_at:confirmedAt}]}
  return query(sql,args)
 }
 await assert.rejects(()=>service(config,owner,reportId,{areaKey:'career_business',confirmed:true}),err=>err.code==='COACHING_REPORT_CONSENT_REQUIRED')
 assert.deepEqual(captured.goals,[])
 assert.deepEqual(captured.actions,[])
})