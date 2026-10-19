import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, revision } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { openSealed, seal } from '../app/crypto.js'
import {
  ENERGYWORK_KEY, ENERGYWORK_VERSION, ENERGYWORK_LEGACY_VERSION, ENERGYWORK_PREVIOUS_VERSION, ENERGYWORK_P2_VERSION, ENERGYWORK_P3_VERSION, ENERGYWORK_P4_VERSION, ENERGYWORK_P5_VERSION, ENERGYWORK_P6_VERSION, ENERGYWORK_P7_VERSION,
  ENERGYWORK_QUESTIONS, ENERGYWORK_MEDITATION_REPORT_IDS, ENERGYWORK_TANTRA_STUDY_QUESTION_IDS,
  ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS, ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS, energyworkReikiStudyAnswerComplete,
  energyworkAnswerValid, energyworkMeditationFeedbackComplete, energyworkTantraStudyAnswerComplete, energyworkPathValid, energyworkInitiationReady,
  energyworkSequence, energyworkLegacyResumeId, energyworkPreviousResumeId, energyworkP2ResumeId, energyworkP3ResumeId, energyworkP4ResumeId, energyworkP6ResumeId, energyworkP7ResumeId,
} from '../../data/academy/energywork-ai-schema.js'
import { ENERGYWORK_FIRST_LESSON_NEXT, energyworkFirstLessonAnswers } from '../../data/academy/energywork-first-lesson.js'
import {
  reikiLeadSummary, shareReikiEnrollment, updateSharedReikiJournal,
  submitReikiApplication, deleteReikiLeads,
} from './reiki-course-leads.js'
import {
  learnerPublicReviewStatuses, consentToPublicReview, withdrawPublicReview,
  revokePublicReviewOnEdit, deleteAllPublicReviews,
} from './reiki-public-reviews.js'

const encryption = (row) => ({ accountId: row.account_id, recordId: row.id, field: 'academy.answers' })
const iso = (value) => value instanceof Date ? value.toISOString() : value
const MAX_RESPONSES = 64
function answersFrom(row, config) {
  const answers = openSealed(row.answers_ciphertext, encryption(row), config) || {}
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) ||
      Object.keys(answers).length > MAX_RESPONSES)
    throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  return answers
}
function resumeSlideId(row, answers = {}) {
  if (row.course_version === ENERGYWORK_LEGACY_VERSION) return energyworkLegacyResumeId(row.slide_id)
  if (row.course_version === ENERGYWORK_PREVIOUS_VERSION) return energyworkPreviousResumeId(row.slide_id, answers)
  if (row.course_version === ENERGYWORK_P2_VERSION) return energyworkP2ResumeId(row.slide_id, answers)
  if (row.course_version === ENERGYWORK_P3_VERSION) return energyworkP3ResumeId(row.slide_id, answers)
  if (row.course_version === ENERGYWORK_P4_VERSION) return energyworkP4ResumeId(row.slide_id, answers)
  if (row.course_version === ENERGYWORK_P5_VERSION || row.course_version === ENERGYWORK_P6_VERSION) return energyworkP6ResumeId(row.slide_id)
  if (row.course_version === ENERGYWORK_P7_VERSION) return energyworkP7ResumeId(row.slide_id)
  return row.slide_id
}
function snapshot(row, config, lead = {}) {
  if (!row) return {
    enrolled: false, courseId: ENERGYWORK_KEY, courseVersion: ENERGYWORK_VERSION,
    sharingWithTeacher: false, applicationLead: null, enrollmentLead: null,
  }
  const answers = answersFrom(row,config)
  return {
    enrolled: true, courseId: row.course_key,
    courseVersion: [ENERGYWORK_LEGACY_VERSION, ENERGYWORK_PREVIOUS_VERSION, ENERGYWORK_P2_VERSION, ENERGYWORK_P3_VERSION, ENERGYWORK_P4_VERSION, ENERGYWORK_P5_VERSION, ENERGYWORK_P6_VERSION, ENERGYWORK_P7_VERSION].includes(row.course_version)
      ? ENERGYWORK_VERSION : row.course_version,
    slideId: resumeSlideId(row, answers),
    pathId: row.path_id, // retained for backward compatibility; no longer selects a branch
    answers,
    status: row.course_version === ENERGYWORK_LEGACY_VERSION ? 'active' : row.status,
    revision: row.revision,
    savedAt: iso(row.updated_at), completedAt: iso(row.completed_at),
    ...lead,
  }
}
const enrichedSnapshot = async (db, actor, config, row) => snapshot(row,config,{
  ...await reikiLeadSummary(db,actor),
  publicReviews: await learnerPublicReviewStatuses(db,actor),
})
const existing = async (db, actor, locked = false) => (
  await db.query(`select * from app_private.academy_course_progress
    where account_id=$1 and course_key=$2 ${locked ? 'for update' : ''}`,
    [actor.id,ENERGYWORK_KEY])
).rows[0] || null

