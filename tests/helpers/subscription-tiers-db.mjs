import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createBillingRepository } from '../../lib/billing/repository.js'
import { createGrowthCourseRepository } from '../../lib/app/growth-course.js'
import { ASSESSMENT_DEFINITIONS } from '../../lib/assessments/definitions.js'
import { COURSE_PRESETS } from '../../lib/inner-growth/course-presets.js'
import { premiumSessionStore } from '../../lib/billing/premium-sessions.js'

// Called only by the guarded, fresh native PostgreSQL17 billing integration job.
export async function runTierDatabaseTests(t, { admin, pool, appConfig, billingConfig, createOwner, seedSubscription, repo, rawAs }) {
  const asCourse = (actor, fn, environment = 'sandbox') => rawAs(actor, 'hh_app_backend', async db => {
    await db.query("select set_config('hh.course_billing_environment',$1,true)", [environment])
    return fn(db)
  })
  const addCourse = actor => asCourse(actor, db => db.query('insert into app_private.growth_courses(account_id,consented_at) values($1,now()) returning id', [actor.id]))
  const access = actor => asCourse(actor, async db => (await db.query("select * from app_private.course_access('sandbox')")).rows[0])
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
