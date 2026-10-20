import { BACH_V2_DEFINITIONS } from '../data/assessments/bach-flower-v2.js'
import { HH_SPLIT_V2_DEFINITIONS } from '../data/assessments/hh-split-reflections-v2.js'
import test, { before, after } from 'node:test'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
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
  listPersonalAnalysisReports,
  readSavedReport,
  rotateReportGrant,
} from '../lib/app/report-flow.js'
import * as maintenance from '../lib/app/maintenance.js'
const { appHousekeepingStatus, runAppHousekeeping } = maintenance
import { getAppConfig } from '../lib/app/config.js'
import { closeDatabase, transaction } from '../lib/app/database.js'
import { A, B, SB, actor, setup, adminClient, rawAs } from './helpers/app-db-setup.mjs'
import { verifySnapshotDimensionIdentity } from './helpers/snapshot-dimension-identity-db.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { APP_SERVICES } from '../data/app-services.js'
import { createPractitionerRepository } from '../lib/practitioners/repository.js'
import { createArticleRepository } from '../lib/practitioners/article-repository.js'
import { bindLegacyClientToAccount } from '../lib/app/client-account-binding.js'
import { commitLegacyDocumentSaveIntent, readSavedDocument } from '../lib/app/legacy-document-flow.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createPaymentDocument } from '../lib/documents/payment.js'
import { legacyDocumentSourceHash } from '../lib/app/legacy-document.js'
import { seal } from '../lib/app/crypto.js'
import { createSessionSaveIntent,commitSessionSaveIntent,readSavedSession,removeSavedSession } from '../lib/app/client-session-save-flow.js'
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
test('snapshot SQL uses exact definition-scale identity and retains source security', async t => {
  const db = await adminClient()
  try {
    await verifySnapshotDimensionIdentity(db, t)
  } finally {
    await db.end()
  }
})
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

test('article folders: real database ownership, search metadata, archival safety and public draft privacy',async()=>{
 const articleRepo=createArticleRepository(config)
 await assert.rejects(()=>articleRepo.library(v2Actor),{code:'PRACTITIONER_REQUIRED'},
   'An active consented account without a practitioner profile must remain rejected')
 const folder=await articleRepo.createFolder(a,{name:'Synthetic QA Remedy Cards'})
 assert.equal(folder.name,'Synthetic QA Remedy Cards')
 await assert.rejects(()=>articleRepo.createFolder(a,{name:' synthetic qa remedy cards '}),{code:'FOLDER_EXISTS'})
 const article=await articleRepo.save(a,null,{
  draft:{
   locale:'ru',title:'Synthetic QA article',
   excerpt:'Synthetic article for checking owner-only folders and private publication.',
   body:'## Описание\n\n'+('Тестовый безопасный материал для проверки структуры. ').repeat(7),
   coverPath:'',sourceUrls:[],linkedServiceIds:[],tags:['Тест','Test'],
  },
  folderId:folder.id,
 })
 assert.equal(article.folderId,folder.id)
 assert.deepEqual(article.draft.tags,['Тест','Test'])
 const mine=await articleRepo.library(a)
 assert.ok(mine.folders.some(x=>x.id===folder.id))
 assert.ok(mine.items.some(x=>x.id===article.id))
 const others=await articleRepo.library(b)
 assert.equal(others.items.some(x=>x.id===article.id),false)
 assert.equal(others.folders.some(x=>x.id===folder.id),false)
 await assert.rejects(()=>articleRepo.renameFolder(b,folder.id,{name:'Not yours',expectedRevision:0}),
   {code:'REVISION_CONFLICT'})
 const renamed=await articleRepo.renameFolder(a,folder.id,{name:'Renamed QA folder',expectedRevision:folder.revision})
 assert.equal(renamed.name,'Renamed QA folder')
 assert.equal(renamed.revision,1)
 assert.equal((await articleRepo.publicList('ru')).some(x=>x.id===article.id),false)
 await articleRepo.removeFolder(a,renamed.id)
 const after=(await articleRepo.library(a)).items.find(x=>x.id===article.id)
 assert.equal(after.folderId,null,'folder deletion must keep its linked article in Unfiled')
 assert.equal((await articleRepo.publicList('ru')).some(x=>x.id===article.id),false)
 const submitted=await articleRepo.submit(a,article.id,{expectedRevision:after.revision})
 assert.equal(submitted.status,'submitted')
 const approved=await articleRepo.moderate(article.id,{action:'approve'})
 assert.equal(approved.status,'published')
 const publicArticle=await articleRepo.publicArticle('ru',article.slug)
 assert.equal(publicArticle.published.title,'Synthetic QA article')
 assert.equal(Object.hasOwn(publicArticle,'draft'),false)
 assert.equal(Object.hasOwn(publicArticle,'folderId'),false)
 assert.equal(Object.hasOwn(publicArticle,'reviewNote'),false)
 const publicList=(await articleRepo.publicList('ru')).find(x=>x.id===article.id)
 assert.ok(publicList)
 assert.equal(Object.hasOwn(publicList,'draft'),false)
 const changed=await articleRepo.save(a,article.id,{
  expectedRevision:approved.revision,
  folderId:null,
  draft:{...approved.draft,body:approved.draft.body+'\n\nPRIVATE_PENDING_CHANGES'},
 })
 assert.notEqual(changed.draft.body,approved.published.body)
 const publishedAgain=await articleRepo.publicArticle('ru',article.slug)
 assert.equal(publishedAgain.published.body,approved.published.body)
 assert.equal(Object.hasOwn(publishedAgain,'draft'),false)
 await articleRepo.archive(a,article.id,{expectedRevision:changed.revision})
 await assert.rejects(()=>articleRepo.publicArticle('ru',article.slug),{code:'NOT_FOUND'})
})

test('public service funnel stores daily clicks and keeps practitioner report private', async () => {
  const owned=(await practiceRepo.getMyPractice(a)).services.find(s=>s.status==='published')
  assert.ok(owned,'Fixture must contain published service for Practitioner A')
  await practiceRepo.recordPublicServiceEvent(owned.id,'impression')
  await practiceRepo.recordPublicServiceEvent(owned.id,'order')
  await practiceRepo.recordPublicServiceEvent(owned.id,'whatsapp')
  await practiceRepo.recordPublicServiceEvent(owned.id,'telegram')
  await assert.rejects(
    () => practiceRepo.recordPublicServiceEvent(randomUUID(),'order'),
    error => error?.code === 'NOT_FOUND',
  )

  const admin=await adminClient()
  try {
    await admin.query(`
      insert into app_private.service_funnel_daily (service_id,day,impressions,order_clicks,whatsapp_clicks,telegram_clicks)
      values ($1,(now() at time zone 'America/Toronto')::date-1,9,4,2,1)
    `,[owned.id])
  } finally { await admin.end() }
  const own=(await practiceRepo.getMyPractice(a)).serviceAnalytics
  const item=own.services.find(s=>s.id===owned.id)
  assert.deepEqual(item.yesterday,{impressions:9,orders:4,whatsapp:2,telegram:1})
  assert.deepEqual(item.week,{impressions:9,orders:4,whatsapp:2,telegram:1})
  assert.equal((await practiceRepo.getMyPractice(b)).serviceAnalytics.services.some(s=>s.id===owned.id),false)
  await assert.rejects(
    () => rawAs(a,'authenticated',db=>db.query('select * from app_private.service_funnel_daily')),
    error => error?.code === '42501',
  )
})

