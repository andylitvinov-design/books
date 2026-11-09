import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {seal,openSealed,operationHash} from './crypto.js'
import {readCoachingReportDraft} from './coaching-report-v2.js'
import {reviewCoachingReportDraft} from '../personal-coaching/report-review.mjs'
import {validateCoachingReportV2} from '../personal-coaching/report-v2.js'

const MAX_REPORTS=128,MAX_RECEIPTS=256,MAX_CIPHERTEXT=65000
const context=(actor,id,field='coaching.report')=>({accountId:actor.id,recordId:id,field})
const REPORT_SCHEMA='coaching-session-report.v2'
const notFound=()=>{throw new AppError('COACHING_REPORT_NOT_FOUND',404)}
async function activeAccount(db,actor,lock=false){
  const rows=(await db.query("select id from app.accounts where id=$1 and status='active' and onboarding_state='active'"+(lock?' for update':''),[actor.id])).rows
  if(!rows.length)throw new AppError('ACCOUNT_REQUIRED',401)
}
function readVersion(row,actor,config){
  if(!row.version_id||!row.report_ciphertext||!row.current_ciphertext||!row.evidence_ciphertext||!row.current_evidence_ciphertext)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  const report=openSealed(row.report_ciphertext,context(actor,row.version_id),config)
  const current=openSealed(row.current_ciphertext,context(actor,row.report_id),config)
  const evidence=openSealed(row.evidence_ciphertext,context(actor,row.version_id,'coaching.evidence'),config)
  const currentEvidence=openSealed(row.current_evidence_ciphertext,context(actor,row.report_id,'coaching.evidence'),config)
  if(!validateCoachingReportV2(report).valid||report.status!=='reviewed'||report.review?.status!=='confirmed'||row.report_status!=='confirmed'||report.locale!==row.locale||
    report.sessionId!==row.session_id||report.reportId!=='coaching-report:'+row.session_id||
    Date.parse(report.review.confirmedAt)!==Date.parse(row.confirmed_at)||
    row.content_hash!==row.current_hash||operationHash(report,config)!==row.content_hash||
    operationHash(current,config)!==row.content_hash||operationHash(evidence,config)!==operationHash(report.evidence,config)||
    operationHash(currentEvidence,config)!==operationHash(report.evidence,config))throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  return {id:row.report_id,revision:row.revision,sessionId:row.session_id,createdAt:row.created_at,report}
}
const versionQuery=`select r.id as report_id,r.session_id,r.created_at,r.confirmed_at,r.report_kind,r.schema_version,r.generated_by,r.status as report_status,r.locale,r.report_ciphertext as current_ciphertext,
  r.evidence_manifest_ciphertext as current_evidence_ciphertext,r.content_hash as current_hash,
  v.id as version_id,v.revision,v.report_ciphertext,v.evidence_manifest_ciphertext as evidence_ciphertext,v.content_hash
  from app_private.coaching_reports r left join app_private.coaching_report_versions v
  on v.report_id=r.id and v.account_id=r.account_id and v.revision=r.current_revision`
