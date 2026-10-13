import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createTestRatingRepository } from '../lib/app/test-ratings.js'
import { adminClient, actor, rawAs } from './helpers/app-db-setup.mjs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'

// Registered by the isolated app DB suite after its shared setup hook.
export function registerTestRatingTests({ config, repo }) {
  test('client ratings: real restricted-role ownership, completed eligibility, races, edits, versions and aggregates', async () => {
    const a = actor(randomUUID(), randomUUID()), b = actor(randomUUID(), randomUUID())
    const ratings = createTestRatingRepository(config)
    const admin = await adminClient()
    try {
      for (const who of [a, b]) {
        await admin.query('insert into auth.users(id,email) values($1,$2)', [who.id, 'rating-fixture@example.invalid'])
        await admin.query('insert into auth.sessions(id,user_id) values($1,$2)', [who.claims.session_id, who.id])
        await repo.ensureAccount(who)
        await repo.onboarding(who, { adult: true, necessary: true, marketing: false, displayName: 'Synthetic rating', uiLocale: 'en', timezone: 'UTC', goal: 'explore' })
      }
      async function complete(who, locale = 'en') {
        const def = getAssessmentDefinition('hh-current-state', 'v2', locale)
        const run = await repo.startRun(who, { definitionKey: def.key, definitionVersion: def.version, instrumentLocale: def.instrumentLocale, operationId: randomUUID() })
        const saved = await repo.saveRun(who, run.id, { expectedRevision: run.revision, operationId: randomUUID(), answers: Object.fromEntries(def.questions.map(q => [q.id, 3])), context: {}, progress: def.questions.length })
        return repo.submitRun(who, run.id, { expectedRevision: saved.revision })
      }
      const first = await complete(a), second = await complete(b)
      assert.deepEqual(await ratings.read(a, first.id), { stars: null, revision: 0 })
      await assert.rejects(ratings.read(b, first.id), { code: 'NOT_FOUND' })
      await assert.rejects(ratings.save(b, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 }), { code: 'NOT_FOUND' })
      await assert.rejects(ratings.save(a, randomUUID(), { uiLocale: 'en', stars: 5, expectedRevision: 0 }), { code: 'NOT_FOUND' })
      // Published content in another UI language must not authorize this one.
      await admin.query("update app.assessment_interpretation_versions set status='retired' where assessment_version_id=$1 and ui_locale='en'", [first.definitionId])
      try {
        await assert.rejects(ratings.save(a, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 }), { code: 'INTERPRETATION_UNAVAILABLE' })
        assert.deepEqual(await ratings.read(a, first.id), { stars: null, revision: 0 })
      } finally {
        await admin.query("update app.assessment_interpretation_versions set status='published' where assessment_version_id=$1 and ui_locale='en'", [first.definitionId])
      }
      await admin.query('revoke select on app.assessment_interpretation_versions from hh_app_backend')
      try {
        await assert.rejects(ratings.save(a, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 }), { code: 'INTERPRETATION_UNAVAILABLE' })
      } finally {
        await admin.query('grant select on app.assessment_interpretation_versions to hh_app_backend')
      }
      // This suite runs only on the disposable loopback DB. A pre-schema rollout
      // must fail closed, not fall through to an unchecked vote.
      await admin.query('alter table app.assessment_interpretation_versions rename to rating_test_hidden_interpretations')
      try {
        await assert.rejects(ratings.save(a, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 }), { code: 'INTERPRETATION_UNAVAILABLE' })
      } finally {
        await admin.query('alter table app.rating_test_hidden_interpretations rename to assessment_interpretation_versions')
      }
      // Deliberate catalog-corruption fixture, never a production write. Restore
      // the original metadata and immutability trigger before leaving this test.
      async function setFixtureHash(value) {
        await admin.query('begin')
        try {
          await admin.query('alter table app.assessment_interpretation_versions disable trigger immutable_interpretation_version')
          await admin.query("update app.assessment_interpretation_versions set instrument_content_hash=$2 where assessment_version_id=$1 and ui_locale='en'", [first.definitionId, value])
          await admin.query('alter table app.assessment_interpretation_versions enable trigger immutable_interpretation_version')
          await admin.query('commit')
        } catch (error) { await admin.query('rollback'); throw error }
      }
      const originalHash = (await admin.query("select instrument_content_hash from app.assessment_interpretation_versions where assessment_version_id=$1 and ui_locale='en'", [first.definitionId])).rows[0].instrument_content_hash
      try {
        await setFixtureHash('sha256:' + '0'.repeat(64))
        await assert.rejects(ratings.save(a, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 }), { code: 'INTERPRETATION_UNAVAILABLE' })
      } finally { await setFixtureHash(originalHash) }
      const concurrent = await Promise.all([ratings.save(a, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 }), ratings.save(a, first.id, { uiLocale: 'en', stars: 5, expectedRevision: 0 })])
      assert.deepEqual(concurrent, [{ stars: 5, revision: 1 }, { stars: 5, revision: 1 }])
      await ratings.save(b, second.id, { uiLocale: 'en', stars: 3, expectedRevision: 0 })
      let summary = (await ratings.summaries()).summaries[first.definitionId]
      assert.equal(summary.count, 2); assert.equal(summary.average, 4); assert.equal(summary.ranked, false)
      const edited = await ratings.save(a, first.id, { uiLocale: 'en', stars: 4, expectedRevision: 1 })
      assert.equal(edited.revision, 2)
      await assert.rejects(ratings.save(a, first.id, { uiLocale: 'en', stars: 2, expectedRevision: 1 }), { code: 'RATING_CONFLICT' })
      const sameTestAgain = await complete(a)
      assert.deepEqual(await ratings.read(a, sameTestAgain.id), { stars: 4, revision: 2 })
      await ratings.save(a, sameTestAgain.id, { uiLocale: 'en', stars: 4, expectedRevision: 2 })
      assert.equal((await ratings.summaries()).summaries[first.definitionId].count, 2)
      const otherLanguage = await complete(a, 'ru')
      await ratings.save(a, otherLanguage.id, { uiLocale: 'en', stars: 5, expectedRevision: 2 })
      assert.equal((await ratings.summaries()).summaries[first.definitionId].count, 1)
      assert.equal((await ratings.summaries()).summaries[otherLanguage.definitionId].count, 1)
      assert.deepEqual(await ratings.read(a, first.id), { stars: null, revision: 3 })
      assert.equal((await ratings.export(a)).length, 1)
      await admin.query("update app.assessment_interpretation_versions set status='retired' where assessment_version_id=$1", [otherLanguage.definitionId])
      let removed
      try {
        assert.equal((await ratings.read(a, otherLanguage.id)).stars, 5)
        removed = await ratings.remove(a, otherLanguage.id, { expectedRevision: 3 })
      } finally {
        await admin.query("update app.assessment_interpretation_versions set status='published' where assessment_version_id=$1", [otherLanguage.definitionId])
      }
      assert.deepEqual(removed, { stars: null, revision: 4 })
      assert.equal((await ratings.summaries()).summaries[otherLanguage.definitionId], undefined)
      await ratings.save(a, otherLanguage.id, { uiLocale: 'en', stars: 4, expectedRevision: 4 })
      await assert.rejects(ratings.save(a, otherLanguage.id, { uiLocale: 'en', stars: 2, expectedRevision: 3 }), { code: 'RATING_CONFLICT' })
      // RLS protects the source even if future backend code forgets its WHERE.
      const own = await rawAs(a, 'hh_app_backend', async db => (await db.query('select account_id from app_private.test_ratings')).rows)
      assert.ok(own.every(row => row.account_id === a.id))
      await assert.rejects(rawAs(a, 'hh_app_backend', db => db.query('update app_private.test_ratings set source_result_id=$1 where account_id=$2', [second.id, a.id])), { code: '42501' })
      await assert.rejects(rawAs(a, 'authenticated', db => db.query('select * from app_private.test_ratings')), { code: '42501' })
      await assert.rejects(rawAs(a, 'authenticated', db => db.query('select * from app_private.test_rating_summaries()')), { code: '42501' })
      const privileges = (await admin.query("select has_table_privilege('anon','app_private.test_ratings','SELECT') as table_access, has_function_privilege('anon','app_private.test_rating_summaries()','EXECUTE') as function_access")).rows[0]
      assert.deepEqual(privileges, { table_access: false, function_access: false })
      const rows = (await admin.query('select * from app_private.test_rating_summaries()')).rows
      assert.ok(rows.every(row => Object.keys(row).sort().join(',') === 'definition_id,rating_count,rating_sum'))
      await admin.query("update app.accounts set status='deleting' where id=$1", [a.id])
      assert.equal((await ratings.summaries()).summaries[otherLanguage.definitionId], undefined)
      await admin.query('delete from auth.sessions where id=$1', [b.claims.session_id])
      await assert.rejects(ratings.save(b, second.id, { uiLocale: 'en', stars: 5, expectedRevision: 1 }), { code: 'SIGN_IN_REQUIRED' })
    } finally {
      await admin.query('delete from app.accounts where id=any($1::uuid[])', [[a.id, b.id]])
      await admin.query('delete from auth.users where id=any($1::uuid[])', [[a.id, b.id]])
      await admin.end()
    }
  })
}
