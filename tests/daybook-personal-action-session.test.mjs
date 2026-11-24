import test from 'node:test'
import assert from 'node:assert/strict'
import {createActionEditorSession} from '../lib/app/daybook-personal-action-session.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
test('new steps remain unconfirmed and unknown saves retain the exact draft across presentation changes',async()=>{
 let fail=true;const bodies=[]
 const session=createActionEditorSession(async(path,body)=>{
  if(body){bodies.push(body);if(fail){fail=false;throw Error('interrupted')}return {saved:true,action:{...body,revision:1}}}
  return {action:{...bodies.at(-1),revision:1,clientConfirmedAt:'2026-11-22T20:00:00.000Z'}}
 },id,id,null,()=>id)
 assert.equal(session.snapshot().draft.confirmed,false)
 session.change('description','My small step');session.change('status','accepted');session.change('confirmed',true)
 const unsubscribe=session.subscribe(()=>{});unsubscribe();await session.save()
 assert.equal(session.snapshot().status,'failed');assert.equal(session.change('description','different'),false)
 await session.save();assert.equal(session.snapshot().status,'saved');assert.equal(session.snapshot().draft.confirmed,false)
 assert.deepEqual(bodies[0],bodies[1]);session.dispose();assert.equal(session.snapshot(),null)
})
test('revoked sessions wipe content and cannot become saved',async()=>{
 const session=createActionEditorSession(async()=>{throw Object.assign(Error('signout'),{status:401})},id,id,null,()=>id)
 session.change('description','private');await session.save()
 assert.equal(session.snapshot().status,'signed-out');assert.equal(session.snapshot().draft,null)
 assert.equal(session.change('description','restore'),false)
})
test('pending erasure remains retryable across presentation changes and requires verified absence',async()=>{
 let fail=true;const bodies=[]
 const session=createActionEditorSession(async(path,body,method)=>{
  if(method==='DELETE'){bodies.push(body);if(fail){fail=false;throw Error('lost response')}return {id,deleted:true}}
  throw Object.assign(Error('absent'),{status:404})
 },id,id,{id,goalId:id,revision:1,description:'Delete this step',timing:'',trigger:'',obstacle:'',fallback:'',feasibilityScore:null,dueAt:null,status:'active'},()=>id)
 await session.remove(false);assert.equal(bodies.length,0)
 await session.remove(true);assert.equal(session.snapshot().status,'failed');assert.equal(session.snapshot().mode,'delete')
 await session.save();assert.equal(bodies.length,1)
 assert.equal(session.change('description','restore'),false)
 await session.remove(true);assert.equal(session.snapshot().status,'deleted');assert.equal(session.snapshot().draft,null)
 assert.deepEqual(bodies[0],bodies[1])
})
