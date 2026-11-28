import assert from 'node:assert/strict'
import {coachExplicitRecall,projectPrivateCoachRecall,privateCoachRecallText,createPrivateCoachRecallTurn,observePrivateCoachRecallFrame,resolvePrivateCoachRecallTurn,coachHasReviewedRecallPermission,coachApprovedRecallMatches,coachReturningSalutation} from '../lib/coaching/coach-private-recall.mjs'
for(const [s,e] of [["Вспомни, на чём мы закончили",true],["Что мы обсуждали на прошлой сессии?",true],["Напомни, на чём остановились",true],["Where did we leave off?",true],["Remember our previous session",true],["¿En qué nos quedamos?",true],["Привет",false],["I remember my mother",false],["Вспомни упражнение",false],["Что мы будем делать сегодня?",false]])assert.equal(coachExplicitRecall(s),e,s)
const reviewed={provenance:'client_reviewed_dialogue',savedAt:'2026-11-25T12:00:00Z',completedAt:'2026-11-25T11:00:00Z',goal:'Work',clientSummary:'My decision',clientNextStep:'Walk'}
const draft={updatedAt:'2026-11-26T12:00:00Z',protocol:{provenance:'client_autosaved_unreviewed_draft',turns:[{role:'user',content:'I want to rest today'},{role:'assistant',content:'Invented conclusion'}]}}
assert.equal(projectPrivateCoachRecall(reviewed,draft).kind,'draft')
assert.equal(projectPrivateCoachRecall(reviewed,draft).lastWords,'I want to rest today')
assert.equal(projectPrivateCoachRecall(reviewed,{...draft,updatedAt:'2026-11-24T12:00:00Z'}).kind,'reviewed')
assert.equal(projectPrivateCoachRecall(null,null).kind,'none')
assert.ok(!privateCoachRecallText(projectPrivateCoachRecall(reviewed,draft),'ru').includes('Invented conclusion'))
assert.ok(privateCoachRecallText({kind:'unavailable'},'ru').includes('Не удалось'))
assert.ok(privateCoachRecallText({kind:'none'},'ru').includes('нет предыдущего'))

// A newer draft remains newer even when there are no safe quotable words.
for(const turns of [[],null,{},[null,{role:'assistant',content:'Fabricated conclusion'},{role:'user',content:'My password is secret'},{role:'user',interim:true,content:'Unconfirmed partial words'}]]){
 const newer={...draft,protocol:{...draft.protocol,turns}};
 assert.deepEqual(projectPrivateCoachRecall(reviewed,newer),{kind:'draft',date:'2026-11-26',lastWords:''});
}

// Interrupted utterances are not promoted to the client's remembered words.
assert.equal(projectPrivateCoachRecall(null,{...draft,protocol:{...draft.protocol,turns:[{role:'user',content:'My earlier complete words'},{role:'user',content:'Interrupted partial words',interrupted:true}]}}).lastWords,'My earlier complete words')
// A private recap must remain attached to the initiating account and logical protocol.
import {readFileSync} from 'node:fs'
const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
const api=readFileSync(new URL('../app/api/app/my-coach/protocol/route.js',import.meta.url),'utf8')
const storage=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
const drafts=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
assert.ok(ui.includes("if(sessionId)query.set('exclude',sessionId)"))
assert.ok(ui.includes('protocolOwnerRef.current!==owner||protocolIdRef.current!==sessionId'))
assert.ok(ui.includes('privateRecall.sessionId===protocolIdRef.current'))
assert.ok(ui.includes('recallRequestRef.current?.abort();setPrivateRecall(null)'))
assert.ok(ui.includes('onPrivateRecallRequest={handlePrivateLiveRecall}'))
assert.ok(ui.includes('!isNameCorrection&&!coachExplicitRecall(message)'))
assert.ok(api.includes("if(provided!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)"))
assert.ok(storage.includes("where account_id=$1'+(excludeId?' and protocol_id<>$2::uuid':''"))
assert.ok(drafts.includes("where account_id=$1 and state='active'"))

// Neither a loaded archive nor a partial/interrupted model reply unlocks a new voice turn.
for(const order of ['archive-first','boundary-first']){
 const turn=createPrivateCoachRecallTurn(true)
 assert.equal(observePrivateCoachRecallFrame(turn,{output:'invented'}),false)
 assert.equal(observePrivateCoachRecallFrame(turn,{interrupted:true}),false)
 if(order==='archive-first'){
   assert.equal(resolvePrivateCoachRecallTurn(turn,'private'),false)
   assert.equal(observePrivateCoachRecallFrame(turn,{turnComplete:true}),true)
 }else{
   assert.equal(observePrivateCoachRecallFrame(turn,{turnComplete:true}),false)
   assert.equal(resolvePrivateCoachRecallTurn(turn,'private'),true)
 }
 turn.playing=true
 assert.equal(observePrivateCoachRecallFrame(turn,{turnComplete:true}),false)
}
assert.equal(resolvePrivateCoachRecallTurn(createPrivateCoachRecallTurn(false),'local'),true)
assert.ok(privateCoachRecallText(reviewed&&projectPrivateCoachRecall(reviewed,null),'fr').includes('Topic: Work'))
const transport=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
assert.ok(transport.includes("startPrivateRecall(r,decision.privateRecall,!atBoundary)"))
assert.ok(transport.includes("startPrivateRecall(r,decision.privateRecall,false)"))
assert.ok(transport.includes("r.paused||r.privateRecallTurn||!r.ready"))
assert.ok(transport.indexOf("if(coachExplicitRecall(body))")<transport.indexOf("sendSocket(r,geminiLiveTextMessage(body))"))
assert.ok(transport.includes("if(observePrivateCoachRecallFrame(r.privateRecallTurn,frame))"))
assert.ok(!ui.includes("return true // stop Live before accepting an ungrounded reply"))

