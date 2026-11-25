import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COACH_OUTCOME_QA_VERSION,COACH_QA_METHOD_FIELDS,COACH_QA_PERSONA_METHODS,
  evaluateCoachSessionOutcome,aggregateCoachSessionOutcomes
} from '../lib/coaching/coach-session-outcome-qa.mjs'

const ID='dddddddd-1111-4111-8111-eeeeeeeeeeee'
const defs=(method,missing=[],partial=[],optionalMissing=[])=>COACH_QA_METHOD_FIELDS[method].map(row=>({
  id:row.id,required:row.required,
  status:missing.includes(row.id)||optionalMissing.includes(row.id)?'missing':
    partial.includes(row.id)?'partial':'supported',
  quote:'SENSITIVE client quotation must never escape this receipt',
  label:{ru:'Секретная надпись'}
}))
const audit=(personaId='mira',methodId='grow',missing=[],partial=[],optionalMissing=[])=>({
  version:'hh-coach-information-coverage-v1',personaId,methodId,
  source:'client_quotes_and_director_signals',completionClaimAllowed:false,
  fields:defs(methodId,missing,partial,optionalMissing)
})
const record=(personaId='mira',methodId='grow',opts={})=>evaluateCoachSessionOutcome({
  sessionId:ID,personaId,methodId,locale:'ru',modelVersion:'hh-director-v4.2',
  lifecycle:{status:'completed_confirmed',source:'trusted_server_event'},
  audit:audit(personaId,methodId),...opts
})

for(const [personaId,methodId] of Object.entries(COACH_QA_PERSONA_METHODS)){
  test(`${personaId}: method-specific six data fields, complete evidence`,()=>{
    const result=record(personaId,methodId)
    assert.equal(result.fields.length,6)
    assert.equal(result.methodId,methodId)
    assert.equal(result.coverage.evidenceCoveragePercent,100)
    assert.equal(result.coverage.totalRequired,COACH_QA_METHOD_FIELDS[methodId].filter(f=>f.required).length)
  })
}

test('scoring distinguishes supported, partial and missing, optional fields cannot lower the denominator',()=>{
  const result=record('mira','grow',{audit:audit('mira','grow',['obstacles'],['situation'],['motivation','resources'])})
  assert.deepEqual([result.coverage.supported,result.coverage.partial,result.coverage.missing,result.coverage.eligibleRequired],[2,1,1,4])
  assert.equal(result.coverage.evidenceCoveragePercent,50)
  assert.equal(result.coverage.partialEvidencePercent,25)
  assert.deepEqual(result.gaps.map(g=>g.id),['situation','obstacles'])
  assert.equal(result.fields.some(f=>'quote' in f||'label' in f),false)
  assert.equal(JSON.stringify(result).includes('SENSITIVE'),false)
})

test('unverified lifecycle cannot invent a finished session or a drop-off',()=>{
  const result=record('mira','grow',{lifecycle:{status:'abandoned',source:'browser'}})
  assert.equal(result.lifecycle.status,'unknown')
  assert.equal(result.lifecycle.isFinal,false)
  assert.equal(result.lifecycle.completionEligible,false)
  assert.equal(aggregateCoachSessionOutcomes([result]).notFinishedPercent,null)
})

test('provisional field support is never client confirmation',()=>{
  const result=record('max','tgrow')
  assert.equal(result.coverage.clientConfirmed,0)
  assert.equal(result.coverage.confirmedPercent,0)
  assert.equal(result.reviewRequired,true)
  const confirmed=record('max','tgrow',{fieldEvents:[
    {type:'client_confirmed',fieldId:'goal',source:'trusted_server_event'},
  ]})
  assert.equal(confirmed.coverage.clientConfirmed,1)
})

test('explicit skip does not become a coach fault, and is excluded transparently',()=>{
  const result=record('max','tgrow',{
    audit:audit('max','tgrow',['obstacles']),
    fieldEvents:[{type:'answer_skipped',fieldId:'obstacles',source:'trusted_server_event'}]
  })
  assert.equal(result.coverage.declined,1)
  assert.equal(result.coverage.eligibleRequired,5)
  assert.equal(result.coverage.evidenceCoveragePercent,100)
  assert.equal(result.fields.find(f=>f.id==='obstacles').reasonCode,'client_declined')
})

test('technical failure, client stopping and safety exit are separate, not assigned to coach',()=>{
  const lifecycle=status=>({status,source:'trusted_server_event'})
  const receipts=['technical_failure','client_stopped','safety_handoff','abandoned','completed_partial','completed_confirmed']
    .map((status,i)=>record('sofia','solution_focused',{sessionId:`dddddddd-1111-4111-8111-${String(i).padStart(12,'0')}`,lifecycle:lifecycle(status)}))
  const roll=aggregateCoachSessionOutcomes(receipts)
  assert.equal(roll.startedCount,6)
  assert.equal(roll.eligibleTerminalCount,5) // a valid safety handoff is not a failed coaching session
  assert.equal(roll.safetyHandoffCount,1)
  assert.equal(roll.notFinishedCount,3)
  assert.equal(roll.notFinishedPercent,60)
  assert.equal(roll.incompleteOutcomeCount,4)
  assert.equal(roll.incompleteOutcomePercent,80)
  assert.equal(roll.reachedCloseoutCount,2)
  assert.equal(roll.reachedCloseoutPercent,40)
  assert.equal(roll.unexpectedExitCount,2)
  assert.equal(roll.unexpectedExitPercent,40)
  assert.equal(roll.clientStoppedCount,1)
  assert.equal(roll.technicalFailureCount,1)
})

