/**
 * QA event boundaries for My Coach. All publicly accepted events are user
 * intentions, never a declaration that coaching was effective or complete.
 * No transcripts, clinical data, LLM scores or arbitrary free-text payloads.
 */
import {COACH_INFORMATION_PERSONA_METHODS,COACH_METHOD_INFORMATION,
  COACH_INFORMATION_COVERAGE_VERSION} from './coach-information-coverage.mjs'

export const MY_COACH_QA_LEDGER_VERSION='hh-my-coach-qa-ledger-v1'
export const MY_COACH_QA_CONSENT_VERSION='hh-my-coach-qa-consent-v1'
export const MY_COACH_QA_STATUS=Object.freeze([
  'in_progress','summary_opened','client_stopped','technical_reported'
])
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i
const allowedEvents=new Set(['start','summary_opened','client_stopped','technical_reported','revoke'])
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const exactKeys=(value,allow)=>Object.keys(value).every(key=>allow.includes(key))

/** Strict same-origin/API request contract. Never accept client-authored coverage. */
export function normalizeMyCoachQaIntent(input){
  if(!isObject(input)||!allowedEvents.has(input.action)||!UUID.test(input.sessionId||''))
    throw Error('MY_COACH_QA_INPUT_INVALID')
  if(input.action==='start'){
    if(!exactKeys(input,['action','sessionId','personaId','locale','consentVersion','consent'])||
      input.consent!==true||input.consentVersion!==MY_COACH_QA_CONSENT_VERSION||
      !Object.hasOwn(COACH_INFORMATION_PERSONA_METHODS,input.personaId)||
      !['en','ru','es'].includes(input.locale))throw Error('MY_COACH_QA_INPUT_INVALID')
    return Object.freeze({action:'start',sessionId:input.sessionId,personaId:input.personaId,
      methodId:COACH_INFORMATION_PERSONA_METHODS[input.personaId],locale:input.locale,
      consentVersion:MY_COACH_QA_CONSENT_VERSION})
  }
  if(!exactKeys(input,['action','sessionId']))throw Error('MY_COACH_QA_INPUT_INVALID')
  return Object.freeze({action:input.action,sessionId:input.sessionId})
}

/**
 * Server-internal adapter only. Call with an audit produced by the SERVER
 * Director after a real authenticated turn, not request JSON or model text.
 * Never serialize quotes, labels, user messages or missing-signal details.
 */
export function distillServerCoachEvidence(audit,{personaId,methodId}={}){
  if(!isObject(audit)||audit.version!==COACH_INFORMATION_COVERAGE_VERSION||
     audit.source!=='client_quotes_and_director_signals'||audit.completionClaimAllowed!==false||
     audit.personaId!==personaId||audit.methodId!==methodId||
     COACH_INFORMATION_PERSONA_METHODS[personaId]!==methodId||
     !Array.isArray(audit.fields))throw Error('MY_COACH_QA_AUDIT_INVALID')
  const schema=COACH_METHOD_INFORMATION[methodId]
  if(!Array.isArray(schema)||audit.fields.length!==schema.length)throw Error('MY_COACH_QA_AUDIT_INVALID')
  const seen=new Set()
  const fields=audit.fields.map(item=>{
    if(!isObject(item)||!schema.some(def=>def.id===item.id)||seen.has(item.id)||
      !['supported','partial','missing'].includes(item.status))throw Error('MY_COACH_QA_AUDIT_INVALID')
    seen.add(item.id)
    const def=schema.find(def=>def.id===item.id)
    return Object.freeze({id:def.id,status:item.status,required:def.required})
  })
  if(fields.some((row,index)=>row.id!==schema[index].id))throw Error('MY_COACH_QA_AUDIT_INVALID')
  return Object.freeze(fields)
}

/**
 * Operational cohort rollup for explicit-consent server receipts. An unobserved
 * exit is unknown, not a failure, and an opened Summary is not a finished
 * coaching result. Show group metrics only with a sufficiently large sample.
 */
export function summarizeMyCoachQaCohort(rows,{minCount=20}={}){
  if(!Array.isArray(rows)||rows.length>5000||!Number.isInteger(minCount)||minCount<20)
    throw Error('MY_COACH_QA_AGGREGATE_INVALID')
  const grouped=new Map()
  for(const row of rows){
    // Consent alone is not a session. Require actual server-attested turn evidence.
    if(!isObject(row)||row.verified_turn_observed!==true)continue
    if(!isObject(row)||!Object.hasOwn(COACH_INFORMATION_PERSONA_METHODS,row.persona_id)||
      !MY_COACH_QA_STATUS.includes(row.status)||
      !['en','ru','es'].includes(row.locale)||
      COACH_INFORMATION_PERSONA_METHODS[row.persona_id]!==row.method_id)continue
    const algorithmVersion=typeof row.algorithm_version==='string'&&/^[A-Za-z][A-Za-z0-9._-]{1,79}$/.test(row.algorithm_version)?row.algorithm_version:'unknown'
    const key=[row.persona_id,row.method_id,row.locale,algorithmVersion].join('|')
    if(!grouped.has(key))grouped.set(key,{personaId:row.persona_id,methodId:row.method_id,
      locale:row.locale,algorithmVersion,observed:0,openedSummary:0,explicitStops:0,reportedTechnical:0,
      unresolved:0,coverageObserved:0,fields:new Map()})
    const group=grouped.get(key)
    group.observed++
    if(row.status==='summary_opened')group.openedSummary++
    if(row.status==='client_stopped')group.explicitStops++
    if(row.status==='technical_reported')group.reportedTechnical++
    if(row.status==='in_progress')group.unresolved++
    const defs=COACH_METHOD_INFORMATION[row.method_id]
    const evidence=row.evidence
    if(Array.isArray(evidence)&&evidence.length===defs.length&&
      defs.every((def,i)=>evidence[i]?.id===def.id&&evidence[i]?.required===def.required&&
        ['supported','partial','missing'].includes(evidence[i]?.status))){
      group.coverageObserved++
      for(const item of evidence){
        if(!group.fields.has(item.id))group.fields.set(item.id,{id:item.id,required:item.required,
          supported:0,partial:0,missing:0})
        group.fields.get(item.id)[item.status]++
      }
    }
  }
  return Object.freeze([...grouped.values()].map(group=>{
    const eligible=group.observed>=minCount
    return Object.freeze({personaId:group.personaId,methodId:group.methodId,locale:group.locale,algorithmVersion:group.algorithmVersion,
      observed:eligible?group.observed:null,comparisonReady:eligible,
      // Do not disclose small-cell breakdowns even to the UI component.
      ...(!eligible?{suppressed:true}:{
        suppressed:false,summaryOpenedPercent:Math.round(100*group.openedSummary/group.observed),
        explicitStopPercent:Math.round(100*group.explicitStops/group.observed),
        reportedTechnicalPercent:Math.round(100*group.reportedTechnical/group.observed),
        unresolvedPercent:Math.round(100*group.unresolved/group.observed),
        unresolvedCount:group.unresolved,coverageObservedCount:group.coverageObserved,
        fields:[...group.fields.values()].map(f=>Object.freeze({...f})),
      })})
  }).sort((a,b)=>a.personaId.localeCompare(b.personaId)||a.locale.localeCompare(b.locale)))
}
