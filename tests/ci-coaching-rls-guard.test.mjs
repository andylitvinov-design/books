import test from 'node:test'
import assert from 'node:assert/strict'
import {coachingRlsCiUrls} from '../scripts/ci-coaching-rls-guard.mjs'
import {readFileSync} from 'node:fs'
import {decideHeavyImpact} from '../scripts/ci-heavy-impact.mjs'
import {parsePrTrigger,matchesTrigger} from '../lib/ci/specialist-aggregate.mjs'

const valid={CI:'true',GITHUB_ACTIONS:'true',NODE_ENV:'test',HH_APP_TEST_RUNTIME:'isolated',
  HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test'}
test('CI RLS runner accepts only the fixed disposable GitHub Actions service',()=>{
  const urls=coachingRlsCiUrls(valid)
  assert.equal(urls.test,'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_coaching_rls_test')
  for(const changes of [
    {CI:'false'},{GITHUB_ACTIONS:''},{NODE_ENV:'production'},{HH_APP_TEST_RUNTIME:'production'},
    {VERCEL:'1'},{HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@remote.example:5432/hh_app_test'},
    {HH_TEST_ADMIN_DATABASE_URL:valid.HH_TEST_ADMIN_DATABASE_URL+'?host=remote.example'},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/postgres'},
  ]) assert.throws(()=>coachingRlsCiUrls({...valid,...changes}),/ISOLATED_POSTGRES_REQUIRED/)
})

test('coaching RLS test and runner changes retain the existing database gate',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/hh-app-r1.yml',import.meta.url),'utf8')
  const trigger=parsePrTrigger(workflow,'hh-app-r1.yml')
  for(const filename of ['tests/personal-coaching-rls-isolated.integration.mjs','tests/ci-coaching-rls-guard.test.mjs','scripts/ci-coaching-rls.mjs','scripts/ci-coaching-rls-guard.mjs']){
    assert.equal(matchesTrigger(trigger,[filename],'codex/public-book-library'),true,filename)
    assert.equal(decideHeavyImpact('app-r1',[{filename,status:'modified'}]).database,true,filename)
  }
})

test('isolated runner enables the real server module and fails if acceptance is skipped',()=>{
 const runner=readFileSync(new URL('../scripts/ci-coaching-rls.mjs',import.meta.url),'utf8')
 const integration=readFileSync(new URL('./personal-coaching-rls-isolated.integration.mjs',import.meta.url),'utf8')
 assert.match(runner,/--conditions=react-server/)
 assert.match(runner,/skipped 0/)
 assert.match(integration,/import\('\.\.\/lib\/app\/personal-coaching\.js'\)/)
 assert.match(integration,/Promise\.allSettled/)
})

// Focused draft-only proposal rehearsal is additive; Ready retains the full
// App R1 acceptance job and protected merge rules.
test('draft Clarity proposal rehearsal is exact-diff scoped, disposable and never replaces Ready DB CI',()=>{
 const source=readFileSync(new URL('../.github/workflows/hh-personal-coaching-session.yml',import.meta.url),'utf8')
 const app=readFileSync(new URL('../.github/workflows/hh-app-r1.yml',import.meta.url),'utf8')
 const section=source.split('Rehearse changed Clarity SQL in disposable PostgreSQL (draft only)')[1]?.split('      - name: Scoped eslint')[0]
 assert.ok(section)
 assert.ok(section.includes("github.event.pull_request.draft == true"))
 assert.ok(section.includes('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"'))
 assert.ok(section.includes('git diff --quiet HEAD^1 HEAD -- docs/coaching/clarity-course-runs.proposal.sql'))
 assert.ok(section.includes('127.0.0.1:5432:5432'))
 assert.ok(section.includes('postgres:17-alpine'))
 assert.ok(section.includes('docker rm -f "$name"'))
 assert.ok(section.includes('node scripts/ci-coaching-rls.mjs'))
 assert.ok(!section.includes('continue-on-error'))
 assert.ok(app.includes('name: Isolated personal coaching owner RLS acceptance'))
 assert.ok(app.includes("github.event.pull_request.draft == false"))
})
