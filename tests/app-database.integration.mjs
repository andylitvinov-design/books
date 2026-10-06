import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createAppRepository } from '../lib/app/repository.js'
import { createGuestRepository } from '../lib/app/guest-repository.js'
import { createGuestCredential } from '../lib/app/guest-session.js'
import { createGuestSaveIntent, createLegacyDocumentSaveIntent, createReportSaveIntent } from '../lib/app/save-intents.js'
import {
  authorizeReportViewer,
  commitReportSaveIntent,
  exchangeReportViewer,
  issueReportGrant,
  readSavedReport,
  rotateReportGrant,
} from '../lib/app/report-flow.js'
import * as maintenance from '../lib/app/maintenance.js'
const { appHousekeepingStatus, runAppHousekeeping } = maintenance
import { getAppConfig } from '../lib/app/config.js'
import { closeDatabase, transaction } from '../lib/app/database.js'
import { A, B, SB, actor, setup, adminClient, rawAs } from './helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { APP_SERVICES } from '../data/app-services.js'
import { createPractitionerRepository } from '../lib/practitioners/repository.js'
import { bindLegacyClientToAccount } from '../lib/app/client-account-binding.js'
import { commitLegacyDocumentSaveIntent, readSavedDocument } from '../lib/app/legacy-document-flow.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createPaymentDocument } from '../lib/documents/payment.js'
import { legacyDocumentSourceHash } from '../lib/app/legacy-document.js'
const config = getAppConfig(),
  repo = createAppRepository(config),
  practiceRepo = createPractitionerRepository(config),
  a = actor(),
  b = actor(B, SB),
  v2Actor = actor('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003')
const en = getAssessmentDefinition('hh-current-state', 'v1', 'en'),
  enV2 = getAssessmentDefinition('hh-current-state', 'v2', 'en'),
  ru = getAssessmentDefinition('hh-current-state', 'v1', 'ru'),
  weekly = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en'),
  mini = getAssessmentDefinition('mini-ipip-20', 'v1', 'en')
const answer = (def, value = 3) => Object.fromEntries(def.questions.map((q) => [q.id, value]))

test('Current State v2 is seeded as a new immutable definition and retains encrypted optional context', async () => {
  const db = await adminClient()
  try {
    await db.query('insert into auth.users(id,email) values($1,$2)', [v2Actor.id, 'v2@example.invalid'])
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [
      v2Actor.claims.session_id,
      v2Actor.id,
    ])
  } finally {
    await db.end()
  }
  await repo.ensureAccount(v2Actor)
  await repo.onboarding(v2Actor, {
    adult: true,
    necessary: true,
    marketing: false,
    displayName: 'Synthetic v2',
    uiLocale: 'en',
    timezone: 'America/Toronto',
    goal: 'explore',
  })
  const run = await start(v2Actor, enV2)
  const saved = await repo.saveRun(v2Actor, run.id, {
    answers: answer(enV2, 4),
    context: { trigger: 'Synthetic trigger', desired_change: 'Synthetic desired change' },
    progress: enV2.questions.length,
    expectedRevision: run.revision,
    operationId: randomUUID(),
  })
  assert.equal(saved.definitionVersion, 'v2')
  assert.deepEqual(saved.context, { trigger: 'Synthetic trigger', desired_change: 'Synthetic desired change' })
  const result = await repo.submitRun(v2Actor, run.id, { expectedRevision: saved.revision })
  assert.equal(result.definitionVersion, 'v2')
  assert.deepEqual(result.dimensions.map((dimension) => dimension.value), [4, 4, 4, 4, 4])
  assert.deepEqual((await repo.getResult(v2Actor, result.id)).context, {
    trigger: 'Synthetic trigger',
    desired_change: 'Synthetic desired change',
  })
})
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
test('Psi-Monitoring mood is private/idempotent and Weekly Pulse persists through the canonical runner', async () => {
  const operationId = randomUUID()
  const firstMood = await repo.moodCheckin(a, {
    mood: 'sad',
    category: null,
    timezone: 'America/Toronto',
    sourceSurface: 'monitoring',
    operationId,
  })
  const updatedMood = await repo.moodCheckin(a, {
    mood: 'sad',
    category: 'energy',
    timezone: 'America/Toronto',
    sourceSurface: 'monitoring',
    operationId,
  })
  assert.equal(updatedMood.id, firstMood.id)
  assert.equal(updatedMood.category, 'energy')
  assert.equal((await repo.bootstrap(a)).moodCheckins[0].id, firstMood.id)
  assert.equal(
    (await rawAs(b, 'authenticated', (db) => db.query('select id from app.mood_checkins'))).rows.length,
    0,
  )

  const weeklyRun = await start(v2Actor, weekly)
  const weeklySaved = await repo.saveRun(v2Actor, weeklyRun.id, {
    answers: answer(weekly, 5),
    context: {},
    progress: weekly.questions.length,
    expectedRevision: weeklyRun.revision,
    operationId: randomUUID(),
  })
  const weeklyResult = await repo.submitRun(v2Actor, weeklyRun.id, {
    expectedRevision: weeklySaved.revision,
  })
  assert.equal(weeklyResult.definitionKey, 'hh-weekly-pulse')
  assert.equal(weeklyResult.dimensions.length, 8)
  assert.deepEqual(
    [...new Set(weeklyResult.dimensions.map((dimension) => dimension.dimensionClass))].sort(),
    ['function', 'resources', 'state', 'symptoms'],
  )

  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential()
  await guestRepo.createSession(credential, {
    adult: true,
    necessary: true,
    uiLocale: 'en',
    timezone: 'America/Toronto',
  })
  const guestMood = await guestRepo.moodCheckin(credential, {
    mood: 'happy',
    category: 'relationships',
    timezone: 'America/Toronto',
    sourceSurface: 'cabinet_landing',
    operationId: randomUUID(),
  })
  assert.equal(guestMood.mood, 'happy')
  assert.equal((await guestRepo.bootstrap(credential)).moodCheckins.length, 1)
})

