import test from 'node:test'
import assert from 'node:assert/strict'
import {journalWrite,journalDelete,journalPage,localJournalDay} from '../lib/app/daybook-journal-contract.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
const write={id,operationId:id,revision:0,text:'A private thought',tags:['work'],kind:'note',locale:'en',timezone:'America/Toronto',localDay:'2026-11-22',goalId:null}
test('entry round trips explicit client fields without manufacturing values',()=>{
 assert.deepEqual(journalWrite(write),write)
 assert.deepEqual(journalWrite({...write,tags:['work','work',' calm ']}).tags,['work','calm'])
 for(const kind of ['note','morning','evening']) assert.equal(journalWrite({...write,kind}).kind,kind)
 for(const locale of ['en','ru','es']) assert.equal(journalWrite({...write,locale}).locale,locale)
})
test('rejects invalid identity, optimistic revision, private payload and unknown fields',()=>{
 for(const delta of [{id:'x'},{operationId:'x'},{revision:-1},{revision:0.5},{text:''},{text:'x'.repeat(20001)},{text:'bad\u0000text'},{tags:Array(13).fill('x')},{tags:[12]},{kind:'diagnosis'},{locale:'de'},{timezone:'Mars/Olympus'},{localDay:'2026-02-30'},{localDay:'2026-1-01'},{goalId:'x'},{accountId:id},{saved:true}])
  assert.throws(()=>journalWrite({...write,...delta}))
 assert.throws(()=>journalWrite(null))
 assert.throws(()=>journalWrite({...write,tags:undefined}))
})
test('delete requires an existing revision and explicit retry identity',()=>{
 const value={id,revision:2,operationId:id}
 assert.deepEqual(journalDelete(value),value)
 for(const delta of [{revision:0},{revision:-1},{revision:'2'},{operationId:null},{accountId:id}]) assert.throws(()=>journalDelete({...value,...delta}))
})
test('local day respects UTC boundary and both Toronto DST transitions',()=>{
 assert.equal(localJournalDay('2026-11-22T02:00:00Z','America/Toronto'),'2026-11-21')
 for(const time of ['2026-11-01T05:30:00Z','2026-11-01T06:30:00Z']) assert.equal(localJournalDay(time,'America/Toronto'),'2026-11-01')
 for(const time of ['2026-03-08T06:59:00Z','2026-03-08T07:01:00Z']) assert.equal(localJournalDay(time,'America/Toronto'),'2026-03-08')
 assert.throws(()=>localJournalDay('invalid','America/Toronto'))
})
test('pagination is bounded with explicit UUID cursor, never interpolated SQL',()=>{
 assert.deepEqual(journalPage({}),{limit:30,before:null})
 assert.deepEqual(journalPage({limit:50,before:id}),{limit:50,before:id})
 for(const value of [{limit:0},{limit:51},{limit:1.2},{before:'x'},{accountId:id},{search:'private'}]) assert.throws(()=>journalPage(value))
})
test('an optional private material reference identifies one existing file without a URL or provider payload',()=>{
 const valid=[{kind:'video',id},{kind:'avatar',id},{kind:'photo',id:'portrait'},{kind:'photo',id:'a'.repeat(64)}]
 for(const material of valid)assert.deepEqual(journalWrite({...write,material}).material,material)
 for(const material of [null,{kind:'photo',id:'../portrait'},{kind:'avatar',id:'portrait'},{kind:'audio',id},{kind:'video',id,url:'https://example.test/file'}])
  assert.throws(()=>journalWrite({...write,material}))
})
