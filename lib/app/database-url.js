import { AppError } from '../assessments/contracts.js'

export function resolveDatabaseUrl(config) {
  const url = new URL(config.databaseUrl)
  if (!config.databaseDirect || config.test) return url.toString()
  const supabase = new URL(config.supabaseUrl)
  const match = supabase.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/i)
  if (!match) throw new AppError('DATABASE_DIRECT_PROJECT_INVALID', 503)
  const ref = match[1].toLowerCase()
  if (!/\.pooler\.supabase\.com$/i.test(url.hostname))
    throw new AppError('DATABASE_CONFIG_UNSAFE', 503)
  const username = decodeURIComponent(url.username)
  const suffix = '.' + ref
  if (!username.endsWith(suffix)) throw new AppError('DATABASE_DIRECT_USER_INVALID', 503)
  const directUser = username.slice(0, -suffix.length)
  if (!directUser || /^(postgres|supabase_admin|service_role)$/i.test(directUser))
    throw new AppError('DATABASE_DIRECT_ROLE_INVALID', 503)
  url.username = directUser
  url.hostname = 'db.' + ref + '.supabase.co'
  url.port = '5432'
  return url.toString()
}
