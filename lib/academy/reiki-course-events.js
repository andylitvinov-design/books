import { randomUUID } from 'node:crypto'
import { openSealed, seal } from '../app/crypto.js'
import { energyworkLessonRanges, energyworkSequence } from '../../data/academy/energywork-ai-schema.js'

const sequence = energyworkSequence()
const lessons = energyworkLessonRanges(sequence)
const questionIndex = id => sequence.indexOf(id === 'tan-study-03' ? 'tan-study-02' : id)
const context = (accountId, recordId) => ({ accountId, recordId, field: 'academy.messenger_event' })

// The caller holds the enrollment row lock. Both the progress and this encrypted
// history commit together; the unique event key also protects repeated requests.
export async function recordReikiEvent(db, config, progress, eventKey, details, occurredAt = null) {
  if (!progress.messenger_consent) return
  const id = randomUUID()
  const payload = { ...details, courseVersion: progress.course_version, revision: progress.revision }
  await db.query(`insert into app_private.reiki_course_events
    (id,account_id,enrollment_id,event_key,kind,question_id,revision,payload_ciphertext,occurred_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,coalesce($9::timestamptz,clock_timestamp()))
    on conflict(enrollment_id,event_key) do nothing`,
    [id, progress.account_id, progress.id, eventKey, details.kind, details.questionId ?? null,
      progress.revision, seal(payload, context(progress.account_id, id), config), occurredAt])
}

export async function recordReikiAnswers(db, config, progress, committed) {
  if (!progress.messenger_consent) return
  // The OAuth handoff commits a whole lesson in one transaction. Its JSON
  // keys need not arrive in the order in which the questions were displayed.
  const answers = Object.entries(committed).sort(([a], [b]) => questionIndex(a) - questionIndex(b))
  for (const [questionId, answer] of answers) {
    // The initiation form has its own final confirmation and event.
    if (questionId === 'end-01') continue
    const { rows: [last] } = await db.query(`select id,payload_ciphertext from app_private.reiki_course_events
      where account_id=$1 and enrollment_id=$2 and question_id=$3 and kind in ('answer','answer-edit')
      order by sequence desc limit 1`, [progress.account_id, progress.id, questionId])
    if (!last && !answer) continue
    if (last && openSealed(last.payload_ciphertext, context(progress.account_id, last.id), config).answer === answer)
      continue
    const index = questionIndex(questionId)
    const lesson = lessons.find(range => index >= range.start && index < range.end)?.lesson ?? 0
    await recordReikiEvent(db, config, progress, `answer:${questionId}:${progress.revision}`,
      { kind: last ? 'answer-edit' : 'answer', lesson, questionId, answer })
  }
}

// The first four lessons have dedicated milestone screens. The final screen
// completes both lesson five and the course. Going back never reopens a milestone.
export async function recordReikiMilestones(db, config, progress, from, to) {
  if (!progress.messenger_consent || to <= from) return
  for (const { lesson, end } of lessons) {
    const milestone = end - 1
    if (from < milestone && to >= milestone) {
      await recordReikiEvent(db, config, progress, `lesson:${lesson}`, { kind: 'milestone', lesson })
      if (lesson === lessons.length)
        await recordReikiEvent(db, config, progress, 'complete', { kind: 'complete', lesson })
    }
  }
}

export async function setReikiMessengerConsent(db, config, progress, enabled) {
  if (Boolean(progress.messenger_consent) === enabled) return progress
  if (!enabled) {
    await db.query('delete from app_private.reiki_course_events where account_id=$1 and enrollment_id=$2',
      [progress.account_id, progress.id])
  }
  const { rows: [updated] } = await db.query(`update app_private.academy_course_progress
    set messenger_consent=$3,revision=revision+1,updated_at=now()
    where account_id=$1 and id=$2 returning *`, [progress.account_id, progress.id, enabled])
  if (enabled) await recordReikiEvent(db, config, updated, 'start', {
    kind: 'start', consentVersion: 'reiki-teacher-messenger-v2', consentedAt: updated.updated_at,
  }, updated.created_at)
  return updated
}
