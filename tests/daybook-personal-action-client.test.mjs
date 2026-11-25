import test from 'node:test'
import assert from 'node:assert/strict'
import {actionEditorDraft,createPersonalActionSaver} from '../lib/app/daybook-personal-action-client.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
const draft={id,goalId:id,revision:0,description:'My step',timing:'',trigger:'',obstacle:'',fallback:'',feasibilityScore:null,dueAt:null,status:'accepted',confirmed:true}
test('editing an imported action retains wording but never prechecks client confirmation',()=>{
 const result=actionEditorDraft({...draft,revision:2,timing:null,trigger:null,obstacle:null,fallback:null,sourceReportId:id})
 assert.equal(result.confirmed,false);assert.equal(result.timing,'');assert.equal(result.description,draft.description)
 assert.equal(Object.hasOwn(result,'sourceReportId'),false)
})
test('save means full matching independent readback and preserves unknown-operation retry identity',async()=>{
 const bodies=[];let fail=true
 const saver=createPersonalActionSaver(async(path,body)=>{
  if(body){bodies.push(body);if(fail){fail=false;throw Error('offline')}return {saved:true,action:{...body,revision:1}}}
  return {action:{...draft,revision:1,clientConfirmedAt:'2026-11-22T20:00:00.000Z'}}
 },id,()=>id)
 await assert.rejects(saver.save(draft));assert.equal(saver.hasPending(),true)
 await assert.rejects(saver.save({...draft,description:'changed'}),{code:'ACTION_RETRY_PENDING'})
 assert.equal((await saver.save(draft)).revision,1);assert.deepEqual(bodies[0],bodies[1])
})
test('mismatched field readback or missing canonical confirmation cannot report saved',async()=>{
 for(const delta of [{description:'other device'},{fallback:'other'},{clientConfirmedAt:null},{revision:2}]){
  const saver=createPersonalActionSaver(async(path,body)=>body?{saved:true,action:{...body,revision:1}}:{action:{...draft,revision:1,clientConfirmedAt:'2026-11-22T20:00:00.000Z',...delta}},id,()=>id)
  await assert.rejects(saver.save(draft),{code:'ACTION_READBACK_CONFLICT'})
 }
})
test('revoked page memory invalidates in-flight operations; invalid local input remains editable',async()=>{
 let resolve
 const saver=createPersonalActionSaver(()=>new Promise(r=>{resolve=r}),id,()=>id)
 const pending=saver.save(draft);saver.discard();resolve({saved:true,action:{...draft,revision:1}})
 await assert.rejects(pending,{code:'ACCOUNT_CHANGED'})
 const invalid=createPersonalActionSaver(async()=>{throw Error('must not send')},id,()=>id)
 await assert.rejects(invalid.save({...draft,description:''}));assert.equal(invalid.hasPending(),false)
})
