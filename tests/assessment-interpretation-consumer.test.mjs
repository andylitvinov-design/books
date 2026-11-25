import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Preserve the production server-only boundary while making the repository's
// default test:unit command exercise these backend-only synthetic cases.
test('server-only interpretation consumer regression suite', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const run = spawnSync(process.execPath, [
    '--conditions=react-server', '--test', '--test-reporter=tap',
    fileURLToPath(new URL('./assessment-interpretation-consumer.cases.mjs', import.meta.url)),
  ], { encoding: 'utf8', timeout: 120000, env })
  assert.ifError(run.error)
  assert.equal(run.status, 0, run.stdout + run.stderr)
  assert.match(run.stdout, /# tests 14\b/, 'all backend regression cases must actually execute')
})