async function receipt(db,actor,operationId,fingerprint){
  const row=(await db.query('select report_id,report_revision,request_fingerprint,state from app_private.coaching_report_receipts where account_id=$1 and operation_id=$2',[actor.id,operationId])).rows[0]
  if(!row)return null
  if(row.request_fingerprint!==fingerprint)throw new AppError('COACHING_REPORT_OPERATION_REUSED',409)
  if(row.state==='deleted')throw new AppError('COACHING_REPORT_DELETED',410)
  const exists=(await db.query('select current_revision from app_private.coaching_reports where account_id=$1 and id=$2',[actor.id,row.report_id])).rows[0]
  if(!exists||exists.current_revision<row.report_revision)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  return {id:row.report_id,revision:row.report_revision,saved:true}
}
export async function saveCoachingReport(config,actor,input){
  onlyKeys(input,['sessionId','revision','locale','operationId','saveConsent','decisions'])
  requireUUID(input.sessionId);requireUUID(input.operationId)
  if(input.saveConsent!==true)throw new AppError('COACHING_REPORT_CONSENT_REQUIRED',400)
  if(!Array.isArray(input.decisions)||input.decisions.length>3)throw new AppError('COACHING_REPORT_REVIEW_INVALID',400)
  const fingerprint=operationHash({accountId:actor.id,sessionId:input.sessionId,revision:input.revision,locale:input.locale,saveConsent:true,decisions:input.decisions},config)
  const previous=await transaction(config,actor,async db=>{await activeAccount(db,actor);return receipt(db,actor,input.operationId,fingerprint)})
  if(previous)return previous
  return transaction(config,actor,async db=>{
    await activeAccount(db,actor,true)
    const prior=await receipt(db,actor,input.operationId,fingerprint)
    if(prior)return prior
    const session=(await db.query('select revision from app_private.personal_coaching_sessions where account_id=$1 for update',[actor.id])).rows[0]
    if(!session||session.revision!==input.revision)throw new AppError('PERSONAL_COACH_REVISION_CONFLICT',409)
    const source=await readCoachingReportDraft(config,actor,{sessionId:input.sessionId,revision:input.revision,locale:input.locale},db)
    const meta=source.sourceSession
    if(meta?.id!==input.sessionId||!meta.schemeKey||!meta.modelKey||!Number.isFinite(Date.parse(meta.startedAt))||!Number.isFinite(Date.parse(meta.completedAt)))
      throw new AppError('COACHING_REPORT_SOURCE_UNVERSIONED',409)
    const scheme=(await db.query('select model_key,estimated_minutes from app_private.coaching_schemes where scheme_key=$1 and model_key=$2',[meta.schemeKey,meta.modelKey])).rows[0]
    if(!scheme||!Number.isInteger(scheme.estimated_minutes))throw new AppError('COACHING_REPORT_SOURCE_UNVERSIONED',409)
    const confirmedAt=new Date().toISOString()
    let reviewed
    try{reviewed=reviewCoachingReportDraft(source.report,input.decisions,confirmedAt)}catch{throw new AppError('COACHING_REPORT_REVIEW_INVALID',400)}
    const id=randomUUID(),versionId=randomUUID(),contentHash=operationHash(reviewed,config)
    const ciphertext=seal(reviewed,context(actor,versionId),config),currentCiphertext=seal(reviewed,context(actor,id),config)
    const evidenceCiphertext=seal(reviewed.evidence,context(actor,versionId,'coaching.evidence'),config),currentEvidenceCiphertext=seal(reviewed.evidence,context(actor,id,'coaching.evidence'),config)
    if([ciphertext,currentCiphertext,evidenceCiphertext,currentEvidenceCiphertext].some(value=>value.length>MAX_CIPHERTEXT))throw new AppError('COACHING_REPORT_TOO_LARGE',413)
    const counts=(await db.query('select (select count(*)::int from app_private.coaching_reports where account_id=$1) as reports,(select count(*)::int from app_private.coaching_report_receipts where account_id=$1) as receipts',[actor.id])).rows[0]
    if(counts.reports>=MAX_REPORTS||counts.receipts>=MAX_RECEIPTS)throw new AppError('COACHING_REPORT_LIMIT',409)
    if((await db.query("select id from app_private.coaching_reports where account_id=$1 and session_id=$2 and report_kind='ai_coaching' and schema_version=$3",[actor.id,input.sessionId,REPORT_SCHEMA])).rows.length)
      throw new AppError('COACHING_REPORT_ALREADY_SAVED',409)
    await db.query("insert into app_private.coaching_session_records(id,account_id,scheme_key,model_key,status,current_phase,locale,planned_duration_seconds,prompt_version,method_version,persona_version,idempotency_key,started_at,completed_at) values($1,$2,$3,$4,'completed','complete',$5,$6,$3,$4,'unrecorded',$1,$7,$8) on conflict do nothing",[meta.id,actor.id,meta.schemeKey,meta.modelKey,input.locale,scheme.estimated_minutes*60,meta.startedAt,meta.completedAt])
    const record=(await db.query('select scheme_key,model_key,status,started_at,completed_at from app_private.coaching_session_records where id=$1 and account_id=$2 for update',[meta.id,actor.id])).rows[0]
    if(!record||record.scheme_key!==meta.schemeKey||record.model_key!==meta.modelKey||record.status!=='completed'||
      Date.parse(record.started_at)!==Date.parse(meta.startedAt)||Date.parse(record.completed_at)!==Date.parse(meta.completedAt))throw new AppError('COACHING_REPORT_SESSION_STATE_MISMATCH',409)
    await db.query("insert into app_private.coaching_session_consents(id,session_id,account_id,consent_type,accepted,policy_version,purpose,occurred_at) values($1,$2,$3,'report_storage',true,'coaching_report_storage_v1','save_reviewed_report',$4)",[randomUUID(),meta.id,actor.id,confirmedAt])
    await db.query("insert into app_private.coaching_reports(id,account_id,session_id,report_kind,authorship,schema_version,locale,status,report_ciphertext,evidence_manifest_ciphertext,content_hash,current_revision,generated_by,confirmed_at) values($1,$2,$3,'ai_coaching','ai',$4,$5,'confirmed',$6,$7,$8,1,'deterministic',$9)",[id,actor.id,meta.id,REPORT_SCHEMA,input.locale,currentCiphertext,currentEvidenceCiphertext,contentHash,confirmedAt])
    await db.query("insert into app_private.coaching_report_versions(id,report_id,account_id,revision,report_ciphertext,evidence_manifest_ciphertext,content_hash,change_reason,editor_kind,actor_account_id) values($1,$2,$3,1,$4,$5,$6,'client_confirmation','client',$3)",[versionId,id,actor.id,ciphertext,evidenceCiphertext,contentHash])
    await db.query("insert into app_private.coaching_report_receipts(account_id,operation_id,report_id,report_revision,request_fingerprint,state) values($1,$2,$3,1,$4,'saved')",[actor.id,input.operationId,id,fingerprint])
    return {id,revision:1,saved:true}
  })
}
export async function listCoachingReports(config,actor){
  return transaction(config,actor,async db=>{
    await activeAccount(db,actor)
    const rows=(await db.query(versionQuery+" where r.account_id=$1 and r.report_kind='ai_coaching' and r.schema_version=$3 and r.generated_by='deterministic' order by r.created_at desc,r.id limit $2",[actor.id,MAX_REPORTS+1,REPORT_SCHEMA])).rows
    if(rows.length>MAX_REPORTS)throw new AppError('COACHING_REPORT_LIMIT',409)
    return {reports:rows.map(row=>readVersion(row,actor,config))}
  })
}
export async function exportCoachingReports(config,actor){
  return transaction(config,actor,async db=>{
    await activeAccount(db,actor)
    const rows=(await db.query(versionQuery+' where r.account_id=$1 order by r.created_at desc,r.id limit $2',[actor.id,MAX_REPORTS+1])).rows
    if(rows.length>MAX_REPORTS||rows.some(row=>row.report_kind!=='ai_coaching'||row.schema_version!==REPORT_SCHEMA||row.generated_by!=='deterministic'))
      throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
    return {reports:rows.map(row=>readVersion(row,actor,config))}
  })
}
export async function readCoachingReport(config,actor,id){
  requireUUID(id)
  return transaction(config,actor,async db=>{
    await activeAccount(db,actor)
    const row=(await db.query(versionQuery+" where r.account_id=$1 and r.id=$2 and r.report_kind='ai_coaching' and r.schema_version=$3 and r.generated_by='deterministic'",[actor.id,id,REPORT_SCHEMA])).rows[0]
    if(!row)notFound()
    return {report:readVersion(row,actor,config)}
  })
}
const LIFE_PLAN_AREAS=new Set([
  'body_health','emotional_wellbeing','relationships','career_business',
  'finance','personal_growth','lifestyle','meaning_purpose',
])
const privateValue=(actor,id,field,value,config)=>seal(value,context(actor,id,field),config)
async function recordLifePlanChange(db,actor,config,{planId,entityId,entityKind,fromRevision,toRevision,changeKind,snapshot}){
  const changeId=randomUUID()
  const encrypted=privateValue(actor,changeId,'coaching.life_plan.change',snapshot,config)
  await db.query(
    "insert into app_private.coaching_life_plan_changes(id,plan_id,account_id,entity_kind,entity_id,from_revision,to_revision,change_kind,snapshot_ciphertext,changed_by,actor_account_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'client',$3)",
    [changeId,planId,actor.id,entityKind,entityId,fromRevision,toRevision,changeKind,encrypted]
  )
}
export async function importAcceptedReportActions(config,actor,reportId,input){
  requireUUID(reportId)
  onlyKeys(input,['areaKey','confirmed'])
  if(input.confirmed!==true)throw new AppError('COACHING_PLAN_IMPORT_CONFIRMATION_REQUIRED',400)
  if(!LIFE_PLAN_AREAS.has(input.areaKey))throw new AppError('COACHING_PLAN_AREA_INVALID',400)
  return transaction(config,actor,async db=>{
    await activeAccount(db,actor,true)
    const row=(await db.query(
      versionQuery+" where r.account_id=$1 and r.id=$2 and r.report_kind='ai_coaching' and r.schema_version=$3 and r.generated_by='deterministic' for update of r",
      [actor.id,reportId,REPORT_SCHEMA]
    )).rows[0]
    if(!row)notFound()
    const saved=readVersion(row,actor,config)
    const report=saved.report
    const consent=(await db.query(
      "select accepted,revoked_at from app_private.coaching_session_consents where account_id=$1 and session_id=$2 and consent_type='report_storage' order by occurred_at desc,id desc limit 1",
      [actor.id,row.session_id]
    )).rows[0]
    if(!consent?.accepted||consent.revoked_at)throw new AppError('COACHING_REPORT_CONSENT_REQUIRED',403)
    const candidates=report.actionCandidates.filter(item=>item.status==='accepted')
    if(!candidates.length)return {imported:false,count:0,reason:'NO_ACCEPTED_ACTIONS'}
    if(candidates.some(item=>item.origin!=='client_selected'||!item.acceptedAt||
      !item.sourceEvidenceIds.some(id=>report.evidence.some(ev=>ev.evidenceId===id&&
        ['client_confirmed_action','client_action_acceptance'].includes(ev.kind)&&
        ev.value===item.text&&ev.capturedAt===item.acceptedAt)))) {
      throw new AppError('COACHING_REPORT_ACTION_NOT_CONFIRMED',409)
    }

    const existing=(await db.query(
      'select a.id,a.source_action_key from app_private.coaching_action_items a where a.account_id=$1 and a.source_report_id=$2 order by a.id',
      [actor.id,reportId]
    )).rows
    if(existing.length){
      const acceptedKeys=new Set(candidates.map(item=>item.candidateId))
      if(existing.some(item=>!acceptedKeys.has(item.source_action_key))||existing.length!==candidates.length)
        throw new AppError('COACHING_PLAN_IMPORT_CONFLICT',409)
      return {imported:false,count:existing.length,alreadyImported:true,actionIds:existing.map(item=>item.id)}
    }

    const insertedPlan=(await db.query(
      "insert into app_private.coaching_life_plans(id,account_id,plan_version,status) values($1,$2,1,'active') on conflict(account_id) do nothing returning id,plan_version,status",
      [randomUUID(),actor.id]
    )).rows[0]
    const plan=insertedPlan||(await db.query(
      'select id,plan_version,status from app_private.coaching_life_plans where account_id=$1 for update',[actor.id]
    )).rows[0]
    if(!plan)throw new AppError('COACHING_LIFE_PLAN_UNAVAILABLE',503)
    if(plan.status!=='active')throw new AppError('COACHING_LIFE_PLAN_ARCHIVED',409)

    const insertedArea=(await db.query(
      "insert into app_private.coaching_life_plan_areas(id,plan_id,account_id,area_key,status,source_report_id) values($1,$2,$3,$4,'active',$5) on conflict(plan_id,area_key) do nothing returning id",
      [randomUUID(),plan.id,actor.id,input.areaKey,reportId]
    )).rows[0]
    const area=(await db.query(
      'select id,revision,status from app_private.coaching_life_plan_areas where plan_id=$1 and account_id=$2 and area_key=$3 for update',
      [plan.id,actor.id,input.areaKey]
    )).rows[0]
    if(!area||area.status!=='active')throw new AppError('COACHING_LIFE_AREA_UNAVAILABLE',409)

    const desired=report.outcome?.desiredResult?.text||report.outcome?.clientFocus?.text||'Coaching follow-up'
    const goalId=randomUUID()
    const goalTitle=privateValue(actor,goalId,'coaching.goal.title',desired,config)
    const goalOutcome=report.outcome?.desiredResult?.text
      ?privateValue(actor,goalId,'coaching.goal.desired_outcome',report.outcome.desiredResult.text,config):null
    await db.query(
      "insert into app_private.coaching_goals(id,area_id,account_id,source_session_id,source_report_id,title_ciphertext,desired_outcome_ciphertext,status,idempotency_key) values($1,$2,$3,$4,$5,$6,$7,'active',$8)",
      [goalId,area.id,actor.id,row.session_id,reportId,goalTitle,goalOutcome,randomUUID()]
    )

    const timing=report.sections?.followUp?.text||null
    const actionIds=[]
    for(const candidate of candidates){
      const actionId=randomUUID()
      const description=privateValue(actor,actionId,'coaching.action.description',candidate.text,config)
      const timingCiphertext=timing?privateValue(actor,actionId,'coaching.action.timing',timing,config):null
      const inserted=(await db.query(
        "insert into app_private.coaching_action_items(id,goal_id,account_id,source_session_id,source_report_id,source_action_key,description_ciphertext,timing_ciphertext,status,client_confirmed_at) values($1,$2,$3,$4,$5,$6,$7,$8,'accepted',$9) on conflict(source_report_id,source_action_key) do nothing returning id",
        [actionId,goalId,actor.id,row.session_id,reportId,candidate.candidateId,description,timingCiphertext,candidate.acceptedAt]
      )).rows[0]
      if(!inserted)throw new AppError('COACHING_PLAN_IMPORT_CONFLICT',409)
      actionIds.push(inserted.id)
    }

    const nextPlanRevision=plan.plan_version+1
    await db.query('update app_private.coaching_life_plans set plan_version=$2,updated_at=now() where id=$1 and account_id=$3',[plan.id,nextPlanRevision,actor.id])
    if(insertedPlan)await recordLifePlanChange(db,actor,config,{
      planId:plan.id,entityId:plan.id,entityKind:'plan',
      fromRevision:null,toRevision:1,changeKind:'created',
      snapshot:{planId:plan.id,sourceReportId:reportId},
    })
    await recordLifePlanChange(db,actor,config,{
      planId:plan.id,entityId:plan.id,entityKind:'plan',
      fromRevision:plan.plan_version,toRevision:nextPlanRevision,changeKind:'updated',
      snapshot:{sourceReportId:reportId,sourceSessionId:row.session_id,areaKey:input.areaKey,goalId,actionIds},
    })
    if(insertedArea)await recordLifePlanChange(db,actor,config,{
      planId:plan.id,entityId:area.id,entityKind:'area',fromRevision:null,toRevision:1,changeKind:'created',
      snapshot:{areaId:area.id,areaKey:input.areaKey,sourceReportId:reportId},
    })
    await recordLifePlanChange(db,actor,config,{
      planId:plan.id,entityId:goalId,entityKind:'goal',fromRevision:null,toRevision:1,changeKind:'created',
      snapshot:{goalId,areaKey:input.areaKey,sourceReportId:reportId,sourceSessionId:row.session_id},
    })
    for(const actionId of actionIds)await recordLifePlanChange(db,actor,config,{
      planId:plan.id,entityId:actionId,entityKind:'action',fromRevision:null,toRevision:1,changeKind:'created',
      snapshot:{actionId,goalId,sourceReportId:reportId,sourceSessionId:row.session_id},
    })
    return {imported:true,count:actionIds.length,goalId,actionIds,planId:plan.id,planRevision:nextPlanRevision,areaKey:input.areaKey}
  })
}

export async function deleteCoachingReport(config,actor,id,input){
  requireUUID(id);onlyKeys(input,['confirmed'])
  if(input.confirmed!==true)throw new AppError('COACHING_REPORT_CONFIRMATION_REQUIRED',400)
  return transaction(config,actor,async db=>{
    await activeAccount(db,actor,true)
    const deleted=(await db.query("delete from app_private.coaching_reports where account_id=$1 and id=$2 and report_kind='ai_coaching' and schema_version=$3 and generated_by='deterministic' returning id",[actor.id,id,REPORT_SCHEMA])).rows[0]
    if(!deleted)notFound()
    return {id,deleted:true}
  })
}
