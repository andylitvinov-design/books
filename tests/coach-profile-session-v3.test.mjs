import test from 'node:test'
import assert from 'node:assert/strict'
import {createCoachProfileSessionV3,coachProfileQuestionV3,applyCoachProfileAnswerV3,requestCoachProfileCorrectionV3,
 closeCoachProfileSessionV3,coachProfileSnapshotV3,coachProfileTrackForCourse,MEANING_AXES_COACH_SESSION_ID,replayCoachProfileSessionV3} from '../lib/coaching/coach-profile-session-v3.mjs'
const sessionId='11111111-1111-4111-8111-111111111111'
const date='2026-11-25T12:00:00.000Z'
const init=(courseSessionId='introductory',locale='ru',approvedBaseline=[])=>createCoachProfileSessionV3({sessionId,courseSessionId,locale,approvedBaseline})
const turn=(q,content,id,extra={})=>({id,role:'user',final:true,questionId:q.id,content,recordedAt:date,...extra})
const respond=(s,content,id='turn-'+s.revision)=>{const q=coachProfileQuestionV3(s);return applyCoachProfileAnswerV3(s,q,turn(q,content,id))}
test('separate track IDs; outer asks current only, allows partial and never invents desired',()=>{
 let s=init()
 assert.equal(coachProfileTrackForCourse('introductory'),'outer')
 assert.equal(coachProfileTrackForCourse(MEANING_AXES_COACH_SESSION_ID),'inner')
 assert.equal(coachProfileTrackForCourse('life_direction'),null)
 assert.equal(coachProfileQuestionV3(s).axis,'body_health')
 assert.equal(coachProfileQuestionV3(s).slot,'current')
 s=respond(s,'0')
 assert.equal(s.rows.body_health.current.value,0)
 assert.equal(s.rows.body_health.desired.value,null)
 s=respond(s,'пропустить')
 assert.equal(s.rows.emotional_wellbeing.current.status,'skipped_by_client')
 assert.equal(coachProfileQuestionV3(s).axis,'relationships')
 const p=coachProfileSnapshotV3(closeCoachProfileSessionV3(s))
 assert.equal(p.status,'partial')
 assert.equal(p.ratings.length,8)
 assert.equal(p.ratings[2].current.status,'not_explored')
 assert.equal(p.ratings[0].current.source.sourceTurnId,'turn-0')
})
test('outer desired questions only for explicitly chosen priorities',()=>{
 let s=init()
 for(let i=0;i<8;i++)s=respond(s,'5')
 assert.equal(coachProfileQuestionV3(s).slot,'priority')
 s=respond(s,'Финансы и Отношения')
 const first=coachProfileQuestionV3(s)
 assert.equal(first.axis,'relationships')
 assert.equal(first.slot,'desired')
 s=respond(s,'8');s=respond(s,'9')
 assert.equal(coachProfileQuestionV3(s),null)
 assert.equal(s.rows.body_health.desired.value,null)
 assert.equal(coachProfileSnapshotV3(s).status,'complete')
})
test('inner asks only missing values, accepts zero and preserves historical provenance',()=>{
 const approvedBaseline=[{axis:'anchor',current:{value:0,source:'client_reviewed_dialogue',recordedAt:date}}]
 let s=init(MEANING_AXES_COACH_SESSION_ID,'en',approvedBaseline)
 assert.equal(coachProfileQuestionV3(s).axis,'anchor')
 assert.equal(coachProfileQuestionV3(s).slot,'desired')
 s=respond(s,'8')
 assert.equal(s.rows.anchor.current.source.kind,'client_reviewed_dialogue')
 assert.equal(s.rows.anchor.desired.value,8)
 assert.equal(coachProfileQuestionV3(s).slot,'pair')
 s=respond(s,'3 and 8')
 assert.equal(s.rows.connection.desired.value,8)
 assert.equal(coachProfileQuestionV3(s).axis,'freedom')
})
test('reject wrong question/track/axis, stale revision, duplicate turn, assistant and interim',()=>{
 const s=init(),q=coachProfileQuestionV3(s),u=turn(q,'5','first')
 for(const bad of [{...q,track:'inner'},{...q,axis:'finance'},{...q,id:'forged'},{...q,revision:1}]){
  assert.throws(()=>applyCoachProfileAnswerV3(s,bad,u),/COACH_PROFILE_SESSION_INVALID/)
 }
 for(const bad of [{...u,role:'assistant'},{...u,final:false},{...u,interim:true},{...u,questionId:'other'}]){
  assert.throws(()=>applyCoachProfileAnswerV3(s,q,bad),/COACH_PROFILE_SESSION_INVALID/)
 }
 const next=applyCoachProfileAnswerV3(s,q,u),nextQ=coachProfileQuestionV3(next)
 assert.throws(()=>applyCoachProfileAnswerV3(next,q,u),/COACH_PROFILE_SESSION_INVALID/)
 assert.throws(()=>applyCoachProfileAnswerV3(next,nextQ,turn(nextQ,'6','first')),/COACH_PROFILE_SESSION_INVALID/)
})
test('question, uncertainty, unrelated quantity and wrong slot do not advance in three languages',()=>{
 for(const [locale,uncertain,wrongSlot,valid] of [
  ['ru','Не знаю','Хочу 8','ноль'],['en',"I don't know",'desired 8','zero'],['es','No sé','quiero 8','cero']
 ]){
  let s=init('introductory',locale)
  for(const value of ['5?',uncertain,wrongSlot,'15','3 children and 8 years']){
   s=respond(s,value)
   assert.equal(coachProfileQuestionV3(s).axis,'body_health')
   assert.equal(s.rows.body_health.current.value,null)
   assert.equal(s.rows.body_health.current.status,'needs_confirmation')
  }
  s=respond(s,valid)
  assert.equal(s.rows.body_health.current.value,0)
 }
})
test('confirmed correction only after a matching user response; keep prior value on unclear or skipped correction',()=>{
 let s=respond(init(),'4')
 s=requestCoachProfileCorrectionV3(s,'body_health','current')
 s=respond(s,'7?')
 assert.equal(s.rows.body_health.current.value,4)
 assert.equal(coachProfileQuestionV3(s).axis,'body_health')
 s=respond(s,'6')
 assert.equal(s.rows.body_health.current.value,6)
 assert.equal(s.history[0].previous.value,4)
 assert.equal(coachProfileQuestionV3(s).axis,'emotional_wellbeing')
 s=requestCoachProfileCorrectionV3(s,'body_health','current')
 s=respond(s,'пропустить')
 assert.equal(s.rows.body_health.current.value,6)
})
test('replay binds sources and produces identical partial snapshot',()=>{
 const initial=init(),q=coachProfileQuestionV3(initial),u=turn(q,'3','turn-1')
 const a=closeCoachProfileSessionV3(applyCoachProfileAnswerV3(initial,q,u))
 const b=replayCoachProfileSessionV3(initial,[{kind:'answer',question:q,turn:u},{kind:'close'}])
 assert.deepEqual(coachProfileSnapshotV3(a),coachProfileSnapshotV3(b))
 assert.equal(coachProfileSnapshotV3(b).ratings[0].current.source.quote,'3')
})
