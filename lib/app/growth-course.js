import 'server-only'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { GROWTH_GOALS, COURSE_TOPICS, courseDay, growthSuggestions, suggestedCourseTopics } from '../inner-growth/course-model.js'
import { resultChangeSummary } from '../assessments/personal-guidance.js'
import { createNewCycle } from './growth-daily.js'
import { courseProgramFromTopics, hasAntistressRequiredBaseline, ANTISTRESS_BASELINE_RECENCY_DAYS, isAntistressBaselineRecent } from '../inner-growth/course-programs.js'
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { getDefinitionById } from '../assessments/definitions.js'
import { courseMeasuredProfile, goalForChosenScale } from '../inner-growth/course-strategy.js'
import { ANTISTRESS_MODULE_IDS, ANTISTRESS_ROUTER_VERSION, validateModuleFinderAnswers, recommendAntistressModule, weeklyAxesFromResults, unpackCourseModuleContext, packCourseModuleContext } from '../inner-growth/antistress-module-router.js'

const topicSet = new Set(COURSE_TOPICS.map((item) => item.id))
const goalSet = new Set(Object.keys(GROWTH_GOALS))
const testByKey = new Map(MONITORING_CATALOG.filter(item =>
  item.startable && item.rightsStatus === 'cleared').map(item => [item.key, item]))
