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
