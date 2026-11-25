// Pure guards shared by the native integration test and its connection-free unit tests.
// Adapted from billing-database.integration.mjs: pin transport, synthetic credentials,
// database identity, fresh PostgreSQL 17 service and explicit CI-only invocation.
export const INTERPRETATION_SEED_PATH = 'supabase/seeds/assessment-interpretations-2026-10-17.v1.sql'
export const INTERPRETATION_V2_SEED_PATH = 'supabase/seeds/assessment-interpretations-2026-10-17.v2.sql'
export const INTERPRETATION_V3_SEED_PATH = 'supabase/seeds/assessment-interpretations-2026-10-17.v3.sql'
const RELEASE_VERSIONS = ['2026-10-17.v1', '2026-10-17.v2', '2026-10-17.v3']
export function interpretationDatabaseOptions(env = process.env, execArgv = process.execArgv) {
  let url
  try { url = new URL(env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid') } catch { throw new Error('Isolated interpretation database required') }
  if (env.CI !== 'true' || env.HH_APP_TEST_RUNTIME !== 'isolated' ||
      env.HH_INTERPRETATION_DB_TEST !== 'synthetic-only' || env.VERCEL || env.NODE_ENV === 'production' ||
      !execArgv.includes('--conditions=react-server') || !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/hh_app_test' || url.search || url.hash ||
      decodeURIComponent(url.username) !== 'postgres' || decodeURIComponent(url.password) !== 'synthetic-ci-admin')
    throw new Error('Refusing interpretation SQL: explicit isolated CI flags and a fresh synthetic loopback database are required')
  const port = Number(url.port || 5432)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid isolated database port')
  return { host: '127.0.0.1', port, database: 'hh_app_test', user: 'postgres', password: 'synthetic-ci-admin',
    ssl: false, application_name: 'hh-interpretation-isolated-ci', connectionTimeoutMillis: 1500,
    statement_timeout: 60000, query_timeout: 65000, idle_in_transaction_session_timeout: 15000 }
}
export function validateInterpretationRelease(release, approvedDigests, { seedExists = false } = {}) {
  const plain = value => value && typeof value === 'object' && !Array.isArray(value)
  const hash = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
  if (!plain(release) || !plain(approvedDigests) || !RELEASE_VERSIONS.includes(release.interpretationVersion))
    throw new Error('Malformed interpretation release descriptor or approved digest manifest')
  const allEntries = Object.entries(approvedDigests)
  // Validate every global entry before selecting a version. Malformed, unknown
  // or noncanonical identities must never be silently ignored by filtering.
  for (const [key, digest] of allEntries) {
    let identity
    try { identity = JSON.parse(key) } catch { throw new Error('Malformed approved interpretation identity') }
    if (!Array.isArray(identity) || identity.length !== 4 || JSON.stringify(identity) !== key ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(identity[0] || '') ||
        !hash(identity[1]) || !RELEASE_VERSIONS.includes(identity[2]) || !['en', 'ru'].includes(identity[3]) || !hash(digest))
      throw new Error('Malformed approved interpretation identity or digest')
  }
  const entries = allEntries.filter(([key]) => JSON.parse(key)[2] === release.interpretationVersion)
  if (release.status === 'pending') {
    if (release.sourceCommit !== null || release.seedPath !== null || release.recordCount !== 0 ||
        release.seedSha256 != null || allEntries.length !== 0 || seedExists)
      throw new Error('Preparatory C1 must have an empty allowlist and no approved seed')
    return { pending: true, reason: 'PREPARATORY C1 ONLY: no approved interpretation seed; native database integration has NOT run.' }
  }
  if (release.status !== 'approved' || !/^[a-f0-9]{40}$/.test(release.sourceCommit || '') ||
      release.seedPath !== (release.interpretationVersion === '2026-10-17.v1' ? INTERPRETATION_SEED_PATH : release.interpretationVersion === '2026-10-17.v2' ? INTERPRETATION_V2_SEED_PATH : INTERPRETATION_V3_SEED_PATH) || release.recordCount !== 460 || !hash(release.seedSha256) ||
      entries.length !== 460 || !seedExists)
    throw new Error('C2 requires the approved source commit, exact 460-record manifest and pinned seed')
  const definitions = new Map()
  for (const [key, digest] of entries) {
    let identity
    try { identity = JSON.parse(key) } catch { throw new Error('Malformed approved interpretation identity') }
    if (!Array.isArray(identity) || identity.length !== 4 || JSON.stringify(identity) !== key ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(identity[0] || '') ||
        !hash(identity[1]) || identity[2] !== release.interpretationVersion || !['en', 'ru'].includes(identity[3]) || !hash(digest))
      throw new Error('Malformed approved interpretation identity or digest')
    const keyWithoutLocale = JSON.stringify(identity.slice(0, 3))
    const locales = definitions.get(keyWithoutLocale) || new Set()
    locales.add(identity[3]); definitions.set(keyWithoutLocale, locales)
  }
  if (definitions.size !== 230 || [...definitions.values()].some(locales => locales.size !== 2))
    throw new Error('C2 approved manifest must cover exactly 230 definitions in both report locales')
  return { pending: false, approvedDigests: Object.fromEntries(entries) }
}
export async function assertFreshInterpretationDatabase(db) {
  const identity = (await db.query(`select current_database() as name,current_user as role,
    current_setting('server_version_num')::integer as version`)).rows[0]
  if (identity.name !== 'hh_app_test' || identity.role !== 'postgres' ||
      identity.version < 170000 || identity.version >= 180000)
    throw new Error('Refusing interpretation SQL: dedicated loopback PostgreSQL 17 identity required')
  const occupied = (await db.query(`select
    exists(select 1 from pg_namespace where nspname not in ('pg_catalog','information_schema','public','pg_toast')
      and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%') as schemas,
    exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public') as relations,
    exists(select 1 from pg_roles where rolname<>'postgres' and rolname not like 'pg_%') as roles,
    exists(select 1 from pg_database where not datistemplate and datname not in ('postgres','hh_app_test')) as databases`)).rows[0]
  if (Object.values(occupied).some(Boolean)) throw new Error('Refusing to modify a nonempty or shared PostgreSQL service')
}
