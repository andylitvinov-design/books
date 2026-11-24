import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_VISUAL_SCENES,coachVisualClip,normalizeCoachVisualScene,selectCoachVisualScene} from '../lib/coaching/coach-visual-cues.mjs'

test('visual scene library is enumerated, not private text in data attributes',()=>{
 assert.ok(COACH_VISUAL_SCENES.length>=9)
 assert.equal(normalizeCoachVisualScene('unknown'),'calm')
 assert.equal(selectCoachVisualScene({phase:'greeting',text:'Hello'}),'welcome')
 assert.equal(selectCoachVisualScene({phase:'listening',text:'I feel afraid'}),'attentive')
 assert.equal(selectCoachVisualScene({phase:'idle',text:'Next step?'}),'calm')
})
test('RU, EN, ES completed coach replies produce conservative appropriate scenes',()=>{
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'Мне очень трудно об этом говорить.'}),'empathy')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'That sounds painful. What happened?'}),'empathy')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'Es difícil vivir esto.'}),'empathy')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'Какой следующий шаг вы выберете?'}),'action')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'What surprised you most?'}),'curiosity')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'Вы заметили важную закономерность.'}),'insight')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'Спасибо. В завершение обсудим важное.'}),'closure')
 assert.equal(selectCoachVisualScene({phase:'speaking',text:'Take your time.'}),'explain')
})
test('each composition references only the reviewed physical MP4 state files',()=>{
 for(const phase of ['idle','greeting','listening','speaking']){
  for(const scene of COACH_VISUAL_SCENES)
   assert.ok(['greeting','idle','listening','speaking'].includes(coachVisualClip(phase,scene)))
 }
 assert.equal(coachVisualClip('speaking','empathy'),'listening')
 assert.equal(coachVisualClip('speaking','closure'),'idle')
})
