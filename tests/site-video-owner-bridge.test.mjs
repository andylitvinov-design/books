import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('the video auth protocol double refuses non-isolated execution', () => {
  const helper = fileURLToPath(new URL('./helpers/app-auth-double.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [helper], {
    env: { ...process.env, CI:'false', VERCEL:'1', HH_APP_TEST_RUNTIME:'isolated',
      HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic@127.0.0.1:5432/hh_app_test',
      HH_TEST_OWNER_FIXTURE:'true' }, encoding:'utf8', timeout:10000,
  })
  assert.ifError(result.error)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Isolated loopback test database required/)
  assert.doesNotMatch(result.stdout, /protocol double ready/)
})

test('video browser checks the real owner bridge and rejects a different authenticated actor', () => {
  const script = read('scripts/verify-site-video-browser.mjs')
  const workflow = read('.github/workflows/site-video-browser.yml')
  assert.doesNotMatch(script, /prescriptions-admin-v1|addCookies\(\[\{ name: 'prescriptions_admin'/)
  assert.match(script, /\/api\/app\/auth\/start/)
  assert.match(script, /\/api\/app\/practitioner\/open/)
  assert.match(script, /assert\.equal\(bridge\.status\(\),404/)
  assert.match(script, /assert\.equal\(bridge\.status\(\),200/)
  assert.match(script, /\^prescription:session:/)
  assert.match(workflow, /HH_APP_TEST_RUNTIME: isolated/)
  assert.match(workflow, /postgres:17-alpine/)
  assert.match(workflow, /tests\/helpers\/app-db-setup\.mjs/)
})
