import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, revision } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { openSealed, seal } from '../app/crypto.js'
import {
  ENERGYWORK_KEY, ENERGYWORK_VERSION, ENERGYWORK_CHOICE_INDEX,
  ENERGYWORK_BRANCH, ENERGYWORK_QUESTIONS, ENERGYWORK_PATHS,
  energyworkAnswerValid, energyworkPathValid, energyworkSequence,
} from '../../data/academy/energywork-ai-schema.js'

const encryption = (row) => ({ accountId: row.account_id, recordId: row.id, field: 'academy.answers' })
const iso = (value) => value instanceof Date ? value.toISOString() : value
const MAX_RESPONSES = 16
function answersFrom(row, config) {
  const answers = openSealed(row.answers_ciphertext, encryption(row), config) || {}
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) ||
      Object.keys(answers).length > MAX_RESPONSES)
    throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  return answers
}
function snapshot(row, config) {
  if (!row) return {
    enrolled: false, courseId: ENERGYWORK_KEY, courseVersion: ENERGYWORK_VERSION,
  }
  return {
    enrolled: true, courseId: row.course_key, courseVersion: row.course_version,
    slideId: row.slide_id, pathId: row.path_id,
    answers: answersFrom(row,config), status: row.status, revision: row.revision,
    savedAt: iso(row.updated_at), completedAt: iso(row.completed_at),
  }
}
const existing = async (db, actor, locked = false) => (
  await db.query(`select * from app_private.academy_course_progress
    where account_id=$1 and course_key=$2 ${locked ? 'for update' : ''}`,
    [actor.id,ENERGYWORK_KEY])
).rows[0] || null

export function createEnergyworkCourseRepository(config) {
  return {
    read(actor) {
      return transaction(config,actor,async db=>snapshot(await existing(db,actor),config))
    },
    command(actor, body) {
      onlyKeys(body,['action','consent','version','slideId','nextSlideId','pathId','answer','expectedRevision','confirmed'])
      if (!['start','save','switch','delete'].includes(body.action)) throw new AppError('INVALID_ACTION',400)
      if (body.action === 'start') {
        if (body.consent !== true || body.version !== ENERGYWORK_VERSION)
          throw new AppError('COURSE_CONSENT_REQUIRED',400)
        return transaction(config,actor,async db=>{
          const account=(await db.query('select status,onboarding_state from app.accounts where id=$1 for update',[actor.id])).rows[0]
          if (!account || account.status!=='active' || account.onboarding_state!=='active')
            throw new AppError('ACCOUNT_UNAVAILABLE',403)
          const id=randomUUID()
          await db.query(`insert into app_private.academy_course_progress
            (id,account_id,course_key,course_version) values ($1,$2,$3,$4)
            on conflict(account_id,course_key) do nothing`,
            [id,actor.id,ENERGYWORK_KEY,ENERGYWORK_VERSION])
          return snapshot(await existing(db,actor),config)
        })
      }
      if (body.action === 'delete') {
        if (body.confirmed !== true) throw new AppError('CONFIRMATION_REQUIRED',400)
        return transaction(config,actor,async db=>{
          await db.query('delete from app_private.academy_course_progress where account_id=$1 and course_key=$2',
            [actor.id,ENERGYWORK_KEY])
          return snapshot(null,config)
        })
      }
      if (body.version !== ENERGYWORK_VERSION ||
          !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)
        throw new AppError('COURSE_REVISION_REQUIRED',400)
      if (typeof body.slideId !== 'string' || typeof body.nextSlideId !== 'string')
        throw new AppError('INVALID_SLIDE',400)
      if (body.pathId != null && !energyworkPathValid(body.pathId))
        throw new AppError('INVALID_PATH',400)
      if (body.answer !== undefined &&
          (typeof body.answer !== 'string' || body.answer.length > 1600 ||
            body.answer.includes('\u0000'))) throw new AppError('INVALID_ANSWER',400)
      return transaction(config,actor,async db=>{
        const row=await existing(db,actor,true)
        if (!row) throw new AppError('COURSE_CONSENT_REQUIRED',409)
        if (row.course_version !== ENERGYWORK_VERSION) throw new AppError('COURSE_VERSION_CHANGED',409)
        if (row.revision !== body.expectedRevision) throw new AppError('COURSE_PROGRESS_CHANGED',409)
        const switching = Boolean(row.path_id && body.pathId && row.path_id!==body.pathId)
        if (switching && (body.action!=='switch' || body.slideId!=='paths-04'))
          throw new AppError('COURSE_PATH_CONFIRM_REQUIRED',409)
        if (body.action === 'switch' && !switching) throw new AppError('INVALID_ACTION',400)
        const pathId = body.pathId || row.path_id
        if (!pathId && ENERGYWORK_PATHS.some(path => ENERGYWORK_BRANCH[path].includes(body.nextSlideId)))
          throw new AppError('CHOOSE_PATH_FIRST',400)
        if (!pathId && body.nextSlideId.startsWith('end-'))
          throw new AppError('CHOOSE_PATH_FIRST',400)
        if (body.pathId && !row.path_id && body.slideId !== 'paths-04')
          throw new AppError('INVALID_PATH',400)
        const sequence=energyworkSequence(pathId)
        const slideIndex=sequence.indexOf(body.slideId)
        const nextIndex=sequence.indexOf(body.nextSlideId)
        if (slideIndex < 0 || nextIndex < 0 ||
            nextIndex < slideIndex || nextIndex > slideIndex+1)
          throw new AppError('INVALID_SLIDE',400)
        const maxBefore=switching ? ENERGYWORK_CHOICE_INDEX : sequence.indexOf(row.slide_id)
        if (maxBefore < 0 || slideIndex > maxBefore)
          throw new AppError('COURSE_STEP_NOT_READY',409)
        const answers=answersFrom(row,config)
        if (switching) {
          for(const branch of Object.values(ENERGYWORK_BRANCH))
            for(const id of branch) delete answers[id]
          delete answers['end-01']
        }
        if (body.answer!==undefined) {
          if (!ENERGYWORK_QUESTIONS[body.slideId])
            throw new AppError('INVALID_ANSWER',400)
          if (body.answer && !energyworkAnswerValid(body.slideId,body.answer))
            throw new AppError('INVALID_ANSWER',400)
          if (body.answer === '') delete answers[body.slideId]
          else answers[body.slideId]=body.answer
        }
        const resumeIndex=Math.max(maxBefore,nextIndex)
        const nextId=sequence[resumeIndex]
        const finished=nextId===sequence[sequence.length-1]
        const encrypted=seal(answers,encryption(row),config)
        const updated=(await db.query(`update app_private.academy_course_progress
          set slide_id=$3,path_id=$4,answers_ciphertext=$5,revision=revision+1,
              status=$6,completed_at=case when $6='completed' then coalesce(completed_at,now()) else null end,
              updated_at=now()
          where account_id=$1 and id=$2 returning *`,
          [actor.id,row.id,nextId,pathId,encrypted,finished?'completed':'active'])).rows[0]
        if (!updated) throw new AppError('COURSE_NOT_FOUND',404)
        return snapshot(updated,config)
      })
    },
  }
}
