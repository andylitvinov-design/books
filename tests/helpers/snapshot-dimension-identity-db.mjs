import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getAssessmentDefinition, provenance } from '../../lib/assessments/definitions.js'
import { scoreAssessment } from '../../lib/assessments/scoring.js'
import { createProfileSnapshot } from '../../lib/profile/history.js'
import { assertIsolated } from './app-db-setup.mjs'

// Called only by the existing isolated DB suite. Every synthetic write and the
// temporary old/new trigger comparison is rolled back in this one transaction.
export async function verifySnapshotDimensionIdentity(db, t) {
  assertIsolated()
  await db.query('begin')
  try {
    const ownerId = randomUUID(), foreignOwnerId = randomUUID()
    for (const id of [ownerId, foreignOwnerId]) {
      await db.query('insert into auth.users(id,email) values($1,$2)', [id, `${id}@example.invalid`])
      await db.query('insert into app.accounts(id) values($1)', [id])
    }
    const fullDefinition = getAssessmentDefinition('ipip-via-r-strengths-96', 'v1', 'en')
    const standaloneDefinition = getAssessmentDefinition('ipip-via-r-curiosity-4', 'v1', 'en')
    async function result(definition, accountId, day) {
      const runId = randomUUID()
      const answers = Object.fromEntries(definition.questions.map(question => [question.id, 3]))
      if (definition.key === standaloneDefinition.key) answers[definition.questions[0].id] = 4
      const measurementAt = `2026-10-${day}T12:00:00.000Z`
      await db.query(
        'insert into app.assessment_runs(id,account_id,assessment_version_id,operation_id,timezone,answers) values($1,$2,$3,$4,$5,$6)',
        [runId, accountId, definition.id, randomUUID(), 'UTC', JSON.stringify(answers)],
      )
      await db.query(
        "update app.assessment_runs set status='submitted',submitted_revision=revision,revision=revision+1,submitted_at=$2,measurement_at=$2 where id=$1",
        [runId, measurementAt],
      )
      const scored = { id: randomUUID(), accountId, measurementAt, ...scoreAssessment(definition, answers) }
      await db.query(
        'insert into app.assessment_results(id,run_id,account_id,source_version_id,scoring_version,result_version,dimensions,measurement_at,provenance) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [scored.id, runId, accountId, definition.id, definition.scoringVersion, definition.resultVersion,
          JSON.stringify(scored.dimensions), measurementAt, provenance(definition)],
      )
      await db.query("update app.assessment_runs set status='completed',revision=revision+1,completed_at=$2 where id=$1", [runId, measurementAt])
      return scored
    }
    const full = await result(fullDefinition, ownerId, '10')
    const standalone = await result(standaloneDefinition, ownerId, '11')
    const repeated = await result(standaloneDefinition, ownerId, '12')
    const foreign = await result(standaloneDefinition, foreignOwnerId, '13')
    const snapshot = (generated, carried = []) => createProfileSnapshot({
      id: randomUUID(), accountId: ownerId, generatedResult: generated,
      carriedResults: carried, createdAt: '2026-10-15T12:00:00.000Z',
    })
    async function insert(value) {
      return (await db.query(
        'insert into app.profile_snapshots(id,account_id,generating_result_id,dimensions) values($1,$2,$3,$4) returning *',
        [value.id, value.accountId, value.generatingResultId, JSON.stringify(value.dimensions)],
      )).rows[0]
    }
    async function attempt(value, expected) {
      await db.query('savepoint snapshot_identity_case')
      try {
        if (expected) await assert.rejects(() => insert(value), expected)
        else {
          const persisted = await insert(value)
          assert.deepEqual(persisted.dimensions, value.dimensions)
          return persisted
        }
      } finally {
        await db.query('rollback to savepoint snapshot_identity_case')
        await db.query('release savepoint snapshot_identity_case')
      }
    }
    const original = await readFile(new URL('../../supabase/migrations/20261002164037_hh_app_r1_foundation.sql', import.meta.url), 'utf8')
    const originalFunction = original.match(/create function app_private\.validate_snapshot\(\)[\s\S]*?end \$\$;/)?.[0]
    assert.ok(originalFunction)
    await db.query(originalFunction.replace('create function', 'create or replace function'))
    const oldSnapshot = await insert(snapshot(full))
    await attempt(snapshot(standalone, [full]), /DUPLICATE_DIMENSION/)
    const metadata = async () => (await db.query(`
      select p.oid, p.proowner, p.proacl::text as acl, p.prosecdef, p.proconfig,
        t.oid as trigger_oid, t.tgfoid, t.tgenabled
      from pg_proc p join pg_trigger t on t.tgfoid=p.oid
      where p.oid='app_private.validate_snapshot()'::regprocedure
        and t.tgrelid='app.profile_snapshots'::regclass and t.tgname='validate_snapshot'
    `)).rows[0]
    const before = await metadata()
    const migration = await readFile(new URL('../../supabase/migrations/20261015235000_hh_snapshot_dimension_identity.sql', import.meta.url), 'utf8')
    // Execute the actual replacement statement inside the rollback-only test
    // transaction, without the artifact's outer BEGIN/COMMIT boundaries.
    const replacement = migration.match(/create or replace function app_private\.validate_snapshot\(\)[\s\S]*?end \$\$;/)?.[0]
    assert.ok(replacement)
    await db.query(replacement)

    await t.test('replacement preserves security, ACL, trigger identity and historical rows', async () => {
      assert.deepEqual(await metadata(), before)
      assert.equal(before.prosecdef, false)
      assert.deepEqual(before.proconfig, ['search_path=""'])
      const privileges = (await db.query(`
        select has_function_privilege('anon','app_private.validate_snapshot()','EXECUTE') as anon,
          has_function_privilege('authenticated','app_private.validate_snapshot()','EXECUTE') as authenticated,
          exists(select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
            where p.oid='app_private.validate_snapshot()'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') as public
      `)).rows[0]
      assert.deepEqual(privileges, { anon: false, authenticated: false, public: false })
      assert.deepEqual((await db.query('select * from app.profile_snapshots where id=$1', [oldSnapshot.id])).rows[0], oldSnapshot)
    })
    const combined = snapshot(standalone, [full])
    await t.test('full VIA96 and standalone shared scale persist together', async () => {
      assert.equal(combined.dimensions.length, 25)
      assert.equal(combined.dimensions.filter(d => d.key === 'trait.via.curiosity').length, 2)
      const fullValue = full.dimensions.find(d => d.key === 'trait.via.curiosity').value
      const standaloneValue = standalone.dimensions[0].value
      assert.notEqual(fullValue, standaloneValue)
      const persisted = await attempt(combined)
      // A fresh full result lets the opposite completion order exercise the
      // unique generating_result_id constraint without changing old snapshots.
      const laterFull = await result(fullDefinition, ownerId, '14')
      const reversed = await attempt(snapshot(laterFull, [standalone]))
      for (const row of [persisted, reversed]) {
        const shared = row.dimensions.filter(d => d.key === 'trait.via.curiosity')
        assert.equal(shared.find(d => d.sourceDefinitionId === full.definitionId).value, fullValue)
        assert.equal(shared.find(d => d.sourceDefinitionId === standalone.definitionId).value, standaloneValue)
      }
    })
    const standaloneSnapshot = () => snapshot(standalone)
    const dimension = standaloneSnapshot().dimensions[0]
    await t.test('same exact definition and scale still rejects duplicate entries', async () => {
      await attempt({ ...standaloneSnapshot(), dimensions: [dimension, { ...dimension }] }, /DUPLICATE_DIMENSION/)
      const oldDimension = { ...snapshot(repeated).dimensions[0], remeasured: false }
      await attempt({ ...standaloneSnapshot(), dimensions: [dimension, oldDimension] }, /DUPLICATE_DIMENSION/)
    })
    await t.test('alternate UUID spellings cannot bypass definition-scale uniqueness', async () => {
      assert.notEqual(dimension.sourceDefinitionId.toUpperCase(), dimension.sourceDefinitionId)
      await attempt({ ...standaloneSnapshot(), dimensions: [dimension, { ...dimension, sourceDefinitionId: dimension.sourceDefinitionId.toUpperCase() }] }, /DUPLICATE_DIMENSION/)
    })
    for (const [label, patch, expected] of [
      ['missing key', { key: undefined }, /DUPLICATE_DIMENSION/],
      ['missing definition', { sourceDefinitionId: undefined }, /INVALID_SNAPSHOT_SOURCE/],
      ['null definition', { sourceDefinitionId: null }, /INVALID_SNAPSHOT_SOURCE/],
      ['forged definition', { sourceDefinitionId: full.definitionId }, /INVALID_SNAPSHOT_SOURCE/],
      ['forged value', { value: dimension.value + 1 }, /INVALID_SNAPSHOT_SOURCE/],
      ['forged source shape', { extraProperty: 'forged' }, /INVALID_SNAPSHOT_SOURCE/],
      ['forged measurement time', { measurementAt: '2026-10-01T00:00:00.000Z' }, /INVALID_SNAPSHOT_SOURCE/],
      ['forged locale', { instrumentLocale: 'ru' }, /INVALID_SNAPSHOT_SOURCE/],
      ['forged remeasurement flag', { remeasured: false }, /INVALID_SNAPSHOT_SOURCE/],
      ['missing source result', { sourceResultId: randomUUID() }, error => error.code === 'P0002'],
      ['missing source dimension', { key: 'trait.via.not-a-source-dimension' }, error => error.code === 'P0002'],
      ['foreign owner source', { sourceResultId: foreign.id, measurementAt: foreign.measurementAt, remeasured: false }, error => error.code === 'P0002'],
    ]) {
      await t.test(`${label} remains rejected`, async () => {
        await attempt({ ...standaloneSnapshot(), dimensions: [{ ...dimension, ...patch }] }, expected)
      })
    }
  } finally {
    await db.query('rollback')
  }
}
