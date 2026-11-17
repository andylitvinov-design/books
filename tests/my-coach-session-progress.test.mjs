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
