import test from 'node:test'
import assert from 'node:assert/strict'
import {createAntiStressRun,advanceAntiStressRun,antiStressRunBinding} from '../lib/coaching/anti-stress-runs.mjs'
import {antiStressReviewStamp,projectAntiStressPrivateMemory,projectCoachingPrivateMemory,assembleOwnerCrossModeMemory} from '../lib/coaching/anti-stress-private-memory.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const sessionId='anti_stress_ground',protocolId=id(2),atMs=1795100000000
function fixture(){
 let run=createAntiStressRun({id:id(1),protocolIds:[protocolId,id(3),id(4)],createdAt:atMs,access:'free'})
 const e={courseRunId:run.id,sessionId,day:1,protocolId,connectionId:id(10),segmentId:id(11),coachId:'mira'}
 run=advanceAntiStressRun(run,{...e,type:'begin',expectedRevision:0,atMs,consent:{kind:'explicit_client_session_consent',decision:'start',protocolId,connectionId:id(10),coachId:'mira',atMs,turnId:'start'}})
 run=advanceAntiStressRun(run,{...e,type:'observe',expectedRevision:1,atMs:atMs+5000,evidence:'server_observed_connected'})
 const scenarioVersion=antiStressRunBinding(run,sessionId,protocolId).scenarioVersion
 const row=(fieldId,value,status='confirmed')=>({fieldId,value,status,scenarioVersion,reviewed:true,evidenceId:'e:'+fieldId,confirmedAt:atMs+5000,coachId:'mira'})
 const ledger={courseRunId:run.id,sessionId,protocolId,scenarioVersion,rows:[row('resource_selected','Quiet lake'),row('resource_details','private detail'),row('practice_consent','accepted'),row('practice_status','attempted'),row('resource_response','comfortable'),row('meditation_consent','accepted'),row('ground_when','Before a meeting')]}
 return {run,ledger,row}
}
test('therapy memory uses exact review date and run binding, no raw content or provider permission',()=>{
 const {run,ledger,row}=fixture(),project=l=>projectAntiStressPrivateMemory(run,sessionId,protocolId,l,atMs+5000,'ru')
 const m=project(ledger)
 assert.equal(m.scope,'owner_private_only')
 assert.equal(m.sessionStatus,'active')
 assert.equal(m.reviewedAt,new Date(atMs+5000).toISOString())
 assert.equal(m.requiresFreshPracticeConsent,true)
 assert.equal(m.fields.find(x=>x.fieldId==='resource_selected').value,'Quiet lake')
 assert.ok(!JSON.stringify(m).includes('private detail'))
 assert.ok(!JSON.stringify(m).includes('stageToken'))
 assert.equal(antiStressReviewStamp([]),null)
 assert.throws(()=>antiStressReviewStamp([{confirmedAt:atMs}]),/INVALID/)
 assert.throws(()=>project({...ledger,courseRunId:id(99)}),/CONFLICT/)
 assert.throws(()=>projectAntiStressPrivateMemory(run,sessionId,protocolId,ledger,atMs,'en'),/INVALID/)
 assert.throws(()=>project({...ledger,rows:ledger.rows.map(x=>({...x,coachId:'caesar'}))}),/INVALID/)
 const corrected={...ledger,rows:ledger.rows.map(x=>x.fieldId==='resource_selected'?row('resource_selected',null,'skipped'):x)}
 assert.ok(!JSON.stringify(project(corrected)).includes('Quiet lake'))
 const revoked={...ledger,rows:ledger.rows.map(x=>x.fieldId==='meditation_consent'?row('meditation_consent','declined'):x)}
 assert.ok(!JSON.stringify(project(revoked)).includes('Quiet lake'))
})
test('cross-mode view separates past facts, rejects unreviewed records, excludes current and labels read failures',()=>{
 const coaching=[{id:id(30),provenance:'client_reviewed_dialogue',savedAt:new Date(atMs+1000).toISOString(),goal:'Work',clientSummary:'Reviewed conclusion',clientNextStep:'One step',turns:['private raw']},{id:id(31),provenance:'client_autosaved_unreviewed_draft',savedAt:new Date(atMs+6000).toISOString(),goal:'unverified'}]
 const c=projectCoachingPrivateMemory(coaching)
 assert.equal(c.protocolId,id(30))
 assert.equal(projectCoachingPrivateMemory(coaching,id(30)),null)
 assert.ok(!JSON.stringify(c).includes('private raw'))
 assert.ok(!JSON.stringify(c).includes('unverified'))
 const {run,ledger}=fixture()
 const t=projectAntiStressPrivateMemory(run,sessionId,protocolId,ledger,atMs+5000,'en')
 const ok=value=>({status:'fulfilled',value})
 const m=assembleOwnerCrossModeMemory({identity:ok({preferredName:'Mary',preferenceVersion:'private-version'}),coaching:ok(c),therapy:ok(t)})
 assert.equal(m.latest,'therapy')
 assert.equal(m.identity.preferredName,'Mary')
 assert.equal(m.coaching.record.mode,'coaching')
 assert.equal(m.therapy.record.mode,'therapy')
 assert.equal(m.requiresProviderSpecificConsent,true)
 assert.ok(!JSON.stringify(m).includes('private-version'))
 const unavailable=assembleOwnerCrossModeMemory({identity:ok({}),coaching:ok(c),therapy:{status:'rejected'}})
 assert.equal(unavailable.latest,null)
 assert.equal(unavailable.therapy.status,'unavailable')
 assert.equal(unavailable.coaching.status,'available')
 assert.equal(assembleOwnerCrossModeMemory({identity:ok({}),coaching:ok(c),therapy:ok(null)}).latest,'coaching')
})
