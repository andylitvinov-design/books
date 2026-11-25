import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_PROGRAM_GROUPS,COACH_PROGRAM_SESSIONS,INTRODUCTORY_COACH_SESSION_ID,COACH_COURSE_SESSIONS,normalizeCoachCourseSessionId,coachCourseLiveInstruction,coachCourseFocusLabel} from '../lib/coaching/coach-course-journey.mjs'
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('three programs match 4/8/4 course sessions; legacy 8 stay available',()=>{
 assert.deepEqual(COACH_PROGRAM_GROUPS.map(g=>[g.id,g.sessions.length]),[['clarity',4],['goal',8],['business',4]])
 assert.equal(COACH_COURSE_SESSIONS.length,8)
 assert.equal(new Set([...COACH_PROGRAM_SESSIONS,...COACH_COURSE_SESSIONS].map(s=>s.id)).size,24)
 for(const group of COACH_PROGRAM_GROUPS)for(const item of group.sessions){
  assert.equal(normalizeCoachCourseSessionId(item.id),item.id)
  for(const lang of ['en','ru','es']){
   assert.ok(item.title[lang]&&item.description[lang])
   assert.ok(coachCourseLiveInstruction(item.id,lang).includes(coachCourseFocusLabel(item.id,lang)))
   assert.match(coachCourseLiveInstruction(item.id,lang),/NOT spoken client consent/)
  }
 }
 assert.throws(()=>normalizeCoachCourseSessionId('business_unknown'))
 assert.equal(coachCourseFocusLabel('business_strategy','ru'),'Стратегический выбор')
 assert.equal(coachCourseFocusLabel('goal_result','ru'),'Определить результат')
})
test('introduction never forces a goal or grants profile access',()=>{
 assert.equal(normalizeCoachCourseSessionId(INTRODUCTORY_COACH_SESSION_ID),'introductory')
 assert.match(coachCourseLiveInstruction(INTRODUCTORY_COACH_SESSION_ID,'ru'),/no preset goal/)
 assert.match(coachCourseLiveInstruction(INTRODUCTORY_COACH_SESSION_ID,'ru'),/NOT spoken client consent/)
})
test('topic modal is free until explicit item selection; topic is committed before start',()=>{
 const gate=load('components/my-coach-greeting-gate.jsx')
 const page=load('components/my-coach-live-dialogue.jsx')
 assert.match(gate,/data-coach-greeting-start/)
 assert.match(gate,/data-coach-greeting-thematic/)
 assert.match(gate,/data-coach-greeting-replay/)
 assert.match(gate,/onClick=\{showTopics\}/)
 assert.match(gate,/onClick=\{\(\)=>chooseSession\(item\.id\)\}/)
 assert.doesNotMatch(gate.slice(gate.indexOf('function showTopics'),gate.indexOf('const label=')),/onStart|chooseSession|live-token/)
 const enter=page.slice(page.indexOf('function enterCoachingFromGreeting'),page.indexOf('const motionPhase='))
 assert.ok(enter.indexOf('setSelectedCourseId(id)')<enter.indexOf('speechRef.current?.startSession?.()'))
 assert.match(enter,/flushSync/)
 assert.match(page,/courseSessionId=\{selectedCourseId\}/)
})
