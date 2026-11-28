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

test('owner memory skips excluded records on bounded pages and never mistakes incomplete search for an empty archive',async()=>{
 const {latestReviewedCoachingMemory,crossModeMemoryDisplay}=await import('../lib/coaching/anti-stress-private-memory.mjs')
 const old={id:id(30),provenance:'client_reviewed_dialogue',savedAt:new Date(atMs).toISOString(),goal:'Work',clientSummary:'Reviewed',clientNextStep:'One step'}
 const current={...old,id:id(31)}
 const cursor={before:old.savedAt,beforeId:current.id}
 const calls=[]
 const rec=await latestReviewedCoachingMemory(async c=>{calls.push(c);return c?{protocols:[old],hasMore:false}:{protocols:[current],hasMore:true,nextCursor:cursor}},current.id)
 assert.equal(rec.protocolId,old.id)
 assert.deepEqual(calls,[null,cursor])
 assert.equal(await latestReviewedCoachingMemory(async()=>({protocols:[],hasMore:false})),null)
 await assert.rejects(latestReviewedCoachingMemory(async()=>({protocols:[],hasMore:true,nextCursor:cursor})),/INVALID/)
 const {run,ledger}=fixture()
 const t=projectAntiStressPrivateMemory(run,sessionId,protocolId,ledger,atMs+5000,'en')
 const ok=value=>({status:'fulfilled',value})
 const memory=assembleOwnerCrossModeMemory({identity:ok({preferredName:'Mary'}),coaching:ok(rec),therapy:ok(t)})
 const view=crossModeMemoryDisplay({...memory,stageToken:'secret'})
 assert.equal(view.coaching.record.topic,'Work')
 assert.equal(view.therapy.record.fields.length,t.fields.length)
 assert.ok(!JSON.stringify(view).includes('secret'))
 assert.ok(!JSON.stringify(view).includes('Mary'))
 assert.ok(!JSON.stringify(view).includes('protocolId'))
 assert.throws(()=>crossModeMemoryDisplay(memory,old.id),/INVALID/)
 assert.throws(()=>crossModeMemoryDisplay({...memory,requiresProviderSpecificConsent:false}),/INVALID/)
 assert.throws(()=>crossModeMemoryDisplay({...memory,therapy:{status:'available',record:{...t,fields:[{fieldId:'resource_details',label:'hidden',value:'private'}]}}}),/INVALID/)
 const read=await import('node:fs')
 const panel=read.readFileSync(new URL('../components/app/anti-stress-memory-panel.jsx',import.meta.url),'utf8')
 assert.match(panel,/getCabinetBootstrap\('portrait',\{refresh:true\}\)/)
 assert.match(panel,/owner\?\.account\?\.id!==accountId/)
 assert.match(panel,/c\.signal\.aborted\|\|scope\.current!==key/)
 assert.match(panel,/appFetch\('anti-stress\/session\?'\+q,undefined,'GET',\{accountId,signal:c.signal\}\)/)
 assert.doesNotMatch(panel,/sendSocket|localStorage|sessionStorage|geminiLiveContextMessage/)
})

test('provider memory shares only one fresh explicitly selected reference, never the archive',async()=>{
 const {crossModeShareOptions,resolveCrossModeShare}=await import('../lib/coaching/anti-stress-memory-share.mjs')
 const owner=id(100),current=id(90)
 const c=projectCoachingPrivateMemory([{id:id(30),provenance:'client_reviewed_dialogue',savedAt:new Date(atMs).toISOString(),goal:'Work',clientSummary:'Reviewed conclusion',clientNextStep:'One step'}])
 const {run,ledger}=fixture()
 const t=projectAntiStressPrivateMemory(run,sessionId,protocolId,ledger,atMs+5000,'en')
 const ok=value=>({status:'fulfilled',value})
 const m=assembleOwnerCrossModeMemory({identity:ok({preferredName:'Mary'}),coaching:ok(c),therapy:ok(t)})
 const choices=crossModeShareOptions(m,owner,current)
 const x=choices.find(v=>v.field==='topic')
 const selection={provider:'gemini_live_free',consent:true,fingerprint:x.fingerprint}
 const note=resolveCrossModeShare(m,owner,current,selection)
 assert.match(note,/Work/)
 assert.doesNotMatch(note,/Reviewed conclusion|One step|Mary|Quiet lake/)
 assert.equal(resolveCrossModeShare(m,id(99),current,selection),null)
 assert.equal(resolveCrossModeShare(m,owner,id(91),selection),null)
 assert.equal(resolveCrossModeShare(m,owner,current,{...selection,consent:false}),null)
 assert.equal(resolveCrossModeShare(m,owner,current,{...selection,provider:'groq'}),null)
 const edited={...m,coaching:{status:'available',record:{...c,topic:'Changed'}}}
 assert.equal(resolveCrossModeShare(edited,owner,current,selection),null)
 assert.ok(!crossModeShareOptions(m,owner,c.protocolId).some(v=>v.mode==='coaching'))
})

test('Clarity uses the same one-record memory gate only for an exact resumed protocol',async()=>{
 const {readFileSync}=await import('node:fs')
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const ui=read('components/my-coach-live-dialogue.jsx'),panel=read('components/app/anti-stress-memory-panel.jsx'),relay=read('lib/app/clarity-live-relay.js'),ctrl=read('lib/coaching/clarity-trusted-live-connection.mjs'),voice=read('components/my-coach-gemini-live.jsx')
 assert.match(ui,/crossModeChoice\.protocolId===protocolIdRef\.current/)
 assert.match(ui,/onClarityRelayClosed=\{\(\)=>setCrossModeChoice\(null\)\}/)
 assert.match(panel,/checked=\{shareFingerprint===selected\}/)
 assert.match(relay,/readApprovedCrossModeReference\(config,actor,selection\.protocolId,memorySelection,start\.locale\)/)
 assert.match(ctrl,/if\(reference\)sendProvider\(reference\)/)
 assert.match(ctrl,/!started\|\|!mediaReady/)
 assert.match(voice,/const requestedSavedContext=Boolean\(r\.contextSentKey\|\|r\.claritySelection\?\.memorySelection\|\|r\.clarityOpeningMemoryStageToken\)/)
})
