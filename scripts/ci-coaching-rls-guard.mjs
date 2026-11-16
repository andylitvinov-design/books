// Only the existing GitHub Actions Postgres service with synthetic credentials.
export function coachingRlsCiUrls(env=process.env){
  const expected='postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test'
  if(env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.NODE_ENV!=='test'||
     env.HH_APP_TEST_RUNTIME!=='isolated'||env.VERCEL||env.HH_TEST_ADMIN_DATABASE_URL!==expected)
    throw new Error('ISOLATED_POSTGRES_REQUIRED')
  return {control:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/postgres',
    test:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_coaching_rls_test'}
}
