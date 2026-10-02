import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createAppRepository } from '../lib/app/repository.js'
import { getAppConfig } from '../lib/app/config.js'
import { closeDatabase, transaction } from '../lib/app/database.js'
import { A, B, SB, actor, setup, adminClient, rawAs } from './helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { APP_SERVICES } from '../data/app-services.js'
const config = getAppConfig(),
  repo = createAppRepository(config),
  a = actor(),
  b = actor(B, SB)
const en = getAssessmentDefinition('hh-current-state', 'v1', 'en'),
  ru = getAssessmentDefinition('hh-current-state', 'v1', 'ru'),
  mini = getAssessmentDefinition('mini-ipip-20', 'v1', 'en')
const answer = (def, value = 3) => Object.fromEntries(def.questions.map((q) => [q.id, value]))
const start = (who = a, def = en) =>
  repo.startRun(who, {
    definitionKey: def.key,
    definitionVersion: def.version,
    instrumentLocale: def.instrumentLocale,
    operationId: randomUUID(),
  })
async function save(run, who = a, value = 3) {
  return repo.saveRun(who, run.id, {
    answers: answer(
      getAssessmentDefinition(run.definitionKey, run.definitionVersion, run.instrumentLocale),
      value,
    ),
    context: {},
    progress: 0,
    expectedRevision: run.revision,
    operationId: randomUUID(),
  })
}
let firstResult
before(async () => {
  await setup()
  for (const who of [a, b]) {
    await repo.ensureAccount(who)
    await repo.onboarding(who, {
      adult: true,
      necessary: true,
      marketing: false,
      displayName: 'Synthetic',
      uiLocale: 'en',
      timezone: 'America/Toronto',
      goal: 'explore',
    })
  }
})
after(closeDatabase)
test('actual grants: own reads allowed; account status and identity updates denied', async () => {
  assert.equal(
    (await rawAs(a, 'authenticated', (db) => db.query('select id from app.accounts'))).rows.length,
    1,
  )
  await assert.rejects(
    () =>
      rawAs(a, 'authenticated', (db) =>
        db.query("update app.accounts set status='active' where id=$1", [A]),
      ),
    (e) => e.code === '42501',
  )
  await assert.rejects(
    () =>
      rawAs(a, 'authenticated', (db) =>
        db.query('update app.accounts set id=$1 where id=$2', [B, A]),
      ),
    (e) => e.code === '42501',
  )
  assert.equal(
    (await rawAs(a, 'authenticated', (db) => db.query('select * from app.assessment_results'))).rows
      .length,
    0,
  )
  assert.equal(
    (await rawAs(a, 'authenticated', (db) => db.query('select * from app.profile_snapshots'))).rows
      .length,
    0,
  )
})
test('blocked account cannot self-unblock or create/read private results', async () => {
  const db = await adminClient()
  try {
    await db.query("update app.accounts set status='blocked' where id=$1", [B])
    await assert.rejects(
      () =>
        rawAs(b, 'authenticated', (q) =>
          q.query("update app.accounts set status='active' where id=$1", [B]),
        ),
      (e) => e.code === '42501',
    )
    await assert.rejects(() => start(b), /ACCOUNT_UNAVAILABLE/)
    assert.equal(
      (await rawAs(b, 'authenticated', (q) => q.query('select * from app.assessment_runs'))).rows
        .length,
      0,
    )
  } finally {
    await db.query("update app.accounts set status='active' where id=$1", [B])
    await db.end()
  }
})
test('durable result and one snapshot survive repository reconstruction; B cannot read A', async () => {
  const run = await save(await start())
  firstResult = await repo.submitRun(a, run.id, { expectedRevision: run.revision })
  assert.equal(firstResult.accountId, A)
  assert.equal(firstResult.dimensions.length, 5)
  assert.deepEqual(await createAppRepository(config).getResult(a, firstResult.id), firstResult)
  assert.equal(
    (await rawAs(a, 'authenticated', (q) => q.query('select id from app.assessment_results'))).rows
      .length,
    1,
  )
  assert.equal(
    (await rawAs(b, 'authenticated', (q) => q.query('select id from app.assessment_results'))).rows
      .length,
    0,
  )
  await assert.rejects(() => repo.getResult(b, firstResult.id), /NOT_FOUND/)
  await assert.rejects(
    () =>
      rawAs(a, 'authenticated', (q) =>
        q.query(
          'insert into app.profile_snapshots(id,account_id,generating_result_id,dimensions) values($1,$2,$3,$4)',
          [randomUUID(), A, firstResult.id, '[]'],
        ),
      ),
    (e) => e.code === '42501',
  )
})
test('simultaneous saves accept one revision; concurrent submit returns one result', async () => {
  const run = await start(),
    writes = await Promise.allSettled([save(run, a, 4), save(run, a, 5)])
  assert.equal(writes.filter((x) => x.status === 'fulfilled').length, 1)
  assert.match(writes.find((x) => x.status === 'rejected').reason.message, /REVISION_CONFLICT/)
  const saved = writes.find((x) => x.status === 'fulfilled').value
  const [one, two] = await Promise.all([
    repo.submitRun(a, saved.id, { expectedRevision: saved.revision }),
    repo.submitRun(a, saved.id, { expectedRevision: saved.revision }),
  ])
  assert.equal(one.id, two.id)
  assert.equal(
    (
      await rawAs(a, 'authenticated', (q) =>
        q.query('select id from app.profile_snapshots where generating_result_id=$1', [one.id]),
      )
    ).rows.length,
    1,
  )
})
test('uncertain save retry is idempotent; same key with different content conflicts', async () => {
  const run = await start(),
    body = {
      answers: answer(en, 2),
      context: { note: 'Synthetic private note' },
      progress: 1,
      expectedRevision: run.revision,
      operationId: randomUUID(),
    }
  const one = await repo.saveRun(a, run.id, body),
    two = await repo.saveRun(a, run.id, body)
  assert.equal(one.revision, two.revision)
  await assert.rejects(
    () => repo.saveRun(a, run.id, { ...body, progress: 2 }),
    /IDEMPOTENCY_CONFLICT/,
  )
  const db = await adminClient()
  try {
    const row = (
      await db.query('select context_ciphertext,answers from app.assessment_runs where id=$1', [
        run.id,
      ])
    ).rows[0]
    assert.ok(!row.context_ciphertext.includes('Synthetic private note'))
    assert.ok(!JSON.stringify(row.answers).includes('Synthetic private note'))
  } finally {
    await db.end()
  }
  await repo.discardRun(a, run.id, { expectedRevision: one.revision })
})
test('draft source cannot be rebound; submitted answer/result content is immutable', async () => {
  const run = await start(),
    saved = await save(run)
  await assert.rejects(
    () =>
      transaction(config, a, (q) =>
        q.query(
          'update app.assessment_runs set assessment_version_id=$2,revision=revision+1 where id=$1',
          [run.id, ru.id],
        ),
      ),
    /IMMUTABLE_IDENTITY/,
  )
  const result = await repo.submitRun(a, run.id, { expectedRevision: saved.revision })
  await assert.rejects(
    () =>
      repo.saveRun(a, run.id, {
        answers: {},
        context: {},
        progress: 0,
        expectedRevision: saved.revision + 2,
        operationId: randomUUID(),
      }),
    /IMMUTABLE_RUN/,
  )
  await assert.rejects(
    () =>
      rawAs(a, 'authenticated', (q) =>
        q.query('update app.assessment_results set dimensions=$1 where id=$2', ['[]', result.id]),
      ),
    (e) => e.code === '42501',
  )
})
test('injected snapshot failure rolls back provisional submission and result', async () => {
  const run = await save(await start()),
    db = await adminClient()
  try {
    await db.query(
      "create function app_private.ci_fail_snapshot() returns trigger language plpgsql as $$ begin raise exception 'CI_INJECTED_FAILURE'; end $$;create trigger ci_fail_snapshot before insert on app.profile_snapshots for each row execute function app_private.ci_fail_snapshot();",
    )
    await assert.rejects(
      () => repo.submitRun(a, run.id, { expectedRevision: run.revision }),
      /CI_INJECTED_FAILURE/,
    )
    assert.equal((await repo.getRun(a, run.id)).status, 'in_progress')
    assert.equal(
      (await db.query('select id from app.assessment_results where run_id=$1', [run.id])).rows
        .length,
      0,
    )
  } finally {
    await db.query(
      'drop trigger if exists ci_fail_snapshot on app.profile_snapshots;drop function if exists app_private.ci_fail_snapshot()',
    )
    await db.end()
  }
  await repo.submitRun(a, run.id, { expectedRevision: run.revision })
})
test('submit racing autosave cannot silently include a newer unacknowledged revision', async () => {
  const saved = await save(await start()),
    attempts = await Promise.allSettled([
      repo.submitRun(a, saved.id, { expectedRevision: saved.revision }),
      repo.saveRun(a, saved.id, {
        answers: { 'state.tension': 9 },
        context: {},
        progress: 5,
        expectedRevision: saved.revision,
        operationId: randomUUID(),
      }),
    ])
  assert.equal(attempts.filter((x) => x.status === 'fulfilled').length, 1)
  const current = await repo.getRun(a, saved.id)
  if (current.status === 'in_progress')
    await repo.submitRun(a, saved.id, { expectedRevision: current.revision })
})
test('a second instrument carries only unaffected axes with their original dates', async () => {
  const p = await save(await start(a, mini)),
    traitResult = await repo.submitRun(a, p.id, { expectedRevision: p.revision }),
    state = await save(await start()),
    stateResult = await repo.submitRun(a, state.id, { expectedRevision: state.revision }),
    bootstrap = await repo.bootstrap(a),
    dimensions = bootstrap.snapshot.dimensions
  assert.equal(dimensions.length, 10)
  assert.equal(new Set(dimensions.map((d) => d.key)).size, 10)
  assert.ok(
    dimensions
      .filter((d) => d.dimensionClass === 'trait')
      .every((d) => d.measurementAt === traitResult.measurementAt && !d.remeasured),
  )
  assert.ok(
    dimensions
      .filter((d) => d.dimensionClass === 'state')
      .every((d) => d.sourceResultId === stateResult.id && d.remeasured),
  )
})
test('requests are idempotent and share only an explicit excerpt; unshare and cancel work', async () => {
  const payload = {
      serviceId: APP_SERVICES[0].id,
      operationId: randomUUID(),
      contact: 'synthetic@example.invalid',
      message: 'Private synthetic message',
      shareResultId: firstResult.id,
      shareConfirmed: true,
    },
    request = await repo.createRequest(a, payload)
  assert.equal((await repo.createRequest(a, payload)).id, request.id)
  await assert.rejects(
    () => repo.createRequest(b, { ...payload, operationId: randomUUID() }),
    /NOT_FOUND/,
  )
  const found = (await repo.inbox()).find((r) => r.id === request.id)
  assert.equal(found.contact, payload.contact)
  assert.equal(found.sharedExcerpt.resultId, firstResult.id)
  assert.equal(found.answers, undefined)
  const next = await repo.inboxUpdate(request.id, {
      status: 'contacted',
      expectedRevision: request.revision,
    }),
    unshared = await repo.updateRequest(a, request.id, {
      action: 'unshare',
      expectedRevision: next.revision,
    })
  assert.equal((await repo.inbox()).find((r) => r.id === request.id).sharedExcerpt, null)
  const cancelled = await repo.updateRequest(a, request.id, {
    action: 'cancel',
    expectedRevision: unshared.revision,
  })
  assert.equal(cancelled.status, 'cancelled')
  // SELECT FOR UPDATE also applies the UPDATE RLS policy: cancelled requests are not mutable.
  await assert.rejects(
    () => repo.inboxUpdate(request.id, { status: 'closed', expectedRevision: cancelled.revision }),
    /NOT_FOUND/,
  )
  assert.equal((await repo.inbox()).find((r) => r.id === request.id).status, 'cancelled')
})
test('inbox role cannot query accounts/results; wrong recipient sees nothing', async () => {
  await assert.rejects(
    () => rawAs(a, 'hh_app_inbox', (q) => q.query('select * from app.assessment_results')),
    (e) => e.code === '42501',
  )
  await assert.rejects(
    () => rawAs(a, 'hh_app_inbox', (q) => q.query('select * from app.accounts')),
    (e) => e.code === '42501',
  )
  const other = await rawAs(a, 'hh_app_inbox', async (q) => {
    await q.query("select set_config('hh.practitioner_id',$1,true)", [randomUUID()])
    return q.query('select * from app.consultation_requests')
  })
  assert.equal(other.rows.length, 0)
})
test('encrypted context edit and own complete export preserve privacy and revisions', async () => {
  const event = await repo.contextEvent(a, null, {
    label: 'Synthetic move',
    note: 'Sensitive synthetic context',
    occurredAt: '2026-10-01T10:00:00Z',
    timezone: 'America/Toronto',
  })
  await assert.rejects(
    () => repo.contextEvent(b, event.id, { action: 'delete', expectedRevision: 0 }),
    /NOT_FOUND/,
  )
  const updated = await repo.contextEvent(a, event.id, {
    label: 'Synthetic new job',
    note: 'Private update',
    occurredAt: '2026-10-02T10:00:00Z',
    timezone: 'UTC',
    expectedRevision: 0,
  })
  assert.equal(updated.revision, 1)
  const exported = await repo.exportData(a)
  assert.ok(exported.contextEvents.some((e) => e.label === 'Synthetic new job'))
  assert.ok(exported.results.every((e) => e.accountId === A))
  assert.ok(exported.runs.length >= exported.results.length)
  await repo.contextEvent(a, event.id, { action: 'delete', expectedRevision: 1 })
})
test('revoked session denied even when token expiry is still in the future', async () => {
  const db = await adminClient()
  try {
    await db.query('delete from auth.sessions where id=$1', [SB])
    await assert.rejects(() => repo.bootstrap(b), /SIGN_IN_REQUIRED/)
    assert.equal(
      (await rawAs(b, 'authenticated', (q) => q.query('select * from app.accounts'))).rows.length,
      0,
    )
  } finally {
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [SB, B])
    await db.end()
  }
})
test('deletion request disables access without pretending provider data was erased', async () => {
  const result = await repo.requestDeletion(b, { confirmation: 'DELETE' })
  assert.equal(result.status, 'requested')
  assert.equal(result.deleted, false)
  await assert.rejects(() => repo.bootstrap(b), /DELETION_REQUESTED/)
  await assert.rejects(
    () =>
      rawAs(b, 'authenticated', (q) =>
        q.query("update app.accounts set status='active' where id=$1", [B]),
      ),
    (e) => e.code === '42501',
  )
})

