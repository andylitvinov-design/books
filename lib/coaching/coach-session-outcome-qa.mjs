/**
 * Privacy-minimal, deterministic My Coach session outcome and information audit.
 * This module consumes ONLY trusted server lifecycle events and the existing
 * provisional method-specific client-evidence audit. No raw dialogue, quotes,
 * audio, sensitive topic labels, LLM judging, network or background tracking.
 *
 * A `supported` field is evidence-supported, NOT client-confirmed or semantically
 * verified. Public persona rankings, individual blame and clinical assessments
 * are deliberately out of scope.
 */
export const COACH_OUTCOME_QA_VERSION = 'hh-coach-outcome-qa-v1'
export const COACH_OUTCOME_QA_AUDIT_VERSION = 'hh-coach-information-coverage-v1'

// Pinned from method-specific information definitions (#5198). The key set is
// versioned and validated so an absent field cannot improve the denominator.
const f=(id,required=true)=>Object.freeze({id,required})
export const COACH_QA_METHOD_FIELDS=Object.freeze({
  grow:Object.freeze([f('goal'),f('motivation',false),f('situation'),f('obstacles'),f('resources',false),f('options_action')]),
  tgrow:Object.freeze([f('topic'),f('goal'),f('situation'),f('obstacles'),f('options'),f('action')]),
  woop:Object.freeze([f('wish'),f('outcome'),f('obstacle'),f('resources',false),f('if_then'),f('review')]),
  oskar:Object.freeze([f('outcome'),f('scale'),f('know_how'),f('motivation',false),f('action'),f('review')]),
  solution_focused:Object.freeze([f('future'),f('exceptions'),f('strengths'),f('motivation',false),f('experiment'),f('review')]),
  appreciative_inquiry:Object.freeze([f('discover'),f('values',false),f('dream'),f('design'),f('deliver'),f('review')]),
})
export const COACH_QA_PERSONA_METHODS=Object.freeze({
  mira:'grow',max:'tgrow',sofia:'solution_focused',alex:'tgrow',
  merlin:'appreciative_inquiry',harry:'oskar',
  lea:'appreciative_inquiry',noah:'woop',iris:'oskar',ray:'appreciative_inquiry',
})

const CLOSED=new Set(['completed_confirmed','completed_partial','client_stopped','abandoned','technical_failure','safety_handoff'])
const KNOWN_STATUSES=new Set([...CLOSED,'in_progress','paused','unknown'])
const TRUSTED_SOURCES=new Set(['trusted_server_event','human_verified'])
const EVENT_TYPES=new Set(['question_presented','answer_accepted','answer_skipped','client_confirmed','client_corrected','timebox_checkpoint'])
const IDENTIFIER=/^[a-z][a-z0-9_]{1,63}$/
const UUID=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i
const percent=(count,denom)=>denom>0?Math.round(count*100/denom):null
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const validId=x=>typeof x==='string'&&IDENTIFIER.test(x)
const validVersion=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9._-]{1,79}$/.test(x)
const freezeRows=rows=>Object.freeze(rows.map(row=>Object.freeze(row)))

function normalizeLifecycle(lifecycle){
  const value=isObj(lifecycle)?lifecycle:{}
  const observed=KNOWN_STATUSES.has(value.status)?value.status:'unknown'
  // A client-side close, an LLM statement or an inferred timeout must not be
  // allowed to certify a completed/abandoned session.
  const source=TRUSTED_SOURCES.has(value.source)?value.source:'unverified'
  const status=source==='unverified'?'unknown':observed
  return Object.freeze({status,source,isFinal:CLOSED.has(status),
    safetyExit:status==='safety_handoff',
    completionEligible:CLOSED.has(status)&&status!=='safety_handoff',
    nonCompletion:status==='client_stopped'||status==='abandoned'||status==='technical_failure',
    incompleteOutcome:status==='completed_partial'||status==='client_stopped'||status==='abandoned'||status==='technical_failure',
    unexpectedExit:status==='abandoned'||status==='technical_failure'})
}

