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
    await db.query("insert into app_private.coaching_reports(id,account_id,session_id,report_kind,authorship,schema_version,locale,status,report_ciphertext,evidence_manifest_ciphertext,content_hash,current_revision,generated_by,confirmed_at) values($1,$2,$3,'ai_coaching','human',$4,$5,'confirmed',$6,$7,$8,1,'deterministic',$9)",[id,actor.id,meta.id,REPORT_SCHEMA,input.locale,currentCiphertext,currentEvidenceCiphertext,contentHash,confirmedAt])
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