test('explicit save can bind one legacy Client to one Google Account without silent reassignment', async () => {
  const legacyClientId = randomUUID()
  const sourceId = randomUUID()
  const first = await transaction(config, a, (db) =>
    bindLegacyClientToAccount(db, a, {
      legacyClientId,
      sourceKind: 'legacy_document',
      sourceId,
    }),
  )
  assert.equal(first.legacyClientId, legacyClientId)
  assert.equal(first.linked, true)

  const repeated = await transaction(config, a, (db) =>
    bindLegacyClientToAccount(db, a, {
      legacyClientId,
      sourceKind: 'legacy_document',
      sourceId,
    }),
  )
  assert.equal(repeated.linked, true)

  await assert.rejects(
    () =>
      transaction(config, b, (db) =>
        bindLegacyClientToAccount(db, b, {
          legacyClientId,
          sourceKind: 'legacy_document',
          sourceId,
        }),
      ),
    (error) => error?.code === 'CLIENT_ACCOUNT_ALREADY_LINKED',
  )

  const db = await adminClient()
  try {
    const row = (
      await db.query(
        'select account_id from app_private.client_account_bindings where legacy_client_id=$1',
        [legacyClientId],
      )
    ).rows[0]
    assert.equal(row.account_id, A)
  } finally {
    await db.end()
  }
})

