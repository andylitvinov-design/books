import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../lib/app/repository.js', import.meta.url), 'utf8')
const start = source.indexOf('    async removeTestPlanItem(')
const end = source.indexOf('    async cancelTestPlan(', start)
assert.ok(start > 0 && end > start)
const method = source.slice(start, end).trim().replace(/,$/, '')
class AppError extends Error { constructor(code, status) { super(code); this.status = status } }
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const actor = { id: id(1) }
const defs = [id(11), id(12), id(13), id(14)]
const runs = [id(21), id(22), id(23)]
function harness({ rows, owner = actor.id, revision = 4, completed = runs } = {}) {
  const plan = { id: id(2), account_id: owner, status: 'active', revision, definition_ids: defs, completed_run_ids: completed }
  const queries = [], locks = []
  const db = { async query(sql, args) {
    queries.push({ sql, args })
    if (sql.startsWith('select id,assessment_version_id')) {
      assert.equal(args[0], actor.id)
      assert.deepEqual(args[1], completed)
      return { rows: rows ?? [2, 1, 0].map(i => ({ id: runs[i], assessment_version_id: defs[i] })) }
    }
    assert.match(sql, /^update app_private.assessment_plans/)
    assert.match(sql, /where id=\$1 and account_id=\$2 and revision=\$3/)
    assert.deepEqual(args.slice(0, 3), [plan.id, actor.id, revision])
    return { rows: [{ ...plan, definition_ids: args[3], completed_run_ids: args[4], current_index: args[5], status: args[6], revision: revision + 1 }] }
  } }
  const dependencies = {
    onlyKeys(input, keys) { assert.deepEqual(Object.keys(input).sort(), [...keys].sort()) },
    requireUUID(value) { assert.match(value, /^[0-9a-f-]{36}$/); return value },
    revision(value) { assert.ok(Number.isInteger(value) && value > 0) },
    transaction: async (_config, actualActor, fn) => { assert.equal(actualActor, actor); return fn(db) },
    config: {},
    accountLock: async (_db, _actor, options) => { locks.push(options); assert.deepEqual(options, { write: true }) },
    ownedTestPlan: async (_db, actualActor, requested, options) => {
      assert.deepEqual(options, { write: true }); assert.equal(locks.length, 1)
      if (plan.account_id !== actualActor.id || requested !== plan.id) throw new AppError('NOT_FOUND', 404)
      return plan
    },
    testPlanView: row => row,
    nextOutstandingDefinitionIndex: (ids, completedIds) => { const i = ids.findIndex(v => !completedIds.has(v)); return i < 0 ? ids.length : i },
    AppError,
  }
  const repository = new Function(...Object.keys(dependencies), `return ({ ${method} })`)(...Object.values(dependencies))
  return { plan, queries, remove: (definitionId = defs[3], expectedRevision = 4) => repository.removeTestPlanItem(actor, plan.id, { definitionId, expectedRevision }) }
}
test('actual removal preserves completed progress order despite reversed database rows', async () => {
  const h = harness(), result = await h.remove()
  assert.deepEqual(result.completed_run_ids, runs)
  assert.deepEqual(result.definition_ids, defs.slice(0, 3))
  assert.equal(result.status, 'completed')
  assert.deepEqual(h.plan.completed_run_ids, runs)
})
test('removing a completed definition filters only its progress and preserves survivors', async () => {
  const result = await harness().remove(defs[1])
  assert.deepEqual(result.completed_run_ids, [runs[0], runs[2]])
  assert.deepEqual(result.definition_ids, [defs[0], defs[2], defs[3]])
  assert.equal(result.current_index, 2)
  assert.equal(result.status, 'active')
})
test('duplicate returned rows never duplicate progress or introduce unrecorded run IDs', async () => {
  const rows = [
    { id: runs[1], assessment_version_id: defs[1] },
    { id: runs[0], assessment_version_id: defs[0] },
    { id: runs[1], assessment_version_id: defs[1] },
    { id: id(99), assessment_version_id: defs[0] },
  ]
  const result = await harness({ rows }).remove()
  assert.deepEqual(result.completed_run_ids, runs.slice(0, 2))
  assert.equal(new Set(result.completed_run_ids).size, result.completed_run_ids.length)
})
test('stale revisions, foreign ownership and absent definitions reject before progress query/write', async () => {
  for (const [options, definition, revision, code] of [
    [{}, defs[3], 3, 'REVISION_CONFLICT'],
    [{ owner: id(90) }, defs[3], 4, 'NOT_FOUND'],
    [{}, id(91), 4, 'PLAN_ITEM_NOT_FOUND'],
  ]) {
    const h = harness(options)
    await assert.rejects(h.remove(definition, revision), { message: code })
    assert.equal(h.queries.length, 0)
  }
})
test('empty progress stays empty and cannot acquire arbitrary database-returned IDs', async () => {
  assert.deepEqual((await harness({ completed: [] }).remove()).completed_run_ids, [])
})
