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


import {coachDraftListSummary,draftTranscriptPrefix,coachDraftDurationExtends,coachDraftMinuteLabel} from '../lib/personal-coaching/protocol-draft.mjs'
test('greeting list summary never returns a transcript or private profile',()=>{
 const item={id:'draft',revision:3,updatedAt:'2026-11-25T12:00:00Z',courseSessionId:'introductory',protocol:{personaId:'mira',locale:'ru',turns:[{role:'user',content:'private text'}],opening:{name:'private name'}}}
 assert.deepEqual(coachDraftListSummary(item),{id:'draft',revision:3,updatedAt:item.updatedAt,courseSessionId:'introductory',personaId:'mira',locale:'ru',turnCount:1,durationSeconds:null})
 assert.ok(!JSON.stringify(coachDraftListSummary(item)).includes('private'))
 const route=readFileSync(new URL('../app/api/app/my-coach/draft/route.js',import.meta.url),'utf8')
 const store=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 assert.ok(route.includes("view:params.get('view')"))
 assert.ok(store.includes("view==='summary'?selected.map(coachDraftListSummary):selected"))
 assert.ok(ui.includes("new URLSearchParams({view:'summary',...(cursor||{})})"))
 assert.ok(ui.includes("action:'resume',id:item.id,revision:item.revision,confirmed:true"))
})
test('checkpoint cannot erase a known interruption but may append an answer or record a new interruption',()=>{
 const a={id:'draft',personaId:'mira',startedAt:'start',turns:[{role:'user',content:'Question'},{role:'assistant',content:'Reply',interrupted:true}]}
 const b={...a,turns:[a.turns[0],{role:'assistant',content:'Reply'}]}
 assert.equal(draftTranscriptPrefix(a,b),false)
 assert.equal(draftTranscriptPrefix(b,a),true)
 assert.equal(draftTranscriptPrefix(a,{...a,turns:[...a.turns,{role:'user',content:'Next'}]}),true)
})

test('time-only progress is persisted, timestamps alone are deduplicated, revisions continue',async()=>{
 const calls=[],queue=createCoachDraftQueue(async(revision,value)=>{calls.push([revision,value.protocol.durationSeconds]);return {saved:true,id:value.protocol.id,revision}},()=>{},4)
 const draft=n=>({courseSessionId:'introductory',protocol:{id:'test',durationSeconds:n,turns:[{role:'user',content:'saved'}]}})
 queue.offer(draft(420));assert.equal(await queue.flush(),5)
 queue.offer({...draft(420),protocol:{...draft(420).protocol,completedAt:'later'}});assert.equal(await queue.flush(),5)
 queue.offer(draft(451));assert.equal(await queue.flush(),6)
 assert.deepEqual(calls,[[5,420],[6,451]])
})
test('duration never decreases and unknown old time is not fabricated',()=>{
 assert.equal(coachDraftDurationExtends({durationSeconds:420},{durationSeconds:419}),false)
 assert.equal(coachDraftDurationExtends({durationSeconds:420},{durationSeconds:null}),false)
 assert.equal(coachDraftDurationExtends({durationSeconds:null},{durationSeconds:0}),true)
 assert.equal(coachDraftDurationExtends({durationSeconds:420},{durationSeconds:420}),true)
 assert.equal(coachDraftDurationExtends({durationSeconds:420},{durationSeconds:451}),true)
 assert.equal(coachDraftMinuteLabel(451,'ru'),'7:31 / 20:00 пройдено')
 assert.equal(coachDraftMinuteLabel(null,'ru'),'Время не записано')
})
test('explicit continuation after private restore freezes the active clock and keeps provider locks',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const gate=readFileSync(new URL('../components/my-coach-greeting-gate.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('setResumePending(true);setPaused(true)'))
 assert.ok(ui.includes('!resumePending&&document.visibilityState'))
 assert.ok(ui.includes('setResumePending(false);setPaused(false);toggleComposer()'))
 assert.ok(ui.includes('window.setInterval(heartbeat,30000)'))
 assert.ok(ui.includes('data-coach-resume-minutes'))
 assert.ok(gate.includes("Начать заново"))
})


test('chronological draft recovery preserves an early name without inventing consent or a previous topic',()=>{
 const turns=[
  {role:'assistant',content:'Как мне вас называть?'},
  {role:'user',content:'Alex'},
  {role:'assistant',content:'Хотите сегодня провести со мной коучинговую сессию?'},
  {role:'user',content:'Да, давайте начнём.'}
 ]
 const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({turns,locale:'ru',personaId:'mira'}))
 assert.equal(opening.name,'Alex')
 assert.equal(opening.checkmarks.invitation,true)
 assert.equal(opening.completed,false)
 const recovered=recoverPrivateOpeningScope({turns,opening,locale:'ru',personaId:'mira'})
 assert.equal(recovered.matched,true)
 assert.equal(recovered.allowPrior,false)
 assert.deepEqual(coachOpeningProtocolSnapshot(coachOpeningProgress({turns,locale:'ru',personaId:'mira',...recovered})),opening)
 const damaged=turns.map((row,index)=>index===0?{...row,interrupted:true}:row)
 assert.equal(recoverPrivateOpeningScope({turns:damaged,opening,locale:'ru',personaId:'mira'}).matched,false)
})
