import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { transaction } from './database.js'
import { summarizeLearningJourney } from './learning-journey.mjs'

// A read-only, account-bound projection. No user-controlled XP writes and no
// psychological values, private answers, session notes, or client records leave here.
export async function readLearningJourney(config, actor) {
  return transaction(config, actor, async db => {
    const account = (await db.query(
      'select status,onboarding_state from app.accounts where id=$1', [actor.id],
    )).rows[0]
    if (account?.status !== 'active' || account.onboarding_state !== 'active')
      throw new AppError('ACCOUNT_UNAVAILABLE', 403)

    const activity = (await db.query(`
      select
        (select count(distinct a.provenance->>'definitionKey')::integer
           from app.assessment_results a
          where a.account_id=$1
            and nullif(a.provenance->>'definitionKey','') is not null) as completed_tests,
        exists (
          select 1 from app_private.academy_course_progress c
           where c.account_id=$1 and c.status='completed' and c.completed_at is not null
        ) as free_course_completed,
        exists (
          select 1 from app.consultation_requests r
          join app.service_offerings s on s.id=r.service_offering_id
           where r.account_id=$1
             and s.confirmed_price=0
             and r.status in ('requested','contacted','closed')
        ) as free_consultation_requested
    `, [actor.id])).rows[0]

    const practitioner = (await db.query(`
      select p.status, p.active,
        exists (
          select 1 from app.practitioner_courses c
          where c.practitioner_id=p.id and c.status <> 'archived'
        ) as authored_draft,
        exists (
          select 1 from app.practitioner_courses c
          where c.practitioner_id=p.id and c.status='published'
        ) as authored_published
       from app.practitioners p
      where p.trusted_auth_user_id=$1
      order by p.created_at desc limit 1
    `, [actor.id])).rows[0]

    return summarizeLearningJourney({
      completedTests: Number(activity?.completed_tests || 0),
      freeCourseCompleted: activity?.free_course_completed === true,
      freeConsultationRequested: activity?.free_consultation_requested === true,
      practitionerStatus: practitioner?.status || null,
      practitionerActive: practitioner?.active === true,
      hasAuthoredCourse: practitioner?.authored_draft === true,
      hasPublishedCourse: practitioner?.authored_published === true,
    })
  })
}
