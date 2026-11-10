import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {runInNewContext} from 'node:vm'
import {readFileSync} from 'node:fs'
import {AppError,onlyKeys,requireUUID} from '../lib/assessments/contracts.js'
import {seal,openSealed,operationHash} from '../lib/app/crypto.js'
import {buildCoachingReportV2Draft,validateCoachingReportV2} from '../lib/personal-coaching/report-v2.js'
import {reviewCoachingReportDraft} from '../lib/personal-coaching/report-review.mjs'

const owner={id:'10000000-0000-4000-8000-000000000001'}
const reportId='20000000-0000-4000-8000-000000000001'
const sessionId='30000000-0000-4000-8000-000000000001'
const now='2026-11-09T22:00:00.000Z'
const config={encryptionKey:Buffer.alloc(32,73),encryptionKeyId:'test'}

function makeReport(status='accepted'){
 const draft=buildCoachingReportV2Draft({
  session:{id:sessionId,status:'completed',schemeKey:'grow_quick_v1',modelKey:'grow_v1',
   clientQuestion:'I want to decide whether to change roles.',
   answers:{topic:'Career direction',outcome:'Choose one practical next step',reality:'Two roles are possible',action:'Compare responsibilities with a trusted colleague.'},
   reflections:{},startedAt:'2026-11-09T21:40:00.000Z',completedAt:'2026-11-09T22:00:00.000Z'},
  questions:[
   {id:'topic',stage:'goal'},{id:'outcome',stage:'goal'},
   {id:'reality',stage:'reality'},{id:'action',stage:'will'},
  ],locale:'en',sourceRevision:9,
 })
 return reviewCoachingReportDraft(draft,[{candidateId:draft.actionCandidates[0].candidateId,status}],now)
}