function planTestKeys(ids = []) {
  return ids.flatMap(id => {
    try { return [getDefinitionById(id).key] } catch { return [] }
  })
}
// Shared recency policy for the Anti-Stress starting battery.
function compatibleResult(results, key, {requireRecent=false,now=Date.now()}={}) {
  const catalog=testByKey.get(key)
  if(!catalog)return null
  const maxAge=requireRecent?ANTISTRESS_BASELINE_RECENCY_DAYS[key]:null
  return results.find(r=>r.definitionKey===key && r.definitionVersion===catalog.version &&
    (catalog.instrumentLocale==='dynamic'||r.instrumentLocale===catalog.instrumentLocale) &&
    (!maxAge || isAntistressBaselineRecent(key,r.measurementAt,now)))||null
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
  // Closed courses are archived, not presented as active enrolments.
  if (row?.status === 'closed') row = null
  const resultRows = (await db.query(
    'select id,provenance,dimensions,measurement_at from app.assessment_results where account_id=$1 order by measurement_at desc,id desc limit 150',
    [actor.id],
  )).rows
  const results = resultRows.map((r) => ({
    id: r.id, ...r.provenance, dimensions: r.dimensions, measurementAt: iso(r.measurement_at),
  }))
  const storedContext = unpackCourseModuleContext(row?.concerns_ciphertext
    ? openSealed(row.concerns_ciphertext,encryptionContext(actor,row),config) : '')
  const plan = (await db.query(
    "select id,status,definition_ids,completed_run_ids from app_private.assessment_plans where account_id=$1 order by updated_at desc,id desc limit 1",
    [actor.id],
  )).rows[0]
  const completedCount = plan?.completed_run_ids?.length || 0
  const plannedCount = plan?.definition_ids?.length || 0
  const courseKeys = row?.test_keys || []
  const stressIntake=row?.stage===2 && courseProgramFromTopics(row?.focus_tags||[])?.id==='stress'
  const selectedTests = courseKeys.map(key => {
    const latest=compatibleResult(results,key)
    const eligible=compatibleResult(results,key,{requireRecent:stressIntake})
    return { key, completed:Boolean(eligible),outdated:Boolean(latest&&!eligible),
      instrumentLocale:eligible?.instrumentLocale||latest?.instrumentLocale||null,
      resultId:eligible?.id||latest?.id||null,
      completedAt:eligible?.measurementAt||latest?.measurementAt||null }
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
      concerns: storedContext.concerns,
       moduleChoice: storedContext.moduleChoice ? {
         id:storedContext.moduleChoice.id,
         recommendedId:storedContext.moduleChoice.recommendedId,
         selectedAt:storedContext.moduleChoice.selectedAt,
         version:storedContext.moduleChoice.version,
         optedForAlternative:Boolean(storedContext.moduleChoice.optedForAlternative),
       } : null,
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
      onlyKeys(body, ['action','consent','expectedRevision','concerns','focusTags','testKeys','scaleKeys','goals','durationDays','day','feedback','problemLabel','intention','timeZone','moduleAnswers','moduleGoal','moduleId'])
      const action = body.action
      if (!['start','intake','edit-intake','to-tests','confirm-tests','review','choose-goals','complete-day','pause','resume','close'].includes(action)) reject()
      return transaction(config, actor, async (db) => {
        await accountReady(db, actor)
        let row = (await db.query(
          'select * from app_private.growth_courses where account_id=$1 for update', [actor.id],
        )).rows[0]
        if (action === 'start') {
          if (body.consent !== true) reject('CONSENT_REQUIRED')
          if (row?.status === 'closed') {
            // Re-enrolment starts a new journey. Previous growth_cycles are
            // archived separately and assessment results are untouched.
            row = (await db.query(`update app_private.growth_courses set
              status='active', stage=1, concerns_ciphertext=null,
              focus_tags='{}', goals='{}', test_keys='{}', scale_keys='{}',
              duration_days=14, day_completions='{}'::jsonb,
              chosen_at=null, started_at=null, consented_at=now(),
              revision=revision+1, updated_at=now()
              where account_id=$1 and id=$2 returning *`, [actor.id, row.id])).rows[0]
          }
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
        if (!row || row.status === 'closed') reject('COURSE_NOT_STARTED', 404)
        validRevision(body, row)
        if (action === 'close') {
          // Preserve every saved session/check-in, but free the one-current-
          // cycle slot for a future enrolment. Never mark an unfinished cycle
          // completed, and never delete related assessment results.
          await db.query(`update app_private.growth_cycles set
            status='archived', revision=revision+1, updated_at=now()
            where account_id=$1 and course_id=$2 and status in ('active','paused')`, [actor.id, row.id])
          row = (await db.query(`update app_private.growth_courses set
            status='closed', revision=revision+1, updated_at=now()
            where account_id=$1 and id=$2 returning *`, [actor.id, row.id])).rows[0]
          return gather(db, actor, row, config)
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
          // New Anti-Stress selection cannot omit its pre-course Weekly Pulse.
          if(!hasAntistressRequiredBaseline(keys,courseProgramFromTopics(row.focus_tags||[])?.id))
            reject('COURSE_ANTISTRESS_BASELINE_REQUIRED',409)
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
          // Also block direct review of a stale stage-2 selection without baseline.
          if(!hasAntistressRequiredBaseline(row.test_keys,courseProgramFromTopics(row.focus_tags||[])?.id))
            reject('COURSE_ANTISTRESS_BASELINE_REQUIRED',409)
          const found=(await db.query(
            'select provenance,measurement_at from app.assessment_results where account_id=$1',
            [actor.id],
          )).rows.map(r=>({...r.provenance,measurementAt:iso(r.measurement_at)}))
          if(!found.length)reject('COURSE_TESTS_REQUIRED',409)
          const recentStress=courseProgramFromTopics(row.focus_tags||[])?.id==='stress'
          if(row.test_keys.some(key=>!compatibleResult(found,key,{requireRecent:recentStress})))
            reject('COURSE_TESTS_REMAIN',409)
          query = 'update app_private.growth_courses set stage=3,revision=revision+1,updated_at=now() where id=$1 returning *'
          parameters = [row.id]
        } else if (action === 'choose-goals') {
          if (row.stage !== 3) reject('INVALID_COURSE_STAGE', 409)
          if (body.consent !== true) reject('CONSENT_REQUIRED')
          // Stage 3 can remain open for weeks after its Stage-2 review.
          // Recheck every selected Anti-Stress baseline at the actual T0 moment;
          // stale Weekly/GAD/Resource results cannot silently start a cycle.
          if (courseProgramFromTopics(row.focus_tags||[])?.id==='stress') {
            if (!hasAntistressRequiredBaseline(row.test_keys, 'stress'))
              reject('COURSE_ANTISTRESS_BASELINE_REQUIRED', 409)
            const before=(await db.query(
              'select provenance,measurement_at from app.assessment_results where account_id=$1',
              [actor.id],
            )).rows.map(entry=>({
              ...entry.provenance, measurementAt:iso(entry.measurement_at),
            }))
            if (row.test_keys.some(key=>!compatibleResult(before,key,{requireRecent:true})))
              reject('COURSE_TESTS_REMAIN',409)
          }
          // Calculate from the account's own current scored tests, never browser scores.
           let moduleChoice=null
           if(courseProgramFromTopics(row.focus_tags||[])?.id==='stress') {
             const freshResults=(await db.query(
               'select id,provenance,dimensions,measurement_at from app.assessment_results where account_id=$1 order by measurement_at desc limit 150',
               [actor.id],
             )).rows.map(r=>({id:r.id,...r.provenance,dimensions:r.dimensions,measurementAt:iso(r.measurement_at)}))
             const weekly=weeklyAxesFromResults(freshResults)
             if(!weekly.ready)reject('COURSE_ANTISTRESS_BASELINE_REQUIRED',409)
             // Backwards-compatible AS2 for existing intake clients.
             if(body.moduleAnswers!==undefined) {
               let answers,goal
               try {
                 answers=validateModuleFinderAnswers(body.moduleAnswers)
                 goal=body.moduleGoal==null||body.moduleGoal==='undecided'?null:body.moduleGoal
                 if(goal!==null&&!ANTISTRESS_MODULE_IDS.includes(goal))throw new Error('MODULE_GOAL_INVALID')
               }catch{reject('COURSE_MODULE_FINDER_INVALID',400)}
               const recommended=recommendAntistressModule({weekly:weekly.values,answers,goal})
               const selected=body.moduleId || recommended.moduleId
               if(!ANTISTRESS_MODULE_IDS.includes(selected))reject('COURSE_MODULE_FINDER_INVALID',400)
               const context=unpackCourseModuleContext(row.concerns_ciphertext
                 ? openSealed(row.concerns_ciphertext,encryptionContext(actor,row),config) : '')
               moduleChoice={
                 id:selected,recommendedId:recommended.moduleId,alternativeId:recommended.alternativeId,
                 goal,answers,weeklyResultId:weekly.resultId,weeklyMeasuredAt:weekly.measuredAt,
                 version:ANTISTRESS_ROUTER_VERSION,selectedAt:new Date().toISOString(),
                 optedForAlternative:selected!==recommended.moduleId,
               }
               row._moduleCiphertext=seal(packCourseModuleContext(context.concerns,moduleChoice),
                 encryptionContext(actor,row),config)
             }
           }
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
          query = row._moduleCiphertext
            ? "update app_private.growth_courses set stage=4,goals=$2,scale_keys=$3,duration_days=$4,concerns_ciphertext=$5,chosen_at=now(),started_at=now(),status='active',revision=revision+1,updated_at=now() where id=$1 returning *"
            : "update app_private.growth_courses set stage=4,goals=$2,scale_keys=$3,duration_days=$4,chosen_at=now(),started_at=now(),status='active',revision=revision+1,updated_at=now() where id=$1 returning *"
          parameters = row._moduleCiphertext ? [row.id,goals,scales,body.durationDays,row._moduleCiphertext] : [row.id,goals,scales,body.durationDays]
        } else if (action === 'complete-day') {
          if (row.stage !== 4 || row.status !== 'active') reject('INVALID_COURSE_STAGE', 409)
          // Legacy R1 compatibility: a skipped earlier day cannot be backfilled with
          // another newly completed lesson today. R2/V3/V4 use server-local dates.
          if (!Number.isInteger(body.day) || body.day !== courseDay(row.started_at, row.duration_days)) reject('COURSE_DAY_NOT_DUE', 409)
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
        if(action === 'choose-goals') await createNewCycle(db, actor, row, config, {...body,moduleId:moduleChoice?.id||'AS2'})
        return gather(db, actor, row, config)
      })
    },
  }
}
