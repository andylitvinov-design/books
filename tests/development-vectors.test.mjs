import test from 'node:test'
import assert from 'node:assert/strict'
import {COACH_PROFILE_AXES} from '../lib/coaching/coach-profile-intake.mjs'
import {INNER_VECTOR_ITEMS,OUTER_VECTOR_ITEMS,emptyDevelopmentVectors,
 normalizeDevelopmentVectors,toVectorDraft,fromVectorDraft,ratingsFromCoachProtocol,coachVectorSummary
} from '../lib/profile/development-vectors.mjs'
const time='2026-11-22T17:00:00.000Z'
test('exactly two disjoint canonical eight-item tracks',()=>{
 assert.deepEqual(INNER_VECTOR_ITEMS.map(x=>x.id),COACH_PROFILE_AXES.map(x=>x.id))
 assert.equal(INNER_VECTOR_ITEMS.length,8)
 assert.equal(OUTER_VECTOR_ITEMS.length,8)
 assert.equal(new Set([...INNER_VECTOR_ITEMS,...OUTER_VECTOR_ITEMS].map(x=>x.id)).size,16)
})
test('no invented ratings and explicit focus',()=>{
 const x=normalizeDevelopmentVectors(emptyDevelopmentVectors())
 assert.deepEqual(x.inner.ratings,{})
 assert.deepEqual(x.outer.ratings,{})
 assert.equal(x.inner.focusId,null)
})
test('invalid numeric values, unknown IDs and fake provenance are blocked',()=>{
 for(const n of [-1,11,1.5,'6',null]){
  const x=emptyDevelopmentVectors()
  x.inner.ratings.anchor={current:n,desired:8,source:'self',recordedAt:time}
  assert.equal(normalizeDevelopmentVectors(x),null)
 }
 const wrong=emptyDevelopmentVectors()
 wrong.outer.ratings.anchor={current:2,desired:8,source:'self',recordedAt:time}
 assert.equal(normalizeDevelopmentVectors(wrong),null)
 const fake=emptyDevelopmentVectors()
 fake.inner.ratings.anchor={current:2,desired:8,source:'AI',recordedAt:time}
 assert.equal(normalizeDevelopmentVectors(fake),null)
})
test('half-completed draft blocks save without fabricating missing values',()=>{
 const draft=toVectorDraft(emptyDevelopmentVectors())
 draft.inner.ratings.anchor={current:'2',desired:''}
 assert.equal(fromVectorDraft(draft),null)
 draft.inner.ratings.anchor.desired='9'
 const x=fromVectorDraft(draft,{now:time,touched:{'inner:anchor':true}})
 assert.equal(x.inner.ratings.anchor.current,2)
 assert.equal(x.inner.ratings.anchor.desired,9)
 assert.equal(x.inner.ratings.anchor.source,'self')
})
test('saved client-reviewed coach profile is importable only in canonical order',()=>{
 const p={completedAt:time,profileCheckin:{version:'hh-coach-profile-intake-v1',ratings:[
  {axis:'anchor',kind:'rated',current:2,desired:8},{axis:'connection',kind:'skipped'}]}}
 assert.equal(ratingsFromCoachProtocol(p).anchor.source,'coach')
 assert.equal(ratingsFromCoachProtocol(p).connection,undefined)
 p.profileCheckin.ratings[0].axis='love'
 assert.equal(ratingsFromCoachProtocol(p),null)
})
test('coach handoff includes only saved owner scores and no omitted axes',()=>{
 const x=emptyDevelopmentVectors()
 x.inner.focusId='anchor'
 x.inner.ratings.anchor={current:2,desired:9,source:'self',recordedAt:time}
 assert.match(coachVectorSummary(x,'ru','inner'),/Опора: 2 → 9/)
 assert.doesNotMatch(coachVectorSummary(x,'ru','inner'),/Связь:/)
 assert.equal(coachVectorSummary(emptyDevelopmentVectors(),'ru','inner'),'')
})
