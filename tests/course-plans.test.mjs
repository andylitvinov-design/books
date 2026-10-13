import test from 'node:test'
import assert from 'node:assert/strict'
import { COURSE_PLANS, courseEntitlements, effectiveCourseTier, isOccupiedCourse } from '../lib/inner-growth/course-plans.js'
test('Free/Start/Advanced/Premium capacity and stated euro pricing', () => {
  assert.deepEqual(Object.values(COURSE_PLANS).map(p => [p.euroMonthly,p.maxActiveCourses]), [[0,1],[10,1],[20,5],[100,5]])
  assert.equal(COURSE_PLANS.start.adFree, true)
  assert.equal(COURSE_PLANS.advanced.adFree, true)
  assert.equal(COURSE_PLANS.premium.includedTests, true)
  assert.equal(COURSE_PLANS.premium.personalSessionsMonthly, 1)
})
test('paid entitlement requires an active provider subscription within its paid period', () => {
  const period = new Date(Date.now() + 3600000).toISOString()
  const good = { tier:'advanced', stripe_status:'active', current_period_end:period }
  assert.equal(effectiveCourseTier(good), 'advanced')
  assert.equal(courseEntitlements(good).maxActiveCourses, 5)
  for (const stripe_status of ['canceled','past_due','unpaid','incomplete','inactive'])
    assert.equal(effectiveCourseTier({...good,stripe_status}), 'free')
  assert.equal(effectiveCourseTier({...good,current_period_end:new Date(Date.now()-3600000).toISOString()}),'free')
  assert.equal(effectiveCourseTier({...good,tier:'made-up'}),'free')
  assert.equal(effectiveCourseTier({...good,current_period_end:null}),'free')
})
test('pausing keeps a slot occupied, finishing and closing release it', () => {
  assert.equal(isOccupiedCourse({ status:'active' }),true)
  assert.equal(isOccupiedCourse({ status:'paused' }),true)
  assert.equal(isOccupiedCourse({ status:'completed' }),false)
  assert.equal(isOccupiedCourse({ status:'archived' }),false)
})
