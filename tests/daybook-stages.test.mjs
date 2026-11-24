import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {STAGES,stageText,parseStageEntry,stageRecords,stageReadable,stageTag} from '../lib/app/daybook-stages.mjs'
test('seven pages preserve the approved plan-before-resources order and three locales',()=>{
 assert.deepEqual(STAGES.map(s=>s.id),['discover','vision','plan','resources','obstacles','options','progress'])
 for(const s of STAGES)for(const l of ['en','ru','es'])assert.equal(s[l].length,s.keys.length+2)
 assert.deepEqual(STAGES.filter(s=>s.links.includes('videos')).map(s=>s.id),['resources','obstacles','progress'])
})
test('stage notes round trip across languages; completion requires a real outcome',()=>{
 const s=STAGES[2],key=s.keys.at(-1)
 assert.throws(()=>stageText(s,{days90:'goal'},true),/STAGE_RESULT_REQUIRED/)
 const e={id:'a',kind:'note',goalId:'goal-1',tags:[stageTag(s.id)],text:stageText(s,{[key]:'First step',days90:'90 days'},true),updatedAt:'2026-11-23'}
 assert.equal(parseStageEntry(e).completed,true)
 assert.match(stageReadable(e,'ru'),/First step/)
 assert.equal(stageRecords([e],'goal-2',s.id).length,0)
 assert.equal(stageRecords([e],'goal-1',s.id).length,1)
 assert.equal(parseStageEntry({...e,tags:[]}),null)
 assert.equal(parseStageEntry({...e,text:'arbitrary note'}),null)
})
test('unrated resource stays absent; zero is retained as a genuine rating',()=>{
 const s=STAGES[3]
 const e={kind:'note',tags:[stageTag(s.id)]}
 assert.equal(parseStageEntry({...e,text:stageText(s,{rating:'0'},false)}).answers.rating,'0')
 assert.equal(parseStageEntry({...e,text:stageText(s,{},false)}).answers.rating,undefined)
})
test('workbook uses verified owner saver, explicit completion, pagination and no browser storage',()=>{
 const s=readFileSync(new URL('../components/app/daybook-stages.jsx',import.meta.url),'utf8')
 assert.match(s,/createJournalSaver\(appFetch,accountId\)/)
 assert.match(s,/await saver.current.save\(input\)/)
 assert.match(s,/hasMore\|\|inFlight.current/)
 assert.match(s,/setPending\(input\)/)
 assert.doesNotMatch(s,/localStorage|sessionStorage|fetch\(['"]https:/)
 const j=readFileSync(new URL('../components/app/daybook-journal.jsx',import.meta.url),'utf8')
 assert.match(j,/phase!=='ready'\|\|tab!=='stages'/)
 assert.match(j,/owner.current===account/)
 assert.match(j,/onLoadAll=\{\(\)=>void collect\(false\)\}/)
})
