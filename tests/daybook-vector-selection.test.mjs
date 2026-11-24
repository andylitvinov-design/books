import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {VECTOR_SPHERES,VECTOR_AXES,emptyVectorSelectionDraft,vectorDraftPairComplete,vectorSelectionFromDraft,vectorSelectionGoalDraft,normalizeVectorSelection} from '../lib/app/daybook-vector-selection.mjs'
import {personalGoalWrite,preserveGoalVectorSelection} from '../lib/app/daybook-personal-goal-contract.mjs'
import {goalSnapshot,readGoalSnapshot} from '../lib/app/daybook-goal-snapshot.mjs'
import {goalEditorDraft,createPersonalGoalSaver} from '../lib/app/daybook-goal-client.mjs'
const now='2026-11-23T23:00:00.000Z'
function complete(){
 const draft=emptyVectorSelectionDraft(randomUUID())
 for(const [track,items] of [['spheres',VECTOR_SPHERES],['axes',VECTOR_AXES]])for(const item of items)draft[track][item.id]={current:'0',desired:'8'}
 return {...draft,sphereId:'work',axisId:'freedom',statement:'Choose meaningful work with a reliable income',why:'Space for family'}
}
test('stage zero requires all four spheres and all eight actual self-ratings, selected intersection and own words',()=>{
 const empty=emptyVectorSelectionDraft(randomUUID())
 assert.equal(vectorSelectionGoalDraft(empty,now),null)
 const draft=complete(),goal=vectorSelectionGoalDraft(draft,now)
 assert.equal(goal.areaKey,'career_business');assert.deepEqual(goal.axes,['freedom']);assert.equal(goal.title,draft.statement)
 assert.equal(goal.status,'active');assert.equal(goal.confirmed,true);assert.equal(Object.keys(goal.vectorSelection.spheres).length,4);assert.equal(Object.keys(goal.vectorSelection.axes).length,8)
 assert.equal(goal.vectorSelection.spheres.body.current,0)
 assert.equal(vectorDraftPairComplete({current:'0',desired:'0'}),true)
 for(const bad of [
  {...draft,sphereId:''},{...draft,axisId:''},{...draft,statement:'   '},
  {...draft,spheres:{...draft.spheres,body:{current:'',desired:'8'}}},
  {...draft,axes:{...draft.axes,recognition:{current:'0',desired:''}}},
  {...draft,axes:{...draft.axes,agency:{current:'11',desired:'8'}}},
 ])assert.equal(vectorSelectionGoalDraft(bad,now),null)
})
test('snapshot rejects unknown keys, missing pairs, wrong versions and unvalidated scores',()=>{
 const snapshot=vectorSelectionFromDraft(complete(),now)
 assert.deepEqual(normalizeVectorSelection(snapshot),snapshot)
 const bads=[{...snapshot,extra:true},{...snapshot,version:'future-v2'},{...snapshot,axisVersion:'other'},
  {...snapshot,sphereId:'finance'},{...snapshot,axisId:'made-up'},
  {...snapshot,recordedAt:'invalid'},{...snapshot,statement:'\u0000'},
  {...snapshot,spheres:{...snapshot.spheres,body:{current:'0',desired:8}}},
  {...snapshot,axes:{...snapshot.axes,anchor:{current:-1,desired:8}}},
  {...snapshot,axes:{...snapshot.axes,recognition:{current:0,desired:8,diagnosis:'not allowed'}}}]
 for(const bad of bads)assert.equal(normalizeVectorSelection(bad),null)
 assert.equal(vectorSelectionFromDraft({...complete(),sphereId:''},now),null,'largest gap never silently chooses a focus')
})
test('canonical personal-goal contract and encrypted snapshot keep the complete origin through editing',()=>{
 const draft=vectorSelectionGoalDraft(complete(),now),body={...draft,operationId:randomUUID()}
 const value=personalGoalWrite(body)
 const saved=readGoalSnapshot(goalSnapshot(value,{revision:1,requestFingerprint:'a'.repeat(64),confirmedAt:now}),{id:body.id,revision:1})
 assert.deepEqual(saved.vectorSelection,value.vectorSelection)
 assert.deepEqual(goalEditorDraft(saved).draft.vectorSelection,saved.vectorSelection)
 const legacyEdit={...body,revision:1,title:'Refined goal'};delete legacyEdit.vectorSelection
 assert.deepEqual(preserveGoalVectorSelection(legacyEdit,saved).vectorSelection,saved.vectorSelection)
 assert.throws(()=>preserveGoalVectorSelection({...body,revision:1,vectorSelection:{...body.vectorSelection,statement:'Rewrite origin'}},saved),{code:'GOAL_VECTOR_ORIGIN_IMMUTABLE'})
 assert.throws(()=>preserveGoalVectorSelection({...body,revision:1},null),{code:'GOAL_VECTOR_ORIGIN_REQUIRES_NEW_GOAL'})
 for(const bad of [{...body,areaKey:'finance'},{...body,axes:['love']},{...body,title:'Other statement'},{...body,vectorSelection:null}])assert.throws(()=>personalGoalWrite(bad),{code:'INVALID_GOAL_VECTOR'})
})
test('readback missing or altering the questionnaire cannot report goal saved',async()=>{
 const draft=vectorSelectionGoalDraft(complete(),now)
 for(const snapshot of [undefined,{...draft.vectorSelection,axisId:'love'}]){
  const saver=createPersonalGoalSaver(async(path,body)=>body?{saved:true,goal:{...body,revision:1}}:{goal:{...draft,revision:1,vectorSelection:snapshot}},randomUUID())
  await assert.rejects(saver.save(draft),{code:'GOAL_READBACK_CONFLICT'})
 }
})
