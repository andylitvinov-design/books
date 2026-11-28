import {normalizeMyCoachDraft} from '../lib/personal-coaching/protocol-draft.mjs'
import {coachOpeningTurn} from '../lib/coaching/coach-opening-entry.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {draftTranscriptPrefix} from '../lib/personal-coaching/protocol-draft.mjs'
import {coachProfileDraftRequestV3,coachProfileDraftTransitionV3,coachProfileDraftViewV3,coachProfileDraftActiveV3} from '../lib/coaching/coach-profile-draft-v3.mjs'
import {coachOpeningProgress,coachOpeningProtocolSnapshot} from '../lib/coaching/coach-opening-protocol.mjs'
import {buildCoachProfileArchiveV3,validateCoachProfileArchiveV3} from '../lib/coaching/coach-profile-archive-v3.mjs'
const id='33333333-3333-4333-8333-333333333333',time='2026-11-25T12:00:00.000Z'
function fixture(courseSessionId='introductory'){
 const locale='en',personaId='mira'
 const client=['Yes','Alice','Personal profile','I feel calm','Yes']
 const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({turns:client,locale,personaId}))
 assert.equal(opening.completed,true)
 assert.equal(opening.focus,'profile')
 const turns=client.flatMap(content=>[{role:'user',content},{role:'assistant',content:'Opening response'}])
 return {revision:1,courseSessionId,protocol:{id,courseSessionId,locale,personaId,turns,opening,startedAt:time,completedAt:time}}
}
const action=(value,action,extra={})=>({action,id,revision:value.revision,consent:true,...extra})
function step(value,kind,extra={}){
 const result=coachProfileDraftTransitionV3(value,action(value,kind,extra),time)
 return {...value,revision:value.revision+1,protocol:result.protocol,profileDirectorV3:result.profileDirectorV3,
  serverLedger:result.serverLedger}
}
function answer(value,content){
 const q=coachProfileDraftViewV3(value).pending
 return step(value,'profile-answer',{questionId:q.id,questionTurnId:q.turnId,content})
}
test('typed private profile owns exact acknowledged draft revision and never invents an opening source',()=>{
 let draft=fixture(),length=draft.protocol.turns.length
 draft=step(draft,'profile-start')
 assert.equal(draft.protocol.turns.length,length)
 assert.equal(draft.serverLedger,null)
 const first=coachProfileDraftViewV3(draft).pending
 assert.equal(first.axis,'body_health')
 assert.equal(first.slot,'current')
 assert.equal(coachProfileDraftActiveV3(draft),true)
 for(const bad of [{...action(draft,'profile-answer',{questionId:first.id,questionTurnId:first.turnId,content:'9'}),revision:1},
  action(draft,'profile-answer',{questionId:first.id,questionTurnId:'forged',content:'9'}),
  action(draft,'profile-answer',{questionId:first.id,questionTurnId:first.turnId,content:'9',ledger:{}})])
  assert.throws(()=>coachProfileDraftTransitionV3(draft,bad,time),/COACH_PROFILE_DRAFT_INVALID/)
 draft=answer(draft,'0')
 const block=buildCoachProfileArchiveV3(draft.serverLedger)
 assert.equal(block.snapshot.ratings[0].current.value,0)
 assert.equal(block.bindings[0].questionTurnIndex,length)
 assert.equal(validateCoachProfileArchiveV3(block,draft.protocol).prefix.length,length+2)
 draft=step(draft,'profile-close')
 assert.equal(coachProfileDraftViewV3(draft).closed,true)
 assert.equal(coachProfileDraftActiveV3(draft),false)
 assert.equal(buildCoachProfileArchiveV3(draft.serverLedger).snapshot.closed,true)
})
test('inner course uses a separate track; no consent or legacy overwrite',()=>{
 let draft=fixture('meaning_axes_inner_growth')
 assert.throws(()=>coachProfileDraftRequestV3({...action(draft,'profile-start'),consent:false}),/COACH_PROFILE_DRAFT_INVALID/)
 assert.throws(()=>coachProfileDraftTransitionV3({...draft,protocol:{...draft.protocol,profileCheckin:{ratings:[{}]}}},action(draft,'profile-start'),time),/COACH_PROFILE_DRAFT_INVALID/)
 draft=step(draft,'profile-start')
 assert.equal(coachProfileDraftViewV3(draft).track,'inner')
 assert.equal(coachProfileDraftViewV3(draft).pending.slot,'pair')
 draft=answer(draft,'3 / 8')
 const block=buildCoachProfileArchiveV3(draft.serverLedger)
 assert.equal(block.snapshot.ratings[0].current.value,3)
 assert.equal(block.snapshot.ratings[0].desired.value,8)
})
test('route preserves owner authentication, origin, rate, CAS and hides private ledger',()=>{
 const route=readFileSync(new URL('../app/api/app/my-coach/draft/route.js',import.meta.url),'utf8')
 const store=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 for(const marker of ['auth.verified()','requireSameOrigin(request,config)','x-hh-account-id','HH_MY_COACH_PROFILE_V3_ENABLED','my-coach-profile-step','stepCoachProfileDraft(config,actor,input)'])assert.ok(route.includes(marker),marker)
 for(const marker of ['pg_advisory_xact_lock','row.revision!==input.revision','state=\'active\' and revision=$5','coachProfileDraftActiveV3(old))throw conflict()','issueCoachProfileArchiveProof(config,actor,step.serverLedger)','const {profileDirectorV3,courseGate,draftCourseReview,...visible}=value','selected.map(item=>publicDraft(item))'])assert.ok(store.includes(marker),marker)
})


