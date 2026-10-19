import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { seal, openSealed } from '../app/crypto.js'
import { transaction } from '../app/database.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import {
  ENERGYWORK_MEDITATION_REPORT_IDS, energyworkMeditationFeedbackComplete,
} from '../../data/academy/energywork-ai-schema.js'

// A publication consent is NOT the consent to share the rest of a journal
// with the practitioner. The stored excerpt is AES-GCM encrypted and never
// published until both consent and owner approval are independently recorded.
const context = (row) => ({
  accountId: row.account_id, recordId: row.id, field: 'academy.review.public',
})
const reviewedSlides = new Set(ENERGYWORK_MEDITATION_REPORT_IDS)
const date = (value) => value instanceof Date ? value.toISOString() : value
const legacyPrefix = /^Feeling:(?:10|[0-9])\/10\n([\s\S]*)$/
export function plainMeditationReview(answer) {
  if (typeof answer !== 'string') return ''
  return (legacyPrefix.exec(answer)?.[1] ?? answer).trim()
}
const publicText = (row,config) => {
  const value = openSealed(row.body_ciphertext, context(row), config)
  if (typeof value !== 'string' || value.length > 1600)
    throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  return value
}

export async function learnerPublicReviewStatuses(db, actor) {
  const rows = (await db.query(
    'select slide_id,status from app_private.reiki_course_public_reviews where account_id=$1',
    [actor.id],
  )).rows
  return rows.map(row => ({ slideId: row.slide_id, status: row.status }))
}

export async function consentToPublicReview(db, actor, config, progress, answers, slideId, locale) {
  if (!reviewedSlides.has(slideId) || !['en','ru'].includes(locale))
    throw new AppError('INVALID_REVIEW',400)
  const raw = answers[slideId]
  if (!energyworkMeditationFeedbackComplete(raw))
    throw new AppError('REVIEW_TOO_SHORT',400)
  const body = plainMeditationReview(raw)
  const id = randomUUID()
  // Re-consent starts fresh moderation, even when this review was published.
  // Never reuse an old approval for a new text revision.
  await db.query(
    'delete from app_private.reiki_course_public_reviews where account_id=$1 and slide_id=$2',
    [actor.id, slideId],
  )
  await db.query(
    `insert into app_private.reiki_course_public_reviews
      (id,account_id,slide_id,locale,body_ciphertext,status)
      values($1,$2,$3,$4,$5,'pending')`,
    [id,actor.id,slideId,locale,
      seal(body, { accountId: actor.id, recordId: id, field: 'academy.review.public' }, config)],
  )
}

export async function withdrawPublicReview(db, actor, slideId) {
  if (!reviewedSlides.has(slideId)) throw new AppError('INVALID_REVIEW',400)
  await db.query(
    'delete from app_private.reiki_course_public_reviews where account_id=$1 and slide_id=$2',
    [actor.id,slideId],
  )
}

export async function revokePublicReviewOnEdit(db, actor, slideId) {
  if (reviewedSlides.has(slideId)) await withdrawPublicReview(db,actor,slideId)
}

export async function deleteAllPublicReviews(db, actor) {
  await db.query(
    'delete from app_private.reiki_course_public_reviews where account_id=$1',
    [actor.id],
  )
}

export async function listApprovedReikiReviews(config) {
  return transaction(config,null,async db => {
    // Deliberately no account ID, name, email or other journal fields in result.
    const rows=(await db.query(
      `select * from app_private.reiki_course_public_reviews
       where status='approved' and approved_at is not null
       order by approved_at desc,id desc limit 16`,
    )).rows
    return rows.map(row => ({
      id: row.id, slideId: row.slide_id, locale: row.locale,
      review: publicText(row,config), publishedAt: date(row.approved_at),
    }))
  },{inbox:true,practitionerId:PRACTITIONER_ID})
}

export function createReikiReviewModeration(config) {
  return {
    list() {
      return transaction(config,null,async db=>{
        const rows=(await db.query(
          `select * from app_private.reiki_course_public_reviews
           order by created_at desc,id desc limit 100`,
        )).rows
        return rows.map(row=>({
          id: row.id, slideId: row.slide_id, locale: row.locale,
          review: publicText(row,config), status: row.status,
          revision: row.revision, createdAt: date(row.created_at),
          approvedAt: date(row.approved_at),
        }))
      },{inbox:true,practitionerId:PRACTITIONER_ID})
    },
    moderate({id,status,expectedRevision}) {
      requireUUID(id)
      if (!['approved','rejected'].includes(status) ||
          !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
        throw new AppError('INVALID_REVIEW_ACTION',400)
      return transaction(config,null,async db=>{
        const row=(await db.query(
          'select id,status,revision from app_private.reiki_course_public_reviews where id=$1 for update',
          [id],
        )).rows[0]
        if (!row) throw new AppError('REVIEW_NOT_FOUND',404)
        if (row.revision !== expectedRevision || row.status !== 'pending')
          throw new AppError('REVIEW_CHANGED',409)
        const updated=(await db.query(
          `update app_private.reiki_course_public_reviews
           set status=$2,approved_at=case when $2='approved' then now() else null end,
               revision=revision+1,updated_at=now()
           where id=$1 returning id,status,revision,approved_at`,
          [id,status],
        )).rows[0]
        return {id:updated.id,status:updated.status,revision:updated.revision,
          approvedAt:date(updated.approved_at)}
      },{inbox:true,practitionerId:PRACTITIONER_ID})
    },
  }
}
