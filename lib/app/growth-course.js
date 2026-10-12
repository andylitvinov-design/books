import 'server-only'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { GROWTH_GOALS, COURSE_TOPICS, courseDay, growthSuggestions, suggestedCourseTopics } from '../inner-growth/course-model.js'
import { resultChangeSummary } from '../assessments/personal-guidance.js'
import { createNewCycle } from './growth-daily.js'
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { getDefinitionById } from '../assessments/definitions.js'
import { courseMeasuredProfile, goalForChosenScale } from '../inner-growth/course-strategy.js'

const topicSet = new Set(COURSE_TOPICS.map((item) => item.id))
const goalSet = new Set(Object.keys(GROWTH_GOALS))
const testByKey = new Map(MONITORING_CATALOG.filter(item =>
  item.startable && item.rightsStatus === 'cleared').map(item => [item.key, item]))
function planTestKeys(ids = []) {
  return ids.flatMap(id => {
    try { return [getDefinitionById(id).key] } catch { return [] }
  })
}
function compatibleResult(results, key) {
  const catalog = testByKey.get(key)
  return catalog && results.find(r => r.definitionKey === key &&
    r.definitionVersion === catalog.version) || null
}
const encryptionContext = (actor, row) => ({ accountId: actor.id, recordId: row.id, field: 'course.concerns' })
const iso = (value) => value instanceof Date ? value.toISOString() : value
function reject(code = 'INVALID_COURSE_INPUT', status = 400) { throw new AppError(code, status) }
function strictArray(input, permitted, min, max) {
  if (!Array.isArray(input) || input.length < min || input.length > max ||
      input.some((item) => typeof item !== 'string' || !permitted.has(item)) ||
      new Set(input).size !== input.length) reject()
  return input
}
function validRevision(body, row) {
  if (!Number.isInteger(body.expectedRevision) || body.expectedRevision !== row.revision)
    reject('REVISION_CONFLICT', 409)
}
async function accountReady(db, actor) {
  const account = (await db.query('select status,onboarding_state from app.accounts where id=$1', [actor.id])).rows[0]
  if (!account || account.status !== 'active' || account.onboarding_state !== 'active')
    reject('ACCOUNT_UNAVAILABLE', 403)
}
async function gather(db, actor, row, config) {
  const resultRows = (await db.query(
    'select id,provenance,dimensions,measurement_at from app.assessment_results where account_id=$1 order by measurement_at desc,id desc limit 150',
    [actor.id],
  )).rows
  const results = resultRows.map((r) => ({
    id: r.id, ...r.provenance, dimensions: r.dimensions, measurementAt: iso(r.measurement_at),
  }))
  const plan = (await db.query(
    "select id,status,definition_ids,completed_run_ids from app_private.assessment_plans where account_id=$1 order by updated_at desc,id desc limit 1",
    [actor.id],
  )).rows[0]
  const completedCount = plan?.completed_run_ids?.length || 0
  const plannedCount = plan?.definition_ids?.length || 0
  const courseKeys = row?.test_keys || []
  const selectedTests = courseKeys.map(key => {
    const latest = compatibleResult(results, key)
    return { key, completed: Boolean(latest), resultId: latest?.id || null,
      completedAt: latest?.measurementAt || null }
  })
  const latestWeekly = results.find((r) => r.definitionKey === 'hh-weekly-pulse')
  const suggestion = growthSuggestions(results, 'en')
  const weeklyDelta = latestWeekly && resultChangeSummary(latestWeekly, results)
  const weeklyChange = weeklyDelta?.previous
    ? {
        from: weeklyDelta.previous.measurementAt,
        to: latestWeekly.measurementAt,
        changes: weeklyDelta.changes
          .filter((change) => Number.isFinite(change.from) && Number.isFinite(change.to))
          .map(({ key, from, to }) => ({ key, from, to })),
      }
    : null
  return {
    course: row ? {
      id: row.id, status: row.status, stage: row.stage,
      concerns: openSealed(row.concerns_ciphertext, encryptionContext(actor, row), config) || '',
      focusTags: row.focus_tags || [], goals: row.goals || [], testKeys: courseKeys, scaleKeys: row.scale_keys || [],
      durationDays: row.duration_days, revision: row.revision,
      startedAt: iso(row.started_at), consentedAt: iso(row.consented_at),
      chosenAt: iso(row.chosen_at), dayCompletions: row.day_completions || {},
      today: row.started_at ? courseDay(iso(row.started_at), row.duration_days) : null,
    } : null,
    assessments: {
      resultsCount: results.length,
      completedInSet: completedCount,
      plannedInSet: plannedCount,
      planStatus: plan?.status || null,
      planKeys: planTestKeys(plan?.definition_ids || []),
      selectedTests, pendingSelected: selectedTests.filter(item => !item.completed).map(item => item.key),
      completedSelectedCount: selectedTests.filter(item => item.completed).length,
      latestWeeklyId: latestWeekly?.id || null,
      weeklyChange,
      weeklyDueAt: latestWeekly
        ? new Date(Date.parse(latestWeekly.measurementAt) + 7 * 86400000).toISOString()
        : null,
      suggestions: suggestion,
      results: results.slice(0, 15).map((r) => ({
        id: r.id, definitionKey: r.definitionKey, measurementAt: r.measurementAt,
      })),
    },
  }
}
export function createGrowthCourseRepository(config) {
  return {
    async read(actor) {
      return transaction(config, actor, async (db) => {
        await accountReady(db, actor)
        const row = (await db.query(
          'select * from app_private.growth_courses where account_id=$1',
          [actor.id],
        )).rows[0]
        return gather(db, actor, row, config)
      })
    },
    async command(actor, body) {
      onlyKeys(body, ['action','consent','expectedRevision','concerns','focusTags','testKeys','scaleKeys','goals','durationDays','day','feedback','problemLabel','intention','timeZone'])
      const action = body.action
      if (!['start','intake','edit-intake','to-tests','confirm-tests','review','choose-goals','complete-day','pause','resume'].includes(action)) reject()
      return transaction(config, actor, async (db) => {
        await accountReady(db, actor)
        let row = (await db.query(
          'select * from app_private.growth_courses where account_id=$1 for update', [actor.id],
        )).rows[0]
        if (action === 'start') {
          if (body.consent !== true) reject('CONSENT_REQUIRED')
          if (!row) {
            row = (await db.query(
              'insert into app_private.growth_courses(account_id,consented_at) values($1,now()) on conflict(account_id) do nothing returning *',
              [actor.id],
            )).rows[0] || (await db.query(
              'select * from app_private.growth_courses where account_id=$1', [actor.id],
            )).rows[0]
          }
          return gather(db, actor, row, config)
        }
        if (!row) reject('COURSE_NOT_STARTED', 404)
        validRevision(body, row)
        if (['edit-intake','choose-goals'].includes(action)) {
          // An older open tab must not change the source or create a parallel 14-day programme after
          // a separately confirmed 21-day activation. Before that optional
          // migration exists, the established course path is unchanged.
          const daily21Schema = (await db.query("select to_regclass('app_private.growth_course_daily_21') as relation")).rows[0]
          if (!daily21Schema || daily21Schema.relation === undefined) reject('COURSE_STATE_UNAVAILABLE', 503)
          if (daily21Schema.relation && (await db.query(
            'select id from app_private.growth_course_daily_21 where account_id=$1 and course_id=$2', [actor.id, row.id],
          )).rowCount) reject('COURSE_21_ALREADY_STARTED', 409)
        }
        let query
        let parameters = []
        if (action === 'intake') {
          if (row.stage !== 1) reject('INVALID_COURSE_STAGE', 409)
          const concerns = typeof body.concerns === 'string' ? body.concerns.trim() : ''
          if (concerns.length > 1000) reject()
          if (suggestedCourseTopics(concerns).urgent) reject('URGENT_SUPPORT_NEEDED', 400)
          const tags = strictArray(body.focusTags, topicSet, 0, 6)
          query = 'update app_private.growth_courses set concerns_ciphertext=$2,focus_tags=$3,test_keys=\'{}\',scale_keys=\'{}\',stage=2,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id, concerns ? seal(concerns, encryptionContext(actor, row), config) : null, tags]
        } else if (action === 'edit-intake') {
          if (![2,3].includes(row.stage)) reject('INVALID_COURSE_STAGE', 409)
          query = 'update app_private.growth_courses set stage=1,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id]
        } else if (action === 'to-tests') {
          // Compatibility with previous UI: advancing alone never selects tests.
          if (row.stage !== 1) reject('INVALID_COURSE_STAGE', 409)
          query = 'update app_private.growth_courses set stage=2,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id]
        } else if (action === 'confirm-tests') {
          if (row.stage !== 2) reject('INVALID_COURSE_STAGE', 409)
          const keys = strictArray(body.testKeys, new Set(testByKey.keys()), 1, 12)
          // Highlighted suggestions do NOT count as chosen; the existing My Tests
          // account-owned storage must first contain the user's selected keys.
          const saved = (await db.query(
            "select definition_ids from app_private.assessment_plans where account_id=$1 and status in ('active','completed') order by updated_at desc,id desc limit 1",
            [actor.id],
          )).rows[0]
          const savedKeys = new Set(planTestKeys(saved?.definition_ids || []))
          if (keys.some(key => !savedKeys.has(key))) reject('COURSE_TEST_SELECTION_REQUIRED', 409)
          query = "update app_private.growth_courses set test_keys=$2,scale_keys='{}',revision=revision+1,updated_at=now() where id=$1 returning *"
          parameters = [row.id, keys]
        } else if (action === 'review') {
          if (row.stage !== 2) reject('INVALID_COURSE_STAGE', 409)
          if (!row.test_keys?.length) reject('COURSE_TEST_SELECTION_REQUIRED', 409)
          const found = (await db.query(
            'select provenance from app.assessment_results where account_id=$1',
            [actor.id],
          )).rows.map(r => r.provenance)
          if (!found.length) reject('COURSE_TESTS_REQUIRED', 409)
          if (row.test_keys.some(key => !compatibleResult(found, key)))
            reject('COURSE_TESTS_REMAIN', 409)
          query = 'update app_private.growth_courses set stage=3,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id]
        } else if (action === 'choose-goals') {
          if (row.stage !== 3) reject('INVALID_COURSE_STAGE', 409)
          if (body.consent !== true) reject('CONSENT_REQUIRED')
          let goals, scales = []
          if (body.scaleKeys !== undefined) {
            const source = (await db.query(
              'select id,provenance,dimensions,measurement_at from app.assessment_results where account_id=$1 order by measurement_at desc limit 150',
              [actor.id],
            )).rows.map(r => ({ id:r.id, ...r.provenance, dimensions:r.dimensions, measurementAt:iso(r.measurement_at) }))
            const profile = courseMeasuredProfile({ results:source, testKeys:row.test_keys, locale:'en' })
            const approved = new Set(profile.eligible.map(item => item.id))
            const minimum = Math.min(3, approved.size)
            if (!minimum) reject('COURSE_SCALES_UNAVAILABLE', 409)
            scales = strictArray(body.scaleKeys, approved, minimum, Math.min(5, approved.size))
            goals = [...new Set(scales.map(key => goalForChosenScale(key)).filter(Boolean))].slice(0, 3)
            if (!goals.length) reject('COURSE_SCALES_UNAVAILABLE', 409)
          } else {
            // Legacy R1/R2 courses were started before R3 chose measured scales.
            // An R3 course with eligible scale evidence cannot skip the required
            // explicit scale confirmation by submitting generic goals directly.
            if (row.test_keys?.length) {
              const source = (await db.query(
                'select id,provenance,dimensions,measurement_at from app.assessment_results where account_id=$1 order by measurement_at desc limit 150',
                [actor.id],
              )).rows.map(r => ({ id:r.id, ...r.provenance, dimensions:r.dimensions, measurementAt:iso(r.measurement_at) }))
              const profile = courseMeasuredProfile({ results:source, testKeys:row.test_keys, locale:'en' })
              if (profile.eligible.length) reject('COURSE_SCALE_SELECTION_REQUIRED', 409)
            }
            goals = strictArray(body.goals, goalSet, 1, 3)
          }
          if (body.durationDays !== 14) reject('COURSE_REVIEWED_CONTENT_14_DAYS_ONLY')
          query = "update app_private.growth_courses set stage=4,goals=$2,scale_keys=$3,duration_days=$4,chosen_at=now(),started_at=now(),status='active',revision=revision+1,updated_at=now() where id=$1 returning *"
          parameters = [row.id, goals, scales, body.durationDays]
        } else if (action === 'complete-day') {
          if (row.stage !== 4 || row.status !== 'active') reject('INVALID_COURSE_STAGE', 409)
          if (!Number.isInteger(body.day) || body.day < 1 || body.day > courseDay(row.started_at, row.duration_days)) reject('COURSE_DAY_NOT_DUE', 409)
          if (body.feedback !== undefined && !['helped','neutral','uncomfortable','skip'].includes(body.feedback)) reject()
          const completed = row.day_completions || {}
          if (completed[String(body.day)]) return gather(db, actor, row, config)
          const next = { ...completed, [String(body.day)]: { completedAt: new Date().toISOString(), feedback: body.feedback || 'skip' } }
          query = 'update app_private.growth_courses set day_completions=$2::jsonb,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id, JSON.stringify(next)]
        } else if (action === 'pause' || action === 'resume') {
          if (row.stage !== 4) reject('INVALID_COURSE_STAGE', 409)
          query = 'update app_private.growth_courses set status=$2,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id, action === 'pause' ? 'paused' : 'active']
        }
        row = (await db.query(query, parameters)).rows[0]
        if(action === 'choose-goals') await createNewCycle(db, actor, row, config, body)
        return gather(db, actor, row, config)
      })
    },
  }
}