function buildService({report=makeReport(),ownerId=owner.id,storageConsent={accepted:true,revoked_at:null}}={}){
 const source=readFileSync(new URL('../lib/app/coaching-life-plan.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const state={plan:null,area:null,goal:null,actions:new Map(),changes:[],consents:[],queries:[],planVersion:1}
 const reportRecord={id:reportId,session_id:sessionId,status:'confirmed',current_revision:1,content_hash:operationHash(report,config)}
 const db={query:async(sql,args=[])=>{
  state.queries.push({sql,args})
  if(sql.includes('select 1 from app_private.coaching_erased_action_receipts'))return {rows:[]}
  if(sql.includes('from app_private.coaching_session_consents')&&sql.trimStart().startsWith('select'))return {rows:storageConsent?[storageConsent]:[]}
  if(sql.includes('select id from app.accounts'))return {rows:[{id:ownerId}]}
  if(sql.includes('select id,session_id,status,current_revision,content_hash from app_private.coaching_reports')){
   return {rows:ownerId===owner.id?[reportRecord]:[]}
  }
  if(sql.includes('insert into app_private.coaching_life_plans')){
   if(!state.plan)state.plan={id:'40000000-0000-4000-8000-000000000001',plan_version:1}
   return {rows:[]}
  }
  if(sql.includes("select id,plan_version from app_private.coaching_life_plans where account_id=$1 and status='active'")){
   return {rows:state.plan?[{...state.plan}]:[]}
  }
  if(sql.includes('insert into app_private.coaching_life_plan_areas')){
   if(!state.area)state.area={id:'50000000-0000-4000-8000-000000000001',area_key:args[2]}
   return {rows:[]}
  }
  if(sql.includes('select id from app_private.coaching_life_plan_areas')){
   return {rows:state.area&&state.area.area_key===args[2]?[{id:state.area.id}]:[]}
  }
  if(sql.includes('insert into app_private.coaching_goals')){
   if(!state.goal){
    state.goal={id:args[0],area_id:args[1],account_id:args[2],source_session_id:args[3],source_report_id:args[4],
     title_ciphertext:args[5],desired_outcome_ciphertext:args[6],status:'proposed',idempotency_key:args[7]}
    return {rows:[{id:state.goal.id,revision:1}]}
   }
   return {rows:[]}
  }
  if(sql.includes('select id,area_id,source_report_id,revision from app_private.coaching_goals')){
   return {rows:state.goal?[{id:state.goal.id,area_id:state.goal.area_id,source_report_id:state.goal.source_report_id,revision:1}]:[]}
  }
  if(sql.includes('insert into app_private.coaching_action_items')){
   const key=args[5]
   if(state.actions.has(key))return {rows:[]}
   const row={id:args[0],goal_id:args[1],account_id:args[2],source_session_id:args[3],source_report_id:args[4],
    source_action_key:key,description_ciphertext:args[6],status:'accepted',client_confirmed_at:args[7]}
   state.actions.set(key,row)
   return {rows:[{id:row.id,status:row.status,client_confirmed_at:row.client_confirmed_at}]}
  }
  if(sql.includes('select id,goal_id,status,client_confirmed_at from app_private.coaching_action_items')){
   const row=state.actions.get(args[2])
   return {rows:row?[{id:row.id,goal_id:row.goal_id,status:row.status,client_confirmed_at:row.client_confirmed_at}]:[]}
  }
  if(sql.includes('insert into app_private.coaching_session_consents')){
   state.consents.push(args);return {rows:[]}
  }
  if(sql.includes('insert into app_private.coaching_life_plan_changes')){
   state.changes.push(args);return {rows:[]}
  }
  if(sql.includes('update app_private.coaching_life_plans set plan_version=plan_version+1')){
   state.planVersion++;if(state.plan)state.plan.plan_version=state.planVersion;return {rows:[]}
  }
  if(sql.includes('select id,plan_version from app_private.coaching_life_plans where id=$1')){
   return {rows:state.plan?[{id:state.plan.id,plan_version:state.planVersion}]:[]}
  }
  throw new Error('Unexpected SQL: '+sql)
 }}
 const transaction=async(_config,_actor,fn)=>fn(db)
 const readCoachingReport=async(_config,actor,id)=>{
  if(actor.id!==owner.id||id!==reportId)throw new AppError('COACHING_REPORT_NOT_FOUND',404)
  return {report:{id,sessionId,revision:1,report}}
 }
 const factory=runInNewContext('(deps)=>{const {randomUUID,createHash,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReport,validateCoachingReportV2}=deps;'+source+';return {readCoachingLifePlan,importCoachingReportActions}}')
 return {service:factory({randomUUID,createHash,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReport,validateCoachingReportV2}),state,report}
}

function buildAreaEditService({existing=false}={}){
 const source=readFileSync(new URL('../lib/app/coaching-life-plan.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const state={plan:null,area:existing?{
  id:'50000000-0000-4000-8000-000000000001',plan_id:'40000000-0000-4000-8000-000000000001',
  account_id:owner.id,area_key:'career_business',revision:1,
  current_state_ciphertext:seal('Current role feels overloaded.',{accountId:owner.id,recordId:'50000000-0000-4000-8000-000000000001',field:'coaching.life_plan.current_state'},config),
  desired_state_ciphertext:null,obstacles_ciphertext:null,self_rating:null,rating_source:null,status:'active',
 }:null,changes:[],queries:[],version:1}
 const db={query:async(sql,args=[])=>{
  state.queries.push({sql,args})
  if(sql.includes('select id from app.accounts'))return {rows:[{id:owner.id}]}
  if(sql.includes('select latest.session_id,s.completed_at'))return {rows:[]}
  if(sql.includes('insert into app_private.coaching_life_plans')){
   if(!state.plan)state.plan={id:'40000000-0000-4000-8000-000000000001',plan_version:1}
   return {rows:[]}
  }
  if(sql.includes("select id,plan_version from app_private.coaching_life_plans where account_id=$1 and status='active'")){
   return {rows:state.plan?[{...state.plan,plan_version:state.version}]:[]}
  }
  if(sql.includes('select id,revision,current_state_ciphertext,desired_state_ciphertext,obstacles_ciphertext,self_rating,rating_source,status from app_private.coaching_life_plan_areas')){
   return {rows:state.area?[{...state.area}]:[]}
  }
  if(sql.includes('insert into app_private.coaching_life_plan_areas')){
   state.area={id:args[0],plan_id:args[1],account_id:args[2],area_key:args[3],
    current_state_ciphertext:args[4],desired_state_ciphertext:args[5],obstacles_ciphertext:args[6],
    self_rating:args[7],rating_source:args[8],status:args[9],revision:1}
   return {rows:[]}
  }
  if(sql.includes('update app_private.coaching_life_plan_areas set current_state_ciphertext')){
   if(!state.area||state.area.revision!==args[8])return {rows:[]}
   Object.assign(state.area,{current_state_ciphertext:args[2],desired_state_ciphertext:args[3],
    obstacles_ciphertext:args[4],self_rating:args[5],rating_source:args[6],status:args[7],revision:state.area.revision+1})
   return {rows:[{revision:state.area.revision}]}
  }
  if(sql.includes('insert into app_private.coaching_life_plan_changes')){
   state.changes.push(args);return {rows:[]}
  }
  if(sql.includes('update app_private.coaching_life_plans set plan_version=plan_version+1')){
   state.version++;return {rows:[]}
  }
  if(sql.includes('select plan_version from app_private.coaching_life_plans where id=$1')){
   return {rows:[{plan_version:state.version}]}
  }
  throw new Error('Unexpected SQL: '+sql)
 }}
 const transaction=async(_config,_actor,fn)=>fn(db)
 const factory=runInNewContext('(deps)=>{const {randomUUID,createHash,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,readCoachingReport,validateCoachingReportV2}=deps;'+source+';return updateCoachingLifePlanArea}')
 const update=factory({randomUUID,createHash,AppError,onlyKeys,requireUUID,transaction,seal,openSealed,operationHash,
  readCoachingReport:async()=>{throw new Error('not used')},validateCoachingReportV2})
 return {update,state}
}

test('import uses only accepted, evidence-backed action IDs and client-selected life domain',async()=>{
 const {service,state,report}=buildService()
 const candidate=report.actionCandidates[0]
 const result=await service.importCoachingReportActions(config,owner,{
  reportId,reportRevision:1,areaKey:'career_business',candidateIds:[candidate.candidateId],planConsent:true,
 })
 assert.equal(result.areaKey,'career_business')
 assert.equal(result.goalCreated,true)
 assert.equal(result.imported,1)
 assert.equal(state.goal.status,'proposed')
 assert.equal(state.actions.get(candidate.candidateId).status,'accepted')
 assert.equal(state.actions.get(candidate.candidateId).client_confirmed_at,candidate.acceptedAt)
 assert.equal(state.changes.length,2,'one encrypted audit record for goal and action')
 assert.equal(state.consents.length,1,'the cross-session consent is stored atomically')
 const consentQuery=state.queries.find(query=>query.sql.includes('insert into app_private.coaching_session_consents'))
 assert.match(consentQuery.sql,/'cross_session_context'/)
 assert.match(consentQuery.sql,/'coaching_life_plan_continuity_v1'/)
 assert.match(consentQuery.sql,/'life_plan_continuity'/)
 assert.equal(consentQuery.args[1],sessionId)
 assert.equal(consentQuery.args[2],owner.id)
 assert.match(consentQuery.sql,/max\(occurred_at\)\+interval '1 microsecond'/)
 const title=openSealed(state.goal.title_ciphertext,{accountId:owner.id,recordId:state.goal.id,field:'coaching.life_plan.goal.title'},config)
 assert.equal(title,'Choose one practical next step')
 const action=openSealed(state.actions.get(candidate.candidateId).description_ciphertext,
  {accountId:owner.id,recordId:state.actions.get(candidate.candidateId).id,field:'coaching.life_plan.action.description'},config)
 assert.equal(action,candidate.text)
 assert.equal(result.planVersion,2)
})

test('cross-session consent is mandatory and missing consent causes no Life Plan writes',async()=>{
 const {service,state,report}=buildService()
 const candidate=report.actionCandidates[0]
 await assert.rejects(()=>service.importCoachingReportActions(config,owner,{
  reportId,reportRevision:1,areaKey:'career_business',candidateIds:[candidate.candidateId],
 }),err=>err.code==='COACHING_PLAN_CONSENT_REQUIRED')
 assert.equal(state.plan,null)
 assert.equal(state.goal,null)
 assert.equal(state.actions.size,0)
 assert.equal(state.consents.length,0)
 assert.equal(state.changes.length,0)
})

test('deferred or declined actions cannot enter My Coaching Plan',async()=>{
 for(const status of ['deferred','declined']){
  const {service,state,report}=buildService({report:makeReport(status)})
  const id=report.actionCandidates[0].candidateId
  await assert.rejects(()=>service.importCoachingReportActions(config,owner,{
   reportId,reportRevision:1,areaKey:'career_business',candidateIds:[id],planConsent:true,
  }),err=>err.code==='COACHING_PLAN_ACTION_NOT_ACCEPTED')
  assert.equal(state.goal,null)
  assert.equal(state.actions.size,0)
 }
})

test('import rejects caller-supplied report content, unknown fields, invalid area and duplicate candidate IDs',async()=>{
 const {service}=buildService()
 const base={reportId,reportRevision:1,areaKey:'career_business',candidateIds:['candidate'],planConsent:true}
 for(const input of [
  {...base,report:{actions:['forged']}},
  {...base,accountId:owner.id},
  {...base,areaKey:'other'},
  {...base,candidateIds:['same','same']},
  {...base,reportRevision:0},
 ])await assert.rejects(()=>service.importCoachingReportActions(config,owner,input),err=>err.code==='COACHING_PLAN_IMPORT_INVALID'||err.code==='UNKNOWN_FIELD')
})

test('wrong account cannot access the private report or create a Life Plan row',async()=>{
 const {service,state}=buildService({ownerId:'10000000-0000-4000-8000-000000000002'})
 await assert.rejects(()=>service.importCoachingReportActions(config,{id:'10000000-0000-4000-8000-000000000002'},{
  reportId,reportRevision:1,areaKey:'career_business',candidateIds:['candidate'],planConsent:true,
 }),err=>err.code==='COACHING_REPORT_NOT_FOUND')
 assert.equal(state.plan,null)
})

test('report import is retry-safe and does not duplicate goal, action, consent or audit events',async()=>{
 const {service,state,report}=buildService()
 const candidate=report.actionCandidates[0]
 const input={reportId,reportRevision:1,areaKey:'career_business',candidateIds:[candidate.candidateId],planConsent:true}
 const first=await service.importCoachingReportActions(config,owner,input)
 const second=await service.importCoachingReportActions(config,owner,input)
 assert.equal(first.goalId,second.goalId)
 assert.equal(first.imported,1)
 assert.equal(second.imported,0)
 assert.equal(state.actions.size,1)
 assert.equal(state.changes.length,2)
 assert.equal(state.consents.length,1,'retry does not duplicate the consent event')
 assert.equal(second.planVersion,2)
})

test('empty Life Plan reads do not create plan/domain records and still return all eight domains',async()=>{
 const source=readFileSync(new URL('../lib/app/coaching-life-plan.js',import.meta.url),'utf8')
 const body=source.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')
 const calls=[]
 const transaction=async(_config,_actor,fn)=>fn({query:async(sql,args=[])=>{
  calls.push(sql)
  if(sql.includes('select id from app.accounts'))return {rows:[{id:owner.id}]}
  if(sql.includes('select latest.session_id,s.completed_at'))return {rows:[]}
  if(sql.includes("select id,plan_version,status,created_at,updated_at from app_private.coaching_life_plans"))return {rows:[]}
  throw new Error('Unexpected SQL: '+sql)
 }})
 const factory=runInNewContext('(deps)=>{const {AppError,transaction,openSealed}=deps;'+body+';return readCoachingLifePlan}')
 const read=factory({AppError,transaction,openSealed})
 const result=await read(config,owner,{locale:'ru'})
 assert.equal(result.plan,null)
 assert.equal(result.domains.length,8)
 assert.ok(result.domains.every(area=>area.status==='not_started'&&area.selfRating===null))
 assert.equal(calls.some(sql=>sql.startsWith('insert')),false)
})


test('Life Plan area edits are encrypted, revisioned and written to the change journal',async()=>{
 const {update,state}=buildAreaEditService()
 const result=await update(config,owner,{areaKey:'career_business',revision:0,
  currentState:'My workload is fragmented.',desiredState:'A sustainable weekly schedule.',
  obstacles:'Too many parallel commitments.',selfRating:6})
 assert.equal(result.revision,1)
 assert.equal(result.planVersion,2)
 assert.equal(state.changes.length,1)
 assert.equal(openSealed(state.area.current_state_ciphertext,{accountId:owner.id,recordId:state.area.id,field:'coaching.life_plan.current_state'},config),'My workload is fragmented.')
 assert.equal(openSealed(state.area.desired_state_ciphertext,{accountId:owner.id,recordId:state.area.id,field:'coaching.life_plan.desired_state'},config),'A sustainable weekly schedule.')
 assert.equal(state.area.rating_source,'client_self_report')
})

test('unchanged Life Plan area values do not create new revisions or duplicate audit rows',async()=>{
 const {update,state}=buildAreaEditService({existing:true})
 const input={areaKey:'career_business',revision:1,currentState:'Current role feels overloaded.',desiredState:'',obstacles:'',selfRating:null}
 const result=await update(config,owner,input)
 assert.equal(result.changed,false)
 assert.equal(result.revision,1)
 assert.equal(state.changes.length,0)
 assert.equal(state.version,1)
})

test('stale Life Plan area revisions and invalid self-ratings are rejected',async()=>{
 const {update,state}=buildAreaEditService({existing:true})
 await assert.rejects(()=>update(config,owner,{areaKey:'career_business',revision:0,
  currentState:'A changed value',desiredState:'',obstacles:'',selfRating:null}),
  err=>err.code==='COACHING_PLAN_REVISION_CONFLICT')
 await assert.rejects(()=>update(config,owner,{areaKey:'career_business',revision:1,
  currentState:'A changed value',desiredState:'',obstacles:'',selfRating:11}),
  err=>err.code==='COACHING_PLAN_RATING_INVALID')
 assert.equal(state.changes.length,0)
 assert.equal(state.version,1)
})

test('Life Plan endpoints use the existing authenticated catch-all route and account switch guard',()=>{
 const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
 assert.match(route,/import \{ readCoachingLifePlan, updateCoachingLifePlanArea, importCoachingReportActions \} from '@\/lib\/app\/coaching-life-plan'/)
 assert.match(route,/path\[0\] === 'coaching-life-plan'/)
 assert.match(route,/readCoachingLifePlan\(config,actor,\{locale\}\)/)
 assert.match(route,/updateCoachingLifePlanArea\(config,actor,\{\.\.\.await readBody\(request,8192\),areaKey:path\[2\]\}\)/)
 assert.match(route,/importCoachingReportActions\(config,actor,await readBody\(request,2048\)\)/)
 assert.match(route,/revokeCoachingPlanContext\(config,actor,await readBody\(request,1024\)\)/)
 assert.match(route,/deleteCoachingPlanAction\(config,actor,path\[2\],await readBody\(request,1024\)\)/)
 const block=route.slice(route.indexOf("if (path[0] === 'coaching-life-plan')"),route.indexOf("if (joined === 'tradition-coaching-summary')"))
 assert.match(block,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
})

test('permission controls remain available without an existing plan',()=>{
 const ui=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(ui,/plan\?\.contextPermissions\?\.length/)
 assert.match(ui,/coaching-life-plan\/revoke-context/)
 assert.match(ui,/sessionId,confirmed:true/)
 for(const text of ['Withdraw permission','Отозвать разрешение','Retirar permiso'])assert.ok(ui.includes(text))
})
test('action removal requires confirmation and uses the authenticated endpoint',()=>{
 const ui=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(ui,/window\.confirm\(t\.confirmDeleteAction\)/)
 assert.match(ui,/coaching-life-plan\/actions\//)
 for(const text of ['Delete action','Удалить действие','Eliminar acción'])assert.ok(ui.includes(text))
})

test('My Coaching Plan workspace JSX and route contract parse cleanly',async()=>{
 const ts=(await import('typescript')).default
 for(const path of ['components/app/my-coaching-plan.jsx','components/app/app-workspace.jsx']){
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  const errors=parsed.parseDiagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.equal(errors.length,0,path+': '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '))
 }
 const page=readFileSync(new URL('../app/[locale]/app/[[...path]]/page.jsx',import.meta.url),'utf8')
 assert.match(page,/my-coaching-plan/)
 const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
 assert.match(workspace,/page === 'my-coaching-plan' && <MyCoachingPlan/)
 assert.match(workspace,/root \+ '\/my-coaching-plan'/)
 const dock=workspace.slice(workspace.indexOf('const mobileNav = ['),workspace.indexOf('const navIsActive'))
 assert.match(dock,/my-coaching-plan/)
 assert.doesNotMatch(dock,/id: 'settings'/,'Settings remain in the account menu so the five-column mobile dock stays within its layout')
 const spanish=readFileSync(new URL('../lib/app/spanish-cabinet-bridge.mjs',import.meta.url),'utf8')
 assert.match(spanish,/my-coaching-plan/)
 const planPage=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(planPage,/planConsent/)
 assert.match(planPage,/planConsent:planConsents\[record\.id\]===true/)
 assert.match(planPage,/disabled=\{!selected\.length\|\|planConsents\[record\.id\]!==true/)
})

test('revoked report storage consent prevents every plan write',async()=>{
 for(const storageConsent of [null,{accepted:false,revoked_at:null},{accepted:true,revoked_at:now}]){
  const {service,state,report}=buildService({storageConsent})
  await assert.rejects(()=>service.importCoachingReportActions(config,owner,{reportId,reportRevision:1,areaKey:'career_business',candidateIds:[report.actionCandidates[0].candidateId],planConsent:true}),err=>err.code==='COACHING_REPORT_CONSENT_REQUIRED')
  assert.equal(state.queries.some(q=>q.sql.trimStart().startsWith('insert ')),false)
 }

})
