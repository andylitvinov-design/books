import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { createBillingRepository } from '../../lib/billing/repository.js'
import { createGrowthCourseRepository } from '../../lib/app/growth-course.js'
import { createDailyCourseRepository } from '../../lib/app/growth-daily.js'
import { seal } from '../../lib/app/crypto.js'
import { ASSESSMENT_DEFINITIONS } from '../../lib/assessments/definitions.js'
import { COURSE_PRESETS } from '../../lib/inner-growth/course-presets.js'
import { COURSE_CONTENT_V3, COURSE_CONTENT_V4 } from '../../lib/inner-growth/lesson-library.js'
import { premiumSessionStore } from '../../lib/billing/premium-sessions.js'

// Called only by the guarded, fresh native PostgreSQL17 billing integration job.
export async function runTierDatabaseTests(t, { admin, pool, appConfig, billingConfig, createOwner, seedSubscription, repo, rawAs }) {
  const asCourse = (actor, fn, environment = 'sandbox') => rawAs(actor, 'hh_app_backend', async db => {
    await db.query("select set_config('hh.course_billing_environment',$1,true)", [environment])
    return fn(db)
  })
  const addCourse = actor => asCourse(actor, db => db.query('insert into app_private.growth_courses(account_id,consented_at) values($1,now()) returning id', [actor.id]))
  const access = actor => asCourse(actor, async db => (await db.query("select * from app_private.course_access('sandbox')")).rows[0])
  const courseConfig = { ...appConfig, multiCourseEnabled: true, billingEnvironment: 'sandbox',
    encryptionKey: Buffer.alloc(32, 7), encryptionKeyId: 'synthetic-ci-only' }
  const repositories = (runTransaction = (_config, actor, fn) => asCourse(actor, fn), config = courseConfig) => ({
    courses: createGrowthCourseRepository(config, { runTransaction }),
    daily: createDailyCourseRepository(config, { runTransaction }),
  })
  const { courses, daily } = repositories()
  const start = (owner, repository = courses) => repository.command(owner, {
    action: 'start', consent: true, courseId: randomUUID(), newCourse: true,
  })
  const continuation = fixture => ({ courseId: fixture.courseId, cycleId: fixture.cycleId,
    problemLabel: 'Synthetic continuation practice', goal: 'connection_boundaries', timeZone: 'UTC' })
  // Fixtures are written through the real owner role, RLS and quota triggers.
  // Only the account/subscription setup and verification reads use the CI admin.
  async function finishedCourse(owner, { status = 'completed', cycleStatus = 'completed' } = {}) {
    const courseId = randomUUID(), cycleId = randomUUID(), targetId = randomUUID()
    await asCourse(owner, async db => {
      await db.query(`insert into app_private.growth_courses
        (id,account_id,status,stage,goals,scale_keys,consented_at,chosen_at,started_at,finished_at)
        values($1,$2,$3,4,$4,$5,now(),now(),now()-interval '14 days',
          case when $3='completed' then now() else null end)`,
      [courseId, owner.id, status, ['calm_regulation', 'energy_agency', 'connection_boundaries'],
        ['hh-weekly-pulse::weekly.tension', 'hh-weekly-pulse::weekly.recovery', 'hh-weekly-pulse::weekly.connection']])
      await db.query(`insert into app_private.growth_cycles
        (id,account_id,course_id,primary_domain,content_version,start_local_date,time_zone,status,finished_at)
        values($1,$2,$3,'calm_regulation',$4,(clock_timestamp() at time zone 'UTC')::date-14,'UTC',$5,
          case when $5='completed' then now() else null end)`, [cycleId, owner.id, courseId, COURSE_CONTENT_V3, cycleStatus])
      await db.query(`insert into app_private.growth_targets(id,account_id,cycle_id,problem_label_ciphertext)
        values($1,$2,$3,$4)`, [targetId, owner.id, cycleId,
        seal('Synthetic original practice', { accountId: owner.id, recordId: targetId, field: 'course.target_label' }, courseConfig)])
    })
    return { courseId, cycleId, targetId }
  }
  async function courseSnapshot(owner, courseId) {
    const result = {}
    for (const table of ['growth_courses', 'growth_cycles', 'growth_targets', 'growth_checkins', 'growth_sessions', 'growth_reviews']) {
      const condition = table === 'growth_courses' ? 'id=$2' : table === 'growth_cycles' ? 'course_id=$2'
        : 'cycle_id in (select id from app_private.growth_cycles where account_id=$1 and course_id=$2)'
      result[table] = (await admin.query(`select * from app_private.${table} where account_id=$1 and ${condition} order by id`, [owner.id, courseId])).rows
    }
    return result
  }
  const settled = promise => promise.then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason }))
  const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
  // Hold the first real repository command immediately after its account lock.
  // Observe a second backend blocking on that exact PID before allowing commit.
  // Distinct course IDs make this proof depend on the owner lock, not a cycle lock.
  async function raceOnOwner(owner, firstCommand, secondCommand) {
    const locked = deferred(), release = deferred(), started = deferred()
    let firstPid, second
    const first = settled(firstCommand(repositories((_config, actor, fn) => asCourse(actor, async db => {
      firstPid = (await db.query('select pg_backend_pid() as pid')).rows[0].pid
      return fn({ query: async (sql, args) => {
        const result = await db.query(sql, args)
        if (sql === 'select status,onboarding_state from app.accounts where id=$1 for update') {
          assert.equal(args[0], owner.id)
          locked.resolve(); await release.promise
        }
        return result
      } })
    }))))
    try {
      await Promise.race([locked.promise, first.then(result => {
        if (result.status === 'rejected') throw result.reason
        assert.fail('Repository command finished without acquiring its owner lock')
      })])
      second = settled(secondCommand(repositories((_config, actor, fn) => asCourse(actor, async db => {
        started.resolve((await db.query('select pg_backend_pid() as pid')).rows[0].pid)
        return fn(db)
      }))))
      const secondPid = await Promise.race([started.promise, second.then(result => {
        if (result.status === 'rejected') throw result.reason
        assert.fail('Competing repository command never opened its transaction')
      })])
      let blocked = false
      const deadline = Date.now() + 3000
      while (Date.now() < deadline) {
        const row = (await admin.query('select $2::integer=any(pg_blocking_pids($1)) as blocked', [secondPid, firstPid])).rows[0]
        if (row.blocked) { blocked = true; break }
        await delay(20)
      }
      assert.equal(blocked, true, 'Competing command must wait on the real account owner lock')
      release.resolve()
      return await Promise.all([first, second])
    } finally {
      release.resolve()
      await Promise.all([first, second].filter(Boolean))
    }
  }
  await t.test('daily continuation reuses a Free legacy active finished course in both feature modes', async () => {
    for (const multiCourseEnabled of [false, true]) {
      const owner = await createOwner(admin), fixture = await finishedCourse(owner, { status: 'active' })
      const service = repositories(undefined, { ...courseConfig, multiCourseEnabled }).daily
      const before = await courseSnapshot(owner, fixture.courseId)
      const original = await service.read(owner, 'en', fixture.courseId)
      // The legacy counter counts the active course row; the SQL projection
      // deliberately frees its slot once all of its cycles are finished.
      assert.equal(original.access.activeCourseCount, multiCourseEnabled ? 0 : 1)
      const next = await service.command(owner, 'new-cycle', continuation(fixture))
      assert.equal(next.courseId, fixture.courseId)
      assert.equal(next.courseStatus, 'active')
      assert.equal(next.cycle.cycleNumber, 2)
      assert.equal(next.cycle.contentVersion, COURSE_CONTENT_V4)
      assert.equal(next.cycle.primaryGoal, 'connection_boundaries')
      assert.equal(next.access.activeCourseCount, 1)
      assert.equal(next.access.activeCourseLimit, 1)
      const after = await courseSnapshot(owner, fixture.courseId)
      assert.equal(after.growth_courses.length, 1)
      assert.equal(after.growth_cycles.length, 2)
      const oldCycle = after.growth_cycles.find(row => row.id === fixture.cycleId)
      assert.equal(oldCycle.status, 'archived')
      for (const key of ['primary_domain', 'content_version', 'start_local_date', 'preferences', 'revision'])
        assert.deepEqual(oldCycle[key], before.growth_cycles[0][key])
      assert.deepEqual(after.growth_targets.find(row => row.id === fixture.targetId), before.growth_targets[0])
      await assert.rejects(start(owner), /COURSE_ACTIVE_LIMIT/)
    }
  })
  await t.test('inactive completed and paused continuations need a free slot and roll back quota rejection', async () => {
    for (const status of ['completed', 'paused']) {
      const owner = await createOwner(admin)
      const fixture = await finishedCourse(owner, { status, cycleStatus: status })
      const occupying = await start(owner)
      const before = await courseSnapshot(owner, fixture.courseId)
      await assert.rejects(daily.command(owner, 'new-cycle', continuation(fixture)), /COURSE_ACTIVE_LIMIT/)
      assert.deepEqual(await courseSnapshot(owner, fixture.courseId), before)
      await courses.command(owner, { action: 'pause', courseId: occupying.course.id, expectedRevision: occupying.course.revision })
      const next = await daily.command(owner, 'new-cycle', continuation(fixture))
      assert.equal(next.courseStatus, 'active')
      assert.equal(next.cycle.cycleNumber, 2)
      assert.equal(next.access.activeCourseCount, 1)
      assert.equal((await courseSnapshot(owner, fixture.courseId)).growth_courses[0].finished_at, null)
    }
  })
  await t.test('daily continuations enforce Start one-slot and Advanced/Premium five-slot limits', async () => {
    for (const [planId, limit] of [['start', 1], ['advanced', 5], ['premium', 5]]) {
      const owner = await createOwner(admin)
      await seedSubscription(repo, owner, { planId })
      for (let i = 0; i < limit - 1; i++) await start(owner)
      const fixture = await finishedCourse(owner), blocked = await finishedCourse(owner)
      const next = await daily.command(owner, 'new-cycle', continuation(fixture))
      assert.equal(next.access.tier, planId)
      assert.equal(next.access.activeCourseLimit, limit)
      assert.equal(next.access.activeCourseCount, limit)
      const before = await courseSnapshot(owner, blocked.courseId)
      await assert.rejects(daily.command(owner, 'new-cycle', continuation(blocked)), /COURSE_ACTIVE_LIMIT/)
      assert.deepEqual(await courseSnapshot(owner, blocked.courseId), before)
      await assert.rejects(start(owner), /COURSE_ACTIVE_LIMIT/)
    }
  })
  await t.test('multi-course active rows with completed cycles cannot reuse a slot already taken by another course', async () => {
    for (const [planId, limit] of [['free', 1], ['advanced', 5]]) {
      const owner = await createOwner(admin)
      if (planId !== 'free') await seedSubscription(repo, owner, { planId })
      const fixture = await finishedCourse(owner, { status: 'active' })
      for (let i = 0; i < limit; i++) await start(owner)
      assert.equal((await access(owner)).active_course_count, limit)
      const before = await courseSnapshot(owner, fixture.courseId)
      await assert.rejects(daily.command(owner, 'new-cycle', continuation(fixture)), /COURSE_ACTIVE_LIMIT/)
      assert.deepEqual(await courseSnapshot(owner, fixture.courseId), before)
      assert.equal((await access(owner)).active_course_count, limit)
    }
  })
  await t.test('over-limit downgrade preserves current daily work but blocks replacement cycles until capacity returns', async () => {
    const owner = await createOwner(admin), snapshot = await seedSubscription(repo, owner, { planId: 'premium' })
    const fixtures = []
    for (let i = 0; i < 5; i++) fixtures.push(await finishedCourse(owner, { status: 'active', cycleStatus: 'active' }))
    await repo.withOwner(owner, store => store.saveSubscription({ ...snapshot, planId: 'start' }))
    const fixture = fixtures[0]
    const progress = await daily.command(owner, 'preferences', { courseId: fixture.courseId, cycleId: fixture.cycleId,
      expectedRevision: 0, length: 'quick', imagery: 'no_imagery', checkinFrequency: 'weekly' })
    assert.equal(progress.access.overLimit, true)
    assert.equal(progress.access.activeCourseCount, 5)
    const resumed = await daily.command(owner, 'resume', { courseId: fixture.courseId, cycleId: fixture.cycleId,
      expectedRevision: progress.cycle.revision })
    assert.equal(resumed.access.activeCourseCount, 5)
    const before = await courseSnapshot(owner, fixture.courseId)
    await assert.rejects(daily.command(owner, 'new-cycle', continuation(fixture)), /COURSE_ACTIVE_LIMIT/)
    assert.deepEqual(await courseSnapshot(owner, fixture.courseId), before)
    for (const other of fixtures.slice(1)) await daily.command(owner, 'pause', {
      courseId: other.courseId, cycleId: other.cycleId, expectedRevision: 0,
    })
    const next = await daily.command(owner, 'new-cycle', continuation(fixture))
    assert.equal(next.cycle.cycleNumber, 2)
    assert.equal(next.access.overLimit, false)
    assert.equal(next.access.activeCourseCount, 1)
    assert.equal((await admin.query('select count(*)::integer n from app_private.growth_courses where account_id=$1', [owner.id])).rows[0].n, 5)
  })
  await t.test('real owner locks serialize a fresh start against continuation in either order', async () => {
    for (const continuationFirst of [false, true]) {
      const owner = await createOwner(admin), fixture = await finishedCourse(owner)
      const before = await courseSnapshot(owner, fixture.courseId)
      const continuing = repositories => repositories.daily.command(owner, 'new-cycle', continuation(fixture))
      const starting = repositories => start(owner, repositories.courses)
      const results = await raceOnOwner(owner, continuationFirst ? continuing : starting, continuationFirst ? starting : continuing)
      assert.equal(results[0].status, 'fulfilled')
      assert.equal(results[1].status, 'rejected')
      assert.equal(results[1].reason.message, 'COURSE_ACTIVE_LIMIT')
      assert.equal((await access(owner)).active_course_count, 1)
      if (continuationFirst) assert.equal((await courseSnapshot(owner, fixture.courseId)).growth_cycles.length, 2)
      else assert.deepEqual(await courseSnapshot(owner, fixture.courseId), before)
    }
  })
  await t.test('two distinct inactive continuations share the owner lock and cannot take the same final slot', async () => {
    const owner = await createOwner(admin), first = await finishedCourse(owner), second = await finishedCourse(owner)
    const before = await courseSnapshot(owner, second.courseId)
    const results = await raceOnOwner(owner,
      repositories => repositories.daily.command(owner, 'new-cycle', continuation(first)),
      repositories => repositories.daily.command(owner, 'new-cycle', continuation(second)))
    assert.equal(results[0].status, 'fulfilled')
    assert.equal(results[1].status, 'rejected')
    assert.equal(results[1].reason.message, 'COURSE_ACTIVE_LIMIT')
    assert.equal((await access(owner)).active_course_count, 1)
    assert.equal((await courseSnapshot(owner, first.courseId)).growth_cycles.length, 2)
    assert.deepEqual(await courseSnapshot(owner, second.courseId), before)
  })
  await t.test('new-cycle failure after its INSERT rolls back the real cycle, goals and old archive, preserving targets', async () => {
    const owner = await createOwner(admin), fixture = await finishedCourse(owner)
    const before = await courseSnapshot(owner, fixture.courseId)
    let insertedCycle = false
    const service = repositories((_config, actor, fn) => asCourse(actor, db => fn({ query: async (sql, args) => {
      const result = await db.query(sql, args)
      if (sql.trimStart().startsWith('insert into app_private.growth_cycles')) insertedCycle = true
      return result
    } }))).daily
    // Intention validation occurs while building the target INSERT, after the
    // new cycle INSERT has succeeded. No SQL/crypto implementation is mocked.
    await assert.rejects(service.command(owner, 'new-cycle', { ...continuation(fixture), intention: 'x'.repeat(301) }), /INVALID_COURSE_TARGET/)
    assert.equal(insertedCycle, true, 'The database really inserted a new cycle before failing')
    assert.deepEqual(await courseSnapshot(owner, fixture.courseId), before)
    assert.equal((await access(owner)).active_course_count, 0)
    const retry = await daily.command(owner, 'new-cycle', continuation(fixture))
    assert.equal(retry.cycle.cycleNumber, 2)
    assert.equal((await courseSnapshot(owner, fixture.courseId)).growth_cycles.length, 2)
  })
  await t.test('daily continuation keeps owner, selected-cycle and revoked-session isolation', async () => {
    const owner = await createOwner(admin), stranger = await createOwner(admin), fixture = await finishedCourse(owner)
    const before = await courseSnapshot(owner, fixture.courseId)
    await assert.rejects(daily.command(stranger, 'new-cycle', continuation(fixture)), /COURSE_NOT_FOUND/)
    await assert.rejects(daily.command(owner, 'new-cycle', { ...continuation(fixture), cycleId: randomUUID() }), /COURSE_CYCLE_CHANGED/)
    await admin.query('delete from auth.sessions where id=$1', [owner.claims.session_id])
    await assert.rejects(daily.command(owner, 'new-cycle', continuation(fixture)), /COURSE_ACCESS_DENIED|ACCOUNT_UNAVAILABLE|COURSE_NOT_FOUND/)
    assert.deepEqual(await courseSnapshot(owner, fixture.courseId), before)
  })
  await t.test('EUR course quotas serialize competing final-slot inserts with real row locks', async () => {
    const free = await createOwner(admin), paid = await createOwner(admin)
    await seedSubscription(repo, paid, { planId: 'advanced' })
    const freeRace = await Promise.allSettled([addCourse(free), addCourse(free)])
    assert.equal(freeRace.filter(item => item.status === 'fulfilled').length, 1)
    assert.equal(freeRace.find(item => item.status === 'rejected').reason.message, 'COURSE_ACTIVE_LIMIT')
    for (let i = 0; i < 4; i++) await addCourse(paid)
    const finalSlot = await Promise.allSettled([addCourse(paid), addCourse(paid)])
    assert.equal(finalSlot.filter(item => item.status === 'fulfilled').length, 1)
    assert.equal(finalSlot.find(item => item.status === 'rejected').reason.message, 'COURSE_ACTIVE_LIMIT')
    assert.deepEqual(await access(paid), { tier: 'advanced', active_course_limit: 5, active_course_count: 5 })
  })
  await t.test('downgrade retains five courses, permits existing updates, blocks new/resume past quota', async () => {
    const owner = await createOwner(admin)
    const snapshot = await seedSubscription(repo, owner, { planId: 'premium' })
    const courses = []
    for (let i = 0; i < 5; i++) courses.push((await addCourse(owner)).rows[0].id)
    await repo.withOwner(owner, store => store.saveSubscription({ ...snapshot, planId: 'start' }))
    assert.deepEqual(await access(owner), { tier: 'start', active_course_limit: 1, active_course_count: 5 })
    await asCourse(owner, db => db.query('update app_private.growth_courses set revision=revision+1 where id=$1', [courses[0]]))
    await assert.rejects(addCourse(owner), /COURSE_ACTIVE_LIMIT/)
    await asCourse(owner, db => db.query("update app_private.growth_courses set status='paused' where id=$1", [courses[0]]))
    await assert.rejects(asCourse(owner, db => db.query("update app_private.growth_courses set status='active' where id=$1", [courses[0]])), /COURSE_ACTIVE_LIMIT/)
    assert.equal((await admin.query('select count(*)::integer n from app_private.growth_courses where account_id=$1', [owner.id])).rows[0].n, 5)
  })
  await t.test('course allowance denies foreign, revoked-session, anonymous and wrong-environment access', async () => {
    const owner = await createOwner(admin), stranger = await createOwner(admin)
    await seedSubscription(repo, owner, { planId: 'advanced' })
    assert.equal((await asCourse(owner, db => db.query("select * from app_private.course_access('live')"), 'live')).rows[0].tier, 'free')
    await assert.rejects(asCourse(stranger, db => db.query('insert into app_private.growth_courses(account_id,consented_at) values($1,now())', [owner.id])), /COURSE_ACCESS_DENIED|row-level security/)
    for (const role of ['anon', 'authenticated', 'hh_billing_backend'])
      await assert.rejects(rawAs(owner, role, db => db.query("select * from app_private.course_access('sandbox')")), /permission denied/)
    await admin.query('delete from auth.sessions where id=$1', [owner.claims.session_id])
    await assert.rejects(access(owner), /COURSE_ACCESS_DENIED/)
  })
  await t.test('standard fixed batteries and personal editable selection share owner-scoped storage', async () => {
    const owner=await createOwner(admin),stranger=await createOwner(admin)
    const courseConfig={...appConfig,multiCourseEnabled:true,billingEnvironment:'sandbox',encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic-ci-only'}
    const courses=createGrowthCourseRepository(courseConfig,{runTransaction:(_config,actor,fn)=>asCourse(actor,fn)})
    const preset=COURSE_PRESETS[0],id=randomUUID()
    let state=await courses.command(owner,{action:'start',consent:true,courseId:id,presetId:preset.id})
    await assert.rejects(courses.command(owner,{action:'confirm-tests',courseId:id,expectedRevision:state.course.revision,testKeys:preset.testKeys.slice(0,4)}),/COURSE_PRESET_TESTS_FIXED/)
    await assert.rejects(courses.command(owner,{action:'confirm-tests',courseId:id,expectedRevision:state.course.revision,testKeys:preset.testKeys}),/COURSE_TEST_SELECTION_REQUIRED/)
    const ids=preset.testKeys.map(key=>ASSESSMENT_DEFINITIONS.find(def=>def.key===key&&def.instrumentLocale==='en').id)
    await admin.query('insert into app_private.assessment_plans(account_id,definition_ids,operation_id) values($1,$2,$3)',[owner.id,ids,randomUUID()])
    state=await courses.command(owner,{action:'confirm-tests',courseId:id,expectedRevision:state.course.revision,testKeys:preset.testKeys})
    const replay=await courses.command(owner,{action:'start',consent:true,courseId:id,presetId:preset.id})
    assert.deepEqual(replay.course.testKeys,preset.testKeys);assert.equal(replay.course.revision,state.course.revision)
    await assert.rejects(courses.command(owner,{action:'review',courseId:id,expectedRevision:state.course.revision}),/COURSE_TESTS_REQUIRED/)
    state=await courses.command(owner,{action:'select-personal',courseId:id,expectedRevision:state.course.revision})
    assert.equal(state.course.presetId,null)
    state=await courses.command(owner,{action:'intake',courseId:id,expectedRevision:state.course.revision,focusTags:[],concerns:'Synthetic personal goal'})
    state=await courses.command(owner,{action:'confirm-tests',courseId:id,expectedRevision:state.course.revision,testKeys:preset.testKeys.slice(0,2)})
    assert.equal(state.course.testKeys.length,2)
    await assert.rejects(courses.read(stranger,id),/COURSE_NOT_FOUND/)
    assert.equal((await courses.exportHistory(owner))[0].concerns,'Synthetic personal goal')
    state=await courses.command(owner,{action:'close',courseId:id,expectedRevision:state.course.revision})
    assert.equal(state.course.status,'archived');assert.equal(state.access.activeCourseCount,0)
    assert.equal((await courses.exportHistory(owner))[0].testKeys.length,2)
  })
  await t.test('dispute recovery keeps exact requested operation and cannot clear a refund hold', async () => {
    const owner=await createOwner(admin),snapshot=await seedSubscription(repo,owner,{planId:'premium'})
    const credits=createBillingRepository(appConfig,billingConfig,{pool,extendStore:premiumSessionStore})
    const operationId=randomUUID(),input={operationId,periodEnd:snapshot.paidThroughAt}
    const dispute={reason:'dispute',chargeId:'ch_recovery',invoiceId:'in_recovery',disputeId:'dp_recovery',disputeStatus:'under_review',periodEnd:snapshot.paidThroughAt}
    await credits.withOwner(owner,async store=>{await store.syncSessionCredit(snapshot);await store.requestSessionCredit(snapshot,input)})
    const before=(await admin.query('select requested_at from billing_private.premium_session_credits where owner_id=$1',[owner.id])).rows[0]
    await credits.withOwner(owner,store=>store.syncSessionCredit({...snapshot,paidThroughAt:null,revokedAt:new Date().toISOString()},Date.now(),{holds:[dispute]}))
    assert.equal((await credits.withOwner(owner,store=>store.getSessionCredit(snapshot))).status,'revoked')
    const resolved={resolvedDisputes:[{...dispute,disputeStatus:'won'}]}
    await Promise.all([credits.withOwner(owner,store=>store.syncSessionCredit(snapshot,Date.now(),resolved)),credits.withOwner(owner,store=>store.syncSessionCredit(snapshot,Date.now(),resolved))])
    const after=(await admin.query('select * from billing_private.premium_session_credits where owner_id=$1',[owner.id])).rows[0]
    assert.equal(after.status,'requested');assert.equal(after.operation_id,operationId);assert.equal(String(after.requested_at),String(before.requested_at))
    assert.equal(after.hold_details[0].resolution,'won')
    assert.equal((await credits.withOwner(owner,store=>store.requestSessionCredit(snapshot,input))).status,'requested')
    await credits.withOwner(owner,store=>store.syncSessionCredit({...snapshot,paidThroughAt:null,revokedAt:new Date().toISOString()},Date.now(),{holds:[{...dispute,reason:'refund'}]}))
    await credits.withOwner(owner,store=>store.syncSessionCredit(snapshot,Date.now(),resolved))
    assert.equal((await credits.withOwner(owner,store=>store.getSessionCredit(snapshot))).status,'revoked')
    assert.equal((await admin.query('select count(*)::integer n from billing_private.premium_session_credits where owner_id=$1',[owner.id])).rows[0].n,1)
  })
  await t.test('Premium monthly credit races consume one credit and scope replay by paid period', async () => {
    const owner = await createOwner(admin), stranger = await createOwner(admin)
    const snapshot = await seedSubscription(repo, owner, { planId: 'premium' })
    const credits = createBillingRepository(appConfig, billingConfig, { pool, extendStore: premiumSessionStore })
    await Promise.all([credits.withOwner(owner, store => store.syncSessionCredit(snapshot)), credits.withOwner(owner, store => store.syncSessionCredit(snapshot))])
    assert.equal((await admin.query('select count(*)::integer n from billing_private.premium_session_credits where owner_id=$1', [owner.id])).rows[0].n, 1)
    const operationId = randomUUID(), input = { operationId, periodEnd: snapshot.paidThroughAt }
    const results = await Promise.all([credits.withOwner(owner, store => store.requestSessionCredit(snapshot, input)), credits.withOwner(owner, store => store.requestSessionCredit(snapshot, input))])
    assert.deepEqual(results[0], results[1]); assert.equal(results[0].status, 'requested')
    await assert.rejects(credits.withOwner(owner, store => store.requestSessionCredit(snapshot, { ...input, operationId: randomUUID() })), /ALREADY_REQUESTED/)
    assert.equal(await credits.withOwner(stranger, store => store.getSessionCredit(snapshot)), null)
    await assert.rejects(rawAs(owner, 'hh_billing_backend', db => db.query("update billing_private.premium_session_credits set fulfilled_at=now(),status='fulfilled'"), { ownerId: owner.id }), /permission denied/)
  })
}
