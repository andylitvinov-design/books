import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('actual HistoryView/ProfileOverview/InstrumentTrend render safely and preserve legacy output', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', fileURLToPath(new URL('./helpers/checkin-view-cases.mjs', import.meta.url))], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env,
  })
  assert.ifError(run.error)
  assert.equal(run.status, 0, run.stdout + '\n' + run.stderr)
  const executed = run.stdout.match(/tests\s+(\d+)/)
  assert.ok(executed && Number(executed[1]) >= 190, 'The actual-source child render cases must execute')
})
