import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createCoachDraftQueue} from '../lib/personal-coaching/protocol-draft-queue.mjs'
test('restored revision continues, never resets',async()=>{
 const calls=[];const queue=createCoachDraftQueue(async(revision,value)=>{calls.push(revision);return {id:value.protocol.id,revision,saved:true}},()=>{},8)
 queue.offer({courseSessionId:'introductory',protocol:{id:'test',turns:[{role:'user',content:'First'}]}})
 assert.equal(await queue.flush(),9);assert.deepEqual(calls,[9])
})
test('owner/revision guard and private text-only resume',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 assert.match(ui,/initialDraftRevision.current=result.draft.revision/)
 // Both restored and fresh private sessions must bypass the provider path.
 assert.match(ui,/const privateTextOnly=restoredDraft\|\|freshPrivateProfile/)
 assert.match(ui,/if\(privateTextOnly\)return await sendMessage\(draft.trim\(\),\{forceLocal:true\}\)/)
 assert.match(ui,/if\(privateTextOnly&&voiceTurn\)return null/)
 assert.match(ui,/if\(restoredDraft\)forceLocal=true/)
 assert.match(ui,/if\(freshPrivateProfile\)forceLocal=true/)
 assert.match(server,/row.state!=='active'\|\|row.revision!==input.revision/)
})
test('reviewed draft retains selected course and finalized tombstone cannot recreate deleted report',()=>{
 const archive=readFileSync(new URL('../components/app/my-coach-draft-archive.jsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 const writer=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
 assert.ok(archive.includes('courseSessionId:item.courseSessionId'))
 assert.ok(server.includes('protocol.courseSessionId!==old.courseSessionId'))
 assert.ok(writer.includes('const draft=await assertCoachDraftReview(db,actor,config,protocol,input.draftRevision)'))
 assert.ok(server.includes('coachDraftReviewDecision(row,revision,Boolean(existing))'))
 assert.ok(server.includes("if(decision==='conflict')throw conflict()"))
 assert.match(writer,/if\(draft\?\.state==='finalized'&&!existing\)throw new AppError\('MY_COACH_PROTOCOL_CONFLICT',409\)/)
})

import {recoverPrivateOpeningScope} from '../lib/personal-coaching/private-draft-resume.mjs'
import {coachOpeningProgress,coachOpeningProtocolSnapshot} from '../lib/coaching/coach-opening-protocol.mjs'
test('private resume preserves explicitly confirmed returning identity and continuity without provider consent',()=>{
 const messages=['Yes','Correct','Continue','goal','I feel calm','Yes']
 const priorSession={name:'Mary',topic:'Work'}
 const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({locale:'en',personaId:'mira',turns:messages,allowPrior:true,priorSession}))
 const turns=messages.flatMap(content=>[{role:'user',content},{role:'assistant',content:'next'}])
 const recovered=recoverPrivateOpeningScope({locale:'en',personaId:'mira',opening,turns})
 assert.equal(recovered.matched,true)
 const actual=coachOpeningProtocolSnapshot(coachOpeningProgress({locale:'en',personaId:'mira',turns:messages,...recovered}))
 assert.deepEqual(actual,opening)
 assert.equal(recovered.priorSession.name,'Mary')
})
test('missing or mismatched opening is not promoted to a recovered fact',()=>{
 const recovered=recoverPrivateOpeningScope({personaId:'mira',locale:'en',turns:[{role:'user',content:'Yes'},{role:'assistant',content:'Name?' }],opening:{name:'Fake',completed:true}})
 assert.equal(recovered.matched,false);assert.equal(recovered.allowPrior,false)
})

import {normalizeMyCoachDraft} from '../lib/personal-coaching/protocol-draft.mjs'
test('explicit course marker cannot conflict with the enclosing draft',()=>{
 const proto={id:'11111111-1111-4111-8111-111111111111',personaId:'mira',locale:'ru',startedAt:'2026-11-25T12:00:00.000Z',completedAt:'2026-11-25T12:00:01.000Z',turnLayout:'chronological',turns:[{role:'user',content:'Да'}]}
 const legacy=normalizeMyCoachDraft({courseSessionId:'introductory',protocol:proto})
 assert.equal(legacy.courseSessionId,'introductory')
 assert.equal(legacy.protocol.courseSessionId,undefined)
 assert.equal(normalizeMyCoachDraft({courseSessionId:'introductory',protocol:{...proto,courseSessionId:'introductory'}}).protocol.courseSessionId,'introductory')
 assert.throws(()=>normalizeMyCoachDraft({courseSessionId:'introductory',protocol:{...proto,courseSessionId:'life_direction'}}),/MY_COACH_DRAFT_INVALID/)
})


import {coachDraftListSummary,draftTranscriptPrefix,coachDraftMatchesResume} from '../lib/personal-coaching/protocol-draft.mjs'
import {CLARITY_DAY_ONE_VERSION} from '../lib/coaching/clarity-day-one-scenario.mjs'
test('greeting list summary never returns a transcript or private profile',()=>{
 const item={id:'draft',revision:3,updatedAt:'2026-11-25T12:00:00Z',courseSessionId:'introductory',protocol:{personaId:'mira',locale:'ru',turns:[{role:'user',content:'private text'}],opening:{name:'private name'}}}
 assert.deepEqual(coachDraftListSummary(item),{id:'draft',revision:3,updatedAt:item.updatedAt,courseSessionId:'introductory',personaId:'mira',locale:'ru',turnCount:1})
 assert.ok(!JSON.stringify(coachDraftListSummary(item)).includes('private'))
 const route=readFileSync(new URL('../app/api/app/my-coach/draft/route.js',import.meta.url),'utf8')
 const store=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.ok(route.includes("view:params.get('view')"))
 assert.ok(store.includes("view==='summary'?selected.map(coachDraftListSummary):selected"))
 // Normal resume remains persona-scoped; a course query is explicitly
 // constrained by both coach and course on the owner-scoped server page.
 assert.ok(ui.includes("new URLSearchParams({view:'summary',personaId,...(clarityDay?{courseSessionId:clarityCourseId(clarityDay)}:{}),...(cursor||{})})"))
 assert.ok(route.includes("courseSessionId:params.get('courseSessionId')"))
 assert.ok(store.includes("coachDraftMatchesResume(item,personaId,courseSessionId)"))
 assert.ok(store.includes("!clarityCourseDay(courseSessionId)"))
 assert.ok(ui.includes("row?.personaId===personaId||(clarityDay&&row?.crossCoach===true)"))
 assert.ok(ui.includes("row.courseSessionId===clarityCourseId(clarityDay)"))
 assert.ok(ui.includes("headers:{'X-HH-Account-ID':owner}"))
 assert.ok(route.includes("auth.verified()"))
 assert.ok(route.includes("request.headers.get('x-hh-account-id')!==actor.id"))
 assert.ok(store.includes("where account_id=$1 and state='active'"))
 assert.ok(ui.includes("action:'resume',id:item.id,revision:item.revision,confirmed:true"))
})
test('checkpoint cannot erase a known interruption but may append an answer or record a new interruption',()=>{
 const a={id:'draft',personaId:'mira',startedAt:'start',turns:[{role:'user',content:'Question'},{role:'assistant',content:'Reply',interrupted:true}]}
 const b={...a,turns:[a.turns[0],{role:'assistant',content:'Reply'}]}
 assert.equal(draftTranscriptPrefix(a,b),false)
 assert.equal(draftTranscriptPrefix(b,a),true)
 assert.equal(draftTranscriptPrefix(a,{...a,turns:[...a.turns,{role:'user',content:'Next'}]}),true)
})

test('cross-coach greeting metadata excludes ledger and transcript, and safety-paused drafts cannot hand off',()=>{
 const item={id:'draft',revision:4,updatedAt:'2026-11-26T12:00:00Z',courseSessionId:'clarity_day_1',protocol:{personaId:'mira',locale:'ru',turns:[{role:'user',content:'private text'}],opening:{name:'private name'}},courseGate:{scenarioVersion:CLARITY_DAY_ONE_VERSION,activeCoachId:'genie',paused:false,gate:{private:'secret'},review:{private:'secret'}}}
 const common={id:item.id,revision:item.revision,updatedAt:item.updatedAt,courseSessionId:item.courseSessionId,personaId:'mira',locale:'ru',turnCount:1}
 assert.deepEqual(coachDraftListSummary(item),{...common,crossCoach:true,activeCoachId:'genie'})
 assert.deepEqual(coachDraftListSummary({...item,courseGate:{...item.courseGate,paused:true}}),common)
 assert.deepEqual(coachDraftListSummary({...item,courseGate:{...item.courseGate,scenarioVersion:'legacy'}}),common)
 assert.ok(!JSON.stringify(coachDraftListSummary(item)).includes('secret'))
 assert.ok(!JSON.stringify(coachDraftListSummary(item)).includes('private'))
})

test('course resume discovery is exact-course and permits cross-coach only for a persisted active v5 gate',()=>{
 const item={courseSessionId:'clarity_day_1',protocol:{personaId:'mira'},courseGate:{scenarioVersion:CLARITY_DAY_ONE_VERSION,paused:false}}
 assert.equal(coachDraftMatchesResume(item,'mira'),true)
 assert.equal(coachDraftMatchesResume(item,'genie'),false)
 assert.equal(coachDraftMatchesResume(item,'genie','clarity_day_1'),true)
 assert.equal(coachDraftMatchesResume(item,'mira','clarity_day_2'),false)
 assert.equal(coachDraftMatchesResume(item,'genie','clarity_day_2'),false)
 assert.equal(coachDraftMatchesResume(item,'mira','introductory'),false)
 assert.equal(coachDraftMatchesResume({...item,courseGate:null},'genie','clarity_day_1'),false)
 assert.equal(coachDraftMatchesResume({...item,courseGate:{...item.courseGate,paused:true}},'genie','clarity_day_1'),false)
 assert.equal(coachDraftMatchesResume({...item,courseGate:{...item.courseGate,scenarioVersion:'legacy'}},'genie','clarity_day_1'),false)
 assert.equal(coachDraftMatchesResume({...item,courseSessionId:'clarity_day_2'},'genie','clarity_day_2'),false)
 assert.equal(coachDraftMatchesResume({...item,courseSessionId:'clarity_day_2'},'mira','clarity_day_2'),true)
})
