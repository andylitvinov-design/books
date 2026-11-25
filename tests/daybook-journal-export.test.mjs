import test from 'node:test'
import assert from 'node:assert/strict'
import {collectJournalExport} from '../lib/app/daybook-journal-export.mjs'
const accountId='550e8400-e29b-41d4-a716-446655440000'
const entry=n=>({id:`550e8400-e29b-41d4-a716-${String(n).padStart(12,'0')}`,revision:1,text:'Synthetic '+n,tags:[],kind:'note',locale:'en',timezone:'America/Toronto',localDay:'2026-11-22',goalId:null,createdAt:'2026-11-22T12:00:00.000Z',updatedAt:'2026-11-22T12:00:00.000Z'})
test('export walks every page, scopes requests and excludes extra server fields',async()=>{
 const calls=[]
 const result=await collectJournalExport(async(path,body,method,options)=>{
  calls.push({path,method,options})
  return calls.length===1?{entries:[{...entry(1),accessToken:'must never export'}],nextCursor:entry(1).id}:{entries:[entry(2)],nextCursor:null}
 },accountId,()=>true)
 assert.equal(result.entries.length,2)
 assert.equal(JSON.stringify(result).includes('must never export'),false)
 assert.equal(calls[1].path,'daybook-journal?limit=50&before='+entry(1).id)
 assert.ok(calls.every(call=>call.options.accountId===accountId&&call.method==='GET'))
})
test('cancellation, repeated cursors, duplicate records and invalid content fail instead of exporting partial data',async()=>{
 await assert.rejects(collectJournalExport(async()=>({entries:[entry(1)],nextCursor:null}),accountId,()=>false),{code:'ACCOUNT_CHANGED'})
 await assert.rejects(collectJournalExport(async()=>({entries:[entry(1)],nextCursor:entry(1).id}),accountId,()=>true),{code:'JOURNAL_EXPORT_CHANGED'})
 await assert.rejects(collectJournalExport(async()=>({entries:[{...entry(1),revision:0}],nextCursor:null}),accountId,()=>true),{code:'JOURNAL_EXPORT_INVALID'})
 await assert.rejects(collectJournalExport(async()=>({entries:[],nextCursor:entry(1).id}),accountId,()=>true),{code:'JOURNAL_EXPORT_CHANGED'})
})
test('network failure returns no successful partial export',async()=>{
 let count=0
 await assert.rejects(collectJournalExport(async()=>{if(count++)throw new Error('network');return {entries:[entry(1)],nextCursor:entry(1).id}},accountId,()=>true),/network/)
})
