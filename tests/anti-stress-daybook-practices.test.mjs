import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {daybookGames,gameTag,gameNotes,gameProgress,gameResult,decodeSavedGame,validGameAnswer,antiStressDays} from '../lib/app/anti-stress-daybook-games.mjs'
const note=(game,day,answers)=>({id:'test-'+day+'-'+game.id,locale:game.locale,kind:'note',goalId:null,revision:1,tags:[gameTag(day,game.id)],text:gameResult(game,answers)})
test('three days, nine tap-first practices, four action screens and reviewed results in each locale',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(antiStressDays(locale).length,3)
  for(const day of [1,2,3]){
   const games=daybookGames(locale,day),entries=[]
   assert.equal(games.length,3)
   for(const g of games){
    assert.equal(g.steps.length,4)
    for(const mode of ['skip','zero','max']){
     const answers=Object.fromEntries(g.steps.map((s,i)=>[i,s.kind==='scale'?(mode==='skip'?-1:mode==='zero'?0:10):s.kind==='text'?(mode==='max'?'My own words / Моя опора':''):mode==='max'?s.options.length-1:0]))
     const e=note(g,day,answers)
     assert.deepEqual(decodeSavedGame(e,day,g.id),answers)
     assert.equal(decodeSavedGame({...e,text:e.text+'\nextra'},day,g.id),null)
     if(mode==='max')entries.push(e)
    }
    for(const s of g.steps)if(s.seconds){assert.ok(s.actionCue);assert.ok(s.seconds<=60);assert.equal(s.options.length,4)}
   }
   assert.deepEqual(gameProgress(entries,day),{done:3,total:3,complete:true})
   assert.equal(gameProgress([...entries,{...entries[0],id:'duplicate'}],day).complete,false)
   assert.equal(gameProgress(entries.map(e=>({...e,revision:0})),day).done,0)
   assert.equal(gameProgress(entries.map(e=>({...e,goalId:'goal'})),day).done,0)
   assert.equal(gameProgress(entries.map(e=>({...e,tags:['clarity-game-v1-'+day+'-1']})),day).done,0)
   assert.equal(gameProgress(entries.map(e=>({...e,text:'invalid'})),day).done,0)
   assert.equal(gameNotes(entries,day,1).length,1)
   assert.equal(gameNotes(entries.map(e=>({...e,tags:[...e.tags,gameTag(day,2)]})),day,1).length,0)
  }
 }
})
test('optional ratings and self-originated resource words, no forced answers or fake values',()=>{
 assert.equal(validGameAnswer({kind:'scale'},-1),true)
 assert.equal(validGameAnswer({kind:'scale'},-2),false)
 assert.equal(validGameAnswer({kind:'scale'},11),false)
 assert.equal(validGameAnswer({kind:'text'},''),true)
 assert.equal(validGameAnswer({kind:'text'},'a\nb'),false)
 assert.equal(validGameAnswer({kind:'text'},'x'.repeat(141)),false)
 assert.throws(()=>gameResult(daybookGames('en',1)[0],{}),/INCOMPLETE_GAME/)
 assert.throws(()=>gameTag(4,1),/INVALID_GAME/)
})
test('existing journal saver, signed-in guard and exact course links; no coach runtime or new billing',()=>{
 const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const flow=source('components/app/anti-stress-daybook.jsx')
 const journal=source('components/app/daybook-journal.jsx')
 const myPage=source('components/app/my-page-client.jsx')
 const route=source('app/[locale]/app/daybook/page.jsx')
 assert.match(flow,/clarity-practice\.module\.css/)
 assert.match(flow,/createJournalSaver\(appFetch,accountId\)/)
 assert.match(flow,/await saver\.current\.save\(pending\.current\)/)
 assert.match(flow,/onSaved\(saved\)/)
 assert.match(flow,/visibilitychange/)
 assert.match(flow,/onSessionLost\(\)/)
 assert.match(flow,/data-practice-action-cue/)
 assert.match(flow,/data-game-visual-result/)
 assert.match(flow,/gameTag\(day,id\)/)
 assert.doesNotMatch(flow,/localStorage|sessionStorage|anti-stress\/session|payment|awardXP/)
 assert.match(journal,/antiStressMode/)
 assert.match(journal,/phase==='ready'&&account\?<AntiStressDaybook/)
 assert.match(myPage,/\/app\/daybook\?program=anti-stress/)
 assert.match(route,/\['clarity','anti-stress'\]/)
})
