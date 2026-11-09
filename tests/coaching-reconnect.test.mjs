import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcileCoachingDraft} from '../lib/personal-coaching/reconnect.mjs'

const prior={id:'session-a',status:'active',answers:{one:'old'}}
const questions=[{id:'one'},{id:'two'}]
test('reconnect retains a draft on its original question when the session remains active',()=>{
 const result=reconcileCoachingDraft({prior,current:{...prior,answers:{one:'changed elsewhere'}},questions,questionId:'one',draft:'my unsaved answer',dirty:true})
 assert.deepEqual(result,{index:0,draft:'my unsaved answer',retained:true})
})
test('reconnect uses server answer when no draft was edited',()=>{
 const result=reconcileCoachingDraft({prior,current:{...prior,answers:{one:'new'}},questions,questionId:'one',draft:'old',dirty:false})
 assert.deepEqual(result,{index:1,draft:'',retained:false})
})
test('reconnect does not transfer a draft to another or non-active session',()=>{
 for(const current of [{...prior,id:'session-b'}, {...prior,status:'safety_hold'},null]){
  const result=reconcileCoachingDraft({prior,current,questions,questionId:'one',draft:'private unsaved text',dirty:true})
  assert.equal(result.retained,false)
  assert.notEqual(result.draft,'private unsaved text')
 }
})
