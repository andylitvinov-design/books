import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {LIFE_CONTEXT_SECTIONS,LIFE_CONTEXT_FIELDS,emptyLifeContext,normalizeLifeContext,
 lifeContextProgress,firstUnansweredLifeQuestion} from '../lib/profile/client-life-context.mjs'
import {normalizeDevelopmentGoals,DEFAULT_DEVELOPMENT_TARGETS} from '../lib/profile/development-program.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const goals=()=>({version:1,targets:{...DEFAULT_DEVELOPMENT_TARGETS},details:{}})
test('four optional life-context sections carry sixteen distinct RU/EN/ES questions',()=>{
 assert.equal(LIFE_CONTEXT_SECTIONS.length,4)
 assert.equal(LIFE_CONTEXT_FIELDS.length,16)
 assert.equal(new Set(LIFE_CONTEXT_FIELDS.map(x=>x.id)).size,16)
 for(const row of LIFE_CONTEXT_SECTIONS){
  assert.equal(row.questions.length,4)
  for(const locale of ['ru','en','es']){
   assert.ok(row.title[locale].length>3)
   for(const q of row.questions)assert.ok(q.prompt[locale].length>10)
  }
 }
})
test('empty context is valid; blanks are not forged into present answers',()=>{
 const empty=emptyLifeContext()
 assert.deepEqual(normalizeLifeContext(empty),empty)
 assert.deepEqual(lifeContextProgress(empty),{answered:0,total:16})
 assert.equal(firstUnansweredLifeQuestion(empty),0)
 const partial=normalizeLifeContext({version:1,answers:{lifeNow:'  Today is good  ',wishes:'   '}})
 assert.deepEqual(partial.answers,{lifeNow:'Today is good'})
 assert.equal(lifeContextProgress(partial).answered,1)
 assert.equal(firstUnansweredLifeQuestion(partial),1)
})
test('strict allowlist and field lengths reject unknown, illegal and arbitrary profile data',()=>{
 for(const value of [
  {version:1,answers:{unknown:'hidden'}},
  {version:1,answers:{lifeNow:7}},
  {version:1,answers:{lifeNow:'x'.repeat(501)}},
  {version:1,answers:{lifeNow:'bad\u0000text'}},
  {version:1,answers:[]},
  {version:5,answers:{}}
 ])assert.equal(normalizeLifeContext(value),null)
})
test('context is optional in legacy development-goals and remains encrypted with both vectors and lifeContext fields',()=>{
 assert.deepEqual(normalizeDevelopmentGoals(goals()),goals())
 const next=normalizeDevelopmentGoals({...goals(),lifeContext:{version:1,answers:{values:'Fairness'}}})
 assert.equal(next.lifeContext.answers.values,'Fairness')
 assert.equal(normalizeDevelopmentGoals({...goals(),lifeContext:{version:1,answers:{random:'no'}}}),null)
 const server=read('lib/app/development-goals.js')
 assert.match(server,/onlyKeys\(input, \['version', 'targets', 'details', 'goalCheckin', 'vectors', 'lifeContext'/)
 assert.match(server,/preserveLifeContext/)
 assert.match(server,/prior\.lifeContext/)
 assert.match(server,/seal\(nextGoals, context\(actor\), config\)/)
 assert.match(server,/DEVELOPMENT_GOALS_CONFLICT/)
})
test('private My Context editor only saves explicitly through existing owner-scoped API',()=>{
 const ui=read('components/app/client-life-context-editor.jsx')
 const host=read('components/app/my-inner-balance-preview.jsx')
 assert.match(ui,/data-client-life-profile/)
 assert.match(ui,/appFetch\('development-goals'/)
 assert.match(ui,/onClick=\{\(\)=>void save\(\)\}/)
 assert.match(ui,/!accountId\)return null/)
 assert.match(ui,/normalizeLifeContext/)
 assert.match(ui,/onSessionLost/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|navigator\.sendBeacon|context-cloud/)
 assert.match(host,/ClientLifeContextEditor/)
 assert.match(host,/key=\{accountId\}/)
 assert.match(host,/savedDaybookBalance/)
 assert.doesNotMatch(ui,/shareWithCoach|sendToProvider|consent\.profile/)
})
