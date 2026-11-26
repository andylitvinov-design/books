import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {discoverPractices,discoverDayTag,discoverNotes,discoverRecordedDays} from '../lib/app/discover-practice.mjs'
const entry=(day,extra={})=>({id:'note-'+day,revision:1,kind:'note',goalId:null,tags:[discoverDayTag(day)],text:'reflection',...extra})
test('seven localized voluntary practices and stable language-independent tags',()=>{
 for(const locale of ['en','ru','es','unknown']){
  const days=discoverPractices(locale)
  assert.equal(days.length,7)
  assert.deepEqual(days.map(x=>x.day),[1,2,3,4,5,6,7])
  assert.equal(new Set(days.map(x=>x.tag)).size,7)
  assert.ok(days.every(x=>x.title&&x.prompt))
 }
 assert.notEqual(discoverPractices('ru')[0].title,discoverPractices('en')[0].title)
 assert.throws(()=>discoverDayTag(0));assert.throws(()=>discoverDayTag(8));assert.throws(()=>discoverDayTag('1'))
})
test('only saved unscoped practice notes count, not C1 or draft or goal note',()=>{
 const entries=[entry(1),entry(2,{revision:0}),entry(3,{goalId:'other-goal'}),entry(4,{kind:'morning'}),entry(5,{text:' '}),entry(6,{tags:['clarity-week-1']}),entry(7)]
 assert.deepEqual(discoverRecordedDays(entries),[1,7])
 assert.equal(discoverNotes(entries,6).length,0)
 assert.deepEqual(discoverRecordedDays(null),[])
})
test('multiple notes never silently select or overwrite a record',()=>{
 const notes=[entry(1),entry(1,{id:'duplicate'}),entry(3)]
 assert.equal(discoverNotes(notes,1).length,2)
 assert.deepEqual(discoverRecordedDays(notes),[1,3])
})
test('component is integrated into existing protected Clarity journal without new entitlement authority',()=>{
 const page=readFileSync(new URL('../components/app/daybook-journal.jsx',import.meta.url),'utf8')
 const component=readFileSync(new URL('../components/app/discover-practice.jsx',import.meta.url),'utf8')
 assert.match(page,/phase==='ready'&&account\?<><ClarityDaybook/)
 assert.match(page,/DiscoverPractice key=\{'discover:'\+account\}/)
 assert.match(component,/createJournalSaver\(appFetch,accountId\)/)
 assert.match(component,/await saver\.current\.save\(pending\.current\)/)
 assert.match(component,/if\(hasMore\)/)
 assert.match(component,/notes\.length>1/)
 assert.doesNotMatch(component,/localStorage|sessionStorage|entitlement|completeSession|checkout|fetch\(['"]/i)
})
