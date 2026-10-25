import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isolatedRedisCommand, isolatedRedisContainer } from './helpers/isolated-redis-container.mjs'
const id = 'a'.repeat(64)
const context = { CI: 'true', GITHUB_ACTIONS: 'true', HH_TEST_REDIS_ISOLATED: 'true', HH_TEST_REDIS_CONTAINER: id }

test('dedicated voice default and explicit isolated GitHub service ID are preserved', () => {
  assert.equal(isolatedRedisContainer({}), 'andrey-voice-redis-ci')
  assert.equal(isolatedRedisContainer(context), id)
})
test('malformed container overrides fail before Docker can execute', () => {
  let calls = 0
  const execute = () => { calls++; throw new Error('Docker must not run') }
  for (const value of ['', '-redis', 'redis://localhost:6379', 'localhost:6379', '/redis',
    'redis other', 'redis;true', 'redis\nother', 'redis_test-7.0', 'a'.repeat(63), 'a'.repeat(65),
    'A'.repeat(64), 'g'.repeat(64), null, 123]) {
    assert.throws(() => isolatedRedisCommand(['GET', 'hh:test:voice:synthetic:item'], {
      env: { ...context, HH_TEST_REDIS_CONTAINER: value }, execute,
    }), /Explicit isolated GitHub CI Redis service ID required/)
  }
  assert.equal(calls, 0)
})
test('wrong or missing isolation context fails before Docker can execute', () => {
  let calls = 0
  for (const key of ['CI', 'GITHUB_ACTIONS', 'HH_TEST_REDIS_ISOLATED']) {
    for (const value of [undefined, 'false', '1', true]) {
      assert.throws(() => isolatedRedisCommand(['GET', 'hh:test:voice:synthetic:item'], {
        env: { ...context, [key]: value }, execute: () => { calls++ },
      }), /Explicit isolated GitHub CI Redis service ID required/)
    }
  }
  assert.equal(calls, 0)
})
test('Docker uses the local socket and argument arrays; Lua remains one argument', () => {
  const lua = 'return "synthetic; no shell expansion"'
  let calls = 0
  const result = isolatedRedisCommand(['EVAL', lua, '1', 'hh:test:voice:synthetic:item', 'value'], {
    env: context,
    execute: (file, args, options) => {
      calls++
      assert.equal(file, 'docker')
      assert.deepEqual(args, ['--host', 'unix:///var/run/docker.sock', 'exec', id,
        'redis-cli', '--raw', 'EVAL', lua, '1', 'hh:test:voice:synthetic:item', 'value'])
      assert.deepEqual(options, { encoding: 'utf8', maxBuffer: 120000, timeout: 5000,
        env: { PATH: '/usr/local/bin:/usr/bin:/bin', LC_ALL: 'C' } })
      return 'synthetic result\n'
    },
  })
  assert.equal(calls, 1)
  assert.equal(result, 'synthetic result')
})
test('invalid command shape cannot execute Docker', () => {
  let calls = 0
  for (const args of ['GET key', ['FLUSHALL'], ['GET', null], []])
    assert.throws(() => isolatedRedisCommand(args, { env: context, execute: () => { calls++ } }),
      /Explicit synthetic Redis command arguments required/)
  assert.equal(calls, 0)
})
test('IA injects only the existing Redis service at the unchanged unit command', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ia-v2.yml', import.meta.url), 'utf8')
  const step = workflow.split('      - run: npm run test:unit\n')[1].split('      - name: Source-content validators')[0]
  assert.match(step, /HH_TEST_REDIS_CONTAINER: \$\{\{ job\.services\.redis\.id \}\}/)
  assert.match(step, /HH_TEST_REDIS_ISOLATED: 'true'/)
  assert.equal((workflow.match(/HH_TEST_REDIS_CONTAINER:/g) || []).length, 1)
  assert.equal((workflow.match(/image: redis:7-alpine/g) || []).length, 1)
  assert.doesNotMatch(workflow, /docker run|redis:\/\//)
})

test('IA generates pinned local artwork before unit tests without changing prebuild', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ia-v2.yml', import.meta.url), 'utf8')
  const install = workflow.indexOf('- run: npm ci --no-audit --no-fund')
  const artwork = workflow.indexOf('run: npm run build:static-artwork')
  const unit = workflow.indexOf('- run: npm run test:unit')
  assert.ok(install >= 0 && artwork > install && unit > artwork)
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.scripts['build:static-artwork'], 'node scripts/build-public-card-artwork.mjs')
  assert.ok(pkg.scripts.prebuild.includes('node scripts/build-public-card-artwork.mjs'))
  const source = readFileSync(new URL('../scripts/build-public-card-artwork.mjs', import.meta.url), 'utf8')
  assert.match(source, /sha !== item\.sha/)
  assert.match(source, /original\.length !== item\.bytes/)
  assert.match(source, /sharp\(original, \{ failOn: "error" \}\)/)
  assert.doesNotMatch(source, /\bfetch\s*\(|\bhttps?\s*:\s*\/\/|node:(?:https?|net|tls|child_process)|\bupload\s*\(/)
})


test('hostile inherited Docker endpoint, context, TLS and config cannot reach the child', () => {
  const hostile = { ...context, PATH: '/usr/bin:/bin', DOCKER_HOST: 'tcp://external.invalid:2376',
    DOCKER_CONTEXT: 'external', DOCKER_TLS_VERIFY: '1', DOCKER_CERT_PATH: '/private/certs',
    DOCKER_CONFIG: '/private/docker', HOME: '/private/home', PRIVATE_SENTINEL: 'never-forward' }
  const before = { ...hostile }
  let calls = 0
  isolatedRedisCommand(['GET', 'hh:test:voice:synthetic:item'], { env: hostile,
    execute: (file, args, options) => {
      calls++
      assert.equal(file, 'docker')
      assert.deepEqual(args.slice(0, 4), ['--host', 'unix:///var/run/docker.sock', 'exec', id])
      assert.deepEqual(options.env, { PATH: '/usr/bin:/bin', LC_ALL: 'C' })
      return ''
    },
  })
  assert.equal(calls, 1)
  assert.deepEqual(hostile, before, 'parent environment must not be modified')
})
