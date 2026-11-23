import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('canonical Daybook goals tab mounts one lazy owner-bound workspace',()=>{
 const source=read('components/app/daybook-journal.jsx')
 assert.match(source,/dynamic\(\(\)=>import\('\.\/daybook-personal-goals'\)\)/)
 assert.match(source,/<DaybookPersonalGoals key=\{account\} accountId=\{account\} locale=\{locale\} onSessionLost=\{sessionLost\}/)
 assert.match(source,/hidden=\{tab!=='goals'\}/)
 assert.match(source,/goalsVisited\|\|tab==='goals'/)
})
test('goal workspace uses canonical plan list, real detail API and verified deletion helper',()=>{
 const source=read('components/app/daybook-personal-goals.jsx')
 assert.match(source,/appFetch\('coaching-life-plan\?locale='/)
 assert.match(source,/appFetch\('personal-goals\?id='/)
 assert.match(source,/createPersonalGoalRemover\(appFetch,accountId\)/)
 assert.match(source,/<DaybookGoalEditor/)
 assert.doesNotMatch(source,/localStorage|sessionStorage/)
})
