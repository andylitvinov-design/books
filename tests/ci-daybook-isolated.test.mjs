import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {daybookCiTargets} from '../scripts/ci-daybook-targets.mjs'
import {decideHeavyImpact} from '../scripts/ci-heavy-impact.mjs'
import {parsePrTrigger,matchesTrigger} from '../lib/ci/specialist-aggregate.mjs'
const valid={CI:'true',GITHUB_ACTIONS:'true',NODE_ENV:'test',HH_APP_TEST_RUNTIME:'isolated',HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test'}
test('Daybook acceptance uses four distinct disposable databases behind the existing CI guard',()=>{
 const {control,targets}=daybookCiTargets(valid)
 assert.equal(new URL(control).pathname,'/postgres')
 assert.equal(targets.length,4)
 assert.equal(new Set(targets.map(t=>t.database)).size,4)
 assert.deepEqual(targets.map(t=>t.variable),['HH_DAYBOOK_TEST_DATABASE_URL','HH_GOAL_TEST_DATABASE_URL','HH_DAILY_TEST_DATABASE_URL','HH_ACTION_TEST_DATABASE_URL'])
 for(const t of targets){assert.equal(new URL(t.url).hostname,'127.0.0.1');assert.equal(new URL(t.url).pathname,'/'+t.database);assert.equal(t.minimumPasses,8)}
 for(const changes of [{CI:''},{GITHUB_ACTIONS:''},{NODE_ENV:'production'},{HH_APP_TEST_RUNTIME:''},{VERCEL:'1'},{HH_TEST_ADMIN_DATABASE_URL:valid.HH_TEST_ADMIN_DATABASE_URL+'?host=remote.example'},{HH_TEST_ADMIN_DATABASE_URL:valid.HH_TEST_ADMIN_DATABASE_URL.replace('127.0.0.1','remote.example')}])assert.throws(()=>daybookCiTargets({...valid,...changes}),/ISOLATED_POSTGRES_REQUIRED/)
})
test('Daybook test-only changes retain App R1 unit and database acceptance',()=>{
 const trigger=parsePrTrigger(readFileSync(new URL('../.github/workflows/hh-app-r1.yml',import.meta.url),'utf8'),'hh-app-r1.yml')
 for(const filename of ['tests/daybook-daily-client.test.mjs','tests/daybook-journal-database.integration.mjs','tests/ci-daybook-isolated.test.mjs','scripts/ci-daybook-targets.mjs','scripts/ci-daybook-isolated.mjs']){
 assert.equal(matchesTrigger(trigger,[filename],'codex/public-book-library'),true,filename)
 const impact=decideHeavyImpact('app-r1',[{filename,status:'modified'}]);assert.equal(impact.database,true,filename);assert.equal(impact.full_app,true,filename)
 }
})