function normalizeEvents(events,fields){
  if(events==null)return []
  if(!Array.isArray(events)||events.length>240)throw Error('COACH_QA_EVENTS_INVALID')
  const names=new Set(fields.map(x=>x.id))
  return events.map(event=>{
    if(!isObj(event)||!EVENT_TYPES.has(event.type)||event.source!=='trusted_server_event'||
      (event.fieldId!==undefined&&(!validId(event.fieldId)||!names.has(event.fieldId))))
      throw Error('COACH_QA_EVENTS_INVALID')
    return {type:event.type,fieldId:event.fieldId||null}
  })
}

function rootCause({status,events,lifecycle}){
  if(status.value==='supported')return {code:null,confidence:'not_needed',recommendation:null}
  const fieldEvents=events.filter(x=>x.fieldId===null||x.fieldId===status.id)
  const has=type=>fieldEvents.some(x=>x.type===type)
  if(has('answer_skipped'))return {code:'client_declined',confidence:'observed',recommendation:'respect_skip'}
  if(lifecycle.status==='technical_failure')return {code:'technical_interruption',confidence:'observed',recommendation:'repair_voice_or_network'}
  if(lifecycle.status==='safety_handoff')return {code:'safety_handoff',confidence:'observed',recommendation:'safety_first'}
  if(lifecycle.status==='client_stopped')return {code:'client_chose_to_stop',confidence:'observed',recommendation:'respect_client_boundary'}
  if(has('client_corrected'))return {code:'needs_reconfirmation',confidence:'observed',recommendation:'clarify_after_correction'}
  if(status.value==='partial')return {code:'insufficient_evidence',confidence:'observed',recommendation:'ask_one_relevant_follow_up'}
  if(!has('question_presented'))return {code:'not_asked',confidence:'observed',recommendation:'inspect_authorized_stage'}
  if(!has('answer_accepted'))return {code:'asked_without_accepted_answer',confidence:'observed',recommendation:'review_question_clarity'}
  return {code:'unverified_answer',confidence:'needs_human_review',recommendation:'review_evidence_relevance'}
}

/**
 * One reviewable, private, text-free QA receipt. `audit` must be sourced from
 * the existing server Director's current-topic client evidence, never from a
 * browser-supplied percent, assistant utterance or provider-generated score.
 */
