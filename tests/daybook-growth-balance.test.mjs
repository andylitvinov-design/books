import test from 'node:test'
import assert from 'node:assert/strict'
import {savedDaybookBalance} from '../lib/profile/daybook-growth-balance.mjs'
import {INNER_VECTOR_ITEMS} from '../lib/profile/development-vectors.mjs'
import {COACH_PROFILE_AXES} from '../lib/coaching/coach-profile-intake.mjs'
const vectors={version:1,inner:{focusId:'anchor',ratings:{anchor:{current:0,desired:8,source:'self',recordedAt:'2026-11-22T19:00:00.000Z'}}},outer:{focusId:null,ratings:{}}}
test('saved Growth balance preserves actual zero, provenance and gaps without merging life domains',()=>{
 const result=savedDaybookBalance({goals:{vectors},revision:4,updatedAt:'2026-11-22T20:00:00.000Z'})
 assert.deepEqual(result,vectors);assert.equal(result.inner.ratings.anchor.current,0)
 assert.deepEqual(Object.keys(result.inner.ratings),['anchor']);assert.deepEqual(result.outer.ratings,{})
 assert.deepEqual(INNER_VECTOR_ITEMS.map(x=>x.id),COACH_PROFILE_AXES.map(x=>x.id))
})
test('accounts without recorded axes remain explicitly empty',()=>{
 const result=savedDaybookBalance({goals:{version:1,targets:{},details:{}},revision:0,updatedAt:null})
 assert.deepEqual(result.inner.ratings,{});assert.equal(result.inner.focusId,null)
})
test('malformed server data is unavailable, never a fabricated empty or normalized score',()=>{
 for(const value of [null,{}, {goals:[]},{goals:{vectors:null}},{goals:{vectors:{...vectors,version:2}}},{goals:{vectors:{...vectors,inner:{...vectors.inner,ratings:{anchor:{...vectors.inner.ratings.anchor,current:11}}}}}}])assert.throws(()=>savedDaybookBalance(value),/PRIVATE_BALANCE_UNAVAILABLE/)
})
