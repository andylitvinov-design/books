import test from 'node:test'
import assert from 'node:assert/strict'
import {MY_COACH_QA_LEDGER_VERSION,MY_COACH_QA_CONSENT_VERSION,
  normalizeMyCoachQaIntent,distillServerCoachEvidence,summarizeMyCoachQaCohort}
  from '../lib/coaching/my-coach-qa-ingest.mjs'
import {COACH_METHOD_INFORMATION,COACH_INFORMATION_PERSONA_METHODS,
  COACH_INFORMATION_COVERAGE_VERSION} from '../lib/coaching/coach-information-coverage.mjs'
const id='a1222222-3333-4444-8555-666666666666'
const verified=rows=>rows.map(row=>({...row,verified_turn_observed:true}))
const consent={action:'start',sessionId:id,personaId:'mira',locale:'ru',consent:true,
  consentVersion:MY_COACH_QA_CONSENT_VERSION}
const audit=(personaId='mira',methodId='grow')=>({version:COACH_INFORMATION_COVERAGE_VERSION,
  source:'client_quotes_and_director_signals',completionClaimAllowed:false,
  personaId,methodId,fields:COACH_METHOD_INFORMATION[methodId].map(item=>({id:item.id,
    status:'supported',quote:'PRIVATE TEXT',label:{ru:'PRIVATE TITLE'},required:item.required}))})

test('consent only and no client-configured methods',()=>{
  const parsed=normalizeMyCoachQaIntent(consent)
  assert.deepEqual(parsed,{action:'start',sessionId:id,personaId:'mira',methodId:'grow',locale:'ru',
    consentVersion:MY_COACH_QA_CONSENT_VERSION})
  assert.throws(()=>normalizeMyCoachQaIntent({...consent,consent:false}),/INVALID/)
  assert.throws(()=>normalizeMyCoachQaIntent({...consent,methodId:'tgrow'}),/INVALID/)
  assert.throws(()=>normalizeMyCoachQaIntent({...consent,transcript:'PRIVATE'}),/INVALID/)
  assert.throws(()=>normalizeMyCoachQaIntent({...consent,consentVersion:'v0'}),/INVALID/)
  assert.equal(MY_COACH_QA_LEDGER_VERSION,'hh-my-coach-qa-ledger-v1')
})

test('close and revoke actions carry no private/client-authored scores',()=>{
  for(const action of ['summary_opened','client_stopped','technical_reported','revoke']){
    assert.deepEqual(normalizeMyCoachQaIntent({action,sessionId:id}),{action,sessionId:id})
    assert.throws(()=>normalizeMyCoachQaIntent({action,sessionId:id,coveragePercent:100}),/INVALID/)
  }
})

for(const [personaId,methodId] of Object.entries(COACH_INFORMATION_PERSONA_METHODS)){
  test(`${personaId}: server audit keeps six statuses but never a client quote`,()=>{
    const rows=distillServerCoachEvidence(audit(personaId,methodId),{personaId,methodId})
    assert.equal(rows.length,6)
    assert.equal(JSON.stringify(rows).includes('PRIVATE'),false)
    assert.equal(rows.filter(x=>x.required).length,COACH_METHOD_INFORMATION[methodId].filter(x=>x.required).length)
  })
}

test('untrusted/partial/reshuffled audit cannot pass as verified server input',()=>{
  assert.throws(()=>distillServerCoachEvidence({...audit(),source:'browser'},{personaId:'mira',methodId:'grow'}),/AUDIT_INVALID/)
  assert.throws(()=>distillServerCoachEvidence({...audit(),fields:audit().fields.slice(1)},{personaId:'mira',methodId:'grow'}),/AUDIT_INVALID/)
  assert.throws(()=>distillServerCoachEvidence({...audit(),fields:audit().fields.reverse()},{personaId:'mira',methodId:'grow'}),/AUDIT_INVALID/)
  assert.throws(()=>distillServerCoachEvidence(audit(),{personaId:'max',methodId:'tgrow'}),/AUDIT_INVALID/)
})

test('small cohorts hide all sensitive breakdowns',()=>{
  const rows=Array.from({length:19},()=>({persona_id:'mira',method_id:'grow',locale:'en',status:'client_stopped'}))
  const results=summarizeMyCoachQaCohort(verified(rows))
  assert.equal(results[0].observed,null)
  assert.equal(results[0].suppressed,true)
  assert.equal(results[0].explicitStopPercent,undefined)
  assert.equal(results[0].fields,undefined)
})

test('unknown exits are not called abandonment, Summary is not success',()=>{
  const rows=[...Array.from({length:12},()=>({persona_id:'mira',method_id:'grow',locale:'en',status:'in_progress'})),
    ...Array.from({length:4},()=>({persona_id:'mira',method_id:'grow',locale:'en',status:'summary_opened'})),
    ...Array.from({length:3},()=>({persona_id:'mira',method_id:'grow',locale:'en',status:'client_stopped'})),
    {persona_id:'mira',method_id:'grow',locale:'en',status:'technical_reported'}]
  const results=summarizeMyCoachQaCohort(verified(rows))
  assert.equal(results[0].comparisonReady,true)
  assert.equal(results[0].summaryOpenedPercent,20)
  assert.equal(results[0].explicitStopPercent,15)
  assert.equal(results[0].reportedTechnicalPercent,5)
  assert.equal(results[0].unresolvedCount,12)
  assert.equal(results[0].unresolvedPercent,60)
  assert.equal(Object.hasOwn(results[0],'abandonmentPercent'),false)
  assert.equal(Object.hasOwn(results[0],'successPercent'),false)
})

test('validated field statuses aggregate as counts without quotations',()=>{
  const fields=distillServerCoachEvidence(audit(),{personaId:'mira',methodId:'grow'})
  const rows=Array.from({length:20},()=>({persona_id:'mira',method_id:'grow',locale:'ru',
    status:'summary_opened',evidence:fields}))
  const group=summarizeMyCoachQaCohort(verified(rows))[0]
  assert.equal(group.coverageObservedCount,20)
  assert.equal(group.fields.length,6)
  assert.equal(group.fields.every(x=>x.supported===20),true)
  assert.equal(JSON.stringify(group).includes('PRIVATE'),false)
})


test('algorithm versions stay separate; no comparisons across upgrades',()=>{
  const a=Array.from({length:20},()=>({persona_id:'alex',method_id:'tgrow',locale:'en',
    status:'summary_opened',algorithm_version:'director-v4'}))
  const b=Array.from({length:20},()=>({persona_id:'alex',method_id:'tgrow',locale:'en',
    status:'client_stopped',algorithm_version:'director-v5'}))
  const groups=summarizeMyCoachQaCohort(verified([...a,...b]))
  assert.equal(groups.length,2)
  assert.deepEqual(groups.map(x=>x.algorithmVersion),['director-v4','director-v5'])
  assert.deepEqual(groups.map(x=>x.summaryOpenedPercent),[100,0])
})


test('fake consented starts without a server turn cannot influence coach comparisons',()=>{
  const fake=Array.from({length:50},()=>({persona_id:'mira',method_id:'grow',
    locale:'ru',status:'summary_opened',verified_turn_observed:false}))
  assert.deepEqual(summarizeMyCoachQaCohort(fake),[])
  const real=verified(Array.from({length:20},()=>({persona_id:'mira',method_id:'grow',
    locale:'ru',status:'summary_opened'})))
  const mixed=summarizeMyCoachQaCohort([...real,...fake])
  assert.equal(mixed.length,1)
  assert.equal(mixed[0].observed,20)
  assert.equal(mixed[0].summaryOpenedPercent,100)
})
