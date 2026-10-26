import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { load } from 'js-yaml'
import { isolatedRedisCommand, isolatedRedisContainer } from './helpers/isolated-redis-container.mjs'
const id = 'a'.repeat(64)
const context = { CI: 'true', GITHUB_ACTIONS: 'true', HH_TEST_REDIS_ISOLATED: 'true', HH_TEST_REDIS_CONTAINER: id }

function unitWorkflow() {
  const source = readFileSync(new URL('../.github/workflows/ia-v2.yml', import.meta.url), 'utf8')
  const workflow = load(source)
  const steps = workflow.jobs.verify.steps
  assert.ok(Array.isArray(steps), 'Actual verify steps')
  const matching = steps.filter(step => step.id === 'ia_unit_tests')
  assert.equal(matching.length, 1, 'One actual unit capture step, not a comment or lookalike')
  const unit = matching[0]
  assert.equal(typeof unit.run, 'string')
  assert.equal(Object.hasOwn(unit, 'continue-on-error'), false, 'Unit failure is not advisory')
  assert.equal(Object.hasOwn(unit, 'if'), false, 'Unit check is not conditionally skipped')
  return { source, workflow, steps, unit }
}


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
  const { source, workflow, unit } = unitWorkflow()
  assert.deepEqual(unit.env, {
    HH_TEST_REDIS_CONTAINER: '${{ job.services.redis.id }}',
    HH_TEST_REDIS_ISOLATED: 'true',
  }, 'Exact isolated service ID environment belongs to the actual unit step')
  assert.equal(workflow.jobs.verify.services.redis.image, 'redis:7-alpine')
  assert.deepEqual(workflow.jobs.verify.services.redis.ports, ['6379:6379'])
  assert.equal(workflow.jobs.verify.services.redis.options,
    '--health-cmd "redis-cli ping" --health-interval 5s --health-timeout 3s --health-retries 5')
  assert.equal((source.match(/HH_TEST_REDIS_CONTAINER:/g) || []).length, 1)
  assert.equal((source.match(/image: redis:7-alpine/g) || []).length, 1)
  assert.doesNotMatch(source, /docker run|redis:\/\//)
})

test('IA generates pinned local artwork before unit tests without changing prebuild', () => {
  const { steps, unit } = unitWorkflow()
  const installs = steps.filter(step => step.run === 'npm ci --no-audit --no-fund')
  const artworks = steps.filter(step => step.run === 'npm run build:static-artwork')
  assert.equal(installs.length, 1, 'One real install step')
  assert.equal(artworks.length, 1, 'One real pinned artwork step')
  const install = steps.indexOf(installs[0]), artwork = steps.indexOf(artworks[0])
  const validators = steps.filter(step => step.run === 'npm run validate:remedy-inventory && npm run validate:remedy-content && npm run validate:remedy-images')
  assert.equal(validators.length, 1, 'One real source-content validator step')
  assert.ok(install >= 0 && artwork > install && steps.indexOf(unit) > artwork && steps.indexOf(validators[0]) > steps.indexOf(unit))
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


test('actual unit capture runs npm exactly once and preserves its fatal status before downstream work', () => {
  const { unit } = unitWorkflow()
  const root = mkdtempSync(join(tmpdir(), 'hh-redis-workflow-unit-'))
  try {
    const bin = join(root, 'bin'); mkdirSync(bin)
    const wrapper = join(root, 'wrapper.sh'); writeFileSync(wrapper, unit.run)
    const npm = join(bin, 'npm')
    writeFileSync(npm, '#!/bin/bash\n[[ "$#" = 2 && "$1" = run && "$2" = test:unit ]] || exit 97\nprintf "called\\n" >> "$RUNNER_TEMP/admissions"\nprintf "synthetic-unit-output\\n"\nexit "$SYNTHETIC_NPM_EXIT"\n', { mode: 0o755 })
    for (const code of [0, 42, 143]) {
      writeFileSync(join(root, 'admissions'), '')
      const env = { PATH: `${bin}:/usr/bin:/bin`, RUNNER_TEMP: root, SYNTHETIC_NPM_EXIT: String(code) }
      const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c',
        '/bin/bash --noprofile --norc -eo pipefail "$1" && printf "synthetic-downstream\\n"', 'probe', wrapper],
        { env, encoding: 'utf8', timeout: 5000, maxBuffer: 120000 })
      assert.ifError(result.error)
      assert.equal(result.signal, null)
      assert.equal(result.status, code, `Actual npm exit ${code} is the gate`)
      assert.equal(readFileSync(join(root, 'admissions'), 'utf8'), 'called\n', 'Exactly one real synthetic npm admission; no early exit/comment substitute')
      assert.equal(result.stdout, 'synthetic-unit-output\n' + (code === 0 ? 'synthetic-downstream\n' : ''))
      assert.equal(result.stderr, '')
      assert.equal(readFileSync(join(root, 'ia222-unit.log'), 'utf8'), 'synthetic-unit-output\n')
      assert.deepEqual(JSON.parse(readFileSync(join(root, 'ia222-unit-status.json'), 'utf8')), { npmExit: code, teeExit: 0 })
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
