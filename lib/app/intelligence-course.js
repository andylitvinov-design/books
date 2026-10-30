import 'server-only'
import { transaction } from './database.js'
import { AppError } from '../assessments/contracts.js'

// Only an availability bit is needed for a voluntary continuation suggestion.
// Do not load course titles, encrypted concerns, goals or assessment results.
export async function hasActiveIntelligenceCourse(config, actor, { runTransaction = transaction } = {}) {
  return runTransaction(config, actor, async db => {
    const account = (await db.query('select status,onboarding_state from app.accounts where id=$1', [actor.id])).rows[0]
    if (!account || account.status !== 'active' || account.onboarding_state !== 'active')
      throw new AppError('ACCOUNT_UNAVAILABLE', 403)
    const row = (await db.query("select exists(select 1 from app_private.growth_courses where account_id=$1 and status='active' and stage > 0) as present", [actor.id])).rows[0]
    if (typeof row?.present !== 'boolean') throw new AppError('COURSE_UNAVAILABLE', 503)
    return { hasActiveCourse: row.present }
  })
}
