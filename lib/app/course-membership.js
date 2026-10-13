import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { courseEntitlements, isOccupiedCourse } from '../inner-growth/course-plans.js'

export async function readCourseMembership(db, actor) {
  const row = (await db.query(
    'select tier,stripe_status,current_period_end,cancel_at_period_end from app_private.course_billing where account_id=$1',
    [actor.id],
  )).rows[0]
  const key=process.env.HH_STRIPE_SECRET_KEY||''
  const ready=Boolean(
    /^sk_(live|test)_[A-Za-z0-9]+$/.test(key) &&
    (process.env.VERCEL_ENV!=='production'||key.startsWith('sk_live_')) &&
    /^whsec_[A-Za-z0-9]+$/.test(process.env.HH_STRIPE_WEBHOOK_SECRET||'') &&
    ['START','ADVANCED','PREMIUM'].every(tier=>/^price_[A-Za-z0-9]+$/.test(
      process.env['HH_STRIPE_PRICE_'+tier]||'')),
  )
  return { ...courseEntitlements(row), checkoutConfigured: ready }
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

export async function assertCourseSlotAllowed(db,actor,courseId){
  const membership=await readCourseMembership(db,actor)
  const rows=(await db.query(`select id from app_private.growth_courses where account_id=$1
    and status in ('active','paused') order by is_primary desc,updated_at desc,id`,[actor.id])).rows
  const index=rows.findIndex(row=>row.id===courseId)
  if(index>=membership.maxActiveCourses)throw new AppError('COURSE_PLAN_LIMIT',409)
  return membership
}
