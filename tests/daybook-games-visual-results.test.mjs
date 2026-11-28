import test from 'node:test'
import assert from 'node:assert/strict'
import {daybookGames,gameResult,decodeSavedGame,gameProgress,gameTag} from '../lib/app/daybook-games.mjs'
test('all nine games restore exactly in all three languages, with zero and maximum values',()=>{
 for(const locale of ['ru','en','es'])for(const day of [1,2,3])for(const game of daybookGames(locale,day)){
  for(const max of [false,true]){
   const answers=Object.fromEntries(game.steps.map((s,i)=>[i,s.kind==='scale'?(max?10:0):s.kind==='multi'?(max?s.options.slice(0,3).map((_,j)=>j):[0]):max?s.options.length-1:0]))
   const text=gameResult(game,answers)
   const note={locale,text}
   assert.deepEqual(decodeSavedGame(note,day,game.id),answers)
   assert.equal(decodeSavedGame({...note,text:text+'\nextra'},day,game.id),null)
   assert.equal(decodeSavedGame({...note,text:text.replace(' — ',' / ')},day,game.id),null)
   assert.equal(decodeSavedGame({...note,text:'legacy'},day,game.id),null)
  }
 }
})
test('visual feedback does not replace private journal verification or grant completion',()=>{
 const note=(id)=>({id:'id'+id,kind:'note',goalId:null,revision:1,tags:[gameTag(2,id)],text:'saved'})
 assert.equal(gameProgress([],2).done,0)
 assert.equal(gameProgress([note(1),note(2),note(3)],2).complete,true)
 assert.equal(gameProgress([note(1),note(2),note(3),{...note(2),id:'duplicate'}],2).complete,false)
 assert.equal(gameProgress([{...note(1),revision:0}],2).done,0)
})

test('all three days have one translated practical action cue per game and goal choices allow defer',()=>{
 for(const locale of ['ru','en','es'])for(const day of [1,2,3])for(const game of daybookGames(locale,day)){
  assert.equal(game.steps.length,4)
  const cues=game.steps.filter(s=>typeof s.actionCue==='string')
  assert.equal(cues.length,1)
  assert.ok(cues[0].actionCue.length>30)
  assert.ok(!cues[0].actionCue.includes('|'))
  const answers=Object.fromEntries(game.steps.map((s,i)=>[i,s.kind==='multi'?[0]:0]))
  const saved=gameResult(game,answers)
  assert.ok(!saved.includes(cues[0].actionCue))
  assert.deepEqual(decodeSavedGame({locale,text:saved},day,game.id),answers)
 }
 for(const locale of ['ru','en','es']){
  const [direction,goal,quest]=daybookGames(locale,3)
  const defer={ru:'Пока уточняю',en:'Still exploring',es:'Todavía exploro'}[locale]
  const later={ru:'Пока не готов(а)',en:'Not ready yet',es:'Aún no estoy listo/a'}[locale]
  assert.equal(direction.steps[0].options.at(-1),defer)
  assert.ok(goal.steps.every(s=>s.options.at(-1)===defer))
  assert.ok(quest.steps.every(s=>s.options.at(-1)===later))
 }
})

test('day two preserves legacy answers and distinguishes support observations from plans',()=>{
 for(const locale of ['ru','en','es']){
  const [battery,resources,calm]=daybookGames(locale,2)
  assert.equal(resources.steps[1].options.length,5)
  assert.equal(resources.steps[2].options.length,5)
  assert.equal(resources.steps[3].options.length,7)
  assert.ok(battery.steps[3].actionCue.length>80)
  assert.ok(calm.steps[2].actionCue.length>100)
  for(let status=0;status<7;status++){
   const answers={0:[0],1:0,2:0,3:status}
   const saved=gameResult(resources,answers)
   assert.deepEqual(decodeSavedGame({locale,text:saved},2,2),answers)
  }
  assert.notEqual(resources.steps[3].options[1],resources.steps[3].options[2])
  assert.notEqual(resources.steps[3].options[5],resources.steps[3].options[6])
 }
})
