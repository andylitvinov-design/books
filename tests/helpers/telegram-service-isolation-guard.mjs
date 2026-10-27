// Pure fail-closed guard, evaluated BEFORE importing pg or connecting.
export function assertTelegramIsolationEnvironment(env=process.env) {
 if(env.CI!=='true'||env.NODE_ENV!=='test'||env.HH_APP_TEST_RUNTIME!=='isolated'||
    env.HH_TELEGRAM_POLICY_FIXTURE!=='synthetic-only')throw new Error('SYNTHETIC_PG17_FIXTURE_REQUIRED')
 for(const key of Object.keys(env))if(/^(?:VERCEL|SUPABASE|HH_APP_SUPABASE|HH_CRM_MSG_|HH_CRM_TG_|PG|DATABASE_URL$)/.test(key))
  throw new Error('UNAPPROVED_DATABASE_OR_PROVIDER_ENVIRONMENT')
 const exact={HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
  HH_APP_DATABASE_URL:'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test'}
 for(const [key,value] of Object.entries(exact))if(env[key]!==value)throw new Error('EXACT_LOOPBACK_SYNTHETIC_DATABASE_REQUIRED')
 return {adminUrl:exact.HH_TEST_ADMIN_DATABASE_URL,appUrl:exact.HH_APP_DATABASE_URL}
}
// The client endpoint is EXACTLY 127.0.0.1 above. Docker service NAT can
// report an RFC1918 bridge address from inet_server_addr(), not that host endpoint.
export function assertTelegramIsolationServer(row) {
 if(row.database!=='hh_app_test'||!/^(?:127\.0\.0\.1|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(row.address)||row.port!==5432||
    !/^17\d{4}$/.test(String(row.version))||row.login!=='postgres'||!row.superuser||row.occupied)
  throw new Error('EMPTY_EPHEMERAL_PG17_REQUIRED')
}