test('private receipt save links legacy Client to one Account and reopens from Google Cabinet', async () => {
  const legacyClientId = randomUUID()
  const record = {
    ...createPaymentDocument(
      {
        patientName: 'Synthetic Receipt Client',
        dateOfService: '2026-10-05',
        dateIssued: '2026-10-05',
        amount: '125.50',
        service: 'Synthetic consultation',
        paymentStatus: 'received',
        status: 'active',
      },
      '2026-10-05T18:00:00.000Z',
    ),
    clientId: legacyClientId,
  }
  const store = createMemoryPrescriptionStore([record])

  const intent = await createLegacyDocumentSaveIntent(config, record, randomUUID())
  const db = await adminClient()
  let proof
  try {
    proof = (
      await db.query(
        'select browser_secret_hash from app_private.save_intents where id=$1',
        [intent.id],
      )
    ).rows[0]?.browser_secret_hash
  } finally {
    await db.end()
  }
  assert.match(proof, /^[a-f0-9]{64}$/)

  const saved = await commitLegacyDocumentSaveIntent(config, store, a, intent.id, proof)
  const opened = await readSavedDocument(config, store, a, saved.id, 'en')
  assert.equal(opened.kind, 'receipt')
  assert.equal(opened.document.patientName, 'Synthetic Receipt Client')
  assert.equal(opened.document.amount, 12550)

  const verifyDb = await adminClient()
  try {
    const binding = (
      await verifyDb.query(
        'select account_id from app_private.client_account_bindings where legacy_client_id=$1',
        [legacyClientId],
      )
    ).rows[0]
    assert.equal(binding.account_id, A)
    const ref = (
      await verifyDb.query(
        'select account_id,source_document_id,legacy_client_id,source_hash from app.saved_documents where id=$1',
        [saved.id],
      )
    ).rows[0]
    assert.deepEqual(ref, {
      account_id: A,
      source_document_id: record.id,
      legacy_client_id: legacyClientId,
      source_hash: legacyDocumentSourceHash(record),
    })
  } finally {
    await verifyDb.end()
  }

  const secondIntent = await createLegacyDocumentSaveIntent(config, record, randomUUID())
  const proofDb = await adminClient()
  let secondProof
  try {
    secondProof = (
      await proofDb.query(
        'select browser_secret_hash from app_private.save_intents where id=$1',
        [secondIntent.id],
      )
    ).rows[0]?.browser_secret_hash
  } finally {
    await proofDb.end()
  }
  await assert.rejects(
    () => commitLegacyDocumentSaveIntent(config, store, b, secondIntent.id, secondProof),
    (error) => error?.code === 'CLIENT_ACCOUNT_ALREADY_LINKED',
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
test('master network approval, publication and practitioner isolation use the existing request model', async () => {
  let practitioner = await practiceRepo.saveProfile(a, {
    profile: {
      displayName: 'Practitioner A',
      professionalTitle: 'Synthetic practitioner',
      shortBio: 'Synthetic public profile for isolated database testing.',
      fullBio: '',
      languages: ['en','ru'],
      city: 'Toronto',
      region: 'Ontario',
      country: 'Canada',
      formats: ['online'],
      areas: ['personal_development'],
      methods: ['Synthetic method'],
      yearsExperience: 1,
      websiteUrl: '',
      socialUrls: [],
      photoPath: '',
    },
  })
  practitioner = await practiceRepo.submitProfile(a, { expectedRevision: practitioner.revision })
  practitioner = await practiceRepo.moderateProfile(practitioner.id, { action: 'approve' })
  assert.equal(practitioner.status, 'approved')

  const credential = await practiceRepo.saveCredential(a, null, {
    title: 'Synthetic credential',
    issuer: 'Synthetic Institute',
    jurisdiction: 'Ontario',
    reference: 'TEST-1',
    public: true,
    expiresOn: null,
  })
  assert.equal((await practiceRepo.moderateCredential(credential.id, { action: 'verify' })).verificationStatus, 'verified')

  let service = await practiceRepo.saveService(a, null, {
    draft: {
      copy: {
        en: { title: 'Synthetic coaching session', shortDescription: 'Synthetic EN description.', description: 'Synthetic EN description.' },
        ru: { title: 'Синтетическая сессия', shortDescription: 'Синтетическое описание.', description: 'Синтетическое описание.' },
      },
      areaKey: 'personal_development',
      offeringType: 'session',
      deliveryFormat: 'online',
      locationLabel: '',
      languages: ['en','ru'],
      pricingMode: 'contact',
      confirmedPrice: null,
      currency: '',
      durationMinutes: 60,
      imagePath: '',
    },
  })
  service = await practiceRepo.submitService(a, service.id, { expectedRevision: service.revision })
  service = await practiceRepo.moderateService(service.id, { action: 'approve' })
  assert.equal(service.status, 'published')
  const publicService = (await practiceRepo.listPublicServices('en')).find(item => item.id === service.id)
  assert.equal(publicService.practitionerName, 'Practitioner A')

  const request = await repo.createRequest(b, {
    serviceId: service.id,
    operationId: randomUUID(),
    contact: 'b@example.invalid',
    message: 'Synthetic multi-practitioner request',
    shareResultId: null,
    shareConfirmed: false,
  })
  assert.equal(request.sharedExcerpt, null)
  assert.ok((await practiceRepo.getMyPractice(a)).requests.some(item => item.id === request.id))

  let second = await practiceRepo.saveProfile(b, {
    profile: {
      displayName: 'Practitioner B',
      professionalTitle: 'Synthetic second practitioner',
      shortBio: 'Second synthetic practitioner.',
      fullBio: '',
      languages: ['en'],
      city: '',
      region: '',
      country: '',
      formats: ['online'],
      areas: ['business_money'],
      methods: [],
      yearsExperience: null,
      websiteUrl: '',
      socialUrls: [],
      photoPath: '',
    },
  })
  second = await practiceRepo.submitProfile(b, { expectedRevision: second.revision })
  await practiceRepo.moderateProfile(second.id, { action: 'approve' })
  assert.equal((await practiceRepo.getMyPractice(b)).requests.length, 0)
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
test('guest result save is explicit, idempotent and preserves an existing account draft', async () => {
  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential()
  await guestRepo.createSession(credential, {
    adult: true,
    necessary: true,
    uiLocale: 'en',
    timezone: 'UTC',
  })
  let guestRun = await guestRepo.startRun(credential, {
    definitionKey: en.key,
    definitionVersion: en.version,
    instrumentLocale: en.instrumentLocale,
    operationId: randomUUID(),
  })
  guestRun = await guestRepo.saveRun(credential, guestRun.id, {
    answers: answer(en, 4),
    context: {},
    progress: en.questions.length,
    expectedRevision: guestRun.revision,
    operationId: randomUUID(),
  })
  const guestResult = await guestRepo.submitRun(credential, guestRun.id, {
    expectedRevision: guestRun.revision,
  })
  const intent = await createGuestSaveIntent(config, credential, {
    sourceId: guestResult.id,
    operationId: randomUUID(),
  })
  const admin = await adminClient()
  let proof
  try {
    proof = (
      await admin.query('select browser_secret_hash from app_private.save_intents where id=$1', [intent.id])
    ).rows[0].browser_secret_hash
  } finally {
    await admin.end()
  }

  const accountDraft = await repo.startRun(b, {
    definitionKey: en.key,
    definitionVersion: en.version,
    instrumentLocale: en.instrumentLocale,
    operationId: randomUUID(),
  })
  const saved = await repo.commitGuestSaveIntent(b, { intentId: intent.id, browserProof: proof })
  const replay = await repo.commitGuestSaveIntent(b, { intentId: intent.id, browserProof: proof })
  assert.equal(replay.id, saved.id)
  assert.equal(saved.measurementAt, guestResult.measurementAt)
  const after = await repo.bootstrap(b)
  assert.ok(after.runs.some((run) => run.id === accountDraft.id))
  assert.equal(after.results.filter((result) => result.id === saved.id).length, 1)
  assert.equal(
    (
      await rawAs(a, 'authenticated', (db) =>
        db.query('select id from app.assessment_results where id=$1', [saved.id]),
      )
    ).rows.length,
    0,
  )
})
test('housekeeping removes expired guest payloads but preserves committed retry receipt', async () => {
  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential()
  await guestRepo.createSession(credential, {
    adult: true,
    necessary: true,
    uiLocale: 'en',
    timezone: 'UTC',
  })
  let run = await guestRepo.startRun(credential, {
    definitionKey: mini.key,
    definitionVersion: mini.version,
    instrumentLocale: mini.instrumentLocale,
    operationId: randomUUID(),
  })
  run = await guestRepo.saveRun(credential, run.id, {
    answers: answer(mini, 3),
    context: {},
    progress: mini.questions.length,
    expectedRevision: run.revision,
    operationId: randomUUID(),
  })
  const result = await guestRepo.submitRun(credential, run.id, {
    expectedRevision: run.revision,
  })
  const intent = await createGuestSaveIntent(config, credential, {
    sourceId: result.id,
    operationId: randomUUID(),
  })
  const admin = await adminClient()
  let proof
  try {
    proof = (
      await admin.query('select browser_secret_hash from app_private.save_intents where id=$1', [intent.id])
    ).rows[0].browser_secret_hash
  } finally {
    await admin.end()
  }
  const saved = await repo.commitGuestSaveIntent(a, { intentId: intent.id, browserProof: proof })

  const expire = await adminClient()
  try {
    await expire.query(
      "update app_private.guest_sessions set created_at=now()-interval '8 days',expires_at=now()-interval '1 second' where id=$1",
      [credential.id],
    )
  } finally {
    await expire.end()
  }

  const cleaned = await runAppHousekeeping(config, { batchSize: 100 })
  assert.equal(cleaned.status, 'completed')
  assert.ok(cleaned.guestSessionsDeleted >= 1)

  const verify = await adminClient()
  try {
    assert.equal(
      (await verify.query('select count(*)::int as count from app_private.guest_sessions where id=$1', [credential.id])).rows[0].count,
      0,
    )
    assert.equal(
      (await verify.query('select count(*)::int as count from app_private.guest_results where id=$1', [result.id])).rows[0].count,
      0,
    )
    const receipt = (
      await verify.query(
        'select status,source_guest_session_id,resource_id from app_private.save_intents where id=$1',
        [intent.id],
      )
    ).rows[0]
    assert.equal(receipt.status, 'committed')
    assert.equal(receipt.source_guest_session_id, null)
    assert.equal(receipt.resource_id, saved.id)
  } finally {
    await verify.end()
  }

  const replay = await repo.commitGuestSaveIntent(a, { intentId: intent.id, browserProof: proof })
  assert.equal(replay.id, saved.id)
  const status = await appHousekeepingStatus(config)
  assert.equal(status.id, cleaned.id)
})
test('housekeeping records failed attempts and limits dependent guest-intent cleanup', async () => {
  assert.equal(typeof maintenance.recordAppHousekeepingFailure, 'function')
  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential()
  await guestRepo.createSession(credential, {
    adult: true,
    necessary: true,
    uiLocale: 'en',
    timezone: 'UTC',
  })
  let run = await guestRepo.startRun(credential, {
    definitionKey: mini.key,
    definitionVersion: mini.version,
    instrumentLocale: mini.instrumentLocale,
    operationId: randomUUID(),
  })
  run = await guestRepo.saveRun(credential, run.id, {
    answers: answer(mini, 3),
    context: {},
    progress: mini.questions.length,
    expectedRevision: run.revision,
    operationId: randomUUID(),
  })
  const result = await guestRepo.submitRun(credential, run.id, {
    expectedRevision: run.revision,
  })
  for (let index = 0; index < 101; index += 1) {
    await createGuestSaveIntent(config, credential, {
      sourceId: result.id,
      operationId: randomUUID(),
    })
  }
  const expire = await adminClient()
  try {
    await expire.query(
      "update app_private.guest_sessions set created_at=now()-interval '8 days',expires_at=now()-interval '1 second' where id=$1",
      [credential.id],
    )
  } finally {
    await expire.end()
  }

  const first = await runAppHousekeeping(config, { batchSize: 100 })
  assert.equal(first.guestSessionsDeleted, 0)
  assert.equal(first.intentsDeleted, 100)
  const second = await runAppHousekeeping(config, { batchSize: 100 })
  assert.ok(second.guestSessionsDeleted >= 1)

  const failed = await maintenance.recordAppHousekeepingFailure(config)
  assert.equal(failed.status, 'failed')
  const verify = await adminClient()
  try {
    const row = (
      await verify.query('select status,completed_at from app_private.housekeeping_runs where id=$1', [failed.id])
    ).rows[0]
    assert.equal(row.status, 'failed')
    assert.ok(row.completed_at)
  } finally {
    await verify.end()
  }
})
test('report save race binds one account, stays idempotent and rotation does not free ownership', async () => {
  const sourceAssessmentId = '30000000-0000-4000-8000-000000000011'
  const sourceClientId = '30000000-0000-4000-8000-000000000012'
  const reportRecord = {
    id: sourceAssessmentId,
    clientId: sourceClientId,
    kind: 'research_result',
    title: 'Synthetic delivered report',
    occurredOn: '2026-09-20',
    language: 'en',
    sourceName: 'Synthetic source',
    sourceVersion: 'v1',
    description: 'Synthetic description',
    originalResult: 'Synthetic result',
    practitionerComment: 'Synthetic comment',
    relatedDocumentIds: ['30000000-0000-4000-8000-000000000013'],
    status: 'shared',
    revision: 4,
  }
  const store = {
    async findClientAssessment(id) {
      return id === sourceAssessmentId ? { ...reportRecord } : undefined
    },
    async findClientById(id) {
      return id === sourceClientId ? { id, status: 'active' } : undefined
    },
  }
  const issued = await issueReportGrant(config, store, {
    sourceAssessmentId,
    locale: 'en',
    saveAllowed: true,
    expiresInDays: 30,
  })
  const one = await exchangeReportViewer(config, store, {
    selector: issued.selector,
    secret: issued.secret,
  })
  const two = await exchangeReportViewer(config, store, {
    selector: issued.selector,
    secret: issued.secret,
  })
  const intentA = await createReportSaveIntent(config, one.grant, randomUUID())
  const intentB = await createReportSaveIntent(config, two.grant, randomUUID())
  const admin = await adminClient()
  let proofA, proofB
  try {
    const proofs = (
      await admin.query(
        'select id,browser_secret_hash from app_private.save_intents where id=any($1::uuid[])',
        [[intentA.id, intentB.id]],
      )
    ).rows
    proofA = proofs.find((row) => row.id === intentA.id).browser_secret_hash
    proofB = proofs.find((row) => row.id === intentB.id).browser_secret_hash
  } finally {
    await admin.end()
  }

  const raced = await Promise.allSettled([
    commitReportSaveIntent(config, store, a, intentA.id, proofA),
    commitReportSaveIntent(config, store, b, intentB.id, proofB),
  ])
  assert.equal(raced.filter((item) => item.status === 'fulfilled').length, 1)
  assert.equal(raced.filter((item) => item.status === 'rejected').length, 1)
  assert.match(raced.find((item) => item.status === 'rejected').reason.message, /SAVE_UNAVAILABLE/)
  const winnerIndex = raced.findIndex((item) => item.status === 'fulfilled')
  const winner = winnerIndex === 0 ? a : b
  const winnerIntent = winnerIndex === 0 ? intentA : intentB
  const winnerProof = winnerIndex === 0 ? proofA : proofB
  const saved = raced[winnerIndex].value
  const replay = await commitReportSaveIntent(config, store, winner, winnerIntent.id, winnerProof)
  assert.equal(replay.id, saved.id)
  assert.equal(replay.report.title, 'Synthetic delivered report')
  const opened = await readSavedReport(config, store, winner, saved.id)
  assert.equal(opened.report.id, sourceAssessmentId)
  assert.equal(opened.report.relatedDocumentIds, undefined)

  await assert.rejects(
    () => authorizeReportViewer(config, store, issued.selector, {
      id: one.viewer.id,
      secretHash: createHash('sha256').update(one.viewer.secret).digest('hex'),
    }),
    /REPORT_UNAVAILABLE/,
  )
  await assert.rejects(
    () => exchangeReportViewer(config, store, {
      selector: issued.selector,
      secret: issued.secret,
    }),
    /REPORT_UNAVAILABLE/,
  )
  await assert.rejects(() => rotateReportGrant(config, store, issued.id, 7), /REPORT_UNAVAILABLE/)
  await assert.rejects(
    () =>
      issueReportGrant(config, store, {
        sourceAssessmentId,
        locale: 'en',
        saveAllowed: true,
        expiresInDays: 7,
      }),
    /REPORT_ALREADY_BOUND/,
  )
  const adminAfter = await adminClient()
  try {
    const viewers = (
      await adminAfter.query(
        'select count(*)::int as count from app_private.report_viewer_sessions where grant_id=$1 and revoked_at is not null',
        [issued.id],
      )
    ).rows[0].count
    assert.equal(viewers, 2)
    const grant = (
      await adminAfter.query(
        'select status,bound_account_id from app_private.report_grants where id=$1',
        [issued.id],
      )
    ).rows[0]
    assert.equal(grant.status, 'revoked')
    assert.equal(grant.bound_account_id, winner.id)
  } finally {
    await adminAfter.end()
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


function minimumMonitoringAnswers(definition) {
  return Object.fromEntries(
    definition.questions.map((question) => [
      question.id,
      question.min ?? definition.answerScale?.min ?? 0,
    ]),
  )
}

test('every published monitoring test completes through the repository and returns a readable result', async () => {
  const items = MONITORING_CATALOG.filter((item) => item.startable)
  assert.equal(items.length, 42)
  const created = []

  for (const item of items) {
    const instrumentLocale = item.instrumentLocale === 'dynamic' ? 'en' : item.instrumentLocale
    const definition = getAssessmentDefinition(item.key, item.version, instrumentLocale)
    const run = await repo.startRun(a, {
      definitionKey: definition.key,
      definitionVersion: definition.version,
      instrumentLocale: definition.instrumentLocale,
      operationId: randomUUID(),
    })
    const saved = await repo.saveRun(a, run.id, {
      answers: minimumMonitoringAnswers(definition),
      context: {},
      progress: definition.questions.length,
      expectedRevision: run.revision,
      operationId: randomUUID(),
    })
    const result = await repo.submitRun(a, run.id, { expectedRevision: saved.revision })
    assert.equal(result.definitionKey, item.key)
    assert.equal(result.definitionVersion, item.version)
    assert.equal(result.instrumentLocale, instrumentLocale)
    assert.ok(result.dimensions.length > 0, item.key + ' must have result dimensions')
    assert.deepEqual((await repo.getResult(a, result.id)).dimensions, result.dimensions)
    created.push(result.id)
  }

  const bootstrap = await repo.bootstrap(a)
  for (const id of created)
    assert.ok(bootstrap.results.some((result) => result.id === id), id + ' missing from history')
})

test('durable guest and account assessment plans enforce ordered private sequential batteries', async () => {
  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential()
  const otherCredential = createGuestCredential()
  await Promise.all([credential, otherCredential].map((guest) => guestRepo.createSession(guest, {
    adult: true,
    necessary: true,
    uiLocale: 'en',
    timezone: 'UTC',
  })))

  const guestPlanInput = {
    items: [enV2, weekly].map((definition) => ({ definitionKey: definition.key, definitionVersion: definition.version, instrumentLocale: definition.instrumentLocale })),
    operationId: randomUUID(),
  }
  const guestPlan = await guestRepo.createTestPlan(credential, guestPlanInput)
  assert.equal((await guestRepo.createTestPlan(credential, guestPlanInput)).id, guestPlan.id)
  assert.equal(guestPlan.currentIndex, 0)
  assert.equal((await guestRepo.bootstrap(credential)).activeTestPlan.id, guestPlan.id)
  await assert.rejects(() => guestRepo.getTestPlan(otherCredential, guestPlan.id), /NOT_FOUND/)
  await assert.rejects(() => guestRepo.createTestPlan(credential, {
    items: [{ definitionKey: 'phq-9', definitionVersion: 'v1', instrumentLocale: 'en' }],
    operationId: randomUUID(),
  }), /GUEST_TEST_UNAVAILABLE/)

  let guestRun = await guestRepo.startRun(credential, {
    definitionKey: enV2.key,
    definitionVersion: enV2.version,
    instrumentLocale: enV2.instrumentLocale,
    operationId: randomUUID(),
  })
  guestRun = await guestRepo.saveRun(credential, guestRun.id, {
    answers: answer(enV2), context: {}, progress: enV2.questions.length, expectedRevision: guestRun.revision, operationId: randomUUID(),
  })
  const guestResult = await guestRepo.submitRun(credential, guestRun.id, { expectedRevision: guestRun.revision })
  const progressedGuestPlan = await guestRepo.advanceTestPlan(credential, guestPlan.id, {
    completedRunId: guestResult.runId,
    expectedRevision: guestPlan.revision,
  })
  assert.equal(progressedGuestPlan.currentIndex, 1)
  assert.equal(progressedGuestPlan.status, 'active')
  assert.deepEqual(progressedGuestPlan.completedRunIds, [guestResult.runId])

  const accountPlan = await repo.createTestPlan(a, {
    items: [mini].map((definition) => ({ definitionKey: definition.key, definitionVersion: definition.version, instrumentLocale: definition.instrumentLocale })),
    operationId: randomUUID(),
  })
  const accountRun = await start(a, mini)
  const savedAccountRun = await save(accountRun, a)
  const accountResult = await repo.submitRun(a, accountRun.id, { expectedRevision: savedAccountRun.revision })
  const completedAccountPlan = await repo.advanceTestPlan(a, accountPlan.id, {
    completedRunId: accountResult.runId,
    expectedRevision: accountPlan.revision,
  })
  assert.equal(completedAccountPlan.status, 'completed')
  assert.equal(completedAccountPlan.currentIndex, 1)
  assert.deepEqual(completedAccountPlan.completedRunIds, [accountResult.runId])
  await assert.rejects(
    () => rawAs(a, 'authenticated', (db) => db.query('select * from app_private.assessment_plans')),
    (error) => error.code === '42501',
  )
})
