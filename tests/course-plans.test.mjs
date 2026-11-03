import test from 'node:test'
import assert from 'node:assert/strict'
import { COURSE_PLANS, PAID_COURSE_TIERS, effectiveCourseTier, courseEntitlements, isOccupiedCourse } from '../lib/inner-growth/course-plans.js'
import { SUBSCRIPTION_PLANS } from '../lib/billing/public-plan.js'
const now=Date.parse('2026-10-13T12:00:00Z')
const paid={planId:'premium',environment:'sandbox',paidThroughAt:'2026-11-01T00:00:00Z'}
test('dashboard EUR plans derive from the sole payment catalogue',()=>{
 assert.deepEqual(PAID_COURSE_TIERS,['start','advanced','premium'])
 for(const [key,amount,limit] of [['free',0,1],['start',10,1],['advanced',20,5],['premium',100,5]]){
  assert.equal(COURSE_PLANS[key].euroMonthly,amount);assert.equal(COURSE_PLANS[key].maxActiveCourses,limit)
  assert.equal(COURSE_PLANS[key].euroMonthly,SUBSCRIPTION_PLANS[key].amount/100)
 }
 assert.equal(COURSE_PLANS.premium.personalSessionsMonthly,1);assert.equal(COURSE_PLANS.premium.personalSessionMinutes,60)
})
test('status-only and unknown snapshots never grant paid dashboard access',()=>{
 for(const snapshot of [null,{tier:'premium',status:'active',current_period_end:'2099-01-01'}, {...paid,paidThroughAt:null},{...paid,planId:'plus'},{...paid,environment:'live'},{...paid,revokedAt:'2026-10-12'}])assert.equal(effectiveCourseTier(snapshot,now),'free')
})
test('verified paid coverage survives cancelled renewal and ends at the exact boundary',()=>{
 for(const status of ['active','canceled','past_due','unpaid'])assert.equal(effectiveCourseTier({...paid,status},now),'premium')
 assert.equal(effectiveCourseTier(paid,Date.parse(paid.paidThroughAt)),'free')
 assert.equal(courseEntitlements({...paid,cancelAtPeriodEnd:true},now).cancelAtPeriodEnd,true)
})
test('only concurrently active courses occupy dashboard slots',()=>{
 assert.equal(isOccupiedCourse({status:'active'}),true)
 for(const status of ['paused','completed','archived','locked',null])assert.equal(isOccupiedCourse({status}),false)
})
