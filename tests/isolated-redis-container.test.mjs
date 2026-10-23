import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isolatedRedisContainer } from './helpers/isolated-redis-container.mjs'

test('dedicated voice default and explicit isolated service ID are preserved', () => {
  assert.equal(isolatedRedisContainer({}), 'andrey-voice-redis-ci')
  for (const id of ['a'.repeat(64), 'redis_test-7.0'])
    assert.equal(isolatedRedisContainer({ CI: 'true', HH_TEST_REDIS_CONTAINER: id }), id)
})
test('Redis selection rejects URLs, options, shell text and non-CI overrides', () => {
  for (const value of ['', '-redis', 'redis://localhost:6379', 'localhost:6379', '/redis', 'redis other', 'redis;true', 'redis\nother', 'a'.repeat(129), null])
    assert.throws(() => isolatedRedisContainer({ CI: 'true', HH_TEST_REDIS_CONTAINER: value }))
  for (const CI of [undefined, 'false', '1'])
    assert.throws(() => isolatedRedisContainer({ CI, HH_TEST_REDIS_CONTAINER: 'redis' }))
})
test('IA injects only its existing Redis service into the unchanged unit test command', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ia-v2.yml', import.meta.url), 'utf8')
  const step = workflow.split('- name: Unit tests with retained isolated diagnostics')[1].split('- name: Source-content validators')[0]
  assert.match(step, /HH_TEST_REDIS_CONTAINER: \$\{\{ job\.services\.redis\.id \}\}/)
  assert.match(step, /npm run test:unit > \/tmp\/ia222-evidence\/unit-tests\.log 2>&1/)
  assert.match(step, /exit "\$test_status"/)
  const runtime = readFileSync(new URL('./local-narration-redis-runtime.test.mjs', import.meta.url), 'utf8')
  assert.match(runtime, /const container=isolatedRedisContainer\(\)/)
  assert.match(runtime, /execFileSync\('docker',\[/)
  assert.doesNotMatch(runtime, /execSync\(|shell:\s*true|redis:\/\//)
})
