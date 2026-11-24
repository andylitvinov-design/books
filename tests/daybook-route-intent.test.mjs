import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {advanceDaybookRouteIntent,vectorStartDecision,daybookRouteOptions} from '../lib/app/daybook-route-intent.mjs'
import {createVectorGoalSession} from '../lib/app/daybook-vector-session.mjs'
import {createGoalWorkspaceMemory} from '../lib/app/daybook-goal-editor-session.mjs'

test('guide is the default; saved stage zero and direct journal routes retain their intent',()=>{
 assert.deepEqual(daybookRouteOptions(),{autoStartVector:false,initialTab:'stages',initialStage:1,initialLevel:1,initialStep:1,initialGoalId:null})
 assert.equal(advanceDaybookRouteIntent(null,daybookRouteOptions()).tab,'stages')
 assert.equal(advanceDaybookRouteIntent(null,daybookRouteOptions({start:'vector'})).tab,'goals')
 for(const tab of ['today','journal','goals','growth'])assert.equal(daybookRouteOptions({tab}).initialTab,tab)
 const goal=randomUUID(),valid=daybookRouteOptions({stage:'8',level:'4',step:'7',goal})
 assert.equal(valid.initialStage,8);assert.equal(valid.initialLevel,4);assert.equal(valid.initialStep,7);assert.equal(valid.initialGoalId,goal)
 for(const bad of ['9','0','-1','1.5','2x',['2'],'<script>']){
  const parsed=daybookRouteOptions({stage:bad,level:bad,step:bad,goal:bad,tab:bad})
  assert.equal(parsed.initialStage,1);assert.equal(parsed.initialLevel,1);assert.equal(parsed.initialStep,1);assert.equal(parsed.initialGoalId,null);assert.equal(parsed.initialTab,'stages')
 }
})

test('same-route navigation moves Today to Goals and assigns one start request per deliberate entry',()=>{
 const initial=advanceDaybookRouteIntent(null,{initialTab:'today'})
 assert.equal(initial.tab,'today');assert.equal(initial.vectorStartRequest,0)
 const first=advanceDaybookRouteIntent(initial,{autoStartVector:true,initialTab:'today'})
 assert.equal(first.tab,'goals');assert.equal(first.vectorStartRequest,1)
 assert.equal(advanceDaybookRouteIntent(first,{autoStartVector:true,initialTab:'today'}),first,'unchanged URL must not reset an internally selected tab or issue another start')
 const catalog=advanceDaybookRouteIntent(first,{initialTab:'goals'})
 assert.equal(catalog.tab,'goals');assert.equal(catalog.vectorStartRequest,1)
 const again=advanceDaybookRouteIntent(catalog,{autoStartVector:true})
 assert.equal(again.tab,'goals');assert.equal(again.vectorStartRequest,2)
 assert.equal(advanceDaybookRouteIntent(again,{autoStartVector:true,initialTab:'goals'}).vectorStartRequest,2,'incidental query changes do not create another draft')
})
test('a consumed or stale intent cannot restart a saved-and-closed wizard after reload or presentation lock',()=>{
 for(const request of [0,1,2])assert.deepEqual(vectorStartDecision({autoStartVector:true,request,consumed:2}),{consume:false,open:false,resume:false})
 assert.deepEqual(vectorStartDecision({autoStartVector:true,request:3,consumed:2}),{consume:true,open:true,resume:false})
 assert.deepEqual(vectorStartDecision({autoStartVector:false,request:3,consumed:2}),{consume:false,open:false,resume:false})
})
test('new route intent preserves a real unfinished editor and never starts a write',()=>{
 let writes=0
 const owner=randomUUID(),memory=createGoalWorkspaceMemory(),session=createVectorGoalSession(async()=>{writes++},owner)
 session.change('statement','Keep these unsaved words')
 const selection={kind:'vector',session};memory.set(owner,{selection,vectorStartConsumed:1})
 const retained=memory.get(owner),decision=vectorStartDecision({autoStartVector:true,request:2,consumed:retained.vectorStartConsumed,hasSelection:true,selectionStatus:session.snapshot().status})
 assert.deepEqual(decision,{consume:true,open:false,resume:true})
 memory.set(owner,{...retained,vectorStartConsumed:2})
 assert.equal(memory.get(owner).selection.session,session);assert.equal(session.snapshot().draft.statement,'Keep these unsaved words');assert.equal(writes,0)
 for(const selectionStatus of ['saving','failed','invalid'])assert.equal(vectorStartDecision({autoStartVector:true,request:3,consumed:2,hasSelection:true,selectionStatus}).open,false)
 assert.equal(vectorStartDecision({autoStartVector:true,request:3,consumed:2,hasSelection:true,selectionStatus:'saved'}).open,true)
 assert.equal(vectorStartDecision({autoStartVector:true,request:3,consumed:2,pendingDelete:true}).open,false)
})
