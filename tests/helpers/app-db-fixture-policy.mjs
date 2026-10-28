// Test-only policy. This module never connects to a database or executes SQL.
const FAIL = 'Fresh dedicated synthetic loopback hh_app_test database required'

function databaseUrl(value, user, password) {
  let url
  try { url = new URL(value) } catch { throw new Error(FAIL) }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/hh_app_test' || url.search || url.hash ||
      url.username !== user || url.password !== password)
    throw new Error(FAIL)
  const port = Number(url.port || 5432)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(FAIL)
  return url
}

export function assertIsolatedDatabaseEnvironment(env) {
  if (env.CI !== 'true' || env.HH_APP_TEST_RUNTIME !== 'isolated' ||
      env.NODE_ENV === 'production' || env.VERCEL || env.VERCEL_ENV ||
      env.PGOPTIONS || env.PGREPLICATION || env.PGCLIENT_ENCODING)
    throw new Error(FAIL)
  const admin = databaseUrl(env.HH_TEST_ADMIN_DATABASE_URL, 'postgres', 'synthetic-ci-admin')
  const app = databaseUrl(env.HH_APP_DATABASE_URL, 'hh_app_ci_login', 'synthetic-ci-only')
  // The application uses its URL unchanged; localhost may resolve to another listener.
  if (app.hostname !== '127.0.0.1') throw new Error(FAIL)
  if (Number(admin.port || 5432) !== Number(app.port || 5432)) throw new Error(FAIL)
  return admin.toString()
}

export function isolatedAdminConnection(env) {
  const url = new URL(assertIsolatedDatabaseEnvironment(env))
  // Pin transport and credentials; never inherit PGHOST, SSL or URL query overrides.
  return {
    host: '127.0.0.1', port: Number(url.port || 5432), database: 'hh_app_test',
    user: 'postgres', password: 'synthetic-ci-admin', ssl: false,
    application_name: 'hh-app-isolated-ci', connectionTimeoutMillis: 1500,
    statement_timeout: 60000, query_timeout: 65000,
    idle_in_transaction_session_timeout: 10000,
  }
}

export function assertFreshIsolatedFixture(identity, occupied) {
  if (identity?.name !== 'hh_app_test' || identity?.role !== 'postgres' ||
      !Number.isInteger(identity.version) || identity.version < 170000 || identity.version >= 180000 ||
      ['schemas', 'relations', 'routines', 'types', 'roles', 'databases', 'extensions', 'eventTriggers']
        .some(key => occupied?.[key] !== false))
    throw new Error(FAIL)
}

// Explicit dependency closure only, not a glob of unrelated production migrations.
// Existing source migrations keep their constraints, policies and private defaults.
export const ISOLATED_SCHEMA_DEPENDENCIES = Object.freeze([
  'supabase/migrations/20261019121144_hh_practitioner_request_messages_20261019.sql',
  'supabase/migrations/20261019152000_hh_public_service_enquiries_secure.sql',
  'supabase/migrations/20261019174312_hh_practitioner_request_read_state_20261019.sql',
  'supabase/migrations/20261019180000_hh_client_message_push_optin.sql',
  'supabase/migrations/20261020123209_hh_practitioner_request_followup_tasks_20261020.sql',
  'sql/client-delivery-sessions-20261015.sql',
  'sql/client-delivery-session-private-pdfs-20261015.sql',
  'supabase/migrations/20261020192118_hh_report_engagement_opt_in_20261020.sql',
])

export function monitoringRegistryDiagnostic(definition) {
  // No answers, context, actor identifiers, database URLs or registry row contents.
  return 'Monitoring registry unavailable: ' + JSON.stringify({
    key: definition.key, version: definition.version, locale: definition.instrumentLocale,
  })
}
