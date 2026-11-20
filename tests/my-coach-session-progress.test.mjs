import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coachSessionProgress,COACH_SESSION_PROGRESS_VERSION} from '../lib/coaching/coach-session-progress.mjs'

const directive=(methodId,stepId,supportedStages=[],ready=false,missing=['not-confirmed'])=>({
 methodId,methodStepId:methodId+':'+stepId,supportedStages,
 readiness:{ready,missing}
})

test('Director evidence starts at one, advances in order, never on phrasing or elapsed time',()=>{
 const initial=coachSessionProgress(directive('grow','goal'))
 assert.equal(initial.schema,COACH_SESSION_PROGRESS_VERSION)
 assert.equal(initial.step,1)
 assert.equal(initial.total,6)
 assert.equal(initial.source,'director-client-evidence')
 assert.equal(coachSessionProgress({...directive('grow','goal'),elapsedSeconds:1800,
   modelMessage:'You have achieved everything.'}).index,0)
 assert.deepEqual([0,1,2,3,4].map(n=>coachSessionProgress(
   directive('grow',['goal','reality','options','way_forward','review'][n],
     ['goal','reality','options','way_forward'].slice(0,n))
 ).step),[1,2,3,4,5])
})

test('Sixth milestone requires confirmed client review, not just assistant summary',()=>{
 const review=directive('grow','review',['goal','reality','options','way_forward'])
 assert.equal(coachSessionProgress(review).step,5)
 assert.equal(coachSessionProgress({...review,readiness:{ready:true,missing:[]}}).step,5)
 const completed=coachSessionProgress(directive('grow','review',
   ['goal','reality','options','way_forward','review'],true,[]))
 assert.equal(completed.step,6)
 assert.equal(completed.stepId,'complete')
 assert.equal(completed.completed,true)
})

test('TGROW can use six genuine steps; corrections may reset previously supported progress',()=>{
 const pending=coachSessionProgress(directive('tgrow','review',
   ['topic','goal','reality','options','way_forward']))
 assert.equal(pending.step,6)
 assert.equal(pending.completed,false)
 assert.equal(pending.stepId,'review')
 const reset=coachSessionProgress(directive('tgrow','topic',[]))
 assert.equal(reset.step,1)
})

test('Invalid or forged progress is not promoted to a verified stage',()=>{
 assert.equal(coachSessionProgress({methodId:'unknown'}),null)
 assert.equal(coachSessionProgress(directive('grow','not-real',[])),null)
 assert.equal(coachSessionProgress(directive('grow','goal',['goal','goal'])),null)
 assert.equal(coachSessionProgress(directive('grow','goal',Array(7).fill('goal'))),null)
})

test('Original six-segment progress is visible and placed between mic and transcript on mobile',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const css=readFileSync(new URL('../components/my-coach-live-dialogue.module.css',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/app/coaching-brain.js',import.meta.url),'utf8')
 assert.match(ui,/data-coach-stage-index=\{visibleStageIndex\+1\}/)
 assert.match(ui,/aria-valuenow=\{visibleStageIndex\+1\}/)
 assert.match(ui,/sessionProgress:result\.sessionProgress/)
 assert.ok(ui.indexOf('data-coach-stage-index')>ui.indexOf('className={styles.voiceControls}'))
 assert.ok(ui.indexOf('data-coach-stage-index')<ui.indexOf('className={styles.voicePrivacyDetails}'))
 assert.match(css,/data-session-visual-v4\] \.voiceWorkspace>\.sessionProgress\{[\s\S]*?display:flex/)
 assert.match(server,/const sessionProgress=directive\?coachSessionProgress\(directive\):null/)
 assert.match(server,/\.\.\.directedCoachOfflineReply\(input,directive,reason\),sessionProgress/)
})

test('Five semantic meaning stages follow only client evidence, not model words or timers',()=>{
 const contact=coachSessionProgress(directive('grow','goal'))
 assert.deepEqual([contact.journey.step,contact.journey.stageId,contact.journey.total],[1,'contact',5])
 const goal=coachSessionProgress({...directive('grow','goal'),evidence:{topicNamed:true}})
 assert.deepEqual([goal.journey.step,goal.journey.stageId],[2,'goal'])
 for(const [id,supported,stage] of [
   ['reality',['goal'],'reality'],['options',['goal','reality'],'options'],
   ['way_forward',['goal','reality','options'],'integration'],
   ['review',['goal','reality','options','way_forward'],'integration']
 ]){
   const result=coachSessionProgress({...directive('grow',id,supported),
     elapsedSeconds:1800,modelMessage:'All stages completed'})
   assert.equal(result.journey.stageId,stage)
 }
 const reset=coachSessionProgress({...directive('grow','goal'),evidence:{goalRestated:false}})
 assert.equal(reset.journey.index,0)
})
test('Alternative methods keep their authentic steps; non-prefix method evidence is rejected',()=>{
 const woop=coachSessionProgress(directive('woop','internal_obstacle',['wish','outcome']))
 assert.equal(woop.journey.stageId,'internal_obstacle')
 assert.equal(woop.journey.step,3)
 assert.equal(coachSessionProgress(directive('tgrow','topic')).journey.stageId,'contact')
 assert.equal(coachSessionProgress(directive('grow','options',['goal'])),null)
 assert.equal(coachSessionProgress(directive('woop','review',['goal','reality'])),null)
})
test('Mobile progress uses five meaning stages and is still server-evidence-driven',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const director=readFileSync(new URL('../lib/coaching/coach-session-director.mjs',import.meta.url),'utf8')
 assert.match(ui,/meaningProgress.total===5/)
 assert.match(ui,/aria-valuemax=\{visibleStageTotal\}/)
 assert.match(ui,/Array.from\(\{length:visibleStageTotal\}/)
 assert.match(ui,/Решение и интеграция/)
 assert.match(director,/NOT five required questions/)
 assert.match(director,/Use ONLY the selected alternative method sequence/)
})
