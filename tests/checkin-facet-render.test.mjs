import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// A clean normal-React subprocess also runs under the app suite's react-server
// conditions. It renders actual JSX and actual scorer/model imports, not stubs.
test('exact-source check-in React rendering and legacy invariance', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', fileURLToPath(new URL('./helpers/checkin-render-cases.mjs', import.meta.url))], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env,
  })
  assert.ifError(run.error)
  assert.equal(run.status, 0, run.stdout + '\n' + run.stderr)
  const executed = run.stdout.match(/tests\s+(\d+)/)
  assert.ok(executed && Number(executed[1]) >= 103, 'The child React suite must actually execute its cases')
})