export function createEnergyworkCourseRepository(config) {
  return {
    read(actor) {
      return transaction(config,actor,async db=>enrichedSnapshot(db,actor,config,
        await existing(db,actor)))
    },
    command(actor, body) {
      onlyKeys(body,['action','consent','teacherConsent','version','slideId','nextSlideId','pathId','answer','secondaryAnswer','expectedRevision','confirmed','locale','firstLesson'])
      if (body.firstLesson !== undefined && body.action !== 'start') throw new AppError('INVALID_FIRST_LESSON',400)
      if (!['start','save','delete','share','apply','submit-review','withdraw-review'].includes(body.action)) throw new AppError('INVALID_ACTION',400)
      if (body.action === 'start') {
        if (body.consent !== true || body.version !== ENERGYWORK_VERSION)
          throw new AppError('COURSE_CONSENT_REQUIRED',400)
        // The first-lesson handoff is an explicit, bounded operation. Do not
        // accept arbitrary slide IDs, extra fields or unvalidated guest notes.
        let firstLesson = null
        if (body.firstLesson !== undefined) {
          if (!body.firstLesson || typeof body.firstLesson !== 'object' ||
              Array.isArray(body.firstLesson) ||
              Object.keys(body.firstLesson).length !== 1 ||
              !Object.hasOwn(body.firstLesson, 'answers') ||
              body.teacherConsent === true)
            throw new AppError('INVALID_FIRST_LESSON',400)
          try { firstLesson = energyworkFirstLessonAnswers(body.firstLesson.answers) }
          catch { throw new AppError('INVALID_FIRST_LESSON',400) }
        }
        return transaction(config,actor,async db=>{
          const account=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[actor.id])).rows[0]
          if (!account || account.status!=='active' || account.onboarding_state!=='active')
            throw new AppError('ACCOUNT_UNAVAILABLE',403)
          const id=randomUUID()
          await db.query(`insert into app_private.academy_course_progress
            (id,account_id,course_key,course_version) values ($1,$2,$3,$4)
            on conflict(account_id,course_key) do nothing`,
            [id,actor.id,ENERGYWORK_KEY,ENERGYWORK_VERSION])
          let progress = await existing(db,actor,Boolean(firstLesson))
          if (firstLesson) {
            // Store the first completed lesson and advance to Lesson 2 in ONE
            // transaction, so a freshly signed-in learner never loses their
            // place. Preserve any older owner's more advanced progress and
            // pre-existing encrypted answers rather than overwriting them.
            const priorAnswers = answersFrom(progress,config)
            const merged = {...firstLesson, ...priorAnswers}
            const sequence = energyworkSequence()
            const savedIndex = sequence.indexOf(resumeSlideId(progress,priorAnswers))
            const nextIndex = sequence.indexOf(ENERGYWORK_FIRST_LESSON_NEXT)
            if (savedIndex < 0 || nextIndex < 0) throw new AppError('COURSE_VERSION_CHANGED',409)
            const destination = sequence[Math.max(savedIndex,nextIndex)]
            const finished = destination === sequence[sequence.length-1]
            const encrypted = seal(merged,encryption(progress),config)
            progress = (await db.query(`update app_private.academy_course_progress
              set slide_id=$3,course_version=$4,answers_ciphertext=$5,
                  revision=revision+1,status=$6,
                  completed_at=case when $6='completed' then coalesce(completed_at,now()) else null end,
                  updated_at=now()
              where account_id=$1 and id=$2 returning *`,
              [actor.id,progress.id,destination,ENERGYWORK_VERSION,encrypted,finished?'completed':'active'])).rows[0]
            if (!progress) throw new AppError('COURSE_NOT_FOUND',404)
            await updateSharedReikiJournal(db,actor,config,progress,merged)
          }
          if (body.teacherConsent === true) {
            await shareReikiEnrollment(db,actor,config,progress,answersFrom(progress,config))
          }
          return enrichedSnapshot(db,actor,config,progress)
        })
      }
      if (body.action === 'share') {
        if (body.version !== ENERGYWORK_VERSION || body.consent !== true ||
            body.teacherConsent !== true) throw new AppError('TEACHER_SHARING_CONSENT_REQUIRED',400)
        return transaction(config,actor,async db=>{
          const progress = await existing(db,actor,true)
          if (!progress) throw new AppError('COURSE_CONSENT_REQUIRED',409)
          await shareReikiEnrollment(db,actor,config,progress,answersFrom(progress,config))
          return enrichedSnapshot(db,actor,config,progress)
        })
      }
      if (body.action === 'delete') {
        if (body.confirmed !== true) throw new AppError('CONFIRMATION_REQUIRED',400)
        return transaction(config,actor,async db=>{
          await deleteReikiLeads(db,actor)
          await deleteAllPublicReviews(db,actor)
          await db.query('delete from app_private.academy_course_progress where account_id=$1 and course_key=$2',
            [actor.id,ENERGYWORK_KEY])
          return snapshot(null,config,{publicReviews:[]})
        })
      }
      if (body.version !== ENERGYWORK_VERSION ||
          !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)
        throw new AppError('COURSE_REVISION_REQUIRED',400)
      if (body.action === 'apply') {
        if (body.confirmed !== true) throw new AppError('CONFIRMATION_REQUIRED',400)
        return transaction(config,actor,async db=>{
          const progress = await existing(db,actor,true)
          if (!progress) throw new AppError('COURSE_CONSENT_REQUIRED',409)
          if (progress.revision !== body.expectedRevision) throw new AppError('COURSE_PROGRESS_CHANGED',409)
          if (progress.course_version !== ENERGYWORK_VERSION ||
              progress.status !== 'completed') throw new AppError('COURSE_NOT_COMPLETED',409)
          const answers = answersFrom(progress,config)
          if (!energyworkInitiationReady(answers)) throw new AppError('INITIATION_REPORTS_REQUIRED',409)
          await submitReikiApplication(db,actor,config,progress,answers)
          return enrichedSnapshot(db,actor,config,progress)
        })
      }
      // Student's separate, explicit opt-in for PUBLIC use. Does not grant CRM
      // access, expose account details, or publish without owner approval.
      if (body.action === 'submit-review' || body.action === 'withdraw-review') {
        if (typeof body.slideId !== 'string') throw new AppError('INVALID_REVIEW',400)
        if (body.action === 'submit-review' &&
            (body.consent !== true || !['en','ru'].includes(body.locale)))
          throw new AppError('PUBLIC_REVIEW_CONSENT_REQUIRED',400)
        return transaction(config,actor,async db=>{
          const progress=await existing(db,actor,true)
          if (!progress) throw new AppError('COURSE_CONSENT_REQUIRED',409)
          if (progress.revision!==body.expectedRevision)
            throw new AppError('COURSE_PROGRESS_CHANGED',409)
          if (body.action === 'submit-review')
            await consentToPublicReview(db,actor,config,answersFrom(progress,config),body.slideId,body.locale)
          else await withdrawPublicReview(db,actor,body.slideId)
          return enrichedSnapshot(db,actor,config,progress)
        })
      }
      if (typeof body.slideId !== 'string' || typeof body.nextSlideId !== 'string')
        throw new AppError('INVALID_SLIDE',400)
      if (body.pathId != null && !energyworkPathValid(body.pathId))
        throw new AppError('INVALID_PATH',400)
      if (body.answer !== undefined &&
          (typeof body.answer !== 'string' || (!ENERGYWORK_MEDITATION_REPORT_IDS.includes(body.slideId) && body.answer.length > 1600) ||
            body.answer.includes('\u0000'))) throw new AppError('INVALID_ANSWER',400)
      if (body.secondaryAnswer !== undefined &&
          (body.slideId !== 'tan-study-02' || !energyworkAnswerValid('tan-study-03', body.secondaryAnswer)))
        throw new AppError('INVALID_ANSWER',400)
      return transaction(config,actor,async db=>{
        const row=await existing(db,actor,true)
        if (!row) throw new AppError('COURSE_CONSENT_REQUIRED',409)
        const legacy = row.course_version === ENERGYWORK_LEGACY_VERSION ||
          row.course_version === ENERGYWORK_PREVIOUS_VERSION ||
          row.course_version === ENERGYWORK_P2_VERSION ||
          row.course_version === ENERGYWORK_P3_VERSION ||
          row.course_version === ENERGYWORK_P4_VERSION ||
          row.course_version === ENERGYWORK_P5_VERSION ||
          row.course_version === ENERGYWORK_P6_VERSION ||
          row.course_version === ENERGYWORK_P7_VERSION
        if (!legacy && row.course_version !== ENERGYWORK_VERSION)
          throw new AppError('COURSE_VERSION_CHANGED',409)
        if (row.revision !== body.expectedRevision) throw new AppError('COURSE_PROGRESS_CHANGED',409)
        // All five lessons follow one fixed sequence, independent of old path_id.
        const sequence=energyworkSequence()
        const slideIndex=sequence.indexOf(body.slideId)
        const nextIndex=sequence.indexOf(body.nextSlideId)
        if (slideIndex < 0 || nextIndex < 0 ||
            nextIndex < slideIndex || nextIndex > slideIndex+1)
          throw new AppError('INVALID_SLIDE',400)
        const answers=answersFrom(row,config)
        const resumeId = resumeSlideId(row, answers)
        const maxBefore=sequence.indexOf(resumeId)
        if (maxBefore < 0 || slideIndex > maxBefore)
          throw new AppError('COURSE_STEP_NOT_READY',409)
        if (body.answer!==undefined) {
          if (!ENERGYWORK_QUESTIONS[body.slideId])
            throw new AppError('INVALID_ANSWER',400)
          if (body.answer && !energyworkAnswerValid(body.slideId,body.answer) &&
              !(['flight-03','tan-03'].includes(body.slideId) &&
                body.answer === (answers[body.slideId] || '')))
            throw new AppError('INVALID_ANSWER',400)
          if (body.answer !== (answers[body.slideId] || ''))
            await revokePublicReviewOnEdit(db,actor,body.slideId)
          if (body.answer === '') delete answers[body.slideId]
          else answers[body.slideId]=body.answer
        }
        if (body.secondaryAnswer !== undefined) {
          const secondaryId = 'tan-study-03'
          if (body.secondaryAnswer !== (answers[secondaryId] || ''))
            await revokePublicReviewOnEdit(db,actor,secondaryId)
          if (body.secondaryAnswer === '') delete answers[secondaryId]
          else answers[secondaryId] = body.secondaryAnswer
        }
        // A short written meditation review is required to advance from these four screens.
        // Previous score-prefixed reviews remain valid; drafts may still be saved privately.
        if (nextIndex > slideIndex && ENERGYWORK_MEDITATION_REPORT_IDS.includes(body.slideId) &&
            !energyworkMeditationFeedbackComplete(answers[body.slideId]))
          throw new AppError('MEDITATION_FEEDBACK_REQUIRED',400)
        // All five active Tantra Reiki answers are required to advance.
        // Historic encrypted answers remain intact but no longer gate completion.
        if (nextIndex > slideIndex && ENERGYWORK_TANTRA_STUDY_QUESTION_IDS.includes(body.slideId) &&
            !energyworkTantraStudyAnswerComplete(answers[body.slideId]))
          throw new AppError('TANTRA_STUDY_ANSWER_REQUIRED',400)
        // Both new Reiki lessons share the existing private, per-question save contract.
        if (nextIndex > slideIndex &&
            (ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS.includes(body.slideId) ||
             ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS.includes(body.slideId)) &&
            !energyworkReikiStudyAnswerComplete(answers[body.slideId]))
          throw new AppError('REIKI_STUDY_ANSWER_REQUIRED',400)
        const resumeIndex=Math.max(maxBefore,nextIndex)
        const nextId=sequence[resumeIndex]
        const finished=nextId===sequence[sequence.length-1]
        const encrypted=seal(answers,encryption(row),config)
        const updated=(await db.query(`update app_private.academy_course_progress
          set slide_id=$3,course_version=$4,answers_ciphertext=$5,revision=revision+1,
              status=$6,completed_at=case when $6='completed' then coalesce(completed_at,now()) else null end,
              updated_at=now()
          where account_id=$1 and id=$2 returning *`,
          [actor.id,row.id,nextId,ENERGYWORK_VERSION,encrypted,finished?'completed':'active'])).rows[0]
        if (!updated) throw new AppError('COURSE_NOT_FOUND',404)
        await updateSharedReikiJournal(db,actor,config,updated,answers)
        return enrichedSnapshot(db,actor,config,updated)
      })
    },
  }
}