test('missing field with no observed question identifies an inspectable process gap',()=>{
  const r=record('harry','oskar',{audit:audit('harry','oskar',['scale'])})
  assert.equal(r.gaps[0].id,'scale')
  assert.equal(r.gaps[0].reasonCode,'not_asked')
  assert.equal(r.gaps[0].reasonConfidence,'observed')
  assert.equal(r.gaps[0].recommendationCode,'inspect_authorized_stage')
})

test('asked field without accepted answer differs from a missing question',()=>{
  const r=record('harry','oskar',{
    audit:audit('harry','oskar',['scale']),
    fieldEvents:[{type:'question_presented',fieldId:'scale',source:'trusted_server_event'}]
  })
  assert.equal(r.gaps[0].reasonCode,'asked_without_accepted_answer')
  assert.equal(r.gaps[0].recommendationCode,'review_question_clarity')
})

test('unavailable method audit is unknown rather than 0% coverage',()=>{
  const r=record('mira','grow',{audit:null})
  assert.equal(r.coverage.status,'unknown')
  assert.equal(r.coverage.evidenceCoveragePercent,null)
  assert.equal(r.reviewRequired,true)
  const roll=aggregateCoachSessionOutcomes([r])
  assert.equal(roll.evidenceCoveragePercent,null)
  assert.equal(roll.evaluatedCoverageSessionCount,0)
})

test('partial/missing method audit cannot silently erase mandatory fields',()=>{
  const a=audit('mira','grow');a.fields=a.fields.filter(row=>row.id!=='obstacles')
  const r=record('mira','grow',{audit:a})
  assert.equal(r.coverage.unknown,1)
  assert.equal(r.coverage.evidenceCoveragePercent,null)
})

test('unsafe provenance and spoofed method cannot count',()=>{
  assert.equal(record('mira','grow',{audit:{...audit(),source:'browser'}}).coverage.evidenceCoveragePercent,null)
  assert.throws(()=>record('mira','tgrow'),/METHOD_MISMATCH/)
  assert.throws(()=>record('mira','grow',{fieldEvents:[{type:'client_confirmed',fieldId:'goal',source:'browser'}]}),/EVENTS_INVALID/)
  assert.throws(()=>record('mira','grow',{audit:{...audit(),fields:[...audit().fields,audit().fields[0]]}}),/AUDIT_INVALID/)
})

test('rolled up by persona / method / locale / version without identifiable session or raw client text',()=>{
  const r1=record('mira','grow',{audit:audit('mira','grow',['situation'])})
  const r2=record('max','tgrow',{sessionId:'dddddddd-1111-4111-8111-000000000001'})
  const roll=aggregateCoachSessionOutcomes([r1,r2])
  assert.equal(roll.byCoach.length,2)
  assert.equal(roll.byCoach.every(r=>r.comparisonReady===false),true)
  assert.equal(roll.privacy.sessionIdsIncluded,false)
  assert.equal(roll.byCoach[0].schemaVersion,undefined)
  assert.equal(JSON.stringify(roll).includes(ID),false)
  assert.equal(JSON.stringify(roll).includes('SENSITIVE'),false)
})

test('small samples are not advertised as comparable even when every session is perfect',()=>{
  const r=record('merlin','appreciative_inquiry')
  const unique = Array.from({length:20},(_,i)=>({...r, sessionId:`dddddddd-1111-4111-8111-${String(i).padStart(12,'0')}`}))
  const small=aggregateCoachSessionOutcomes(unique.slice(0,19))
  const enough=aggregateCoachSessionOutcomes(unique)
  assert.equal(small.byCoach[0].comparisonReady,false)
  assert.equal(enough.byCoach[0].comparisonReady,true)
  assert.equal(small.schemaVersion,COACH_OUTCOME_QA_VERSION)
})

test('retrying the same session cannot inflate success rates or satisfy a sample size gate',()=>{
  const r=record('max','tgrow')
  const repeated=aggregateCoachSessionOutcomes(Array.from({length:50},()=>r))
  assert.equal(repeated.startedCount,1)
  assert.equal(repeated.duplicateReceiptCount,49)
  assert.equal(repeated.byCoach[0].comparisonReady,false)
})

test('unverified browser closeout or in-progress data never pollutes terminal information coverage',()=>{
  const noTrust=record('mira','grow',{lifecycle:{status:'completed_confirmed',source:'browser'}})
  const ongoing=record('max','tgrow',{lifecycle:{status:'in_progress',source:'trusted_server_event'},sessionId:'dddddddd-1111-4111-8111-000000000001'})
  const summary=aggregateCoachSessionOutcomes([noTrust,ongoing])
  assert.equal(summary.startedCount,2)
  assert.equal(summary.eligibleTerminalCount,0)
  assert.equal(summary.evaluatedCoverageSessionCount,0)
  assert.equal(summary.evidenceCoveragePercent,null)
})
