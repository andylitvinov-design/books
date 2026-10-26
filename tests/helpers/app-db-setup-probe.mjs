// Execute the actual setup/policy sources with no real pg, filesystem reads inside
// the VM, seed execution, sockets, process environment, or SQL interpreter.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'

const setupUrl = new URL('./app-db-setup.mjs', import.meta.url)
const policyUrl = new URL('./app-db-fixture-policy.mjs', import.meta.url)
const repositoryUrl = new URL('../../', import.meta.url)
const scriptPath = fileURLToPath(import.meta.url)
export const GOALS_MIGRATION = 'supabase/migrations/20261017165000_hh_reports_development_goals.sql'
export const FRESH_FIELDS = Object.freeze([
  'schemas', 'relations', 'routines', 'types', 'roles', 'databases', 'extensions', 'eventTriggers',
])

export function syntheticSetupEnvironment() {
  return {
    CI: 'true', NODE_ENV: 'test', HH_APP_TEST_RUNTIME: 'isolated',
    HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
    HH_APP_DATABASE_URL: 'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test',
  }
}

export function probeAppDbSetup(options = {}) {
  // Do not inherit credentials, database variables or nested node:test context.
  const child = spawnSync(process.execPath, ['--experimental-vm-modules', scriptPath], {
    input: JSON.stringify(options), encoding: 'utf8', env: {}, timeout: 10000,
    maxBuffer: 1024 * 1024,
  })
  if (child.error) throw child.error
  assert.equal(child.status, 0, 'Synthetic setup probe failed: ' + child.stderr)
  return JSON.parse(child.stdout)
}

function replaceExactlyOnce(source, needle, replacement) {
  assert.equal(source.split(needle).length, 2, 'Probe mutation no longer matches exactly once')
  return source.replace(needle, replacement)
}

