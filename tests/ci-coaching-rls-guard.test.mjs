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
