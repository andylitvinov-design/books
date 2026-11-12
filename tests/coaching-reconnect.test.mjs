import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcileCoachingDraft,reconcileCoachingPlan,coachingPlansEqual,reconcileFollowupDraft} from '../lib/personal-coaching/reconnect.mjs'

const prior={id:'session-a',status:'active',answers:{one:'old'}}
const questions=[{id:'one'},{id:'two'}]
test('reconnect retains a draft on its original question when the session remains active',()=>{
 const result=reconcileCoachingDraft({prior,current:{...prior,answers:{one:'changed elsewhere'}},questions,questionId:'one',draft:'my unsaved answer',dirty:true})
 assert.deepEqual(result,{index:0,draft:'my unsaved answer',retained:true,changedAnswer:'changed elsewhere'})
})
test('reconnect uses server answer when no draft was edited',()=>{
 const result=reconcileCoachingDraft({prior,current:{...prior,answers:{one:'new'}},questions,questionId:'one',draft:'old',dirty:false})
 assert.deepEqual(result,{index:1,draft:'',retained:false,changedAnswer:undefined})
})
test('unchanged server answer does not require an overwrite decision',()=>{
 const result=reconcileCoachingDraft({prior,current:prior,questions,questionId:'one',draft:'my new text',dirty:true})
 assert.equal(result.retained,true)
 assert.equal(result.changedAnswer,undefined)
})
test('a concurrently skipped answer is distinct from no conflicting answer',()=>{
 const result=reconcileCoachingDraft({prior,current:{...prior,answers:{one:null}},questions,questionId:'one',draft:'my new text',dirty:true})
 assert.equal(result.changedAnswer,null)
})
test('a second refresh keeps an unresolved overwrite decision visible',()=>{
 const result=reconcileCoachingDraft({prior,current:prior,questions,questionId:'one',draft:'my draft',dirty:true,unresolvedAnswer:'old'})
 assert.equal(result.changedAnswer,'old')
})
test('plan refresh detects another saved plan, and keeps conflict on a second refresh',()=>{
 const old={id:'one',status:'completed',actionPlan:{actionText:'Walk',confidence:4}}
 const current={...old,actionPlan:{actionText:'Rest',confidence:6,approvedAt:'later'}}
 const first=reconcileCoachingPlan(old,current)
 assert.equal(first.kind,'ready')
 assert.equal(first.conflict.actionText,'Rest')
 assert.equal(reconcileCoachingPlan(current,current,first.conflict).conflict.actionText,'Rest')
 assert.equal(coachingPlansEqual({actionText:'Rest',confidence:6},current.actionPlan),true)
 assert.equal(coachingPlansEqual({actionText:'Walk',confidence:4},current.actionPlan),false)
})
test('plan refresh never carries drafts into a different or held session',()=>{
 const prior={id:'one',status:'completed'}
 assert.equal(reconcileCoachingPlan(prior,{id:'two',status:'completed'}).kind,'changed')
 assert.equal(reconcileCoachingPlan(prior,{id:'one',status:'safety_hold'}).kind,'safety_hold')
 assert.equal(reconcileCoachingPlan(prior,null).kind,'changed')
})
test('follow-up refresh preserves unsent text only for the same question and source answer',()=>{
 const pending={questionId:'one',key:'reality_text_v1'}
 const prior={id:'one',status:'active',dialogueProtocol:1,answers:{one:'original'},pendingFollowup:pending}
 assert.equal(reconcileFollowupDraft(prior,prior,pending,'my note'),'retain')
 assert.equal(reconcileFollowupDraft(prior,{...prior,answers:{one:'changed'}},pending,'my note'),'confirm_discard')
 assert.equal(reconcileFollowupDraft(prior,{...prior,id:'two'},pending,'my note'),'confirm_discard')
 assert.equal(reconcileFollowupDraft(prior,{...prior,status:'safety_hold'},pending,'my note'),'safety_hold')
})
test('follow-up refresh recognizes a saved acknowledgement without silently discarding a different draft',()=>{
 const pending={questionId:'one',key:'reality_text_v1'}
 const prior={id:'one',status:'active',dialogueProtocol:1,answers:{one:'original'},pendingFollowup:pending}
 const saved={...prior,pendingFollowup:undefined,reflections:{one:{key:'reality_text_v1',text:'my note'}}}
 assert.equal(reconcileFollowupDraft(prior,saved,pending,' my note '),'saved')
 assert.equal(reconcileFollowupDraft(prior,saved,pending,'different note'),'confirm_discard')
 assert.equal(reconcileFollowupDraft(prior,saved,pending,''),'none')
})
test('reconnect does not transfer a draft to another or non-active session',()=>{
 for(const current of [{...prior,id:'session-b'}, {...prior,status:'safety_hold'},null]){
  const result=reconcileCoachingDraft({prior,current,questions,questionId:'one',draft:'private unsaved text',dirty:true})
  assert.equal(result.retained,false)
  assert.notEqual(result.draft,'private unsaved text')
 }
})