test('isolated service photos fixture matches the observed existing JSON-array contract', async () => {
  const owned = (await practiceRepo.getMyPractice(a)).services.find(service => service.status === 'published')
  assert.ok(owned, 'Use the existing synthetic published-service fixture')
  assert.deepEqual(owned.photos, [], 'The existing column defaults to an empty JSON array')
  const db = await adminClient()
  try {
    await db.query('begin')
    const photos = Array.from({ length: 5 }, (_, index) => `https://example.invalid/synthetic-photo-${index}.jpg`)
    const result = await db.query('update app.service_offerings set photos=$1::jsonb where id=$2 returning photos', [JSON.stringify(photos), owned.id])
    assert.deepEqual(result.rows[0].photos, photos)
    for (const [invalid, code] of [[{}, '23514'], [Array(6).fill('synthetic'), '23514'], [null, '23502']]) {
      await db.query('savepoint invalid_photos')
      await assert.rejects(
        db.query('update app.service_offerings set photos=$1::jsonb where id=$2', [invalid === null ? null : JSON.stringify(invalid), owned.id]),
        error => error.code === code,
      )
      await db.query('rollback to savepoint invalid_photos')
      assert.deepEqual((await db.query('select photos from app.service_offerings where id=$1', [owned.id])).rows[0].photos, photos)
    }
  } finally {
    await db.query('rollback')
    await db.end()
  }
  assert.deepEqual((await practiceRepo.getMyPractice(a)).services.find(service => service.id === owned.id).photos, [])
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
  const winnerList = await listPersonalAnalysisReports(config, store, winner)
  const pinned = winnerList.reports.find((item) => item.id === saved.id)
  assert.deepEqual({ title: pinned.title, kind: pinned.kind, unread: pinned.unread, available: pinned.available }, {
    title: 'Synthetic delivered report', kind: 'research_result', unread: true, available: true,
  })
  const loserList = await listPersonalAnalysisReports(config, store, winnerIndex === 0 ? b : a)
  assert.equal(loserList.reports.some((item) => item.id === saved.id), false, 'cross-account report title must not leak')
  const opened = await readSavedReport(config, store, winner, saved.id)
  assert.equal(opened.report.id, sourceAssessmentId)
  assert.equal(opened.report.relatedDocumentIds, undefined)
  const openedList = await listPersonalAnalysisReports(config, store, winner)
  assert.equal(openedList.reports.find((item) => item.id === saved.id)?.unread, false, 'listing does not mark reports as read')

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
    // Unsharing a report invalidates the live source. Existing archive entry remains
    // visible but offers neither content nor a false promise of a downloadable PDF.
    reportRecord.status = 'draft'
    const unavailable = await listPersonalAnalysisReports(config, store, winner)
    const entry = unavailable.reports.find((item) => item.id === saved.id)
    assert.equal(entry.available, false)
    assert.equal(entry.title, undefined)
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
  assert.ok(items.length >= 42, 'the published catalog should not shrink when adding instruments')
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
    const context = syntheticTraumaContext(definition)
    let ready = run
    if (Object.keys(context).length) {
      await assert.rejects(repo.saveRun(a, run.id, {
        answers: minimumMonitoringAnswers(definition), context: {},
        progress: definition.questions.length, expectedRevision: run.revision,
        operationId: randomUUID(),
      }), error => error.code === 'REQUIRED_CONTEXT')
      await assert.rejects(repo.saveRun(a, run.id, {
        answers: minimumMonitoringAnswers(definition), context,
        progress: definition.questions.length, expectedRevision: run.revision,
        operationId: randomUUID(),
      }), error => error.code === 'REQUIRED_CONTEXT')
      ready = await repo.saveRun(a, run.id, {
        answers: {}, context, progress: 0, expectedRevision: run.revision,
        operationId: randomUUID(),
      })
      assert.deepEqual(ready.context, context)
      assert.deepEqual(ready.answers, {})
    }
    const saved = await repo.saveRun(a, run.id, {
      answers: minimumMonitoringAnswers(definition),
      context,
      progress: definition.questions.length,
      expectedRevision: ready.revision,
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

  await assert.rejects(
    guestRepo.startRun(credential, {
      definitionKey: 'phq-8',
      definitionVersion: 'v1',
      instrumentLocale: 'en',
      operationId: randomUUID(),
    }),
    (error) => error.code === 'GUEST_TEST_UNAVAILABLE',
  )
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


test('a fresh selection appends to existing saved tests and keeps draft/completed progress', async () => {
  const toItem = (def) => ({
    definitionKey: def.key, definitionVersion: def.version,
    instrumentLocale: def.instrumentLocale,
  })
  const original = await repo.createTestPlan(v2Actor, {
    items: [enV2, weekly].map(toItem), operationId: randomUUID(), replaceActive: true,
  })
  const draft = await start(v2Actor, weekly)
  const run = await start(v2Actor, enV2)
  const saved = await save(run, v2Actor)
  const result = await repo.submitRun(v2Actor, run.id, { expectedRevision: saved.revision })
  const progressed = await repo.advanceTestPlan(v2Actor, original.id, {
    completedRunId: result.runId, expectedRevision: original.revision,
  })
  assert.equal(progressed.status, 'active')
  const added = await repo.createTestPlan(v2Actor, {
    items: [mini, weekly].map(toItem), operationId: randomUUID(),
    appendActive: true, selectionPreferences: { focus: ['anxiety'] },
  })
  assert.equal(added.id, original.id, 'preserves the active plan identity')
  assert.deepEqual(added.definitionIds, [enV2.id, weekly.id, mini.id])
  assert.deepEqual(added.completedRunIds, [result.runId])
  assert.equal(added.currentIndex, progressed.currentIndex)
  const retry = await repo.createTestPlan(v2Actor, {
    items: [mini, weekly].map(toItem), operationId: randomUUID(), appendActive: true,
    selectionPreferences: { focus: ['anxiety'] },
  })
  assert.deepEqual(retry.definitionIds, added.definitionIds, 'retry adds no duplicates')
  assert.equal(retry.revision, added.revision, 'unchanged append is idempotent')
  const after = await repo.bootstrap(v2Actor)
  assert.equal(after.activeTestPlan.id, original.id)
  assert.ok(after.runs.some((row) => row.id === draft.id), 'unfinished answers are not removed')
  assert.ok(after.results.some((row) => row.id === result.id), 'completed result is not removed')
  await assert.rejects(
    () => repo.getTestPlan(a, original.id),
    (error) => error.code === 'NOT_FOUND',
  )
})

test('new tests reactivate an already completed selection, preserving its recorded result', async () => {
  const toItem = (def) => ({
    definitionKey: def.key, definitionVersion: def.version,
    instrumentLocale: def.instrumentLocale,
  })
  const original = await repo.createTestPlan(v2Actor, {
    items: [mini].map(toItem), operationId: randomUUID(), replaceActive: true,
  })
  const run = await start(v2Actor, mini)
  const saved = await save(run, v2Actor)
  const result = await repo.submitRun(v2Actor, run.id, { expectedRevision: saved.revision })
  const completed = await repo.advanceTestPlan(v2Actor, original.id, {
    completedRunId: result.runId, expectedRevision: original.revision,
  })
  assert.equal(completed.status, 'completed')
  const reactivated = await repo.createTestPlan(v2Actor, {
    items: [weekly].map(toItem), operationId: randomUUID(), appendActive: true,
  })
  assert.equal(reactivated.id, completed.id)
  assert.equal(reactivated.status, 'active')
  assert.deepEqual(reactivated.definitionIds, [mini.id, weekly.id])
  assert.deepEqual(reactivated.completedRunIds, [result.runId])
  assert.equal(reactivated.currentIndex, 1)
  assert.equal((await repo.bootstrap(v2Actor)).activeTestPlan.id, original.id)
})

test('owner can remove saved selections atomically without erasing answers, results or other plan items', async () => {
  const chosen=[enV2,weekly,mini]
  const plan=await repo.createTestPlan(v2Actor,{
    items:chosen.map(def=>({
      definitionKey:def.key,definitionVersion:def.version,
      instrumentLocale:def.instrumentLocale,
    })),
    operationId:randomUUID(),replaceActive:true,
  })
  assert.equal(plan.definitionIds.length,3)
  const unfinishedRun=await start(v2Actor,weekly)
  const started=await start(v2Actor,enV2)
  const saved=await save(started,v2Actor)
  const recorded=await repo.submitRun(v2Actor,started.id,{expectedRevision:saved.revision})
  const inProgressPlan=await repo.advanceTestPlan(v2Actor,plan.id,{
    completedRunId:recorded.runId,expectedRevision:plan.revision,
  })
  assert.equal(inProgressPlan.status,'active')
  assert.equal(inProgressPlan.completedRunIds.length,1)
  await assert.rejects(
    ()=>repo.removeTestPlanItem(a,plan.id,{definitionId:weekly.id,expectedRevision:inProgressPlan.revision}),
    error=>error.code==='NOT_FOUND',
  )
  await assert.rejects(
    ()=>repo.removeTestPlanItem(v2Actor,plan.id,{definitionId:weekly.id,expectedRevision:plan.revision}),
    error=>error.code==='REVISION_CONFLICT',
  )
  await assert.rejects(
    ()=>repo.removeTestPlanItem(v2Actor,plan.id,{
      definitionId:weekly.id,expectedRevision:inProgressPlan.revision,extra:'invalid',
    }),
    error=>error.code==='UNKNOWN_FIELD',
  )
  const removed=await repo.removeTestPlanItem(v2Actor,plan.id,{
    definitionId:weekly.id,expectedRevision:inProgressPlan.revision,
  })
  assert.deepEqual(removed.definitionIds,[enV2.id,mini.id])
  assert.deepEqual(removed.completedRunIds,[recorded.runId])
  assert.equal(removed.currentIndex,1)
  assert.equal(removed.status,'active')
  const after=await repo.bootstrap(v2Actor)
  assert.equal(after.activeTestPlan.id,plan.id)
  assert.ok(after.results.some(x=>x.id===recorded.id))
  assert.ok(after.runs.some(x=>x.id===unfinishedRun.id),'unfinished draft must survive removing its test from the plan')
  // Removing a completed test detaches its *plan credit*, not its private report.
  const reduced=await repo.removeTestPlanItem(v2Actor,plan.id,{
    definitionId:enV2.id,expectedRevision:removed.revision,
  })
  assert.deepEqual(reduced.definitionIds,[mini.id])
  assert.deepEqual(reduced.completedRunIds,[])
  assert.equal(reduced.currentIndex,0)
  assert.ok((await repo.getResult(v2Actor,recorded.id)).dimensions.length)
  const empty=await repo.removeTestPlanItem(v2Actor,plan.id,{
    definitionId:mini.id,expectedRevision:reduced.revision,
  })
  assert.equal(empty.status,'cancelled')
  assert.equal((await repo.bootstrap(v2Actor)).activeTestPlan,null)
  assert.ok((await repo.getResult(v2Actor,recorded.id)).dimensions.length)
  await assert.rejects(
    ()=>repo.removeTestPlanItem(v2Actor,plan.id,{definitionId:mini.id,expectedRevision:empty.revision}),
    error=>error.code==='REVISION_CONFLICT',
  )
})

// Bach profile: real private account persistence, all 38 dimensions, and cross-account isolation.
test('Bach Flower Emotional Profile saves 115 answers in the authorized Google account', async () => {
  const definition = getAssessmentDefinition('hh-bach-flower-profile','v1','en')
  const run = await start(a, definition)
  const answers = Object.fromEntries(definition.questions.map(question => [question.id, 0]))
  answers['bach.situation.21'] = 4
  answers['bach.character.04'] = 3
  answers['bach.control.04'] = 5
  const saved = await repo.saveRun(a, run.id, {
    answers, context: {}, progress: definition.questions.length,
    expectedRevision: run.revision, operationId: randomUUID(),
  })
  const submitted = await repo.submitRun(a, run.id, { expectedRevision: saved.revision })
  assert.equal(submitted.definitionKey, 'hh-bach-flower-profile')
  assert.equal(submitted.dimensions.length, 38)
  assert.equal(submitted.dimensions.find(d => d.sourceConstruct === 'Olive').value, 23)
  const stored = await repo.getResult(a, submitted.id)
  assert.equal(stored.dimensions.find(d => d.key === 'bach.olive').value, 23)
  // Earlier integration cases intentionally put account B into deletion state.
  // Verify true cross-client privacy using a fresh, fully active synthetic account.
  const outsider = actor('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004')
  const db = await adminClient()
  try {
    await db.query('insert into auth.users(id,email) values($1,$2)', [outsider.id, 'bach-outsider@example.invalid'])
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [outsider.claims.session_id, outsider.id])
  } finally { await db.end() }
  await repo.ensureAccount(outsider)
  await repo.onboarding(outsider, { adult:true, necessary:true, marketing:false,
    displayName:'Bach isolation test', uiLocale:'en', timezone:'America/Toronto', goal:'explore' })
  await assert.rejects(() => repo.getResult(outsider, submitted.id), error =>
    error.code === 'NOT_FOUND')
})

test('compassion registration is identical, idempotent and rejects ID/hash/content collisions', async () => {
  const { readFile } = await import('node:fs/promises')
  const { COMPASSION_DEFINITIONS } = await import('../data/assessments/compassion-2026.js')
  const sql = await readFile(new URL('../supabase/migrations/20261012033100_hh_compassion_research_measures.sql', import.meta.url), 'utf8')
  const db = await adminClient()
  try {
    await db.query(sql)
    await db.query(sql)
    for (const d of COMPASSION_DEFINITIONS) {
      const rows = (await db.query('select id, definition, content_hash from app.assessment_versions where definition_key=$1 and definition_version=$2 and instrument_locale=$3', [d.key, d.version, d.instrumentLocale])).rows
      assert.equal(rows.length, 1)
      assert.equal(rows[0].id, d.id)
      assert.equal(rows[0].content_hash, d.contentHash)
      assert.deepEqual(rows[0].definition, d)
    }
    const first = COMPASSION_DEFINITIONS[0]
    for (const broken of [sql.replace(first.id, randomUUID()), sql.replace(first.contentHash, 'sha256:'+'0'.repeat(64)), sql.replace('HOW I TYPICALLY', 'CHANGED I TYPICALLY')]) {
      await assert.rejects(() => db.query(broken), /Conflicting professional assessment ID|Different content already published/)
      await db.query('rollback')
    }
    assert.deepEqual((await db.query('select definition from app.assessment_versions where id=$1',[first.id])).rows[0].definition, first)
  } finally { await db.end() }
})

test('both compassion instruments preserve source means in private guest saves and reports', async () => {
  const { buildAssessmentResultReport } = await import('../lib/assessments/result-report.js')
  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential(), other = createGuestCredential()
  for (const who of [credential, other]) await guestRepo.createSession(who, {adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
  for (const [key,expected] of [['scs-sf',[3]],['compassion-scale',[2,1,1,1,5]]]) {
    const d = getAssessmentDefinition(key,'v1','en')
    let run = await guestRepo.startRun(credential,{definitionKey:key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
    run = await guestRepo.saveRun(credential,run.id,{answers:answer(d,1),context:{},progress:d.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
    const result = await guestRepo.submitRun(credential,run.id,{expectedRevision:run.revision})
    assert.deepEqual(result.dimensions.map(s=>s.value),expected)
    assert.equal(result.contentHash,d.contentHash)
    assert.deepEqual((await guestRepo.getResult(credential,result.id)).dimensions,result.dimensions)
    await assert.rejects(()=>guestRepo.getResult(other,result.id),/NOT_FOUND/)
    for (const locale of ['en','ru']) {
      const report=buildAssessmentResultReport(result,locale)
      assert.equal(report.sections.length,expected.length)
      assert.ok(report.sections.every(s=>s.source===d.source.scoringUrl))
    }
  }
})


test('existing relationship registration is exact and idempotent for all sixteen published forms', async () => {
  const { readFile } = await import('node:fs/promises')
  const { RELATIONSHIPS_INTIMACY_DEFINITIONS: defs } = await import('../data/assessments/relationships-intimacy-v1.js')
  const sql = await readFile(new URL('../supabase/migrations/20261011211746_hh_love_intimacy_assessments.sql', import.meta.url),'utf8')
  const db = await adminClient()
  try {
    await db.query(sql)
    await db.query(sql)
    for(const d of defs){
      const rows=(await db.query('select id,definition,content_hash,status from app.assessment_versions where definition_key=$1 and definition_version=$2 and instrument_locale=$3',[d.key,d.version,d.instrumentLocale])).rows
      assert.equal(rows.length,1)
      assert.equal(rows[0].id,d.id)
      assert.equal(rows[0].status,'published')
      assert.equal(rows[0].content_hash,d.contentHash)
      assert.deepEqual(rows[0].definition,d)
    }
    await assert.rejects(()=>db.query(sql.replace(defs[0].contentHash,'sha256:'+'0'.repeat(64))),/Refusing to overwrite published intimacy questionnaire/)
    await db.query('rollback')
    assert.deepEqual((await db.query('select definition from app.assessment_versions where id=$1',[defs[0].id])).rows[0].definition,defs[0])
  } finally { await db.end() }
})

test('all relationship forms save independent means privately and reject another guest', async () => {
  const { RELATIONSHIPS_INTIMACY_DEFINITIONS: defs } = await import('../data/assessments/relationships-intimacy-v1.js')
  const guestRepo=createGuestRepository(config)
  const owner=createGuestCredential(),other=createGuestCredential()
  for(const who of [owner,other])await guestRepo.createSession(who,{adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
  for(const d of defs){
    let run=await guestRepo.startRun(owner,{definitionKey:d.key,definitionVersion:d.version,instrumentLocale:d.instrumentLocale,operationId:randomUUID()})
    run=await guestRepo.saveRun(owner,run.id,{answers:Object.fromEntries(d.questions.map((q,i)=>[q.id,[0,1,4,4,2,0][i]])),context:{},progress:6,expectedRevision:run.revision,operationId:randomUUID()})
    const result=await guestRepo.submitRun(owner,run.id,{expectedRevision:run.revision})
    assert.equal(result.contentHash,d.contentHash)
    assert.deepEqual(result.dimensions.map(s=>s.value),[1.67,2])
    assert.deepEqual((await guestRepo.getResult(owner,result.id)).dimensions,result.dimensions)
    await assert.rejects(()=>guestRepo.getResult(other,result.id),/NOT_FOUND/)
  }
})

test('original typology registration is identical, idempotent and rejects ID/hash/content collisions', async () => {
  const { readFile } = await import('node:fs/promises')
  const { PERSONALITY_TYPE_DEFINITIONS } = await import('../data/assessments/personality-types-original-2026.js')
  const sql = await readFile(new URL('../supabase/migrations/20261011230000_hh_personality_types_original.sql', import.meta.url), 'utf8')
  const db = await adminClient()
  try {
    await db.query(sql)
    await db.query(sql)
    for (const d of PERSONALITY_TYPE_DEFINITIONS) {
      const rows = (await db.query('select id, definition, content_hash from app.assessment_versions where definition_key=$1 and definition_version=$2 and instrument_locale=$3', [d.key, d.version, d.instrumentLocale])).rows
      assert.equal(rows.length, 1)
      assert.equal(rows[0].id, d.id)
      assert.equal(rows[0].content_hash, d.contentHash)
      assert.deepEqual(rows[0].definition, d)
    }
    const first = PERSONALITY_TYPE_DEFINITIONS[0]
    for (const broken of [sql.replace(first.id, randomUUID()), sql.replace(first.contentHash, 'sha256:'+'0'.repeat(64)), sql.replace('Exchanging ideas with others', 'CHANGED original question')]) {
      await assert.rejects(() => db.query(broken), /Conflicting immutable assessment version|Different content already published/)
      await db.query('rollback')
    }
    assert.deepEqual((await db.query('select definition from app.assessment_versions where id=$1',[first.id])).rows[0].definition, first)
  } finally { await db.end() }
})

test('MHC-SF registration is identical, idempotent and rejects ID/hash/content collisions', async () => {
  const { readFile } = await import('node:fs/promises')
  const { MHC_SF_DEFINITIONS } = await import('../data/assessments/mhc-sf-adult-dec2011.js')
  const sql = await readFile(new URL('../supabase/migrations/20261012041529_hh_mhc_sf_adult_dec2011.sql', import.meta.url), 'utf8')
  const db = await adminClient()
  try {
    await db.query(sql)
    await db.query(sql)
    for (const d of MHC_SF_DEFINITIONS) {
      const rows = (await db.query('select id, definition, content_hash from app.assessment_versions where definition_key=$1 and definition_version=$2 and instrument_locale=$3', [d.key, d.version, d.instrumentLocale])).rows
      assert.equal(rows.length, 1)
      assert.equal(rows[0].id, d.id)
      assert.equal(rows[0].content_hash, d.contentHash)
      assert.deepEqual(rows[0].definition, d)
    }
    const first = MHC_SF_DEFINITIONS[0]
    for (const broken of [sql.replace(first.id, randomUUID()), sql.replace(first.contentHash, 'sha256:'+'0'.repeat(64)), sql.replace('Adult MHC-SF', 'CHANGED MHC-SF')]) {
      await assert.rejects(() => db.query(broken), /Conflicting professional assessment ID|Different content already published/)
      await db.query('rollback')
    }
    assert.deepEqual((await db.query('select definition from app.assessment_versions where id=$1',[first.id])).rows[0].definition, first)
  } finally { await db.end() }
})


test('MHC-SF guest persistence retains zero, source sums and private bilingual reports', async () => {
  const { buildAssessmentResultReport } = await import('../lib/assessments/result-report.js')
  const guestRepo = createGuestRepository(config)
  const credential = createGuestCredential(), other = createGuestCredential()
  for (const who of [credential, other]) await guestRepo.createSession(who, {adult:true,necessary:true,uiLocale:'ru',timezone:'UTC'})
  const d = getAssessmentDefinition('mhc-sf','v1','en')
  for (const [value,expected] of [[0,[0,0,0,0]],[5,[70,15,25,30]]]) {
    let run = await guestRepo.startRun(credential,{definitionKey:d.key,definitionVersion:'v1',instrumentLocale:'en',operationId:randomUUID()})
    run = await guestRepo.saveRun(credential,run.id,{answers:answer(d,value),context:{},progress:14,expectedRevision:run.revision,operationId:randomUUID()})
    assert.deepEqual((await guestRepo.getRun(credential,run.id)).answers,answer(d,value))
    const result = await guestRepo.submitRun(credential,run.id,{expectedRevision:run.revision})
    assert.deepEqual(result.dimensions.map(s=>s.value),expected)
    assert.equal(result.contentHash,d.contentHash)
    assert.deepEqual((await guestRepo.getResult(credential,result.id)).dimensions,result.dimensions)
    await assert.rejects(()=>guestRepo.getResult(other,result.id),/NOT_FOUND/)
    for (const locale of ['en','ru']) {
      const report=buildAssessmentResultReport(result,locale)
      assert.equal(report.sections.length,4)
      assert.ok(report.sections.every(s=>s.source===d.source.scoringUrl && s.bandBasis==='descriptive'))
    }
  }
})

// Synthetic V4 regression: exercise the real restricted-role repository read and
// session insert for the non-primary selected scale. This suite is loopback-only.
test('V4 new cycle preserves primary focus, original 84 tracks and private EN/RU session validation', async () => {
  const { createDailyCourseRepository } = await import('../lib/app/growth-daily.js')
  const { buildCourseSlides } = await import('../lib/inner-growth/course-slide-sequence.js')
  const { lessonFor, COURSE_CONTENT_VERSION, COURSE_CONTENT_V3, COURSE_CONTENT_V4 } = await import('../lib/inner-growth/lesson-library.js')
  const dailyRepo = createDailyCourseRepository(config)
  for (const locale of ['en','ru']) {
    const who = actor(randomUUID(),randomUUID()), courseId = randomUUID()
    const db = await adminClient()
    try {
      await db.query('insert into auth.users(id,email) values($1,$2)',[who.id,'synthetic-course-'+locale+'@example.invalid'])
      await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[who.claims.session_id,who.id])
      await repo.ensureAccount(who)
      await repo.onboarding(who,{adult:true,necessary:true,marketing:false,displayName:'Synthetic R3 course',uiLocale:locale,timezone:'UTC',goal:'explore'})
      await db.query(`insert into app_private.growth_courses
        (id,account_id,stage,goals,scale_keys,consented_at,chosen_at,started_at)
        values($1,$2,4,$3,$4,now(),now(),now())`,[courseId,who.id,
        ['calm_regulation','attention_clarity','connection_boundaries'],
        ['hh-weekly-pulse::weekly.tension','hh-weekly-pulse::weekly.clarity','hh-weekly-pulse::weekly.connection']])
      let value = await dailyRepo.command(who,'activate',{problemLabel:'Synthetic everyday concern',timeZone:'UTC'},locale)
      await db.query("update app_private.growth_cycles set start_local_date=(now() at time zone 'UTC')::date-1 where id=$1",[value.cycle.id])
      value = await dailyRepo.command(who,'preferences',{expectedRevision:value.cycle.revision,length:'quick',imagery:'optional',checkinFrequency:'daily'},locale)
      // Advancing the original calendar start must not skip an unfinished first lesson.
      assert.equal(value.cycle.day,1)
      assert.equal(value.cycle.activeGoal,'calm_regulation')
      assert.equal(value.cycle.contentVersion,COURSE_CONTENT_V4)
      assert.ok(value.lesson.practiceV4?.symbol)
      assert.deepEqual(value.lesson.sections,lessonFor('calm_regulation',1,locale,'quick',COURSE_CONTENT_V3).sections)
      assert.equal(value.lesson.id,lessonFor('calm_regulation',1,locale,'quick',COURSE_CONTENT_V4).id)
      const originalLessonId = value.lesson.id
      const first = {operationId:randomUUID(),day:1,lessonId:originalLessonId,feedback:'neutral',beforeNow:null,afterNow:null,reflection:'',visitedSlideKeys:buildCourseSlides(value.lesson).map(slide=>slide.key)}
      await assert.rejects(dailyRepo.command(who,'session',{...first,day:2,lessonId:lessonFor('calm_regulation',2,locale,'quick',COURSE_CONTENT_V4).id},locale),{code:'COURSE_DAY_NOT_DUE'})
      await assert.rejects(dailyRepo.command(who,'session',{...first,operationId:randomUUID(),visitedSlideKeys:[]},locale),{code:'COURSE_SLIDES_INCOMPLETE'})
      const firstSaved = await dailyRepo.command(who,'session',first,locale)
      assert.equal(firstSaved.cycle.day,1)
      assert.ok(firstSaved.currentSession.completedAt)
      await dailyRepo.command(who,'session',first,locale)
      await assert.rejects(dailyRepo.command(who,'session',{...first,operationId:randomUUID()},locale),{code:'COURSE_NEXT_DAY_ONLY'})
      // Simulate a local date rollover on synthetic private data without waiting
      // until tomorrow; the next lesson must now open from the saved day number.
      await db.query("update app_private.growth_sessions set local_date=(now() at time zone 'UTC')::date-1 where account_id=$1 and cycle_id=$2 and day_number=1",
        [who.id,value.cycle.id])
      value = await dailyRepo.read(who,locale)
      assert.equal(value.cycle.day,2)
      assert.equal(value.cycle.activeGoal,'calm_regulation')
      assert.deepEqual(value.lesson.sections,lessonFor('calm_regulation',2,locale,'quick',COURSE_CONTENT_V3).sections)
      assert.equal(value.lesson.id,lessonFor('calm_regulation',2,locale,'quick',COURSE_CONTENT_V4).id)
      const second = {operationId:randomUUID(),day:2,lessonId:value.lesson.id,feedback:'neutral',beforeNow:null,afterNow:null,reflection:'',visitedSlideKeys:buildCourseSlides(value.lesson).map(slide=>slide.key)}
      await assert.rejects(dailyRepo.command(who,'session',{...second,lessonId:lessonFor('attention_clarity',2,locale,'quick',COURSE_CONTENT_V4).id},locale),{code:'INVALID_LESSON_ID'})
      const secondSaved = await dailyRepo.command(who,'session',second,locale)
      assert.equal(secondSaved.cycle.day,2)
      assert.ok(secondSaved.currentSession.completedAt)
      await dailyRepo.command(who,'session',second,locale)
      const rows = (await db.query('select day_number,lesson_id,content_version from app_private.growth_sessions where account_id=$1 and cycle_id=$2 order by day_number',[who.id,value.cycle.id])).rows
      assert.equal(rows.length,2)
      assert.deepEqual(rows.map(row=>row.day_number),[1,2])
      assert.equal(rows[0].lesson_id,originalLessonId)
      assert.equal(rows[1].lesson_id,value.lesson.id)
      assert.ok(rows.every(row=>row.content_version===COURSE_CONTENT_V4))
      assert.equal((await dailyRepo.read(who,locale)).lesson.id,value.lesson.id)
    } finally { await db.end() }
  }
})

// ASRS6 coverage is intentionally append-only. This suite's existing setup guard
// permits only the empty synthetic loopback database; no production data is used.
test('ASRS6 EN/RU registration is exact and idempotent and rejects ID/hash/content collisions', async () => {
  const { readFile } = await import('node:fs/promises')
  const { ASRS6_DEFINITIONS: definitions } = await import('../data/assessments/asrs-v1-6-nyu.js')
  const sql = await readFile(new URL('../supabase/migrations/20261012202000_hh_asrs6_nyu_classic.sql', import.meta.url), 'utf8')
  const db = await adminClient()
  try {
    await db.query(sql)
    await db.query(sql)
    for (const definition of definitions) {
      const rows = (await db.query(`select id, definition, questions, answer_schema,
        translation_version, scoring_key, scoring_version, result_schema,
        timeframe, source_metadata, content_hash, status
        from app.assessment_versions where definition_key=$1 and definition_version=$2 and instrument_locale=$3`,
      [definition.key, definition.version, definition.instrumentLocale])).rows
      assert.equal(rows.length, 1)
      const row = rows[0]
      assert.equal(row.id, definition.id)
      assert.equal(row.status, 'published')
      assert.equal(row.content_hash, definition.contentHash)
      assert.deepEqual(row.definition, definition)
      assert.deepEqual(row.questions, definition.questions)
      assert.deepEqual(row.answer_schema, { type: 'integer', minimum: 0, maximum: 4 })
      assert.equal(row.translation_version, definition.translationVersion)
      assert.equal(row.scoring_key, definition.scoringKey)
      assert.equal(row.scoring_version, definition.scoringVersion)
      assert.deepEqual(row.result_schema, { version: definition.resultVersion })
      assert.equal(row.timeframe, 'past-6-months')
      assert.deepEqual(row.source_metadata, definition.source)
      for (const broken of [
        sql.replace(definition.id, randomUUID()),
        sql.replace(definition.contentHash, 'sha256:' + '0'.repeat(64)),
        sql.replace(definition.questions[0].text, 'Synthetic changed ASRS6 source item'),
      ]) {
        await assert.rejects(() => db.query(broken), /Conflicting professional assessment ID|Different content already published/)
        await db.query('rollback')
      }
      assert.deepEqual((await db.query('select definition from app.assessment_versions where id=$1', [definition.id])).rows[0].definition, definition)
    }
    assert.equal((await db.query("select id from app.assessment_versions where definition_key in ('asrs-v1-18','asrs-5')")).rowCount, 0)
  } finally { await db.end() }
})

test('ASRS6 EN/RU guest zero and mixed saves retain exact report provenance and reject cross-guest access', async () => {
  const { ASRS6_DEFINITIONS: definitions } = await import('../data/assessments/asrs-v1-6-nyu.js')
  const { provenance } = await import('../lib/assessments/definitions.js')
  const { buildAssessmentResultReport } = await import('../lib/assessments/result-report.js')
  const { exactAsrs6DefinitionForResult } = await import('../lib/assessments/interpretation-registry.js')
  const guestRepo = createGuestRepository(config)
  const owner = createGuestCredential(), outsider = createGuestCredential()
  for (const credential of [owner, outsider]) await guestRepo.createSession(credential, { adult: true, necessary: true, uiLocale: 'ru', timezone: 'UTC' })
  for (const definition of definitions) for (const [values, expected] of [[Array(6).fill(0), 0], [[2, 2, 2, 3, 0, 0], 4]]) {
    const answers = Object.fromEntries(definition.questions.map((question, index) => [question.id, values[index]]))
    let run = await guestRepo.startRun(owner, { definitionKey: definition.key, definitionVersion: definition.version, instrumentLocale: definition.instrumentLocale, operationId: randomUUID() })
    // Persist zero before the rest; missing entries must not silently become Never.
    run = await guestRepo.saveRun(owner, run.id, { answers: { [definition.questions[0].id]: 0 }, context: {}, progress: 1, expectedRevision: run.revision, operationId: randomUUID() })
    assert.deepEqual((await guestRepo.getRun(owner, run.id)).answers, { [definition.questions[0].id]: 0 })
    await assert.rejects(() => guestRepo.submitRun(owner, run.id, { expectedRevision: run.revision }), /REQUIRED_ANSWER/)
    run = await guestRepo.saveRun(owner, run.id, { answers, context: {}, progress: 6, expectedRevision: run.revision, operationId: randomUUID() })
    assert.deepEqual((await guestRepo.getRun(owner, run.id)).answers, answers)
    const submitted = await guestRepo.submitRun(owner, run.id, { expectedRevision: run.revision })
    const stored = await guestRepo.getResult(owner, submitted.id)
    assert.deepEqual(stored.dimensions, submitted.dimensions)
    assert.deepEqual(stored.dimensions.map(dimension => dimension.value), [expected])
    for (const [key, value] of Object.entries(provenance(definition))) assert.equal(stored[key], value, key)
    assert.equal(exactAsrs6DefinitionForResult(stored), definition)
    await assert.rejects(() => guestRepo.getResult(outsider, submitted.id), /NOT_FOUND/)
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(stored, locale)
      assert.equal(report.sections.length, 1)
      assert.equal(report.sections[0].value, expected)
      assert.equal(report.sections[0].bandBasis, 'screening')
      assert.equal(report.sections[0].recommendedReview, expected >= 4)
      assert.equal(report.sections[0].source, definition.source.scoringUrl)
      assert.equal(report.instrumentText.instrumentLocale, definition.instrumentLocale)
      assert.equal(report.instrumentText.safetyText, definition.safetyText)
      assert.equal(report.instrumentText.printedScoringText, definition.printedScoringText)
      assert.equal(report.instrumentText.requiredSiteAttribution, definition.requiredSiteAttribution)
      assert.equal(report.instrumentText.formCopyright, definition.formCopyright)
      assert.equal(report.personalityType, null)
      if (definition.instrumentLocale === 'ru') assert.match(report.contextNote, locale === 'ru' ? /не подтверждена/ : /has not been established/)
    }
  }
})

test('ASRS6 EN/RU account zero and mixed results preserve discrete counts and all stored provenance fields', async () => {
  const { ASRS6_DEFINITIONS: definitions } = await import('../data/assessments/asrs-v1-6-nyu.js')
  const { provenance } = await import('../lib/assessments/definitions.js')
  const { buildAssessmentResultReport } = await import('../lib/assessments/result-report.js')
  const { exactAsrs6DefinitionForResult } = await import('../lib/assessments/interpretation-registry.js')
  const owner = actor(randomUUID(), randomUUID())
  const db = await adminClient()
  try {
    await db.query('insert into auth.users(id,email) values($1,$2)', [owner.id, 'synthetic-asrs6@example.invalid'])
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [owner.claims.session_id, owner.id])
  } finally { await db.end() }
  await repo.ensureAccount(owner)
  await repo.onboarding(owner, { adult: true, necessary: true, marketing: false, displayName: 'Synthetic ASRS6', uiLocale: 'en', timezone: 'UTC', goal: 'explore' })
  for (const definition of definitions) for (const [values, expected] of [[Array(6).fill(0), 0], [[2, 2, 2, 3, 0, 0], 4]]) {
    const answers = Object.fromEntries(definition.questions.map((question, index) => [question.id, values[index]]))
    const run = await start(owner, definition)
    const saved = await repo.saveRun(owner, run.id, { answers, context: {}, progress: 6, expectedRevision: run.revision, operationId: randomUUID() })
    assert.deepEqual((await repo.getRun(owner, run.id)).answers, answers)
    const submitted = await repo.submitRun(owner, run.id, { expectedRevision: saved.revision })
    const stored = await repo.getResult(owner, submitted.id)
    for (const [key, value] of Object.entries(provenance(definition))) assert.equal(stored[key], value, key)
    assert.equal(exactAsrs6DefinitionForResult(stored), definition)
    assert.equal(stored.dimensions.length, 1)
    assert.equal(stored.dimensions[0].value, expected)
    assert.equal(stored.dimensions[0].unit, 'qualifying-responses')
    assert.equal(stored.dimensions[0].displayKind, 'screening-count')
    for (const locale of ['en', 'ru']) {
      const report = buildAssessmentResultReport(stored, locale)
      assert.equal(report.sections[0].value, expected)
      assert.equal(report.sections[0].bandBasis, 'screening')
      assert.equal(report.sections[0].recommendedReview, expected >= 4)
      assert.equal(report.instrumentText.instrumentLocale, definition.instrumentLocale)
      assert.equal(report.instrumentText.safetyText, definition.safetyText)
      assert.equal(report.instrumentText.requiredSiteAttribution, definition.requiredSiteAttribution)
      if (definition.instrumentLocale === 'ru') assert.match(report.contextNote, locale === 'ru' ? /не подтверждена/ : /has not been established/)
    }
  }
})


test('push subscriptions and preferences are account-owned, RLS-protected and removable', async () => {
  const {createECDH,randomBytes} = await import('node:crypto')
  const {createNotificationRepository} = await import('../lib/app/notification-repository.js')
  const {pushConfig} = await import('../lib/app/web-push.js')
  // OpenSSL may omit leading zero bytes from a valid synthetic scalar.
  const fixedPrivateKey = key => {
    const scalar=key.getPrivateKey(),padded=Buffer.alloc(32)
    scalar.copy(padded,padded.length-scalar.length)
    return padded.toString('base64url')
  }
  const short=createECDH('prime256v1');short.setPrivateKey(Buffer.from([1]))
  const shortEnv={HH_PUSH_PUBLIC_KEY:short.getPublicKey().toString('base64url'),
    HH_PUSH_PRIVATE_KEY:short.getPrivateKey().toString('base64url'),
    HH_PUSH_SUBJECT:'mailto:tests@example.invalid'}
  assert.equal(short.getPrivateKey().length,1,'deterministic leading-zero regression fixture')
  assert.equal(pushConfig(shortEnv).supported,false,'production still rejects non-32-byte encoding')
  assert.equal(pushConfig({...shortEnv,HH_PUSH_PRIVATE_KEY:fixedPrivateKey(short)}).supported,true)
  const vapid=createECDH('prime256v1');vapid.generateKeys()
  const env={HH_PUSH_PUBLIC_KEY:vapid.getPublicKey().toString('base64url'),
    HH_PUSH_PRIVATE_KEY:fixedPrivateKey(vapid),
    HH_PUSH_SUBJECT:'mailto:tests@example.invalid'}
  const push=createNotificationRepository(config,env)
  const key=createECDH('prime256v1');key.generateKeys()
  const subscription={endpoint:'https://web.push.apple.com/synthetic-test-'+randomUUID(),keys:{
    p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}}
  const initial=await push.state(a)
  assert.equal(initial.ready,true,'synthetic VAPID fixture must be valid')
  assert.equal(initial.enabled,false)
  assert.equal(initial.messageAlerts,false,'message alerts require separate explicit consent')
  const saved=await push.subscribe(a,{subscription,locale:'ru',timeZone:'America/Toronto'})
  assert.equal(saved.enabled,true);assert.equal(saved.deviceCount,1);assert.equal(saved.locale,'ru')
  assert.equal(saved.messageAlerts,false,'course subscription must not opt in to private-message alerts')
  const changed=await push.preferences(a,{enabled:true,courseReminders:false,
    reminderHour:20,timeZone:'America/Toronto',locale:'ru'})
  assert.equal(changed.reminderHour,20);assert.equal(changed.courseReminders,false)
  assert.equal(changed.messageAlerts,false)
  assert.equal((await transaction(config,v2Actor,db=>db.query('select id from app_private.push_subscriptions'))).rows.length,0)
  assert.equal((await transaction(config,v2Actor,db=>db.query('select account_id from app_private.notification_preferences'))).rows.length,0)
  await assert.rejects(()=>rawAs(a,'authenticated',db=>db.query('select * from app_private.push_subscriptions')),
    error=>error.code==='42501')
  await assert.rejects(()=>push.subscribe(v2Actor,{subscription,locale:'ru',timeZone:'America/Toronto'}),
    error=>error.code==='DEVICE_ALREADY_REGISTERED')
  const removed=await push.unsubscribe(a,{endpoint:null})
  assert.equal(removed.enabled,false);assert.equal(removed.deviceCount,0)
})


// End-to-end restricted-role OPORA handoff: a real synthetic Weekly Pulse
// result, encrypted module choice, growth-course transaction and Day 1 read.
// This runs only against the isolated Postgres CI fixture, never production.
test('OPORA stage-3 consent creates exactly one Day 1 cycle and keeps saved testing', async () => {
  const {createGrowthCourseRepository} = await import('../lib/app/growth-course.js')
  const {createDailyCourseRepository} = await import('../lib/app/growth-daily.js')
  const {courseMeasuredProfile} = await import('../lib/inner-growth/course-strategy.js')
  const {ANTISTRESS_MODULE_FINDER_ITEMS} = await import('../lib/inner-growth/antistress-module-router.js')
  const who=actor(randomUUID(),randomUUID())
  const growth=createGrowthCourseRepository(config)
  const daily=createDailyCourseRepository(config)
  const db=await adminClient()
  try {
    await db.query('insert into auth.users(id,email) values($1,$2)',[who.id,'synthetic-opora@example.invalid'])
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[who.claims.session_id,who.id])
    await repo.ensureAccount(who)
    await repo.onboarding(who,{
      adult:true,necessary:true,marketing:false,displayName:'Synthetic OPORA learner',
      uiLocale:'en',timezone:'UTC',goal:'explore',
    })
    let course=await growth.command(who,{action:'start',consent:true})
    course=await growth.command(who,{
      action:'intake',expectedRevision:course.course.revision,
      concerns:'Synthetic stress during ordinary activities',
      focusTags:['stress','mood','energy'],
    })
    assert.equal(course.course.stage,2)
    const run=await repo.startRun(who,{
      definitionKey:weekly.key,definitionVersion:weekly.version,
      instrumentLocale:weekly.instrumentLocale,operationId:randomUUID(),
    })
    const saved=await repo.saveRun(who,run.id,{
      answers:answer(weekly,5),context:{},progress:weekly.questions.length,
      expectedRevision:run.revision,operationId:randomUUID(),
    })
    const completed=await repo.submitRun(who,run.id,{expectedRevision:saved.revision})
    const profile=courseMeasuredProfile({
      results:[completed],testKeys:['hh-weekly-pulse'],locale:'en',
    })
    const selected=profile.eligible.slice(0,Math.min(3,profile.eligible.length)).map(x=>x.id)
    assert.ok(selected.length>0,'Synthetic Weekly Pulse has current measured practice scales')
    // Earlier stages are exercised by the existing plan tests; advance the
    // synthetic course to the real module decision with its completed test.
    await db.query(`update app_private.growth_courses
      set stage=3,test_keys=ARRAY['hh-weekly-pulse']::text[],revision=revision+1,updated_at=now()
      where account_id=$1`,[who.id])
    course=await growth.read(who)
    assert.equal(course.course.stage,3)
    assert.equal(course.assessments.selectedTests[0].completed,true)
    const request={
      action:'choose-goals',expectedRevision:course.course.revision,
      scaleKeys:selected,consent:true,durationDays:14,
      moduleId:'AS5',moduleGoal:'undecided',
      moduleAnswers:Object.fromEntries(ANTISTRESS_MODULE_FINDER_ITEMS.map(x=>[x.id,null])),
      problemLabel:'Synthetic daily stress observation',intention:'',timeZone:'UTC',
    }
    const started=await growth.command(who,request)
    assert.equal(started.course.stage,4)
    assert.equal(started.course.moduleChoice.id,'AS5')
    assert.equal(started.assessments.selectedTests[0].completed,true)
    const today=await daily.read(who,'en')
    assert.equal(today.cycle.moduleId,'AS5')
    assert.equal(today.cycle.day,1)
    assert.equal(today.cycle.preferences.length,'standard')
    assert.equal(today.cycle.preferences.imagery,'optional')
    assert.equal(today.cycle.preferences.checkinFrequency,'daily')
    assert.equal(today.roadmap.length,14)
    assert.ok(today.lesson?.id)
    await assert.rejects(growth.command(who,request),{code:'REVISION_CONFLICT'})
    const cycleCount=await db.query('select count(*)::int as n from app_private.growth_cycles where account_id=$1',[who.id])
    const resultCount=await db.query('select count(*)::int as n from app.assessment_results where account_id=$1',[who.id])
    assert.equal(cycleCount.rows[0].n,1)
    assert.equal(resultCount.rows[0].n,1)
  } finally {
    await db.end()
  }
})


test('private session share grants enforce per-consultation ownership under real Postgres roles', async()=>{
  // Synthetic A/B test uses the exact deployed migration; never a production DB.
  const {readFile}=await import('node:fs/promises')
  const db=await adminClient()
  try{
    await db.query('create schema if not exists storage')
    await db.query('create table if not exists storage.buckets (id text primary key,name text not null,public boolean,file_size_limit bigint,allowed_mime_types text[])')
    const sql=await readFile(new URL('../sql/client-delivery-sessions-20261015.sql',import.meta.url),'utf8')
    await db.query(sql)
    // The private PDF extension is additive and does not grant browser DB access.
    const pdfExtension=await readFile(new URL('../sql/client-delivery-session-private-pdfs-20261015.sql',import.meta.url),'utf8')
    await db.query(pdfExtension)
    const permittedMime=(await db.query("select allowed_mime_types from storage.buckets where id='hh-client-private-media'")).rows[0].allowed_mime_types
    assert.ok(permittedMime.includes('application/pdf'))
    const bucket=(await db.query("select public,file_size_limit from storage.buckets where id='hh-client-private-media'")).rows[0]
    assert.ok(bucket)
    assert.equal(bucket.public,false)
    assert.equal(Number(bucket.file_size_limit),50_000_000)
    const clientA=randomUUID(),clientB=randomUUID(),sessionA=randomUUID(),sessionB=randomUUID()
    const pdfConstraint=(await db.query("select pg_get_constraintdef(c.oid) as definition from pg_constraint c where c.conname='client_delivery_assets_asset_kind_check'")).rows[0].definition
    assert.match(pdfConstraint,/pdf/)

    for(const [id,clientId] of [[sessionA,clientA],[sessionB,clientB]]){
      await db.query("insert into app_private.client_delivery_sessions(id,legacy_client_id,occurred_on,draft_payload,status) values($1,$2,'2026-10-15','synthetic-encrypted-fixture','draft')",[id,clientId])
    }
    const grant=randomUUID()
    await db.query("insert into app_private.client_session_share_grants(id,session_id,legacy_client_id,selector,secret_hash,expires_at) values($1,$2,$3,$4,$5,now()+interval '30 days')",[grant,sessionA,clientA,'aaaaaaaaaaaaaaaaaaaaaa','a'.repeat(64)])
    // A grant for Session B cannot be spoofed as Client A, even with Session B's UUID.
    await assert.rejects(db.query("insert into app_private.client_session_share_grants(id,session_id,legacy_client_id,selector,secret_hash,expires_at) values($1,$2,$3,$4,$5,now()+interval '30 days')",[randomUUID(),sessionB,clientA,'bbbbbbbbbbbbbbbbbbbbbb','b'.repeat(64)]),e=>e.code==='23503')
    await assert.rejects(db.query("insert into app_private.client_delivery_assets(id,legacy_client_id,session_id,asset_kind,scope,object_key,mime,max_bytes,status) values($1,$2,$3,'audio','practitioner','synthetic-path','audio/mp4',1024,'pending')",[randomUUID(),clientB,sessionA]),e=>e.code==='23503')
    for(const table of ['client_delivery_sessions','client_delivery_assets','client_session_share_grants','client_session_viewer_sessions']){
      await assert.rejects(rawAs(a,'authenticated',database=>database.query('select * from app_private.'+table)),e=>e.code==='42501')
      assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',['app_private.'+table])).rows[0].relrowsecurity,true)
    }
    const permitted=await rawAs(a,'hh_app_backend',database=>database.query('select count(*)::int as total from app_private.client_delivery_sessions'))
    assert.equal(permitted.rows[0].total,2)
    // Two isolated connections exercise both winners of finalization vs cleanup.
    // Only pending, never-ready rows may be claimed; published/ready keys survive.
    const finishing=await adminClient(),cleaning=await adminClient()
    const assetA=randomUUID(),assetB=randomUUID()
    const claim="update app_private.client_delivery_assets set status='removed' where id in (select id from app_private.client_delivery_assets where legacy_client_id=$1 and session_id=$2 and ready_at is null and status in ('pending','removed') and created_at < now()-interval '24 hours' order by created_at limit 30 for update skip locked) and ready_at is null and status in ('pending','removed') returning object_key"
    try {
      for(const id of [assetA,assetB])await db.query("insert into app_private.client_delivery_assets(id,legacy_client_id,session_id,asset_kind,scope,object_key,mime,max_bytes,status,created_at) values($1,$2,$3,'audio','client',$4,'audio/mp4',512,'pending',now()-interval '2 days')",[id,clientA,sessionA,'synthetic-race-'+id])
      await finishing.query('begin');await finishing.query('set local role hh_app_backend')
      await finishing.query("update app_private.client_delivery_assets set status='ready',ready_at=now(),bytes=512 where id=$1 and status='pending'",[assetA])
      await cleaning.query('begin');await cleaning.query('set local role hh_app_backend')
      await cleaning.query("set local statement_timeout='2s'")
      const claimed=await cleaning.query(claim,[clientA,sessionA])
      assert.deepEqual(claimed.rows.map(row=>row.object_key),['synthetic-race-'+assetB])
      // A concurrent finalizer can no longer turn the claimed row ready.
      const rejectedFinish=finishing.query("update app_private.client_delivery_assets set status='ready',ready_at=now(),bytes=512 where id=$1 and status='pending' returning id",[assetB])
      await cleaning.query('commit')
      assert.equal((await rejectedFinish).rowCount,0)
      await finishing.query('commit')
      const retryClaim=await cleaning.query(claim,[clientA,sessionA])
      assert.deepEqual(retryClaim.rows.map(row=>row.object_key),['synthetic-race-'+assetB])
      assert.equal((await db.query('select status from app_private.client_delivery_assets where id=$1',[assetA])).rows[0].status,'ready')
    } finally {
      await cleaning.query('rollback');await finishing.query('rollback')
      await finishing.end();await cleaning.end()
    }

  }finally{await db.end()}
})



test('an explicitly selected Session is saved to exactly one Google Account, with pinned version and no Client binding', async()=>{
  const {readFile}=await import('node:fs/promises')
  const admin=await adminClient()
  const clientId=randomUUID(),sessionId=randomUUID(),grantId=randomUUID(),selector='save'+randomUUID().replaceAll('-','').slice(0,18)
  const store={findClientById:async id=>id===clientId?{id,status:'active'}:null}
  try{
    const accountB=actor(randomUUID(),randomUUID())
    await admin.query('insert into auth.users(id,email) values($1,$2)',[accountB.id,'test-'+randomUUID()+'@example.invalid'])
    await admin.query('insert into auth.sessions(id,user_id) values($1,$2)',[accountB.claims.session_id,accountB.id])
    await repo.ensureAccount(accountB)
    await repo.onboarding(accountB,{adult:true,necessary:true,marketing:false,displayName:'Second Account',uiLocale:'en',timezone:'America/Toronto',goal:'explore'})
    const sql=await readFile(new URL('../sql/client-session-google-save-20261015.sql',import.meta.url),'utf8')
    await admin.query(sql)
    const payload=(version)=>seal({title:'Private session v'+version,summary:'Approved synthetic content',
      reportDocumentId:null,media:[],plan:{}},{accountId:clientId,recordId:sessionId,field:'session.published'},config)
    await admin.query(
      "insert into app_private.client_delivery_sessions(id,legacy_client_id,occurred_on,draft_payload,published_payload,status,draft_revision,published_revision) values($1,$2,'2026-10-15','synthetic-owner-draft',$3,'published',1,1)",
      [sessionId,clientId,payload(1)]
    )
    await admin.query(
      "insert into app_private.client_session_share_grants(id,session_id,legacy_client_id,selector,secret_hash,access_version,expires_at) values($1,$2,$3,$4,$5,1,now()+interval '30 days')",
      [grantId,sessionId,clientId,selector,'a'.repeat(64)]
    )
    const intent=await createSessionSaveIntent(config,store,{clientId,sessionId,grantId,grantVersion:1},randomUUID())
    assert.equal(intent.sourceKind,'client_session')
    const proof=(await admin.query('select browser_secret_hash from app_private.save_intents where id=$1',[intent.id])).rows[0].browser_secret_hash
    // The user explicitly confirms the destination Account after sign-in.
    const resource=await commitSessionSaveIntent(config,store,a,intent.id,proof)
    assert.ok(resource.id)
    assert.equal((await commitSessionSaveIntent(config,store,a,intent.id,proof)).id,resource.id)
    const saved=await readSavedSession(config,store,a,resource.id)
    assert.equal(saved.session.title,'Private session v1')
    assert.equal(saved.session.clientId,undefined)
    await assert.rejects(readSavedSession(config,store,accountB,resource.id),e=>e.code==='SESSION_UNAVAILABLE')
    const bind=(await admin.query('select account_id from app_private.client_account_bindings where legacy_client_id=$1',[clientId])).rows
    assert.equal(bind.length,0)
    const second=await createSessionSaveIntent(config,store,{clientId,sessionId,grantId,grantVersion:1},randomUUID())
    const secondProof=(await admin.query('select browser_secret_hash from app_private.save_intents where id=$1',[second.id])).rows[0].browser_secret_hash
    await assert.rejects(commitSessionSaveIntent(config,store,accountB,second.id,secondProof),e=>e.code==='SAVE_UNAVAILABLE')
    await admin.query("update app_private.client_delivery_sessions set published_payload=$2,published_revision=2,draft_revision=2 where id=$1",
      [sessionId,payload(2)])
    await assert.rejects(readSavedSession(config,store,a,resource.id),e=>e.code==='SESSION_CHANGED')
    const newIntent=await createSessionSaveIntent(config,store,{clientId,sessionId,grantId,grantVersion:1},randomUUID())
    const newProof=(await admin.query('select browser_secret_hash from app_private.save_intents where id=$1',[newIntent.id])).rows[0].browser_secret_hash
    assert.equal((await commitSessionSaveIntent(config,store,a,newIntent.id,newProof)).id,resource.id)
    assert.equal((await readSavedSession(config,store,a,resource.id)).session.title,'Private session v2')
    const oldFlag=process.env.HH_CLIENT_DELIVERY_ENABLED
    try{
      process.env.HH_CLIENT_DELIVERY_ENABLED='true'
      assert.equal((await repo.bootstrap(a)).savedSessions.filter(row=>row.id===resource.id).length,1)
    }finally{if(oldFlag===undefined)delete process.env.HH_CLIENT_DELIVERY_ENABLED
      else process.env.HH_CLIENT_DELIVERY_ENABLED=oldFlag}
    await removeSavedSession(config,a,resource.id)
    await assert.rejects(readSavedSession(config,store,a,resource.id),e=>e.code==='SESSION_UNAVAILABLE')
  }finally{await admin.end()}
})

test('saved session table is account-scoped and the raw recipient cannot write',async()=>{
  const rows=await rawAs(a,'authenticated',db=>db.query('select id from app.saved_sessions'))
  assert.ok(Array.isArray(rows.rows))
  await assert.rejects(rawAs(b,'authenticated',db=>db.query('insert into app.saved_sessions(account_id,source_session_id,legacy_client_id,source_revision,source_hash,occurred_on) values($1,$2,$3,1,$4,current_date)',
    [B,randomUUID(),randomUUID(),'sha256:'+'a'.repeat(64)])),e=>e.code==='42501')
})

// Six immutable EN/RU split editions: synthetic loopback DB only.
test('split and Bach v2 fixtures retain exact technical fields and all eight historical v1 definitions', async () => {
  const db = await adminClient()
  try {
    for (const definition of [...HH_SPLIT_V2_DEFINITIONS, ...BACH_V2_DEFINITIONS]) {
      for (const def of [definition, getAssessmentDefinition(definition.key, 'v1', definition.instrumentLocale)]) {
        const row = (await db.query('select * from app.assessment_versions where id=$1', [def.id])).rows[0]
        assert.ok(row)
        assert.deepEqual(row.definition, def)
        assert.deepEqual(row.questions, def.questions)
        assert.equal(row.definition_key, def.key)
        assert.equal(row.definition_version, def.version)
        assert.equal(row.instrument_locale, def.instrumentLocale)
        assert.equal(row.translation_version, def.translationVersion)
        assert.equal(row.scoring_key, def.scoringKey)
        assert.equal(row.scoring_version, def.scoringVersion)
        assert.deepEqual(row.result_schema, { version: def.resultVersion })
        assert.equal(row.timeframe, def.timeframe)
        assert.deepEqual(row.source_metadata, def.source)
        assert.equal(row.content_hash, def.contentHash)
        assert.equal(row.status, 'published')
        if (def.version === 'v2') assert.deepEqual(row.answer_schema, { type: 'integer', minimum: 0, maximum: def.key === 'hh-bach-flower-profile' ? 5 : 4 })
      }
    }
  } finally { await db.end() }
})

test('account split v2 EN/RU start-save-submit-readback preserves v1 history and owner isolation', async () => {
  const owner = actor(randomUUID(), randomUUID()), outsider = actor(randomUUID(), randomUUID())
  const db = await adminClient()
  try {
    for (const who of [owner, outsider]) {
      await db.query('insert into auth.users(id,email) values($1,$2)', [who.id, who.id+'@example.invalid'])
      await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [who.claims.session_id, who.id])
    }
  } finally { await db.end() }
  for (const who of [owner, outsider]) {
    await repo.ensureAccount(who)
    await repo.onboarding(who, { adult: true, necessary: true, marketing: false, displayName: 'Synthetic Split', uiLocale: 'en', timezone: 'UTC', goal: 'explore' })
  }
  for (const def of HH_SPLIT_V2_DEFINITIONS) {
    const old = getAssessmentDefinition(def.key, 'v1', def.instrumentLocale)
    let legacyRun = await start(owner, old)
    legacyRun = await save(legacyRun, owner, 2)
    const legacy = await repo.submitRun(owner, legacyRun.id, { expectedRevision: legacyRun.revision })
    const before = await repo.getResult(owner, legacy.id)
    assert.equal(before.dimensions.length, 1)
    assert.equal(before.dimensions[0].value, 2)
    let run = await start(owner, def)
    await assert.rejects(() => repo.getRun(outsider, run.id), /NOT_FOUND/)
    const count = def.key === 'hh-money-pressure' ? 3 : 5
    const responses = Object.fromEntries(def.questions.map((q, i) => [q.id, i < count ? 2 : 4]))
    run = await repo.saveRun(owner, run.id, { answers: responses, context: {}, progress: 6, expectedRevision: run.revision, operationId: randomUUID() })
    assert.equal(run.definitionVersion, 'v2')
    assert.deepEqual((await repo.getRun(owner, run.id)).answers, responses)
    await assert.rejects(() => repo.saveRun(outsider, run.id, { answers: responses, context: {}, progress: 6, expectedRevision: run.revision, operationId: randomUUID() }), /NOT_FOUND/)
    await assert.rejects(() => repo.submitRun(outsider, run.id, { expectedRevision: run.revision }), /NOT_FOUND/)
    const result = await repo.submitRun(owner, run.id, { expectedRevision: run.revision })
    assert.equal(result.definitionId, def.id)
    assert.equal(result.contentHash, def.contentHash)
    assert.equal(result.instrumentLocale, def.instrumentLocale)
    assert.equal(result.definitionVersion, 'v2')
    assert.deepEqual(result.dimensions.map(d => d.value), [2, 4])
    assert.equal(result.dimensions.length, 2)
    assert.deepEqual(result.dimensions.map(d => d.key), def.scoring.dimensions.map(d => d.key))
    assert.deepEqual((await repo.getResult(owner, result.id)).dimensions, result.dimensions)
    assert.deepEqual(await repo.getResult(owner, legacy.id), before)
    await assert.rejects(() => repo.getResult(outsider, result.id), /NOT_FOUND/)
    await assert.rejects(() => repo.getResult(outsider, legacy.id), /NOT_FOUND/)
  }
})

test('guest split v2 EN/RU start-save-submit-readback retains two dimensions and session isolation', async () => {
  const guestRepo = createGuestRepository(config)
  const owner = createGuestCredential(), outsider = createGuestCredential()
  for (const credential of [owner, outsider]) await guestRepo.createSession(credential, { adult: true, necessary: true, uiLocale: 'en', timezone: 'UTC' })
  for (const def of HH_SPLIT_V2_DEFINITIONS) {
    let run = await guestRepo.startRun(owner, { definitionKey: def.key, definitionVersion: def.version, instrumentLocale: def.instrumentLocale, operationId: randomUUID() })
    const count = def.key === 'hh-money-pressure' ? 3 : 5
    run = await guestRepo.saveRun(owner, run.id, { answers: Object.fromEntries(def.questions.map((q, i) => [q.id, i < count ? 4 : 0])), context: {}, progress: 6, expectedRevision: run.revision, operationId: randomUUID() })
    await assert.rejects(() => guestRepo.saveRun(outsider, run.id, { answers: {}, context: {}, progress: 6, expectedRevision: run.revision, operationId: randomUUID() }), /NOT_FOUND/)
    await assert.rejects(() => guestRepo.submitRun(outsider, run.id, { expectedRevision: run.revision }), /NOT_FOUND/)
    const result = await guestRepo.submitRun(owner, run.id, { expectedRevision: run.revision })
    assert.equal(result.definitionId, def.id)
    assert.equal(result.contentHash, def.contentHash)
    assert.equal(result.instrumentLocale, def.instrumentLocale)
    assert.equal(result.definitionVersion, 'v2')
    assert.deepEqual(result.dimensions.map(d => d.value), [4, 0])
    assert.equal(result.dimensions.length, 2)
    assert.deepEqual(result.dimensions.map(d => d.key), def.scoring.dimensions.map(d => d.key))
    assert.deepEqual((await guestRepo.getResult(owner, result.id)).dimensions, result.dimensions)
    await assert.rejects(() => guestRepo.getResult(outsider, result.id), /NOT_FOUND/)
  }
})

const bachV2SyntheticAnswers = def => Object.fromEntries(def.questions.map(q =>
  [q.id, q.id === 'bach.situation.36' ? 5 : q.id === 'bach.control.03' ? 4 : 0]))
function assertBachV2SyntheticDimensions(result) {
  assert.equal(result.dimensions.length, 38)
  // Independent legacy arithmetic: situation 5 + peak bonus 2 = 7;
  // control 4 × 1.5 + peak bonus 1 + control-presence bonus 1.5 = 8.5.
  assert.equal(result.dimensions.find(d => d.key === 'bach.beech').value, 7)
  assert.equal(result.dimensions.find(d => d.key === 'bach.agrimony').value, 8.5)
  assert.ok(result.dimensions.filter(d => !['bach.beech', 'bach.agrimony'].includes(d.key)).every(d => d.value === 0))
  assert.ok(result.dimensions.every(d => d.direction === 'non-normative'))
}

test('account Bach v2 EN/RU lifecycle preserves v1 history and owner isolation', async () => {
  const owner = actor(randomUUID(), randomUUID()), outsider = actor(randomUUID(), randomUUID())
  const db = await adminClient()
  try {
    for (const who of [owner, outsider]) {
      await db.query('insert into auth.users(id,email) values($1,$2)', [who.id, who.id+'@example.invalid'])
      await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [who.claims.session_id, who.id])
    }
  } finally { await db.end() }
  for (const who of [owner, outsider]) {
    await repo.ensureAccount(who)
    await repo.onboarding(who, { adult: true, necessary: true, marketing: false, displayName: 'Synthetic Bach', uiLocale: 'en', timezone: 'UTC', goal: 'explore' })
  }
  for (const def of BACH_V2_DEFINITIONS) {
    const old = getAssessmentDefinition(def.key, 'v1', def.instrumentLocale)
    let legacyRun = await start(owner, old)
    legacyRun = await save(legacyRun, owner, 0)
    const legacy = await repo.submitRun(owner, legacyRun.id, { expectedRevision: legacyRun.revision })
    const before = await repo.getResult(owner, legacy.id)
    assert.equal(before.dimensions.length, 38)
    assert.ok(before.dimensions.every(d => d.value === 0))
    let run = await start(owner, def)
    await assert.rejects(() => repo.getRun(outsider, run.id), /NOT_FOUND/)
    const responses = bachV2SyntheticAnswers(def)
    run = await repo.saveRun(owner, run.id, { answers: responses, context: {}, progress: def.questions.length, expectedRevision: run.revision, operationId: randomUUID() })
    assert.deepEqual((await repo.getRun(owner, run.id)).answers, responses)
    await assert.rejects(() => repo.saveRun(outsider, run.id, { answers: responses, context: {}, progress: def.questions.length, expectedRevision: run.revision, operationId: randomUUID() }), /NOT_FOUND/)
    await assert.rejects(() => repo.submitRun(outsider, run.id, { expectedRevision: run.revision }), /NOT_FOUND/)
    const result = await repo.submitRun(owner, run.id, { expectedRevision: run.revision })
    assert.equal(result.definitionId, def.id)
    assert.equal(result.contentHash, def.contentHash)
    assert.equal(result.instrumentLocale, def.instrumentLocale)
    assert.equal(result.definitionVersion, 'v2')
    assertBachV2SyntheticDimensions(result)
    assert.deepEqual((await repo.getResult(owner, result.id)).dimensions, result.dimensions)
    assert.deepEqual(await repo.getResult(owner, legacy.id), before)
    await assert.rejects(() => repo.getResult(outsider, result.id), /NOT_FOUND/)
    await assert.rejects(() => repo.getResult(outsider, legacy.id), /NOT_FOUND/)
  }
})

test('guest Bach v2 EN/RU lifecycle retains weighted themes and session isolation', async () => {
  const guestRepo = createGuestRepository(config)
  const owner = createGuestCredential(), outsider = createGuestCredential()
  for (const credential of [owner, outsider]) await guestRepo.createSession(credential, { adult: true, necessary: true, uiLocale: 'en', timezone: 'UTC' })
  for (const def of BACH_V2_DEFINITIONS) {
    let run = await guestRepo.startRun(owner, { definitionKey: def.key, definitionVersion: def.version, instrumentLocale: def.instrumentLocale, operationId: randomUUID() })
    run = await guestRepo.saveRun(owner, run.id, { answers: bachV2SyntheticAnswers(def), context: {}, progress: def.questions.length, expectedRevision: run.revision, operationId: randomUUID() })
    await assert.rejects(() => guestRepo.saveRun(outsider, run.id, { answers: {}, context: {}, progress: def.questions.length, expectedRevision: run.revision, operationId: randomUUID() }), /NOT_FOUND/)
    await assert.rejects(() => guestRepo.submitRun(outsider, run.id, { expectedRevision: run.revision }), /NOT_FOUND/)
    const result = await guestRepo.submitRun(owner, run.id, { expectedRevision: run.revision })
    assert.equal(result.definitionId, def.id)
    assert.equal(result.contentHash, def.contentHash)
    assert.equal(result.instrumentLocale, def.instrumentLocale)
    assert.equal(result.definitionVersion, 'v2')
    assertBachV2SyntheticDimensions(result)
    assert.deepEqual((await guestRepo.getResult(owner, result.id)).dimensions, result.dimensions)
    await assert.rejects(() => guestRepo.getResult(outsider, result.id), /NOT_FOUND/)
  }
})
