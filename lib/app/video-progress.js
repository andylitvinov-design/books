import 'server-only'
import { transaction } from './database.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'

const iso = value => value instanceof Date ? value.toISOString() : value
function view(row) {
  return {
    videoId:row.video_id, title:row.title, status:row.status,
    markedAt:iso(row.marked_at), updatedAt:iso(row.updated_at),
  }
}
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new AppError('INVALID_VIDEO_PROGRESS',400)
  onlyKeys(input,['videoId','title','status'])
  if (typeof input.videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(input.videoId))
    throw new AppError('INVALID_VIDEO_ID',400)
  if (typeof input.title !== 'string') throw new AppError('INVALID_VIDEO_TITLE',400)
  const title = input.title.replace(/\s+/g,' ').trim()
  if (!title || title.length > 160 || /[<>]/.test(title))
    throw new AppError('INVALID_VIDEO_TITLE',400)
  if (!['watched','mastered'].includes(input.status))
    throw new AppError('INVALID_VIDEO_STATUS',400)
  return {videoId:input.videoId,title,status:input.status}
}
async function assertAccount(db,actor) {
  const account=(await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0]
  if (!account || account.status !== 'active' || account.onboarding_state !== 'active')
    throw new AppError('ACCOUNT_UNAVAILABLE',403)
}
export async function listVideoProgress(config,actor) {
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const result=await db.query(
      'select video_id,title,status,marked_at,updated_at from app_private.learning_video_progress where account_id=$1 order by updated_at desc,video_id limit 250',
      [actor.id])
    return {records:result.rows.map(view)}
  })
}
export async function markVideoProgress(config,actor,input) {
  const {videoId,title,status}=validate(input)
  return transaction(config,actor,async db=>{
    await assertAccount(db,actor)
    const previous=(await db.query(
      'select * from app_private.learning_video_progress where account_id=$1 and video_id=$2 for update',
      [actor.id,videoId])).rows[0]
    if (!previous && status === 'mastered')
      throw new AppError('WATCH_MARK_REQUIRED',409)
    let updated
    if (!previous) {
      updated=(await db.query(
        "insert into app_private.learning_video_progress(account_id,video_id,title,status) values($1,$2,$3,'watched') returning *",
        [actor.id,videoId,title])).rows[0]
    } else if (previous.status === status || previous.status === 'mastered') {
      return view(previous)
    } else {
      updated=(await db.query(
        "update app_private.learning_video_progress set title=$3,status='mastered',marked_at=now(),updated_at=now() where account_id=$1 and video_id=$2 returning *",
        [actor.id,videoId,title])).rows[0]
    }
    return view(updated)
  })
}