test('public draft projection strips both private Director ledgers and exposes only explicit step projections',()=>{
 const store=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 const projection=store.slice(store.indexOf('function publicDraft('),store.indexOf('export async function saveCoachDraft'))
 assert.match(projection,/const \{profileDirectorV3,courseGate,draftCourseReview,\.\.\.visible\}=value/)
 assert.match(projection,/includeProfile&&profileDirectorV3\?\{profileStep:coachProfileDraftViewV3\(value\)\}/)
 assert.match(projection,/includeProfile&&courseGate\?\{courseGateStep:coachCourseGateView\(value\)\}/)
 assert.match(projection,/const savedReview=courseGate\?null:draftCourseReview\|\|deriveCoachDraftReview\(value\.protocol,value\.courseSessionId\)/)
 assert.match(projection,/courseGateArchive:\{review:courseGate\.review\|\|null,scenarioVersion:courseGate\.scenarioVersion\|\|null\}/)
 assert.doesNotMatch(projection,/\.\.\.(?:profileDirectorV3|courseGate|draftCourseReview|value)\b/)
})

test('private resume UI keeps typed profile actions and normal checkpoints mutually exclusive',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const route=readFileSync(new URL('../app/api/app/my-coach/draft/route.js',import.meta.url),'utf8')
 for(const marker of ['data-coach-private-profile-v3','setProfileV3Enabled(result.profileV3Enabled===true)','profileV3Ref.current=structured','profileV3FaultRef.current=true','if(structured&&!structured.step.closed)draftRevision=structured.revision','if(restoredDraft)forceLocal=true','profileV3Ref.current&&!profileV3Ref.current.step.closed','questionTurnId:q.turnId','restoredProfileProof.current=coachProfileArchiveEnvelope(p)'])assert.ok(ui.includes(marker),marker)
 const profile=ui.slice(ui.indexOf('  async function runProfileV3('),ui.indexOf('  async function runCourseGate('))
 assert.match(profile,/p\.personaId!==\(protocolOriginPersonaRef\.current\|\|personaId\)/)
 assert.match(profile,/\(item\.privateCoachId\|\|p\.personaId\)!==personaId/)
 assert.ok(route.includes("profileV3Enabled:process.env.HH_MY_COACH_PROFILE_V3_ENABLED==='true'"))
})