export function evaluateCoachSessionOutcome({sessionId,personaId,methodId,locale='en',
  modelVersion='unknown',lifecycle={},audit=null,fieldEvents=[]}={}){
  if(!UUID.test(sessionId||'')||!validId(personaId)||!validId(methodId)||
    !Object.hasOwn(COACH_QA_METHOD_FIELDS,methodId)||
    !['en','ru','es'].includes(locale)||!validVersion(modelVersion))throw Error('COACH_QA_INPUT_INVALID')
  if(COACH_QA_PERSONA_METHODS[personaId]!==methodId)throw Error('COACH_QA_METHOD_MISMATCH')
  const fieldsDef=COACH_QA_METHOD_FIELDS[methodId]
  const state=normalizeLifecycle(lifecycle)
  const events=normalizeEvents(fieldEvents,fieldsDef)
  const auditUsable=isObj(audit)&&audit.version===COACH_OUTCOME_QA_AUDIT_VERSION&&
    audit.personaId===personaId&&audit.methodId===methodId&&
    audit.source==='client_quotes_and_director_signals'&&
    audit.completionClaimAllowed===false&&Array.isArray(audit.fields)&&audit.fields.length<=10
  const byId=new Map()
  if(auditUsable){
    for(const row of audit.fields){
      if(!isObj(row)||!validId(row.id)||byId.has(row.id)||
        !['supported','partial','missing'].includes(row.status))
        throw Error('COACH_QA_AUDIT_INVALID')
      byId.set(row.id,row)
    }
    if([...byId.keys()].some(id=>!fieldsDef.some(field=>field.id===id)))
      throw Error('COACH_QA_AUDIT_INVALID')
  }
  const hasSkipped=id=>events.some(row=>row.type==='answer_skipped'&&row.fieldId===id)
  const fields=fieldsDef.map(def=>{
    const raw=auditUsable?byId.get(def.id):null
    const declined=def.required&&hasSkipped(def.id)&&raw?.status!=='supported'
    const status=declined?'declined':raw?.status||'unknown'
    const base={id:def.id,required:def.required,status}
    const diagnosis=(!def.required||status==='supported'||status==='unknown')
      ?{code:null,confidence:'not_needed',recommendation:null}
      :rootCause({status:{id:def.id,value:status},events,lifecycle:state})
    // Explicit refusal never becomes a coaching failure or missing evidence.
    return Object.freeze({...base,reasonCode:diagnosis.code,
      reasonConfidence:diagnosis.confidence,recommendationCode:diagnosis.recommendation,
      clientConfirmed:status==='supported'&&events.some(e=>e.type==='client_confirmed'&&e.fieldId===def.id)})
  })
  const required=fields.filter(x=>x.required)
  const declined=required.filter(x=>x.status==='declined').length
  const eligible=required.length-declined
  const supported=required.filter(x=>x.status==='supported').length
  const partial=required.filter(x=>x.status==='partial').length
  const missing=required.filter(x=>x.status==='missing').length
  const unknown=required.filter(x=>x.status==='unknown').length
  const confirmed=required.filter(x=>x.clientConfirmed).length
  const coverage=Object.freeze({
    status:auditUsable?'provisional':'unknown',
    totalRequired:required.length,eligibleRequired:auditUsable?eligible:null,
    supported:auditUsable?supported:null,partial:auditUsable?partial:null,
    missing:auditUsable?missing:null,declined:auditUsable?declined:null,
    unknown:auditUsable?unknown:null,clientConfirmed:auditUsable?confirmed:null,
    evidenceCoveragePercent:auditUsable&&unknown===0?percent(supported,eligible):null,
    partialEvidencePercent:auditUsable&&unknown===0?percent(partial,eligible):null,
    confirmedPercent:auditUsable&&unknown===0?percent(confirmed,eligible):null,
  })
  const gaps=fields.filter(x=>x.required&&['missing','partial'].includes(x.status))
    .map(x=>({id:x.id,status:x.status,reasonCode:x.reasonCode,
      reasonConfidence:x.reasonConfidence,recommendationCode:x.recommendationCode}))
  return Object.freeze({
    schemaVersion:COACH_OUTCOME_QA_VERSION,sessionId,personaId,methodId,locale,modelVersion,
    lifecycle:state,coverage,fields:Object.freeze(fields),gaps:freezeRows(gaps),
    reviewRequired:state.status==='unknown'||(state.isFinal&&(!auditUsable||gaps.length>0||
      coverage.clientConfirmed<coverage.eligibleRequired||state.incompleteOutcome)),
    privacy:Object.freeze({transcriptStored:false,answerTextIncluded:false,
      audioStored:false,fieldsContainNoQuotes:true,privateSessionId:true}),
  })
}

/**
 * Owner-only cohort rollup. The output cannot contain session IDs, quotes,
 * client identity or individual report links. Never expose these as public
 * coach ratings; comparisons are invalid below the minimum verified sample.
 */
