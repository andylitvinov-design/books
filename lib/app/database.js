import 'server-only'
import pg from 'pg'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { operationHash } from './crypto.js'
import { SUPABASE_ROOT_2021_CA } from './supabase-ca.js'
import { databaseTimestamp } from './timestamps.js'
const { Pool } = pg
let pool, configuredUrl

export function resolveDatabaseUrl(config) {
  const url = new URL(config.databaseUrl)
  if (!config.databaseDirect || config.test) return url.toString()
  const supabase = new URL(config.supabaseUrl)
  const match = supabase.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/i)
  if (!match) throw new AppError('DATABASE_CONFIG_UNSAFE', 503)
  const ref = match[1].toLowerCase()
  if (!/\.pooler\.supabase\.com$/i.test(url.hostname)) throw new AppError('DATABASE_CONFIG_UNSAFE',503)
  const username = decodeURIComponent(url.username)
  const suffix = '.' + ref
  if (!username.endsWith(suffix)) throw new AppError('DATABASE_CONFIG_UNSAFE',503)
  const directUser = username.slice(0, -suffix.length)
  if (!directUser || /^(postgres|supabase_admin|service_role)$/i.test(directUser)) throw new AppError('DATABASE_CONFIG_UNSAFE',503)
  url.username = directUser
  url.hostname = 'db.' + ref + '.supabase.co'
  url.port = '5432'
  return url.toString()
}
function verifiedSsl(url, test) {
  if (test) return false
  const supabaseHost = /(^|\.)supabase\.(co|com)$/i.test(url.hostname)
  return {
    rejectUnauthorized: true,
    ...(supabaseHost ? { ca: SUPABASE_ROOT_2021_CA } : {}),
  }
}
export function databasePool(config) {
  const resolvedUrl = resolveDatabaseUrl(config)
  if (pool && configuredUrl !== resolvedUrl)
    throw new AppError('DATABASE_CONFIG_CHANGED', 503)
  if (!pool) {
    configuredUrl = resolvedUrl
    const url = new URL(resolvedUrl)
    if (!config.test && [...url.searchParams.keys()].some((key) => /^ssl/i.test(key)))
      throw new AppError('DATABASE_CONFIG_UNSAFE', 503)
    pool = new Pool({
      connectionString: resolvedUrl,
      ssl: verifiedSsl(url, config.test),
      max: 4,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 8000,
      statement_timeout: 15000,
      application_name: 'holistic-house-app',
      types: {
        getTypeParser(oid, format) {
          return oid === 1184 && format !== 'binary'
            ? databaseTimestamp
            : pg.types.getTypeParser(oid, format)
        },
      },
    })
    pool.on('error', () => {})
  }
  return pool
}
export async function closeDatabase() {
  if (pool) await pool.end()
  pool = undefined
  configuredUrl = undefined
}
export async function transaction(
  config,
  actor,
  fn,
  { inbox = false, practitionerId = null } = {},
) {
  const client = await databasePool(config).connect()
  try {
    await client.query('BEGIN')
    const permissions = (
      await client.query('select rolsuper, rolbypassrls from pg_roles where rolname=current_user')
    ).rows[0]
    if (!config.test && (permissions?.rolsuper || permissions?.rolbypassrls))
      throw new AppError('DATABASE_ROLE_UNSAFE', 503)
    await client.query(inbox ? 'SET LOCAL ROLE hh_app_inbox' : 'SET LOCAL ROLE hh_app_backend')
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify(actor?.claims || {}),
    ])
    if (inbox) {
      requireUUID(practitionerId)
      await client.query("select set_config('hh.practitioner_id',$1,true)", [practitionerId])
    } else {
      requireUUID(actor?.id)
      if (!(await client.query('select app_private.session_active() as valid')).rows[0]?.valid)
        throw new AppError('SIGN_IN_REQUIRED', 401)
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}
export async function consumeRate(config, bucket, limit = 120, seconds = 60) {
  return transaction(
    config,
    null,
    async (db) => {
      const ok = (
        await db.query('select app_private.consume_rate($1,$2,$3) as ok', [
          operationHash(bucket, config),
          limit,
          seconds,
        ])
      ).rows[0]?.ok
      if (!ok) throw new AppError('RATE_LIMITED', 429)
    },
    { inbox: true, practitionerId: '246aa1a3-a371-5a83-9f4b-cd23ff027a76' },
  )
}