test('fresh private profile opening keeps six gates and hands off rather than asking legacy inner scores',()=>{
 const input={locale:'en',openingHistory:['Yes','Alice','Personal profile','I feel calm'],message:'Yes'}
 const legacy=coachOpeningTurn(input,'mira')
 const privateReply=coachOpeningTurn({...input,deferProfileToPrivateDirector:true},'mira')
 assert.equal(privateReply.openingProgress.completed,true)
 assert.equal(privateReply.openingProgress.answers.focus.kind,'profile')
 assert.match(privateReply.message,/start the private profile check-in/)
 assert.notEqual(legacy.message,privateReply.message)
 const incomplete=coachOpeningTurn({locale:'en',openingHistory:[],message:'Yes',deferProfileToPrivateDirector:true},'mira')
 assert.equal(incomplete.openingProgress.completed,false)
 const after=coachOpeningTurn({...input,openingHistory:[...input.openingHistory,'Yes'],message:'5',deferProfileToPrivateDirector:true},'mira')
 assert.equal(after.stage,'profile_handoff')
 assert.equal(after.profileProgress,undefined)
})
test('new private profile entry is capability gated and never starts a voice provider',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const gate=readFileSync(new URL('../components/my-coach-greeting-gate.jsx',import.meta.url),'utf8')
 const route=readFileSync(new URL('../app/api/app/my-coach/draft/route.js',import.meta.url),'utf8')
 assert.match(ui,/privateProfileEnabled=\{protocolOwnerReady&&profileV3Enabled\}/)
 assert.match(ui,/if\(privateProfile&&\(!profileV3Enabled\|\|!protocolOwnerRef.current\|\|!coachProfileTrackForCourse\(id\)\)\)return/)
 assert.match(ui,/if\(privateProfile\)\{toggleComposer\(\);return\}/)
 assert.match(ui,/if\(freshPrivateProfile\)forceLocal=true/)
 assert.match(ui,/deferProfileToPrivateDirector:freshPrivateProfile/)
 assert.match(ui,/if\(freshProfileAwaiting\)return null/)
 assert.match(ui,/privateResumeVoice=restoredDraft&&restoredPrivateVoice&&!restoredRelay&&!freshPrivateProfile/)
 assert.match(ui,/privateTextOnly&&!privateResumeVoice\?<span data-coach-private-text-resume/)
 assert.match(gate,/chooseSession\(MEANING_AXES_COACH_SESSION_ID,\{privateProfile:true\}\)/)
 assert.match(route,/params.get\('view'\)==='capabilities'/)
 assert.match(route,/profileV3Enabled:process.env.HH_MY_COACH_PROFILE_V3_ENABLED==='true'/)
})


test('private profile entry preference survives checkpoint/resume without enabling a new provider or changing course',()=>{
 const raw=fixture(),value={...raw,protocol:{...raw.protocol,methodId:'grow'}}
 const normalized=normalizeMyCoachDraft({...value,privateProfileV3Requested:true})
 assert.equal(normalized.privateProfileV3Requested,true)
 assert.equal(normalizeMyCoachDraft(normalized).privateProfileV3Requested,true)
 assert.equal(normalizeMyCoachDraft(value).privateProfileV3Requested,undefined)
 assert.throws(()=>normalizeMyCoachDraft({...value,privateProfileV3Requested:'true'}),/MY_COACH_DRAFT_INVALID/)
 const other={...value,courseSessionId:'life_direction',protocol:{...value.protocol,courseSessionId:'life_direction'}}
 assert.throws(()=>normalizeMyCoachDraft({...other,privateProfileV3Requested:true}),/MY_COACH_DRAFT_INVALID/)
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const store=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 assert.match(ui,/setFreshPrivateProfile\(recovered.privateProfileV3Requested===true\)/)
 assert.match(store,/Boolean\(old.privateProfileV3Requested\)!==Boolean\(value.privateProfileV3Requested\)/)
})


test('typed profile continuation preserves the acknowledged unanswered opening transcript',()=>{
 let value=fixture()
 const old=value.protocol.turns
 old.splice(2,0,{role:'user',content:'An earlier unanswered message',unanswered:true})
 old.push({role:'user',content:'A trailing unanswered message',unanswered:true})
 const prior=structuredClone(value.protocol),length=old.length
 value=step(value,'profile-start')
 assert.deepEqual(value.protocol.turns,prior.turns)
 value=answer(value,'6')
 assert.deepEqual(value.protocol.turns.slice(0,length),prior.turns)
 assert.equal(draftTranscriptPrefix(prior,value.protocol),true)
 assert.equal(buildCoachProfileArchiveV3(value.serverLedger).bindings[0].questionTurnIndex,length)
 value=answer(value,'7')
 assert.deepEqual(value.protocol.turns.slice(0,length),prior.turns)
})
test('checkpoint cannot clear pending marker without an appended adjacent assistant turn',()=>{
 const previous=fixture().protocol
 previous.turns=[{role:'user',content:'Pending',unanswered:true}]
 const row={role:'user',content:'Pending'}
 const other={role:'user',content:'Another request',unanswered:true}
 const reply={role:'assistant',content:'Reply'}
 const check=turns=>draftTranscriptPrefix(previous,{...previous,turns})
 assert.equal(check([row]),false)
 assert.equal(check([row,other]),false)
 assert.equal(check([row,other,reply]),false)
 assert.equal(check([previous.turns[0],other,reply]),true)
 assert.equal(check([row,reply]),true)
 assert.equal(check([row,reply,other]),true)
 const older={...previous,turns:[previous.turns[0],other]}
 assert.equal(draftTranscriptPrefix(older,{...older,turns:[row,other,reply]}),false)
})
