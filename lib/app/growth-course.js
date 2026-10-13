import 'server-only'
import { getBillingConfig } from '../billing/config.js'
import { COURSE_PLANS } from '../inner-growth/course-plans.js'
import { getCoursePreset, coursePresetForTags, coursePresetTags, courseVisibleFocusTags, matchesFixedPresetTests } from '../inner-growth/course-presets.js'
import { randomUUID } from 'node:crypto'
import { lockCourseOwner, selectOwnedCourse, readCourseAccess, requireCourseCapacity } from './course-access.js'
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
  const access = await readCourseAccess(db, actor, config)
  const courseRows = (await db.query(`select * from app_private.growth_courses where account_id=$1
    order by ${config.multiCourseEnabled ? 'is_primary desc,' : ''}updated_at desc,id desc`, [actor.id])).rows
  const cycleRows = (await db.query(`select v.course_id,v.status as cycle_status,v.cycle_number,
    count(s.id)::integer as completed_lessons from app_private.growth_cycles v
    left join app_private.growth_sessions s on s.account_id=v.account_id and s.cycle_id=v.id
    where v.account_id=$1 group by v.id,v.course_id,v.status,v.cycle_number
    order by (case when v.status in ('active','paused') then 0 else 1 end),v.cycle_number desc`, [actor.id])).rows
  const recentCycle = new Map()
  for (const cycle of cycleRows) if (!recentCycle.has(cycle.course_id)) recentCycle.set(cycle.course_id, cycle)
  const courses = courseRows.map(item => {
    const cycle = recentCycle.get(item.id)
    return { id: item.id, status: item.status, stage: item.stage, revision: item.revision,
      isPrimary: item.is_primary === true,
      title: openSealed(item.concerns_ciphertext, encryptionContext(actor,item),config)?.slice(0,160) || '',
      focusTags: courseVisibleFocusTags(item.focus_tags), presetId: coursePresetForTags(item.focus_tags)?.id || null,
      goals: item.goals || [], scaleKeys: item.scale_keys || [], testKeys: item.test_keys || [],
      startedAt: iso(item.started_at), updatedAt: iso(item.updated_at), finishedAt: iso(item.finished_at),
      completedLessons: cycle?.completed_lessons || 0, durationDays: item.duration_days || 14,
      cycleStatus: cycle?.cycle_status || null }
  })
  const billingConfig = getBillingConfig()
  const membership = { ...COURSE_PLANS[access.tier], tier: access.tier,
    occupiedCount: access.activeCourseCount, overLimit: access.overLimit,
    checkoutConfigured: billingConfig.enabled, enabledPlans: billingConfig.enabled ? billingConfig.enabledPlans : [] }
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
    courses, access, membership,
    course: row ? {
      id: row.id, status: row.status, stage: row.stage, isPrimary: row.is_primary === true,
      concerns: openSealed(row.concerns_ciphertext, encryptionContext(actor, row), config) || '',
      focusTags: courseVisibleFocusTags(row.focus_tags), presetId: coursePresetForTags(row.focus_tags)?.id || null, goals: row.goals || [], testKeys: courseKeys, scaleKeys: row.scale_keys || [],
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
export function createGrowthCourseRepository(config, { runTransaction = transaction } = {}) {
  return {
    async exportHistory(actor) {
      return runTransaction(config,actor,async db=>{
        await accountReady(db,actor)
        const rows=(await db.query('select * from app_private.growth_courses where account_id=$1 order by created_at,id',[actor.id])).rows
        return rows.map(row=>({id:row.id,status:row.status,stage:row.stage,revision:row.revision,
          concerns:openSealed(row.concerns_ciphertext,encryptionContext(actor,row),config)||'',
          presetId:coursePresetForTags(row.focus_tags)?.id||null,focusTags:courseVisibleFocusTags(row.focus_tags),
          testKeys:row.test_keys||[],scaleKeys:row.scale_keys||[],goals:row.goals||[],durationDays:row.duration_days,
          dayCompletions:row.day_completions||{},isPrimary:row.is_primary===true,
          consentedAt:iso(row.consented_at),startedAt:iso(row.started_at),chosenAt:iso(row.chosen_at),finishedAt:iso(row.finished_at)}))
      })
    },
    async read(actor, courseId = null) {
      return runTransaction(config, actor, async (db) => {
        await accountReady(db, actor)
        const row = await selectOwnedCourse(db, actor, { courseId, primary: config.multiCourseEnabled })
        return gather(db, actor, row, config)
      })
    },
    async command(actor, body) {
      onlyKeys(body, ['courseId','newCourse','presetId','action','consent','expectedRevision','concerns','focusTags','testKeys','scaleKeys','goals','durationDays','day','feedback','problemLabel','intention','timeZone'])
      const action = body.action
      if (!['start','intake','edit-intake','to-tests','confirm-tests','review','choose-goals','complete-day','pause','resume','close','make-primary','select-preset','select-personal'].includes(action)) reject()
      return runTransaction(config, actor, async (db) => {
        await lockCourseOwner(db, actor)
        if (body.newCourse !== undefined && typeof body.newCourse !== 'boolean') reject()
        if (body.presetId !== undefined && !getCoursePreset(body.presetId)) reject('INVALID_COURSE_PRESET')
        if (body.newCourse && (action !== 'start' || !body.courseId || !config.multiCourseEnabled)) reject('COURSE_MULTIPLE_UNAVAILABLE', 409)
        let row = await selectOwnedCourse(db, actor, { courseId: body.courseId, mutation: true, allowMissing: action === 'start', primary: config.multiCourseEnabled })
        if (action === 'start') {
          if (body.consent !== true) reject('CONSENT_REQUIRED')
          if (!row && !body.newCourse) row = await selectOwnedCourse(db, actor, { mutation: true, primary: config.multiCourseEnabled })
          if (!row) {
            await requireCourseCapacity(db, actor, config)
            const id = body.courseId || randomUUID()
            if (config.multiCourseEnabled) await db.query('update app_private.growth_courses set is_primary=false where account_id=$1 and is_primary=true',[actor.id])
            row = (await db.query(config.multiCourseEnabled
              ? 'insert into app_private.growth_courses(id,account_id,consented_at,is_primary) values($1,$2,now(),true) returning *'
              : 'insert into app_private.growth_courses(id,account_id,consented_at) values($1,$2,now()) on conflict(account_id) do nothing returning *', [id, actor.id])).rows[0]
              || await selectOwnedCourse(db, actor, { mutation: true, primary: config.multiCourseEnabled })
          }
          if (body.presetId !== undefined) {
            const preset = getCoursePreset(body.presetId)
            const currentPreset = coursePresetForTags(row.focus_tags)
            // A repeated successful start must not reset its stage or chosen tests.
            if (currentPreset?.id !== preset.id) {
              if (row.stage !== 1) reject('COURSE_ALREADY_CONFIGURED',409)
              row = (await db.query("update app_private.growth_courses set focus_tags=$2,concerns_ciphertext=null,test_keys='{}',scale_keys='{}',stage=2,revision=revision+1,updated_at=now() where account_id=$3 and id=$1 returning *",[row.id,coursePresetTags(preset.id),actor.id])).rows[0]
            }
          }
          return gather(db, actor, row, config)
        }
        if (!row) reject('COURSE_NOT_STARTED', 404)
        validRevision(body, row)
        if (action === 'close') {
          if (!config.multiCourseEnabled) reject('COURSE_MULTIPLE_UNAVAILABLE',409)
          if (!['active','paused'].includes(row.status)) reject('COURSE_ALREADY_FINISHED',409)
          await db.query("update app_private.growth_cycles set status='archived',finished_at=now(),updated_at=now() where account_id=$1 and course_id=$2 and status in ('active','paused')",[actor.id,row.id])
          row = (await db.query("update app_private.growth_courses set status='archived',is_primary=false,finished_at=now(),revision=revision+1,updated_at=now() where account_id=$1 and id=$2 returning *",[actor.id,row.id])).rows[0]
          return gather(db, actor, row, config)
        }
        if (action === 'make-primary') {
          if (!config.multiCourseEnabled) reject('COURSE_MULTIPLE_UNAVAILABLE',409)
          if (!['active','paused'].includes(row.status)) reject('COURSE_NOT_ACTIVE',409)
          await db.query('update app_private.growth_courses set is_primary=false where account_id=$1 and is_primary=true',[actor.id])
          row = (await db.query('update app_private.growth_courses set is_primary=true,revision=revision+1,updated_at=now() where account_id=$1 and id=$2 returning *',[actor.id,row.id])).rows[0]
          return gather(db, actor, row, config)
        }
        if (!['active','paused'].includes(row.status)) reject('COURSE_NOT_ACTIVE',409)
        if (action === 'select-preset' || action === 'select-personal') {
          if (![1,2,3].includes(row.stage)) reject('COURSE_ALREADY_CONFIGURED',409)
          const preset = action === 'select-preset' ? getCoursePreset(body.presetId) : null
          if (action === 'select-preset' && !preset) reject('INVALID_COURSE_PRESET')
          row = (await db.query("update app_private.growth_courses set focus_tags=$2,concerns_ciphertext=null,test_keys='{}',scale_keys='{}',stage=$3,revision=revision+1,updated_at=now() where account_id=$4 and id=$1 returning *",[row.id,preset ? coursePresetTags(preset.id) : [],preset ? 2 : 1,actor.id])).rows[0]
          return gather(db, actor, row, config)
        }
        let query
        let parameters = []
        if (action === 'intake') {
          if (coursePresetForTags(row.focus_tags)) reject('COURSE_PRESET_TESTS_FIXED',409)
          if (row.stage !== 1) reject('INVALID_COURSE_STAGE', 409)
          const concerns = typeof body.concerns === 'string' ? body.concerns.trim() : ''
          if (concerns.length > 1000) reject()
          if (suggestedCourseTopics(concerns).urgent) reject('URGENT_SUPPORT_NEEDED', 400)
          const tags = strictArray(body.focusTags, topicSet, 0, 6)
          query = 'update app_private.growth_courses set concerns_ciphertext=$2,focus_tags=$3,test_keys=\'{}\',scale_keys=\'{}\',stage=2,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id, concerns ? seal(concerns, encryptionContext(actor, row), config) : null, tags]
        } else if (action === 'edit-intake') {
          if (coursePresetForTags(row.focus_tags)) reject('COURSE_PRESET_TESTS_FIXED',409)
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
          const preset = coursePresetForTags(row.focus_tags)
          if (preset && !matchesFixedPresetTests(preset,keys)) reject('COURSE_PRESET_TESTS_FIXED',409)
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
          const preset = coursePresetForTags(row.focus_tags)
          if (preset && !matchesFixedPresetTests(preset,row.test_keys)) reject('COURSE_PRESET_TESTS_FIXED',409)
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
          if (action === 'resume' && row.status !== 'active') await requireCourseCapacity(db, actor, config, { existingCourseId: row.id })
          query = 'update app_private.growth_courses set status=$2,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id, action === 'pause' ? 'paused' : 'active']
        }
        row = (await db.query(query, parameters)).rows[0]
        if (action === 'pause' || action === 'resume') await db.query("update app_private.growth_cycles set status=$3,revision=revision+1,updated_at=now() where account_id=$1 and course_id=$2 and status in ('active','paused')", [actor.id, row.id, action === 'pause' ? 'paused' : 'active'])
        if(action === 'choose-goals') await createNewCycle(db, actor, row, config, body)
        return gather(db, actor, row, config)
      })
    },
  }
}
