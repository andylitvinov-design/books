import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { courseEntitlements, isOccupiedCourse } from '../inner-growth/course-plans.js'

export async function readCourseMembership(db, actor) {
  const row = (await db.query(
    'select tier,stripe_status,current_period_end,cancel_at_period_end from app_private.course_billing where account_id=$1',
    [actor.id],
  )).rows[0]
  return { ...courseEntitlements(row), checkoutConfigured: Boolean(
    process.env.HH_STRIPE_SECRET_KEY && process.env.HH_STRIPE_WEBHOOK_SECRET &&
    process.env.HH_STRIPE_PRICE_START && process.env.HH_STRIPE_PRICE_ADVANCED &&
    process.env.HH_STRIPE_PRICE_PREMIUM,
  ) }
}
// Caller must lock the owner's account row first so concurrent starts cannot
// race around the plan limit. Pending drafts and paused programmes count.
export async function enforceCourseCapacity(db, actor, { excludeId = null } = {}) {
  const membership = await readCourseMembership(db, actor)
  const rows = (await db.query(
    "select id,status from app_private.growth_courses where account_id=$1 and status in ('active','paused')",
    [actor.id],
  )).rows
  const occupied = rows.filter(row => isOccupiedCourse(row) && row.id !== excludeId).length
  if (occupied >= membership.maxActiveCourses) throw new AppError('COURSE_PLAN_LIMIT', 409)
  return membership
}
export async function lockCourseAccount(db, actor) {
  const locked = (await db.query('select id from app.accounts where id=$1 for update', [actor.id])).rows[0]
  if (!locked) throw new AppError('ACCOUNT_UNAVAILABLE', 403)
}