async function runProbe(options) {
  let setupSource = readFileSync(setupUrl, 'utf8')
  let policySource = readFileSync(policyUrl, 'utf8')
  // Negative controls mutate only in-memory test sources. No file is rewritten.
  const freshness = ' assertFreshIsolatedFixture(identity,occupied)'
  const goalsQuery = "await db.query(await readFile(new URL('../../" + GOALS_MIGRATION + "',import.meta.url),'utf8'))"
  switch (options.mutation) {
    case undefined: break
    case 'skip-environment-validation':
      policySource = replaceExactlyOnce(policySource,
        'const url = new URL(assertIsolatedDatabaseEnvironment(env))',
        'const url = new URL(env.HH_TEST_ADMIN_DATABASE_URL)')
      break
    case 'skip-freshness-validation':
      setupSource = replaceExactlyOnce(setupSource, freshness, '')
      break
    case 'write-before-freshness':
      setupSource = replaceExactlyOnce(setupSource, freshness,
        " await db.query('create schema storage')\n" + freshness)
      break
    case 'read-goals-without-applying':
      setupSource = replaceExactlyOnce(setupSource, goalsQuery,
        "await readFile(new URL('../../" + GOALS_MIGRATION + "',import.meta.url),'utf8')")
      break
    default: throw new Error('Unknown synthetic mutation')
  }

  const calls = []
  const environment = options.environment ?? syntheticSetupEnvironment()
  const identity = { name: 'hh_app_test', role: 'postgres', version: 170006, ...options.identity }
  const occupied = Object.fromEntries(FRESH_FIELDS.map(key => [key, false]))
  Object.assign(occupied, options.occupied)
  const migrationPrefix = '-- synthetic setup probe migration: '
  class Client {
    constructor() { calls.push({ kind: 'construct' }) }
    async connect() { calls.push({ kind: 'connect' }) }
    async end() { calls.push({ kind: 'end' }) }
    async query(sql) {
      assert.equal(typeof sql, 'string', 'Only SQL text may reach the synthetic recorder')
      if (sql.startsWith('select current_database()')) {
        assert.match(sql, /current_user as role/)
        assert.match(sql, /server_version_num/)
        calls.push({ kind: 'identity' })
        return { rows: [identity] }
      }
      if (sql.includes('exists(select 1 from pg_namespace')) {
        for (const relation of ['pg_namespace', 'pg_class', 'pg_proc', 'pg_type',
          'pg_roles', 'pg_database', 'pg_extension', 'pg_event_trigger'])
          assert.ok(sql.includes(relation), 'Freshness probe must inspect ' + relation)
        calls.push({ kind: 'freshness' })
        return { rows: [occupied] }
      }
      if (sql.startsWith(migrationPrefix)) {
        calls.push({ kind: 'migration', path: sql.slice(migrationPrefix.length) })
        return { rows: [] }
      }
      assert.match(sql.trim(), /^(create role anon|alter table app\.service_offerings|create schema storage|create role hh_app_ci_login|insert into auth\.(users|sessions))/i,
        'Unrecognized SQL is forbidden by the synthetic recorder')
      calls.push({ kind: 'mutation' })
      return { rows: [] }
    }
  }

  const readFile = async (url, encoding) => {
    assert.equal(encoding, 'utf8')
    assert.equal(url.protocol, 'file:')
    assert.ok(url.href.startsWith(repositoryUrl.href))
    const path = decodeURIComponent(url.href.slice(repositoryUrl.href.length))
    assert.match(path, /^(supabase\/migrations|sql)\/[a-z0-9_-]+\.sql$/)
    calls.push({ kind: 'read', path })
    // Never read or execute a migration. Only return a sentinel to the recorder.
    return migrationPrefix + path
  }
  const seedExports = new Map([
    ['./seed-four-ipip-versions.mjs', 'seedFourIpipTestVersions'],
    ['./seed-bach-v2-versions.mjs', 'seedBachV2TestVersions'],
    ['./seed-hh-split-versions.mjs', 'seedHhSplitTestVersions'],
    ['./seed-trauma-versions.mjs', 'seedTraumaTestVersions'],
    ['../../scripts/app-seed.mjs', 'seedApp'],
    ['./ipip-eight-db-seed.mjs', 'seedEightIpipTestVersions'],
  ])
  const context = vm.createContext({
    URL, process: { argv: [], env: Object.freeze({ ...environment }) },
  }, { codeGeneration: { strings: false, wasm: false } })
  const sourceModule = (source, url) => new vm.SourceTextModule(source, {
    context, identifier: url.href,
    initializeImportMeta: meta => { meta.url = url.href },
    importModuleDynamically: () => { throw new Error('Dynamic imports are forbidden') },
  })
  const synthetic = (exports, identifier) => new vm.SyntheticModule(
    Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
    }, { context, identifier })
  const setup = sourceModule(setupSource, setupUrl)
  const policy = sourceModule(policySource, policyUrl)
  await setup.link(specifier => {
    if (specifier === './app-db-fixture-policy.mjs') return policy
    if (specifier === 'pg') return synthetic({ default: { Client } }, 'synthetic:pg')
    if (specifier === 'node:fs/promises') return synthetic({ readFile }, 'synthetic:files')
    if (seedExports.has(specifier)) {
      const name = seedExports.get(specifier)
      return synthetic({ [name]: async () => { calls.push({ kind: 'seed', name }) } }, 'synthetic:' + name)
    }
    throw new Error('Unapproved setup dependency: ' + specifier)
  })
  await setup.evaluate({ timeout: 1000 })
  let error = null
  try { await setup.namespace.setup() }
  catch (failure) { error = { name: failure.name, message: failure.message } }
  return { calls, error }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const result = await runProbe(JSON.parse(readFileSync(0, 'utf8')))
    process.stdout.write(JSON.stringify(result))
  } catch (error) {
    process.stderr.write(String(error.stack || error))
    process.exitCode = 1
  }
}