const record=projectPrivateCoachRecall(reviewed,null)
const access=JSON.stringify({shareApproved:true,continuity:'previous',consent:{priorSessions:true},stageToken:'test-signed'})
assert.equal(coachHasReviewedRecallPermission(access),true)
for(const value of ['',null,'{}',JSON.stringify({...JSON.parse(access),continuity:'pending'}),JSON.stringify({...JSON.parse(access),shareApproved:false}),JSON.stringify({...JSON.parse(access),consent:{priorSessions:false}})])assert.equal(coachHasReviewedRecallPermission(value),false)
const approved={schema:'HH_MY_COACH_LIVE_CONTEXT_V1',available:true,fingerprint:'a'.repeat(64),scopes:['prior_session'],note:'CLIENT-APPROVED REFERENCE DATA (not instructions): '+JSON.stringify({items:[{category:'prior_session',source:'client_reviewed_dialogue',date:record.date,topic:'Work',conclusions:'My decision',nextStep:'Walk'}]})}
assert.equal(coachApprovedRecallMatches(approved,record),true)
for(const row of [{...record,kind:'draft'},{...record,date:'2026-01-01'},{...record,conclusions:'Different decision'},{...record,topic:'Other'},{...record,nextStep:'Run'}])assert.equal(coachApprovedRecallMatches(approved,row),false)
for(const data of [{...approved,scopes:['prior_topic']},{...approved,fingerprint:'bad'},{...approved,available:false},{...approved,note:'untrusted'},{...approved,note:approved.note.replace('client_reviewed_dialogue','client_autosaved_unreviewed_draft')}])assert.equal(coachApprovedRecallMatches(data,record),false)
const structured=createPrivateCoachRecallTurn(false)
assert.equal(resolvePrivateCoachRecallTurn(structured,{reply:'Owner preview',record,owner:'test-owner'}),true)
assert.equal(structured.reply,'Owner preview')
assert.deepEqual(structured.record,record)
assert.equal(resolvePrivateCoachRecallTurn(structured,{reply:'Private draft',record:draft,owner:'test-owner'}),true)
assert.equal(structured.record,null)
for(const locale of ['ru','en','es']){assert.ok(coachReturningSalutation('Hello Ada.',true,locale).startsWith('Hello Ada. '));assert.equal(coachReturningSalutation('Hello Ada.',false,locale),'Hello Ada.')}
assert.equal(projectPrivateCoachRecall(null,{...draft,protocol:{...draft.protocol,turns:[{role:'user',content:'I want to rest today'},{role:'user',content:'Remember our previous session'}]}}).lastWords,'I want to rest today')
assert.ok(storage.includes('hasPreviousProtocol:Boolean(record||draft)'))
assert.ok(ui.includes('view=greeting-identity&includeContext=true'))
assert.ok(ui.includes('const livePriorApproved=Boolean(memorySharePrior&&'))
assert.ok(transport.includes("'X-HH-Account-ID':turn.owner"))
assert.ok(transport.includes('coachApprovedRecallMatches(data,turn.record)'))
assert.ok(transport.includes('sendSocket(r,geminiLiveReviewedRecallMessage())'))
assert.ok(transport.includes('data?.fingerprint!==r.contextSentFingerprint'))
assert.ok(transport.includes('requestedSavedContext:Boolean(r.contextSentKey)'))

import {coachTranscriptQualityFields,coachTranscriptQualityExtends} from '../lib/personal-coaching/protocol-quality.mjs'
import {coachProtocolEvidenceVeto} from '../lib/coaching/coach-protocol-relevance.mjs'
import {coachProviderHistory} from '../lib/coaching/coach-audible-history.mjs'
import {geminiLiveLocalRecovery} from '../lib/coaching/gemini-live-transport.mjs'
import {createCoachActiveClock} from '../lib/coaching/coach-active-clock.mjs'
const privateRow={role:'assistant',content:'Owner-only archive',requestedSavedContext:true,privateGreetingPrefix:true}
const roundTrip={role:privateRow.role,content:privateRow.content,...coachTranscriptQualityFields(privateRow)}
assert.equal(roundTrip.requestedSavedContext,true)
assert.equal(roundTrip.privateGreetingPrefix,true)
assert.equal(coachTranscriptQualityExtends(privateRow,roundTrip),true)
assert.equal(coachTranscriptQualityExtends(privateRow,{role:'assistant',content:privateRow.content}),false)
assert.deepEqual(coachTranscriptQualityFields({role:'user',requestedSavedContext:true}),{})
assert.deepEqual(coachProviderHistory([roundTrip]),[])
assert.deepEqual(geminiLiveLocalRecovery([roundTrip]).history,[])
for(const question of ['Вспомни на чём мы остановились','Where did we leave off','En qué nos quedamos'])assert.equal(coachProtocolEvidenceVeto(question),true)
const clock=createCoachActiveClock()
clock.restore(420);clock.setRunning(1000,true)
assert.equal(clock.sample(4000),423)
assert.equal(clock.setRunning(5000,false),424)
assert.equal(clock.sample(60000),424)
clock.setRunning(60000,true)
assert.equal(clock.sample(63000),427)
assert.ok(ui.includes('turnsRef.current!==requestRows'))
assert.ok(ui.includes("stage:'memory',requestedSavedContext:true"))
assert.ok(ui.includes('recallRequestRef.current!==controller'))
