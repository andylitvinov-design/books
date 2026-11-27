import test from 'node:test'
import assert from 'node:assert/strict'
import {geminiFreeLiveConfig,normalizeGeminiFreeLiveStart,geminiFreeLiveSetup,issueGeminiFreeLiveToken} from '../lib/coaching/gemini-live-free.mjs'
import {createAntiStressRun,advanceAntiStressRun} from '../lib/coaching/anti-stress-runs.mjs'
import {ANTI_STRESS_SESSION_IDS} from '../lib/coaching/coach-program-mode.mjs'
const key='AIza'+'A'.repeat(36)
const config=geminiFreeLiveConfig({HH_GEMINI_FREE_API_KEY:key,HH_MY_COACH_GEMINI_FREE_ENABLED:'true',HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED:'true',HH_COACHING_BRAIN_ENABLED:'true',HH_COACHING_LIVE_VOICE_ENABLED:'true',HH_COACHING_LIVE_VOICE_APPROVED:'true'})
const body={personaId:'mira',locale:'ru',settings:{},voiceName:'Sulafat',consent:true,voiceConsent:true,trainingUseConsent:true}
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
test('therapy mint is internal-only, locks scenario and gentle pacing, enforces remaining budget and never retries ambiguous mint',async()=>{
 const base=1795100000000,pid=id(2),sid=ANTI_STRESS_SESSION_IDS[0]
 let run=createAntiStressRun({id:id(1),protocolIds:[pid,id(3),id(4)],access:'free',createdAt:base})
 assert.throws(()=>normalizeGeminiFreeLiveStart({...body,courseSessionId:sid}))
 assert.throws(()=>normalizeGeminiFreeLiveStart({...body,antiStressLease:{}}))
 const start={...normalizeGeminiFreeLiveStart(body),courseSessionId:sid}
 assert.throws(()=>geminiFreeLiveSetup(start))
 let calls=0,last
 const fetcher=async(_url,opts)=>{calls++;last=JSON.parse(opts.body);return {ok:true,status:200,json:async()=>({name:'auth_tokens/synthetic-therapy'})}}
 const lease=(now,remaining,previousCredentialExpiresAt=null)=>({leaseId:id(90),run,sessionId:sid,protocolId:pid,now,previousCredentialExpiresAt,reservedExpiresAt:new Date(now+remaining).toISOString(),expiresAt:new Date(now+remaining).toISOString(),newSessionExpireTime:new Date(now+Math.min(45000,remaining)).toISOString()})
 const mint=(now,antiStressLease,extra={})=>issueGeminiFreeLiveToken(config,start,{now,antiStressLease,fetcher,...extra})
 await assert.rejects(mint(base,undefined),/LEASE_REQUIRED/)
 await assert.rejects(mint(base,{...lease(base,900000),reservedExpiresAt:'wrong'}),/LEASE_REJECTED/)
 await assert.rejects(mint(base,{...lease(base,900000),protocolId:id(3)}),/LEASE_REJECTED/)
 await assert.rejects(mint(base+45000,lease(base,900000)),/LEASE_REJECTED/)
 await assert.rejects(mint(base,{...lease(base,900000),leaseId:'wrong'}),/LEASE_REJECTED/)
 assert.equal(calls,0)
 const first=await mint(base+1000,lease(base,900000))
 assert.equal(first.expiresAt,new Date(base+900000).toISOString())
 assert.equal(last.uses,1)
 assert.equal(last.bidiGenerateContentSetup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs,1400)
 assert.match(last.bidiGenerateContentSetup.systemInstruction.parts[0].text,/THERAPY-ORIENTED SELF-REGULATION/)
 assert.match(last.bidiGenerateContentSetup.systemInstruction.parts[0].text,/15 active minutes/)
 assert.ok(!JSON.stringify(first).includes(key))
 const ev=(type,atMs,extra)=>({courseRunId:run.id,sessionId:sid,expectedRevision:run.clock.revision,day:1,type,atMs,protocolId:pid,connectionId:id(8),segmentId:id(9),...extra})
 run=advanceAntiStressRun(run,ev('begin',base,{coachId:'mira',consent:{kind:'explicit_client_session_consent',decision:'start',protocolId:pid,connectionId:id(8),coachId:'mira',atMs:base,turnId:'start'}}))
 for(let t=10000;t<=300000;t+=10000)run=advanceAntiStressRun(run,ev('observe',base+t,{evidence:'server_observed_connected'}))
 run=advanceAntiStressRun(run,ev('coach_change',base+300001,{evidence:'server_observed_stop'}))
 await assert.rejects(mint(base+300001,lease(base+300001,600000,base+900000)),/LEASE_REJECTED/)
 assert.equal(calls,1)
 const resumed=await mint(base+900000,lease(base+900000,600000,base+900000))
 assert.equal(resumed.expiresAt,new Date(base+1500000).toISOString())
 assert.equal(run.clock.days[0].elapsedMs,300000)
 let failures=0
 await assert.rejects(mint(base+900000,lease(base+900000,600000,base+900000),{fetcher:async()=>{failures++;return {ok:false,status:503}}}),/PROVIDER_UNAVAILABLE/)
 assert.equal(failures,1)
})
