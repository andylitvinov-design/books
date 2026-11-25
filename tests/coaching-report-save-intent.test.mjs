import test from 'node:test'
import assert from 'node:assert/strict'
import {makeReportSaveIntent} from '../lib/personal-coaching/report-save-intent.mjs'

const source={sessionId:'20000000-0000-4000-8000-000000000001',revision:7,locale:'en'}
const candidates=[{id:'candidate:action',text:'Take a walk'},{id:'candidate:rest',text:'Rest'}]
const operationId='30000000-0000-4000-8000-000000000001'

test('only explicit consent and one valid decision for every displayed action create a save intent',()=>{
 const choices={'candidate:action':'accepted','candidate:rest':'deferred'}
 assert.deepEqual(makeReportSaveIntent(source,candidates,choices,true,operationId),{
  ...source,operationId,saveConsent:true,decisions:[{candidateId:'candidate:action',status:'accepted'},{candidateId:'candidate:rest',status:'deferred'}],
 })
 for(const [decisions,consent] of [[choices,false],[{'candidate:action':'accepted'},true],[{...choices,unknown:'accepted'},true],[{...choices,'candidate:rest':'draft'},true]])
  assert.throws(()=>makeReportSaveIntent(source,candidates,decisions,consent,operationId),/COACHING_REPORT_SAVE_INTENT_INVALID/)
})

test('intent contains no client-provided report text and remains unchanged when UI choices mutate',()=>{
 const choices={'candidate:action':'declined','candidate:rest':'accepted'}
 const intent=makeReportSaveIntent(source,candidates,choices,true,operationId)
 choices['candidate:action']='accepted';candidates[0].text='Forged text'
 assert.equal(intent.decisions[0].status,'declined')
 assert.equal(JSON.stringify(intent).includes('Forged text'),false)
 assert.equal(JSON.stringify(intent).includes('Take a walk'),false)
})
