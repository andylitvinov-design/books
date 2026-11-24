import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createVectorGoalSession} from '../lib/app/daybook-vector-session.mjs'
import {createGoalWorkspaceMemory} from '../lib/app/daybook-goal-editor-session.mjs'
import {VECTOR_SPHERES,VECTOR_AXES} from '../lib/app/daybook-vector-selection.mjs'
const owner=randomUUID()
function fill(session){
 for(const [track,items] of [['spheres',VECTOR_SPHERES],['axes',VECTOR_AXES]])for(const item of items){session.rate(track,item.id,'current','0');session.rate(track,item.id,'desired','7')}
 session.change('sphereId','relationships');session.change('axisId','connection');session.change('statement','Build friendships with regular time together')
}
test('incomplete stage zero never sends or silently chooses ratings',async()=>{
 let calls=0
 const session=createVectorGoalSession(async()=>{calls++},owner)
 session.change('statement','A direction without a questionnaire');await session.save()
 assert.equal(calls,0);assert.equal(session.snapshot().status,'invalid');assert.equal(session.snapshot().draft.spheres.body.current,'')
 assert.equal(session.change('axisId','love'),true)
})
test('lost response retry keeps the goal UUID, operation key and exact snapshot; only one card is created',async()=>{
 let fail=true,stored,clocks=0
 const bodies=[],session=createVectorGoalSession(async(path,body)=>{
  if(body){bodies.push(body);stored={...body,revision:1};if(fail){fail=false;throw Error('response lost')}return {saved:true,goal:stored}}
  return {goal:stored}
 },owner,randomUUID,()=>{clocks++;return '2026-11-23T23:00:00.000Z'})
 fill(session);await session.save()
 assert.equal(session.snapshot().status,'failed');assert.equal(session.change('statement','Different draft'),false)
 const memory=createGoalWorkspaceMemory();memory.set(owner,{selection:{session}})
 assert.equal(memory.get(owner).selection.session,session);assert.equal(memory.get(randomUUID()),null)
 await memory.get(owner).selection.session.save()
 assert.equal(session.snapshot().status,'saved');assert.equal(clocks,1);assert.deepEqual(bodies[0],bodies[1])
 await session.save();assert.equal(bodies.length,2,'saved session cannot create again')
 assert.equal(session.snapshot().result.vectorSelection.spheres.body.current,0)
})
test('two deliberate goal starts create independent IDs and reloadable records',async()=>{
 const records=new Map()
 const fetcher=async(path,body)=>{
  if(body){records.set(body.id,{...body,revision:1});return {saved:true,goal:records.get(body.id)}}
  return {goal:records.get(new URL('https://example.test/'+path).searchParams.get('id'))}
 }
 const first=createVectorGoalSession(fetcher,owner),second=createVectorGoalSession(fetcher,owner)
 fill(first);fill(second);await first.save();await second.save()
 assert.equal(records.size,2);assert.notEqual(first.snapshot().result.id,second.snapshot().result.id)
 assert.deepEqual((await fetcher('personal-goals?id='+first.snapshot().result.id)).goal.vectorSelection,first.snapshot().result.vectorSelection)
})
test('session revoke and account-memory wipe remove answers and cannot accept an in-flight response',async()=>{
 const denied=createVectorGoalSession(async()=>{throw Object.assign(Error('revoked'),{status:403})},owner)
 fill(denied);await denied.save();assert.equal(denied.snapshot().draft,null);assert.equal(denied.snapshot().status,'signed-out')
 let finish,body
 const pending=createVectorGoalSession(async(path,input)=>{body=input;await new Promise(resolve=>{finish=resolve});return {saved:true,goal:{...body,revision:1}}},owner)
 fill(pending);const memory=createGoalWorkspaceMemory();memory.set(owner,{selection:{session:pending}})
 const save=pending.save();memory.clear();finish();await save
 assert.equal(pending.snapshot(),null);assert.equal(memory.get(owner),null)
})
