import 'server-only'
import {transaction} from './database.js'
import {AppError} from '../assessments/contracts.js'
import {COACH_INFORMATION_COVERAGE_VERSION} from '../coaching/coach-information-coverage.mjs'
import {MY_COACH_QA_LEDGER_VERSION,normalizeMyCoachQaIntent,
  distillServerCoachEvidence,summarizeMyCoachQaCohort} from '../coaching/my-coach-qa-ingest.mjs'

/**
 * Called only after createRequestAuth().verified() and requireSameOrigin().
 * A browser requests start/stop/revoke, never fabricates method, coverage or
 * completion. Verified model/Director data is a different server-only entry.
 */
export async function recordMyCoachQaIntent(config,actor,raw){
  const input=normalizeMyCoachQaIntent(raw)
  return transaction(config,actor,async db=>{
    if(input.action==='start'){
      await db.query(`insert into app_private.my_coach_qa_sessions
        (account_id,session_id,persona_id,method_id,locale,consent_version,algorithm_version)
        values ($1,$2,$3,$4,$5,$6,$7) on conflict(account_id,session_id) do nothing`,
        [actor.id,input.sessionId,input.personaId,input.methodId,input.locale,input.consentVersion,COACH_INFORMATION_COVERAGE_VERSION])
    }
    if(input.action==='revoke'){
      const result=await db.query(`delete from app_private.my_coach_qa_sessions
        where account_id=$1 and session_id=$2`,[actor.id,input.sessionId])
      return {schema:MY_COACH_QA_LEDGER_VERSION,deleted:true,removed:Number(result.rowCount)===1}
    }
    const found=(await db.query(`select persona_id,method_id,locale,status from app_private.my_coach_qa_sessions
      where account_id=$1 and session_id=$2 for update`,[actor.id,input.sessionId])).rows[0]
    if(!found)throw new AppError('MY_COACH_QA_NOT_FOUND',404)
    if(input.action==='start'){
      if(found.persona_id!==input.personaId||found.method_id!==input.methodId||found.locale!==input.locale)
        throw new AppError('MY_COACH_QA_CONFLICT',409)
      return {schema:MY_COACH_QA_LEDGER_VERSION,saved:true,status:found.status}
    }
    const status=input.action
    if(found.status==='in_progress'){
      await db.query(`update app_private.my_coach_qa_sessions
        set status=$3,status_at=now(),updated_at=now()
        where account_id=$1 and session_id=$2 and status='in_progress'`,
        [actor.id,input.sessionId,status])
      return {schema:MY_COACH_QA_LEDGER_VERSION,saved:true,status}
    }
    // Once Summary was opened, leaving it is NOT a new abandonment.
    if(found.status===status||found.status==='summary_opened')
      return {schema:MY_COACH_QA_LEDGER_VERSION,saved:true,status:found.status}
    throw new AppError('MY_COACH_QA_ALREADY_CLOSED',409)
  })
}

/** NEVER expose as a client-accessible API or accept an audit from request JSON. */
export async function recordMyCoachServerAudit(config,actor,{sessionId,personaId,methodId,audit}){
  const fields=distillServerCoachEvidence(audit,{personaId,methodId})
  return transaction(config,actor,async db=>{
    const result=await db.query(`update app_private.my_coach_qa_sessions
      set evidence=$5::jsonb,evidence_observed_at=now(),verified_turn_observed=true,updated_at=now()
      where account_id=$1 and session_id=$2 and persona_id=$3 and method_id=$4
        and status='in_progress'`,[actor.id,sessionId,personaId,methodId,JSON.stringify(fields)])
    // No consented row => no quality data is recorded. Do not create one here.
    return {recorded:Number(result.rowCount)===1}
  })
}

/** Owner-only caller MUST pass requireAdminRequest() first. */
export async function readOwnerMyCoachQa(config){
  return transaction(config,null,async db=>{
    await db.query("select set_config('hh.my_coach_qa_admin','owner_verified',true)")
    const result=await db.query(`select persona_id,method_id,locale,algorithm_version,status,evidence,verified_turn_observed
      from app_private.my_coach_qa_sessions
      where consented_at>=now()-interval '30 days' and verified_turn_observed=true
      order by consented_at desc limit 5000`)
    return {schema:MY_COACH_QA_LEDGER_VERSION,windowDays:30,
      observedRows:result.rows.length,truncated:result.rows.length===5000,
      cohorts:summarizeMyCoachQaCohort(result.rows)}
  },{server:true})
}
