import test from 'node:test'
import assert from 'node:assert/strict'
import {createGoalEditorSession,createGoalWorkspaceMemory} from '../lib/app/daybook-goal-editor-session.mjs'
const owner='550e8400-e29b-41d4-a716-446655440000'
test('editor session survives presentation unsubscribe and retains verified completion',async()=>{
 let finish,body
 const session=createGoalEditorSession(async(path,input)=>{
  if(input){body=input;await new Promise(r=>{finish=r});return {saved:true,goal:{...body,revision:1}}}
  return {goal:{...body,revision:1}}
 },owner,null,()=>owner)
 session.change('title','Synthetic draft')
 const unsubscribe=session.subscribe(()=>{})
 const pending=session.save();unsubscribe()
 assert.equal(session.snapshot().draft.title,'Synthetic draft')
 finish();await pending
 assert.equal(session.snapshot().status,'saved')
 assert.equal(session.snapshot().draft.revision,1)
 assert.equal(session.snapshot().draft.confirmed,false)
})
test('unknown outcome preserves same operation through presentation restoration',async()=>{
 const bodies=[];let fail=true
 const session=createGoalEditorSession(async(path,input)=>{
  if(input){bodies.push(input);if(fail){fail=false;throw new Error('network')}return {saved:true,goal:{...input,revision:1}}}
  return {goal:{...bodies[0],revision:1}}
 },owner,null,()=>owner)
 session.change('title','Private draft');await session.save()
 assert.equal(session.snapshot().status,'failed')
 assert.equal(session.change('title','Overwrite uncertain request'),false)
 await session.save();assert.deepEqual(bodies[0],bodies[1])
 assert.equal(session.snapshot().status,'saved')
})
test('account-scoped memory rejects other owner and disposes late save on wipe',async()=>{
 const memory=createGoalWorkspaceMemory();let finish
 const session=createGoalEditorSession(()=>new Promise(r=>{finish=r}),owner,null,()=>owner)
 session.change('title','Wipe this draft')
 memory.set(owner,{selection:{session}})
 assert.equal(memory.get('other'),null)
 const pending=session.save();memory.clear();finish({saved:true,goal:{id:owner,revision:1}});await pending
 assert.equal(session.snapshot(),null);assert.equal(memory.get(owner),null)
})
