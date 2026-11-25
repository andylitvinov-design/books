import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createVectorGoalSession} from '../lib/app/daybook-vector-session.mjs'
import {createGoalWorkspaceMemory} from '../lib/app/daybook-goal-editor-session.mjs'
const owner=randomUUID()
function fill(session){
 session.change('sphereId','relationships');session.rate('spheres','relationships','current','0');session.rate('spheres','relationships','desired','7')
 session.change('axisId','connection');session.rate('axes','connection','current','2');session.rate('axes','connection','desired','8')
 session.change('statement','Build friendships with regular time together')
}
test('incomplete stage zero never sends or silently chooses ratings',async()=>{
 let calls=0
 const session=createVectorGoalSession(async()=>{calls++},owner)
 session.change('statement','A direction without a questionnaire');await session.save()
 assert.equal(calls,0);assert.equal(session.snapshot().status,'invalid');assert.deepEqual(session.snapshot().draft.spheres,{})
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
 assert.equal(session.change('sphereId','work'),false);assert.equal(session.change('axisId','love'),false);assert.equal(session.position(0),false)
 assert.equal(session.rate('spheres','relationships','current','5'),false)
 const memory=createGoalWorkspaceMemory();memory.set(owner,{selection:{session}})
 assert.equal(memory.get(owner).selection.session,session);assert.equal(memory.get(randomUUID()),null)
 await memory.get(owner).selection.session.save()
 assert.equal(session.snapshot().status,'saved');assert.equal(clocks,1);assert.deepEqual(bodies[0],bodies[1])
 await session.save();assert.equal(bodies.length,2,'saved session cannot create again')
 assert.equal(session.snapshot().result.vectorSelection.spheres.relationships.current,0)
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

test('Back and Next preserve deliberate choices; changing sphere, focus or axis cannot reuse stale ratings',async()=>{
 let calls=0
 const session=createVectorGoalSession(async()=>{calls++},owner)
 assert.equal(session.position(1),false)
 assert.equal(session.change('sphereId','work'),true)
 assert.equal(session.rate('spheres','work','current','3'),false,'choose the concrete focus before rating')
 assert.equal(session.change('focusId','finance'),true)
 session.rate('spheres','work','current','3');session.rate('spheres','work','desired','8')
 assert.equal(session.position(1),true);assert.equal(session.position(2),false)
 session.change('axisId','anchor');session.rate('axes','anchor','current','2');session.rate('axes','anchor','desired','9')
 assert.equal(session.position(2),true)
 session.change('statement','My own unchanged words')
 const before=structuredClone(session.snapshot().draft)
 assert.equal(session.position(1),true);assert.equal(session.position(0),true)
 assert.equal(session.position(1),true);assert.equal(session.position(2),true)
 assert.deepEqual(session.snapshot().draft,before)
 session.position(0);session.change('focusId','career_business')
 assert.deepEqual(session.snapshot().draft.spheres,{work:{current:'',desired:''}})
 assert.equal(session.position(1),false);await session.save();assert.equal(calls,0)
 session.change('sphereId','body')
 assert.equal(session.snapshot().draft.focusId,'');assert.deepEqual(session.snapshot().draft.spheres,{body:{current:'',desired:''}})
 assert.equal(session.change('focusId','finance'),false)
 session.change('sphereId','relationships')
 assert.equal(session.snapshot().draft.focusId,'relationships','the only matching focus is explicit in the visible sphere')
 session.rate('spheres','relationships','current','4');session.rate('spheres','relationships','desired','9')
 session.position(1);session.change('axisId','freedom')
 assert.deepEqual(session.snapshot().draft.axes,{freedom:{current:'',desired:''}})
 assert.equal(session.position(2),false);assert.equal(session.rate('axes','anchor','current','2'),false)
 assert.equal(session.change('axisId','made-up'),false)
 session.rate('axes','freedom','current','1');session.rate('axes','freedom','desired','6')
 assert.equal(session.position(2),true)
 assert.equal(session.snapshot().draft.statement,'My own unchanged words')
})
