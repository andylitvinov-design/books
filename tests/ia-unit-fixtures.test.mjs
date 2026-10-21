import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isolatedNarrationRedisContainer } from './helpers/narration-redis-container.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('isolated narration fixture uses the explicit service ID or the unchanged local fixture name', () => {
  assert.equal(isolatedNarrationRedisContainer({}), 'andrey-voice-redis-ci')
  const id = '60972d9aa486605e66b0dad4abb678dc3d9116f536579e418176eedb8abb9105'
  assert.equal(isolatedNarrationRedisContainer({ HH_TEST_REDIS_CONTAINER: id }), id)
})

test('container selection rejects empty, truncated, arbitrary and remote destinations', () => {
  for (const id of ['', ' ', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64),
    'production-redis', 'andrey-voice-redis-ci', 'redis://localhost:6379',
    'https://example.invalid', '--privileged', 'a'.repeat(64) + '; echo bad', null, 42]) {
    assert.throws(() => isolatedNarrationRedisContainer({ HH_TEST_REDIS_CONTAINER: id }),
      /full isolated service container ID/)
  }
})

test('runtime tests keep argument-separated Docker execution and synthetic key namespaces', () => {
  const source = read('tests/local-narration-redis-runtime.test.mjs')
  assert.match(source, /import \{ isolatedNarrationRedisContainer \} from '\.\/helpers\/narration-redis-container\.mjs'/)
  assert.match(source, /const container=isolatedNarrationRedisContainer\(process\.env\)/)
  assert.match(source, /execFileSync\('docker',\[\s*'exec',container,'redis-cli','--raw','EVAL'/)
  assert.match(source, /execFileSync\('docker',\['exec',container,'redis-cli','--raw','GET',key\]/)
  assert.match(source, /'hh:test:voice:'\+randomUUID\(\)/)
  assert.match(source, /ENCRYPTED_FAKE_ONLY/)
  assert.doesNotMatch(source, /redis:\/\/|rediss:\/\/|shell:\s*true|FLUSHALL|FLUSHDB/)
})

function assertUnitFixtureWorkflow(source) {
  const install = source.indexOf('      - run: npm ci --no-audit --no-fund')
  const generate = source.indexOf('        run: node scripts/build-public-card-artwork.mjs')
  const unit = source.indexOf('      - run: npm run test:unit')
  const build = source.indexOf('      - run: npm run build')
  assert.ok(install >= 0 && generate > install && unit > generate && build > unit)
  assert.match(source, /- run: npm run test:unit\n        env:\n          HH_TEST_REDIS_CONTAINER: \$\{\{ job\.services\.redis\.id \}\}/)
  assert.equal((source.match(/HH_TEST_REDIS_CONTAINER:/g) || []).length, 1)
  assert.match(source, /services:\n      redis:\n        image: redis:7-alpine/)
  assert.match(source, /--health-cmd "redis-cli ping"/)
}

test('IA prepares pinned assets and binds only its existing healthy Redis service before unit checks', () => {
  const workflow = read('.github/workflows/ia-v2.yml')
  assertUnitFixtureWorkflow(workflow)
  for (const [before, after] of [
    ['run: node scripts/build-public-card-artwork.mjs', 'run: echo skip-generation'],
    ['${{ job.services.redis.id }}', 'production-redis'],
    ['        env:\n          HH_TEST_REDIS_CONTAINER:', '        arbitrary:\n          HH_TEST_REDIS_CONTAINER:'],
    ['--health-cmd "redis-cli ping"', '--health-cmd "true"'],
  ]) {
    assert.ok(workflow.includes(before))
    assert.throws(() => assertUnitFixtureWorkflow(workflow.replace(before, after)))
  }
})

test('artwork prerequisite retains pinned local inputs and cannot silently download a replacement', () => {
  const generator = read('scripts/build-public-card-artwork.mjs')
  assert.match(generator, /sha !== item\.sha/)
  assert.match(generator, /original\.length !== item\.bytes/)
  assert.match(generator, /Unsafe source asset path/)
  assert.match(generator, /Unexpected static artwork destination/)
  assert.doesNotMatch(generator, /fetch\(|https\.get|http\.get|execFile|child_process/)
})
