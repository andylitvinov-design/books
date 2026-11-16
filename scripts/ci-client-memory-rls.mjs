// Executes only inside the existing App R1 CI PostgreSQL service. Never production.
import pg from 'pg'
import { spawnSync } from 'node:child_process'

const raw = process.env.HH_TEST_ADMIN_DATABASE_URL || ''
let input
try { input = new URL(raw) } catch { throw new Error('ISOLATED_POSTGRES_REQUIRED') }
if (process.env.CI !== 'true' || process.env.HH_APP_TEST_RUNTIME !== 'isolated' ||
    process.env.VERCEL || !['localhost','127.0.0.1'].includes(input.hostname) ||
    input.pathname !== '/hh_app_test') throw new Error('ISOLATED_POSTGRES_REQUIRED')
const testDb = new URL(input)
testDb.pathname = '/hh_client_memory_test'
const controlDb = new URL(input)
controlDb.pathname = '/postgres'
const client = new pg.Client({ connectionString: controlDb.toString() })
await client.connect()
try {
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', ['hh_client_memory_test'])
  if (exists.rowCount) throw new Error('CLIENT_MEMORY_DB_ALREADY_EXISTS')
  // CREATE DATABASE is a distinct empty DB on the same ephemeral test server.
  await client.query('CREATE DATABASE hh_client_memory_test')
} finally { await client.end() }
const result = spawnSync(process.execPath, ['--test', 'tests/client-memory-postgres.integration.mjs'], {
  stdio: 'inherit', env: { ...process.env,
    HH_TEST_ADMIN_DATABASE_URL: testDb.toString(),
    HH_CLIENT_MEMORY_TEST_APPLY_PROPOSALS: 'synthetic-only',
  }, timeout: 120000,
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