export function aggregateCoachSessionOutcomes(receipts=[],{minSampleSize=20}={}){
  if(!Array.isArray(receipts)||!Number.isInteger(minSampleSize)||minSampleSize<5)
    throw Error('COACH_QA_AGGREGATE_INVALID')
  const groups=new Map()
  const seenSessions=new Set()
  let duplicateReceiptCount=0
  const uniqueReceipts=[]
  for(const r of receipts){
    if(!isObj(r)||r.schemaVersion!==COACH_OUTCOME_QA_VERSION||!validId(r.personaId)||
      !validId(r.methodId)||!isObj(r.lifecycle)||!isObj(r.coverage)||!Array.isArray(r.fields))
      throw Error('COACH_QA_AGGREGATE_INVALID')
    if(!UUID.test(r.sessionId||''))throw Error('COACH_QA_AGGREGATE_INVALID')
    if(seenSessions.has(r.sessionId)){duplicateReceiptCount++;continue}
    seenSessions.add(r.sessionId)
    uniqueReceipts.push(r)
    const key=[r.personaId,r.methodId,r.locale,r.modelVersion].join('|')
    if(!groups.has(key))groups.set(key,[])
    groups.get(key).push(r)
  }
  const one=rows=>{
    const relevant=rows.filter(r=>r.lifecycle.completionEligible)
    const bad=relevant.filter(r=>r.lifecycle.nonCompletion)
    const incomplete=relevant.filter(r=>r.lifecycle.incompleteOutcome)
    const closed=relevant.filter(r=>r.lifecycle.status==='completed_partial'||r.lifecycle.status==='completed_confirmed')
    const unexpected=relevant.filter(r=>r.lifecycle.unexpectedExit)
    const confirmed=relevant.filter(r=>r.lifecycle.status==='completed_confirmed')
    const counted=rows.filter(r=>r.lifecycle.completionEligible&&r.coverage.status==='provisional'&&
      Number.isInteger(r.coverage.eligibleRequired)&&
      Number.isInteger(r.coverage.supported)&&r.coverage.unknown===0)
    const totalFields=counted.reduce((a,r)=>a+r.coverage.eligibleRequired,0)
    const supportedFields=counted.reduce((a,r)=>a+r.coverage.supported,0)
    const partlyFields=counted.reduce((a,r)=>a+r.coverage.partial,0)
    const reasonCounts={},fieldGaps={}
    for(const r of counted)for(const field of r.fields){
      if(!field.required||!['missing','partial'].includes(field.status))continue
      fieldGaps[field.id]??={missing:0,partial:0,reasons:{}}
      fieldGaps[field.id][field.status]++
      const code=field.reasonCode||'unclassified'
      reasonCounts[code]=(reasonCounts[code]||0)+1
      fieldGaps[field.id].reasons[code]=(fieldGaps[field.id].reasons[code]||0)+1
    }
    return {
      startedCount:rows.length,terminalCount:rows.filter(r=>r.lifecycle.isFinal).length,
      eligibleTerminalCount:relevant.length,
      pendingCount:rows.filter(r=>!r.lifecycle.isFinal).length,
      safetyHandoffCount:rows.filter(r=>r.lifecycle.safetyExit).length,
      unverifiedLifecycleCount:rows.filter(r=>r.lifecycle.source==='unverified').length,
      completedConfirmedCount:confirmed.length,completedPartialCount:relevant.filter(r=>r.lifecycle.status==='completed_partial').length,
      clientStoppedCount:relevant.filter(r=>r.lifecycle.status==='client_stopped').length,
      abandonedCount:relevant.filter(r=>r.lifecycle.status==='abandoned').length,
      technicalFailureCount:relevant.filter(r=>r.lifecycle.status==='technical_failure').length,
      notFinishedCount:bad.length,unexpectedExitCount:unexpected.length,
      incompleteOutcomeCount:incomplete.length,reachedCloseoutCount:closed.length,
      notFinishedPercent:percent(bad.length,relevant.length),
      incompleteOutcomePercent:percent(incomplete.length,relevant.length),
      reachedCloseoutPercent:percent(closed.length,relevant.length),
      unexpectedExitPercent:percent(unexpected.length,relevant.length),
      fullyCompletedPercent:percent(confirmed.length,relevant.length),
      evaluatedCoverageSessionCount:counted.length,
      evidenceCoveragePercent:percent(supportedFields,totalFields),
      partialEvidencePercent:percent(partlyFields,totalFields),
      totalEvaluatedRequiredFields:totalFields,
      fieldGaps,reasonCounts,
    }
  }
  const overall=one(uniqueReceipts)
  const byCoach=[]
  for(const [key,rows] of groups){
    const [personaId,methodId,locale,modelVersion]=key.split('|')
    const stats=one(rows)
    byCoach.push({personaId,methodId,locale,modelVersion,...stats,
      comparisonReady:stats.eligibleTerminalCount>=minSampleSize&&
        stats.evaluatedCoverageSessionCount>=minSampleSize})
  }
  byCoach.sort((a,b)=>a.personaId.localeCompare(b.personaId)||a.locale.localeCompare(b.locale))
  return Object.freeze({schemaVersion:COACH_OUTCOME_QA_VERSION,
    ...overall,duplicateReceiptCount,byCoach:Object.freeze(byCoach),minSampleSize,
    privacy:Object.freeze({sessionIdsIncluded:false,clientIdentifiersIncluded:false,
      answerTextIncluded:false,publicRankingAllowed:false})})
}
