import test from 'node:test'
import assert from 'node:assert/strict'
import {needsFeasibilityReview,canSaveFeasibility} from '../lib/personal-coaching/feasibility.mjs'

test('pilot asks for feasibility review only for a valid rating below seven',()=>{
 for(const rating of ['0','3','6'])assert.equal(needsFeasibilityReview(true,rating),true)
 for(const rating of ['','7','10','-1','11','2.5','x'])assert.equal(needsFeasibilityReview(true,rating),false)
 assert.equal(needsFeasibilityReview(false,'2'),false)
})
test('review accepts an explicit client choice and never blocks recognized safety content',()=>{
 assert.equal(canSaveFeasibility(true,'3','',false),false)
 assert.equal(canSaveFeasibility(true,'3','considered',false),true)
 assert.equal(canSaveFeasibility(true,'3','keep',false),true)
 assert.equal(canSaveFeasibility(true,'3','forged',false),false)
 assert.equal(canSaveFeasibility(true,'3','',true),true)
 assert.equal(canSaveFeasibility(true,'7','',false),true)
})
