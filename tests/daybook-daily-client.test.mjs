import test from 'node:test'
import assert from 'node:assert/strict'
import {createDailyIntentionSaver,createDailyEditorSession} from '../lib/app/daybook-daily-client.mjs'
const owner='550e8400-e29b-41d4-a716-446655440000',id='550e8400-e29b-41d4-a716-446655440001',goal='550e8400-e29b-41d4-a716-446655440002',action='550e8400-e29b-41d4-a716-446655440003'
const input={id,revision:0,localDay:'2026-11-22',timezone:'America/Toronto',weeklyGoalId:goal,actionIds:[action],carriedActionIds:[],carryFromDay:null,confirmed:true}
const plan={goals:[{id:goal,title:'Synthetic focus',status:'active'}],actions:[{id:action,goalId:goal,status:'active',clientConfirmedAt:'2026-11-22T10:00:00Z',description:'Synthetic step'}]}
test('daily save requires independent readback and retains identical retry operation',async()=>{
 let body,fail=true;const requests=[]
 const saver=createDailyIntentionSaver(async(path,value)=>{
  if(value){body=value;requests.push(value);if(fail){fail=false;throw new Error('offline')}return {saved:true,intention:{...value,revision:1}}}
  return {intention:{...body,revision:1}}
 },owner,()=>owner)
 await assert.rejects(saver.save(input));assert.equal(saver.hasPending(),true)
 await assert.rejects(saver.save({...input,weeklyGoalId:null}),{code:'DAYBOOK_RETRY_PENDING'})
 assert.equal((await saver.save(input)).revision,1);assert.deepEqual(requests[0],requests[1]);assert.equal(saver.hasPending(),false)
})
test('changed readback and disposed acknowledgement never become saved',async()=>{
 const saver=createDailyIntentionSaver(async(path,body)=>body?{saved:true,intention:{...body,revision:1}}:{intention:{...input,revision:1,weeklyGoalId:null}},owner,()=>owner)
 await assert.rejects(saver.save(input),{code:'DAYBOOK_READBACK_CONFLICT'})
 let finish;const disposed=createDailyIntentionSaver(()=>new Promise(r=>{finish=r}),owner,()=>owner)
 const task=disposed.save(input);disposed.discard();finish({saved:true,intention:{...input,revision:1}})
 await assert.rejects(task,{code:'ACCOUNT_CHANGED'})
})
test('loading and reviewing carryover choose nothing; only explicit toggles change draft, not source',async()=>{
 const writes=[]
 const session=createDailyEditorSession(async(path,body)=>{
  if(body)writes.push(body)
  if(path.startsWith('coaching-life-plan'))return plan
  return {intention:path.includes('2026-11-21')?{...input,localDay:'2026-11-21'}:null}
 },owner,input.localDay,input.timezone,'en',()=>id)
 await session.load();assert.deepEqual(session.snapshot().draft.actionIds,[]);assert.equal(session.snapshot().draft.weeklyGoalId,null)
 await session.reviewCarryover('2026-11-21');assert.deepEqual(session.snapshot().offer.actionIds,[action]);assert.deepEqual(session.snapshot().draft.actionIds,[])
 session.toggleCarry(action);assert.deepEqual(session.snapshot().draft.carriedActionIds,[action])
 assert.equal(session.snapshot().draft.carryFromDay,'2026-11-21');assert.equal(writes.length,0);assert.equal(plan.actions[0].status,'active')
 session.toggleAction(action);assert.deepEqual(session.snapshot().draft.carriedActionIds,[]);assert.equal(session.snapshot().draft.carryFromDay,null)
})
test('presentation unsubscribe preserves failed draft and same-operation retry; editing stays locked',async()=>{
 let saved,fail=true;const requests=[]
 const session=createDailyEditorSession(async(path,body)=>{
  if(path.startsWith('coaching-life-plan'))return plan
  if(body){requests.push(body);if(fail){fail=false;throw new Error('offline')}saved={...body,revision:1};return {saved:true,intention:saved}}
  return {intention:saved||null}
 },owner,input.localDay,input.timezone,'en',()=>id)
 await session.load();session.setFocus(goal);session.toggleAction(action)
 const unsubscribe=session.subscribe(()=>{});unsubscribe();await session.save()
 assert.equal(session.snapshot().status,'failed');assert.equal(session.setFocus(null),false)
 await session.save();assert.equal(session.snapshot().status,'saved');assert.equal(session.snapshot().draft.revision,1);assert.deepEqual(requests[0],requests[1])
})
test('account revocation and disposal wipe selections and ignore late reads',async()=>{
 const denied=createDailyEditorSession(async()=>{throw Object.assign(new Error('denied'),{status:403})},owner,input.localDay,input.timezone,'en',()=>id)
 await denied.load();assert.equal(denied.snapshot().phase,'signed-out');assert.equal(denied.snapshot().draft,null);assert.equal(denied.snapshot().plan,null)
 let finish;const session=createDailyEditorSession(path=>path.startsWith('coaching-life-plan')?Promise.resolve(plan):new Promise(r=>{finish=r}),owner,input.localDay,input.timezone,'en',()=>id)
 const pending=session.load();session.dispose();finish({intention:input});await pending;assert.equal(session.snapshot(),null)
})
test('daily clearing retries one operation and requires independent 404 before resetting selections',async()=>{
 let failed=true;const bodies=[]
 const session=createDailyEditorSession(async(path,body,method)=>{
  if(path.startsWith('coaching-life-plan'))return plan
  if(method==='DELETE'){bodies.push(body);return {id,deleted:true}}
  if(path.includes('?id=')){if(failed){failed=false;throw new Error('read interrupted')}throw Object.assign(new Error('absent'),{status:404})}
  return {intention:{...input,revision:1}}
 },owner,input.localDay,input.timezone,'en',()=>owner)
 await session.load();await session.remove();assert.equal(session.snapshot().status,'delete-failed')
 assert.equal(session.setFocus(null),false);assert.equal(session.snapshot().draft.revision,1)
 await session.remove();assert.equal(session.snapshot().status,'deleted');assert.equal(session.snapshot().draft.revision,0)
 assert.deepEqual(session.snapshot().draft.actionIds,[]);assert.deepEqual(bodies[0],bodies[1])
})
test('daily selection caps at three without accepting proposals or mutating canonical state',async()=>{
 const ids=[3,4,5,6].map(n=>'550e8400-e29b-41d4-a716-44665544000'+n)
 const options={...plan,actions:ids.map(key=>({...plan.actions[0],id:key}))}
 options.actions.push({...plan.actions[0],id:owner,status:'proposed'})
 const session=createDailyEditorSession(async path=>path.startsWith('coaching-life-plan')?options:{intention:null},owner,input.localDay,input.timezone,'en',()=>id)
 await session.load();for(const key of ids.slice(0,3))assert.equal(session.toggleAction(key),true)
 assert.equal(session.toggleAction(ids[3]),false);assert.equal(session.snapshot().status,'limit')
 assert.equal(session.toggleAction(owner),false);assert.equal(session.snapshot().draft.actionIds.length,3)
 assert.ok(options.actions.slice(0,4).every(item=>item.status==='active'))
})
test('a failed reload cannot write a hidden stale selection',async()=>{
 let unavailable=false,writes=0
 const session=createDailyEditorSession(async(path,body)=>{
  if(body){writes++;return {saved:true,intention:{...body,revision:1}}}
  if(unavailable)throw new Error('offline')
  return path.startsWith('coaching-life-plan')?plan:{intention:null}
 },owner,input.localDay,input.timezone,'en',()=>id)
 await session.load();session.setFocus(goal);unavailable=true;await session.load(true)
 assert.equal(session.snapshot().phase,'error');await session.save();assert.equal(writes,0)
 assert.equal(session.setFocus(null),false)
})
