import test from 'node:test'
import assert from 'node:assert/strict'
import {SIMLI_CAESAR_FACE,SIMLI_LUKAS_FACE,simliTokenRequest,mintReservedSimliToken,providerSettlementEvidence} from '../lib/coaching/lukas-simli-lifecycle.mjs'
import {parseCaesarVideoAction,parseLukasVideoAction,startCaesarVideoSession,endCaesarVideoSession} from '../lib/coaching/lukas-video-session-coordinator.mjs'

const actor={id:'11111111-1111-4111-8111-111111111111'}
const id='22222222-2222-4222-8222-222222222222'
const contract={validUntilSeconds:9000,customerUseApproved:true,privacyApproved:true,freeHardStopVerified:true,singleUseVerified:true,accountHistoryComplete:true,billingSecondsVerified:true,durationSecondsVerified:true,finalHistoryVerified:true,sharedStartsVerified:true,tokenTtlSeconds:300,caesarCoachingAudioApproved:true}
const body={action:'start',nonSensitiveConsent:true,privacyConsentVersion:'caesar-video-v1'}
const state={contract,providerRemaining:2800,cycleEndSeconds:5000,monthEndSeconds:5000,freeOnly:true,providerCycleVerified:true,channelActiveCount:0,providerCycle:'cycle',overheadSeconds:5,apiKey:'synthetic'}
const reservation={allowed:true,sessionId:id,videoSeconds:300,providerReserved:305,createdAtSeconds:1000,latestPossibleEndSeconds:1635}
const row={id:'33333333-3333-4333-8333-333333333333',sessionAggregator:'hh-caesar-'+id,face_id:SIMLI_CAESAR_FACE,startTime:1010,endTime:1050,endReason:'ended',sessionTotalTime:40,estimatedCost:{simliBilledSeconds:43}}
function ctx({providerState=state,owner=false,google=true}={}){
  const calls=[]
  return {calls,body,auth:{verified:async()=>actor,client:{auth:{getUser:async()=>({data:{user:{id:actor.id,identities:google?[{provider:'google',user_id:actor.id}]:[]}}})}}},ownerEmailAllowed:()=>owner,ownerPractitionerActive:async()=>true,accountEligible:async()=>true,consumeAttempt:async()=>calls.push('rate'),readProviderState:async()=>providerState,newId:()=>id,now:()=>1000,reserve:async x=>{calls.push(['reserve',x.availableWindow,x.access.ownerExempt]);return reservation},beginMint:async()=>{calls.push('begin');return true},mint:async x=>{calls.push(['mint',x.target]);return {provider:'simli',target:'coach',sessionToken:'synthetic-token',maxVideoSeconds:300,latestPossibleEndSeconds:1635}},markUncertain:async x=>calls.push(['hold',x.tokenIssued]),readOwnReservation:async()=>({...reservation,state:'uncertain'}),readChannel:async()=>({activeCount:0}),readHistory:async()=>[row],reconcile:async({receipt})=>{calls.push('settled');return {state:'settled',videoCharged:receipt.videoSeconds,providerCharged:receipt.providerSeconds}}}
}
test('server entrypoint pins role and consent; browser cannot choose face, duration or role',()=>{
  assert.deepEqual(parseCaesarVideoAction(body),{action:'start'})
  assert.equal(parseLukasVideoAction(body),null)
  for(const x of [{...body,privacyConsentVersion:'lukas-video-v1'},{...body,nonSensitiveConsent:false},{...body,target:'coach'},{...body,faceId:SIMLI_LUKAS_FACE},{...body,maxVideoSeconds:300}])assert.equal(parseCaesarVideoAction(x),null)
})
test('Caesar face and aggregator are pinned; no reservation above 300 seconds',()=>{
  const r=simliTokenRequest({...reservation,faceId:SIMLI_LUKAS_FACE},'coach')
  assert.equal(r.faceId,SIMLI_CAESAR_FACE);assert.equal(r.sessionAggregator,'hh-caesar-'+id);assert.equal(r.maxSessionLength,300)
  assert.throws(()=>simliTokenRequest({...reservation,videoSeconds:301},'coach'),/INVALID_RESERVATION/)
  assert.throws(()=>simliTokenRequest(reservation,'unknown'),/INVALID_RESERVATION/)
})
test('missing independent Caesar audio approval blocks before any reserve or mint',async()=>{
  const c=ctx({providerState:{...state,contract:{...contract,caesarCoachingAudioApproved:false}}})
  assert.deepEqual(await startCaesarVideoSession(c),{allowed:false,code:'UNAVAILABLE'});assert.deepEqual(c.calls,['rate'])
  let contacted=false
  await assert.rejects(mintReservedSimliToken({reservation,contract:{...contract,caesarCoachingAudioApproved:false},target:'coach',nowSeconds:1000,apiKey:'synthetic',cycleEndSeconds:5000,monthEndSeconds:5000,issueDeadlineSeconds:1030,fetcher:async()=>{contacted=true}}))
  assert.equal(contacted,false)
})
test('anonymous caller cannot start; owner still limited to 300 seconds using shared reservation window',async()=>{
  const guest=ctx({google:false});assert.equal((await startCaesarVideoSession(guest)).code,'AUTH_REQUIRED');assert.deepEqual(guest.calls,[])
  const c=ctx({owner:true});const r=await startCaesarVideoSession(c)
  assert.equal(r.target,'coach');assert.equal(r.maxVideoSeconds,300);assert.deepEqual(c.calls,['rate',['reserve',305,true],'begin',['mint','coach'],['hold',true]])
})
test('oversized shared reservation or wrong returned target cannot leak a token',async()=>{
  const oversized=ctx();oversized.reserve=async()=>({...reservation,videoSeconds:301,providerReserved:306});assert.equal((await startCaesarVideoSession(oversized)).code,'UNAVAILABLE');assert.ok(!oversized.calls.includes('begin'))
  const wrong=ctx();wrong.mint=async()=>({provider:'simli',target:'chatbot',sessionToken:'wrong',maxVideoSeconds:300,latestPossibleEndSeconds:1635});assert.equal((await startCaesarVideoSession(wrong)).code,'UNAVAILABLE');assert.deepEqual(wrong.calls.at(-1),['hold',false])
})
test('mock provider receives only fixed Caesar configuration and duration, never coaching data',async()=>{
  const calls=[]
  const result=await mintReservedSimliToken({reservation,contract,target:'coach',nowSeconds:1000,apiKey:'synthetic',cycleEndSeconds:5000,monthEndSeconds:5000,issueDeadlineSeconds:1030,fetcher:async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>url.endsWith('/ratelimiter/sessions')?{currentUsage:0}:{session_token:'synthetic-token'}}}})
  assert.equal(result.target,'coach');assert.equal(result.maxVideoSeconds,300);assert.equal(calls.length,2)
  assert.deepEqual(JSON.parse(calls[1].init.body),{faceId:SIMLI_CAESAR_FACE,apiVersion:'v2',sessionAggregator:'hh-caesar-'+id,maxSessionLength:300,maxIdleTime:30,handleSilence:true,audioInputFormat:'pcm16'})
})
test('settlement requires actual Caesar history, not Lukas or duplicate cross-role evidence',async()=>{
  const proof={reservation,contract,nowSeconds:1800,rows:[row],activeCount:0,target:'coach'}
  assert.deepEqual(providerSettlementEvidence(proof),{sessionId:id,verified:true,ended:true,videoSeconds:40,providerSeconds:43})
  const wrong={...row,face_id:SIMLI_LUKAS_FACE,sessionAggregator:'hh-lukas-'+id}
  for(const rows of [[wrong],[row,wrong],[row,{...row}],[{...row,face_id:SIMLI_LUKAS_FACE}]])assert.equal(providerSettlementEvidence({...proof,rows}),null)
  assert.equal(providerSettlementEvidence({...proof,nowSeconds:1634}),null)
  const c=ctx();c.body={action:'end',sessionId:id};c.now=()=>1800
  assert.deepEqual(await endCaesarVideoSession(c),{allowed:true,state:'settled',videoCharged:40,providerCharged:43});assert.ok(c.calls.includes('settled'))
})
