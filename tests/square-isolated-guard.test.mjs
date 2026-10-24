import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { isSquareIsolatedTestEnvironment as allowed } from './helpers/square-isolated-guard.mjs'
const base = {
  CI: 'true', NODE_ENV: 'test', HH_APP_TEST_RUNTIME: 'isolated',
  HH_BILLING_TEST_APPLY_PROPOSALS: 'synthetic-only',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
}
for (const url of [base.HH_TEST_ADMIN_DATABASE_URL, 'postgresql://localhost/hh_app_test', 'postgres://[::1]:5432/hh_app_test']) {
  test(`accept dedicated loopback test URL ${new URL(url).hostname}`, () => assert.equal(allowed({...base, HH_TEST_ADMIN_DATABASE_URL:url}), true))
}
const badUrls = [
  'postgres://localhost/production', 'postgres://localhost/hh_app_test_extra',
  'postgres://localhost/hh_app_test/', 'postgres://localhost/%68h_app_test',
  'postgres://database.example/hh_app_test', 'postgres://127.0.0.2/hh_app_test',
  'postgres://localhost.example/hh_app_test', 'postgres://localhost@database.example/hh_app_test',
  'postgres://localhost/hh_app_test?host=database.example',
  'postgres://localhost/hh_app_test?dbname=production',
  'postgres://localhost/hh_app_test?', 'postgres://localhost/hh_app_test#',
  'postgres://localhost/hh_app_test#production', 'https://localhost/hh_app_test',
  'postgres:///hh_app_test', 'postgres://localhost', '', 'not a URL',
  ' postgres://localhost/hh_app_test', 'postgres://local\nhost/hh_app_test',
  'postgres://[broken/hh_app_test', undefined, null,
]
badUrls.forEach((url,index) => test(`reject unsafe or malformed connection URL case ${index+1}`, () => {
  assert.equal(allowed({...base, HH_TEST_ADMIN_DATABASE_URL:url}), false)
}))
for (const key of ['CI','NODE_ENV','HH_APP_TEST_RUNTIME','HH_BILLING_TEST_APPLY_PROPOSALS']) {
  test(`reject missing ${key}`, () => { const env={...base}; delete env[key]; assert.equal(allowed(env),false) })
  test(`reject wrong ${key}`, () => assert.equal(allowed({...base,[key]:'production'}),false))
}
test('reject Vercel runtime', () => assert.equal(allowed({...base,VERCEL:'1'}),false))
test('invalid secret-bearing URL returns false without throwing or disclosing it', () => {
  assert.equal(allowed({...base, HH_TEST_ADMIN_DATABASE_URL:'postgres://synthetic:do-not-print@[broken/hh_app_test'}),false)
})
test('integration guard dominates Client construction and connection', () => {
  const s=readFileSync(new URL('./square-ledger-isolated.integration.mjs',import.meta.url),'utf8')
  assert.match(s,/const good = isSquareIsolatedTestEnvironment\(process.env\)/)
  assert.ok(s.indexOf('if (!good)') < s.indexOf('new pg.Client'))
  assert.ok(s.indexOf('} else {') < s.indexOf('new pg.Client'))
  assert.ok(s.indexOf('new pg.Client') < s.indexOf('await client.connect()'))
})
