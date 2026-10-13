import { AppError, requireUUID } from '../assessments/contracts.js'

export async function lockCourseOwner(db, actor) {
  const row = (await db.query('select status,onboarding_state from app.accounts where id=$1 for update', [actor.id])).rows[0]
  if (!row || row.status !== 'active' || row.onboarding_state !== 'active') throw new AppError('ACCOUNT_UNAVAILABLE', 403)
}

export async function selectOwnedCourse(db, actor, { courseId, mutation = false, allowMissing = false, primary = false } = {}) {
  if (courseId != null) requireUUID(courseId)
  const rows = (await db.query(`select * from app_private.growth_courses where account_id=$1
    ${courseId ? 'and id=$2' : ''} order by ${primary ? 'is_primary desc,' : ''}(case when status='active' then 0 else 1 end),updated_at desc,id desc
    limit ${courseId ? '1' : '2'} ${mutation ? 'for update' : ''}`, courseId ? [actor.id, courseId] : [actor.id])).rows
  if (courseId && !rows.length && !allowMissing) throw new AppError('COURSE_NOT_FOUND', 404)
  // Legacy one-course callers remain supported. With multiple courses every
  // mutation must explicitly identify the target, never whichever loaded last.
  if (mutation && !courseId && rows.length > 1) throw new AppError('COURSE_SELECTION_REQUIRED', 409)
  return rows[0] || null
}

export async function listOwnedCourses(db, actor) {
  return (await db.query(`select id,status,stage,started_at,updated_at from app_private.growth_courses
    where account_id=$1 order by updated_at desc,id desc limit 100`, [actor.id])).rows.map(row => ({
    id: row.id, status: row.status, stage: row.stage,
    startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }))
}

export async function readCourseAccess(db, actor, config) {
  if (config.multiCourseEnabled) {
    const row = (await db.query('select * from app_private.course_access($1)', [config.billingEnvironment])).rows[0]
    if (!row || !['free', 'start', 'advanced', 'premium'].includes(row.tier) || ![1, 5].includes(row.active_course_limit) ||
      !Number.isInteger(row.active_course_count) || row.active_course_count < 0) throw new AppError('COURSE_ACCESS_UNAVAILABLE', 503)
    return { tier: row.tier, activeCourseLimit: row.active_course_limit,
      activeCourseCount: row.active_course_count, overLimit: row.active_course_count > row.active_course_limit, multiCourseEnabled: true }
  }
  const count = (await db.query("select count(*)::integer as count from app_private.growth_courses where account_id=$1 and status='active'", [actor.id])).rows[0]?.count || 0
  return { tier: 'free', activeCourseLimit: 1, activeCourseCount: count, overLimit: count > 1, multiCourseEnabled: false }
}

export async function requireCourseCapacity(db, actor, config, { existingCourseId = null } = {}) {
  // Every caller holds app.accounts FOR UPDATE first, serializing concurrent
  // create/resume requests. The reviewed SQL trigger repeats this safety check.
  const access = await readCourseAccess(db, actor, config)
  if (existingCourseId) {
    const current = await selectOwnedCourse(db, actor, { courseId: existingCourseId })
    if (current.status === 'active') {
      const cycles = (await db.query('select status from app_private.growth_cycles where account_id=$1 and course_id=$2', [actor.id, existingCourseId])).rows
      if (current.stage < 4 || !cycles.length || cycles.some(cycle => cycle.status === 'active')) return access
    }
  }
  if (access.activeCourseCount >= access.activeCourseLimit) throw new AppError('COURSE_ACTIVE_LIMIT', 409)
  return access
}
