import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  buildCoachProfileAudit, coachProfileReviewProgress, coachProfileReviewNextReply,
  coachProfileReviewProtocolSnapshot, coachProfileSingleScore, COACH_PROFILE_REVIEW_VERSION
} from '../lib/coaching/coach-profile-review.mjs'
import {COACH_PROFILE_AXES} from '../lib/coaching/coach-profile-intake.mjs'
import {normalizeMyCoachProtocol,myCoachProtocolPdfOptions} from '../lib/personal-coaching/session-protocol.mjs'

const date='2026-11-22T12:00:00.000Z'
const mk=(ratings,when=date,version='hh-coach-profile-intake-v1')=>({
 provenance:'client_reviewed_dialogue',completedAt:when,
 profileCheckin:{version,ratings}
})
const completed=(ids=COACH_PROFILE_AXES.slice(0,5).map(a=>a.id))=>ids.map(axis=>({
 axis,kind:'rated',current:3,desired:8,quote:'3 8'
}))

test('5 reviewed axes are not asked twice; only 3 empty axes fill the wheel',()=>{
 const audit=buildCoachProfileAudit([mk(completed())])
 assert.equal(audit.summary.present,5)
 assert.equal(audit.summary.missing,3)
 const first=coachProfileReviewProgress({audit,locale:'ru'})
 assert.equal(first.current,'dignity')
 assert.equal(first.step,6)
 const p=coachProfileReviewProgress({audit,locale:'ru',turns:['4 8','6 9','5 8']})
 assert.equal(p.finished,true)
 assert.equal(p.completed,true)
 assert.equal(p.updates.length,3)
 assert.deepEqual(p.updates.map(x=>x.axis),['dignity','self-realization','recognition'])
 assert.equal(p.ratings[0].current,3)
 assert.match(coachProfileReviewNextReply(p),/Проверка профиля завершена/)
 const snapshot=coachProfileReviewProtocolSnapshot(p)
 assert.equal(snapshot.version,COACH_PROFILE_REVIEW_VERSION)
 assert.equal(snapshot.completed,false)
 assert.equal(snapshot.ratings.length,3)
 assert.equal(JSON.stringify(snapshot).includes('source'),false)
})
test('one old half is kept, one missing half is asked and validated',()=>{
 const audit=buildCoachProfileAudit([mk([
  {axis:'anchor',kind:'partial',current:0,desired:null,quote:'0'}
 ],date,COACH_PROFILE_REVIEW_VERSION)])
 assert.equal(audit.axes[0].status,'partial')
 assert.equal(audit.axes[0].current,0)
 const p=coachProfileReviewProgress({audit,locale:'en',turns:['7']})
 assert.equal(p.updates[0].kind,'partial')
 assert.equal(p.updates[0].current,null)
 assert.equal(p.updates[0].desired,7)
 assert.equal(p.ratings[0].current,0)
 assert.equal(p.ratings[0].desired,7)
 assert.equal(p.current,'connection')
 assert.equal(coachProfileSingleScore('восемь'),8)
 assert.equal(coachProfileSingleScore('seven'),7)
 assert.equal(coachProfileSingleScore('siete'),7)
 assert.equal(coachProfileSingleScore('7 and 9'),null)
})
test('newest partial value merges with an older reviewed desired value',()=>{
 const old=mk([{axis:'anchor',kind:'rated',current:2,desired:8,quote:'2 8'}],
  '2026-11-21T12:00:00.000Z')
 const newer=mk([{axis:'anchor',kind:'partial',current:5,desired:null,quote:'5'}],
  date,COACH_PROFILE_REVIEW_VERSION)
 const audit=buildCoachProfileAudit([newer,old])
 assert.equal(audit.axes[0].current,5)
 assert.equal(audit.axes[0].desired,8)
 assert.equal(audit.axes[0].status,'present')
})
test('skips, inaccessible archive and unreviewed AI output do not become missing zeros',()=>{
 const fake={...mk(completed()),provenance:'ai_only'}
 assert.equal(buildCoachProfileAudit([fake]).summary.present,0)
 const partial=buildCoachProfileAudit([],{exhaustive:false})
 assert.equal(partial.summary.unavailable,8)
 assert.equal(partial.summary.missing,0)
 const skipped=buildCoachProfileAudit([mk([{axis:'anchor',kind:'skipped',current:null,desired:null,quote:'пропустить'}])])
 assert.equal(skipped.axes[0].status,'skipped_by_client')
 const p=coachProfileReviewProgress({audit:skipped,turns:['3 8'],locale:'ru'})
 assert.equal(p.updates[0].axis,'connection')
 assert.equal(p.ratings[0].kind,'skipped')
 assert.equal(coachProfileReviewProgress({audit:{status:'not_authorized',axes:[]}}),null)
})
const proto=(checkin,client='6 9')=>({
 id:'ee6a6327-0394-4530-b2a9-01234567abcd',
 personaId:'mira',locale:'ru',startedAt:new Date(Date.now()-60000).toISOString(),
 completedAt:new Date().toISOString(),
 turns:[{role:'user',content:client},{role:'assistant',content:'Продолжим.'}],
 profileCheckin:checkin
})
test('sparse v2 supports owner-confirmed single axis; PDF does not pad earlier values',()=>{
 const p=normalizeMyCoachProtocol(proto({version:COACH_PROFILE_REVIEW_VERSION,
  completed:false,ratings:[{axis:'recognition',kind:'rated',current:6,desired:9,quote:'6 9'}]}))
 assert.equal(p.profileCheckin.ratings.length,1)
 assert.match(myCoachProtocolPdfOptions(p,{locale:'ru'}).protocolOverview,/Признание: 6 → 9/)
 const partial=normalizeMyCoachProtocol(proto({version:COACH_PROFILE_REVIEW_VERSION,
  completed:false,ratings:[{axis:'freedom',kind:'partial',current:null,desired:7,quote:'7'}]},'7'))
 assert.equal(partial.profileCheckin.ratings[0].axis,'freedom')
})
test('sparse v2 rejects forged score, duplicate, absent quote and false completion',()=>{
 const good={axis:'recognition',kind:'rated',current:6,desired:9,quote:'6 9'}
 const invalid=[
  {...good,current:4},
  {...good,desired:11},
  {...good,axis:'invented'},
  {...good,quote:'unspoken'},
 ]
 for(const item of invalid)assert.throws(
  ()=>normalizeMyCoachProtocol(proto({version:COACH_PROFILE_REVIEW_VERSION,
   completed:false,ratings:[item]})),/MY_COACH_PROTOCOL_INVALID/)
 assert.throws(()=>normalizeMyCoachProtocol(proto({version:COACH_PROFILE_REVIEW_VERSION,
  completed:true,ratings:[good]})),/MY_COACH_PROTOCOL_INVALID/)
 assert.throws(()=>normalizeMyCoachProtocol(proto({version:COACH_PROFILE_REVIEW_VERSION,
  completed:false,ratings:[good,good]})),/MY_COACH_PROTOCOL_INVALID/)
})
test('owner-only staged memory and client UI do not transmit the audit to AI',()=>{
 const service=readFileSync(new URL('../lib/app/my-coach-staged-memory.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const privacy=readFileSync(new URL('../components/my-coach-staged-memory-controls.jsx',import.meta.url),'utf8')
 assert.match(service,/verifyCoachMemoryTicket/)
 assert.match(service,/consent.profile === true/)
 assert.match(service,/readOwnerProfileAudit/)
 assert.match(service,/readOwnerMeasurementPreview/)
 assert.match(privacy,/data-coach-profile-audit/)
 assert.match(privacy,/effectiveTopicKey/)
 assert.match(ui,/profileReviewStart/)
 assert.match(ui,/coachProfileReviewNextReply/)
 assert.match(ui,/const goalEligible=openingProgress.completed&&openingProgress.answers.focus\?\.kind!=='profile'/)
 assert.doesNotMatch(ui,/JSON.stringify\(\{[^}]*profileAudit/)
})

test('an incomplete archive never asks for scores marked unavailable',()=>{
 const unknown=buildCoachProfileAudit([],{exhaustive:false})
 assert.equal(unknown.completeArchive,false)
 assert.ok(unknown.axes.every(axis=>axis.status==='unavailable'))
 assert.equal(coachProfileReviewProgress({audit:unknown,locale:'en'}),null)
 const complete=buildCoachProfileAudit([],{exhaustive:true})
 assert.equal(coachProfileReviewProgress({audit:complete,locale:'en'}).current,COACH_PROFILE_AXES[0].id)
})

test('a bounded scan with all eight saved axes remains reviewable',()=>{
 const audit=buildCoachProfileAudit([mk(completed(COACH_PROFILE_AXES.map(axis=>axis.id)))],{exhaustive:false})
 assert.equal(audit.completeArchive,false)
 assert.ok(audit.axes.every(axis=>axis.status==='present'))
 assert.equal(coachProfileReviewProgress({audit,locale:'en'}).finished,true)
})