test('legacy shared report claim is idempotent for one account and exclusive across accounts', async () => {
  const sourceAssessmentId = '30000000-0000-4000-8000-000000000001'
  const input = {
    sourceAssessmentId,
    sourceRevision: 2,
    report: {
      id: sourceAssessmentId,
      kind: 'research_result',
      title: 'Synthetic shared report',
      occurredOn: '2026-10-02',
      language: 'en',
      sourceName: 'Synthetic source',
      sourceVersion: 'v1',
      description: 'Description',
      originalResult: 'Result',
      practitionerComment: 'Comment',
    },
  }
  const first = await repo.claimSharedReport(a, input)
  const replay = await repo.claimSharedReport(a, input)
  assert.equal(replay.id, first.id)
  await assert.rejects(() => repo.claimSharedReport(b, input), /REPORT_ALREADY_CLAIMED/)
  const own = await repo.bootstrap(a)
  assert.equal(own.accountReports.filter((item) => item.sourceAssessmentId === sourceAssessmentId).length, 1)
  assert.equal(own.accountReports.find((item) => item.sourceAssessmentId === sourceAssessmentId).report.title, 'Synthetic shared report')
  assert.equal((await repo.bootstrap(b)).accountReports.length, 0)
  assert.equal(
    (await rawAs(b, 'authenticated', (db) => db.query('select id from app.account_reports'))).rows.length,
    0,
  )
})
