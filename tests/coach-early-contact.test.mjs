import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_EARLY_CONTACT_SECONDS,coachEarlyContactInstruction,coachEarlyTopicReaction} from '../lib/coaching/coach-early-contact.mjs'
import {coachOpeningTurn} from '../lib/coaching/coach-opening-entry.mjs'
import {coachSessionOpeningLine,coachOpeningLiveInstruction,coachOpeningNextReply} from '../lib/coaching/coach-opening-protocol.mjs'
import {COACH_METHOD_IDS,coachMethodStagePlan} from '../lib/coaching/method-protocol-v4.mjs'
import {goalSessionScenario} from '../lib/coaching/goal-session-scenarios.mjs'
const ids=['mira','max','sofia','alex','merlin','harry','genie','caesar','lea','noah','iris','ray']
const messages={en:'I want to discuss money',ru:'Хочу обсудить деньги',es:'Quiero hablar de dinero'}
test('first topical reaction differs by character in all languages and preserves opening gate',()=>{
 assert.equal(COACH_EARLY_CONTACT_SECONDS,120)
 for(const locale of Object.keys(messages)){
  const reactions=ids.map(personaId=>coachEarlyTopicReaction({personaId,locale,message:messages[locale]}))
  assert.equal(new Set(reactions).size,12)
  for(const personaId of ids){
   const line=coachSessionOpeningLine(personaId,locale)
   assert.equal((line.match(/\?/g)||[]).length,1)
   assert.match(coachOpeningLiveInstruction(personaId,locale),/EARLY TOPIC AND CHARACTER CONTRACT/)
   const result=coachOpeningTurn({locale,message:messages[locale],openingHistory:[]},personaId)
   assert.equal(result.openingProgress.completed,false)
   assert.equal(result.openingProgress.checkmarks.invitation,false)
   assert.ok(result.message.includes(coachEarlyTopicReaction({personaId,locale,message:messages[locale]})))
  }
 }
 assert.match(coachEarlyContactInstruction(119),/119 seconds/)
 assert.match(coachOpeningNextReply({personaId:'mira',locale:'ru',current:'focus',attempts:0,answers:{}}),/конкретную тему/)
})
test('no fake opinion on a bare name, refusal, correction, distress or repeated reaction',()=>{
 const common={personaId:'max',locale:'en'}
 for(const message of ['John','yes','No, stop talking about money','My name is John','I want to kill myself over money','I want money but no advice'])assert.equal(coachEarlyTopicReaction({...common,message}),'')
 const message='I want to discuss money'
 const reaction=coachEarlyTopicReaction({...common,message})
 assert.equal(coachEarlyTopicReaction({...common,message,turns:[{role:'assistant',content:reaction}]}),'')
 assert.equal(coachEarlyTopicReaction({...common,message,next:{pendingNameCorrection:{name:'X'}}}),'')
})
test('six personal methods and eight Goal scenarios retain 20min budgets and Goal has explicit first two minute reaction',()=>{
 for(const id of COACH_METHOD_IDS)assert.equal(coachMethodStagePlan(id).targetSeconds,1200)
 for(const id of ['result','motivation','plan','resources','obstacles','possibilities','acceleration','integration']){
  const stages=goalSessionScenario('goal_'+id).stages
  assert.equal(stages[0].start,0);assert.equal(stages[0].end,2)
  assert.match(stages[0].instruction,/character-specific viewpoint/)
  assert.equal(stages.at(-1).end,20)
  for(let i=1;i<stages.length;i++)assert.equal(stages[i-1].end,stages[i].start)
 }
})
test('separate contact time is transmitted but existing consented course clock remains unchanged',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const live=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('contactClockRef.current.sample'))
 assert.ok(ui.includes('sessionClockStarted&&openingProgress.completed'))
 assert.ok(live.includes('contactElapsedSeconds:Math.min'))
})
