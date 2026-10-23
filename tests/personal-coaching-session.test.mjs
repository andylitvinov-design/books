import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PERSONAL_COACH_QUESTIONS, PERSONAL_COACH_IDS, PERSONAL_COACH_VERSION,
  personalCoachNextIndex, personalCoachQuestion,
} from '../lib/personal-coaching/questions.js'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('7 separately authored GROW-based questions are localized, versioned and unique',()=>{
  assert.equal(PERSONAL_COACH_VERSION,1)
  assert.equal(PERSONAL_COACH_QUESTIONS.length,7)
  assert.equal(new Set(PERSONAL_COACH_IDS).size,7)
  assert.deepEqual(PERSONAL_COACH_IDS,['topic','outcome','reality','obstacle','options','first_step','when'])
  assert.deepEqual(PERSONAL_COACH_QUESTIONS.map(q=>q.stage),['goal','goal','reality','reality','options','will','will'])
  for(const item of PERSONAL_COACH_QUESTIONS){
    for(const lang of ['en','ru','es']){
      assert.ok(item.question[lang].length>15)
      assert.ok(item.hint[lang].length>15)
      assert.equal(item.examples[lang].length,3)
    }
    assert.equal(personalCoachQuestion(item.id),item)
  }
  assert.equal(personalCoachQuestion('external'),null)
  assert.equal(personalCoachNextIndex({}),0)
  assert.equal(personalCoachNextIndex({topic:'Focus',outcome:null}),2)
  assert.equal(personalCoachNextIndex(Object.fromEntries(PERSONAL_COACH_IDS.map(id=>[id,null]))),6)
})

test('independent account-encrypted backend with owner-scope RLS; legacy data remains untouched',()=>{
  const repo=source('lib/app/personal-coaching.js')
  const old=source('lib/app/business-coaching.js')
  const sql=source('supabase/migrations/20261023183700_hh_personal_coaching_sessions.sql')
  assert.match(repo,/import 'server-only'/)
  assert.match(repo,/transaction\(config,actor/)
  assert.match(repo,/seal\(course,sealContext\(actor\),config\)/)
  assert.match(repo,/openSealed\(row\.payload_ciphertext,sealContext\(actor\),config\)/)
  assert.match(repo,/field:'personal\.coaching'/)
  assert.match(repo,/app_private\.personal_coaching_sessions/)
  assert.match(repo,/PERSONAL_COACH_REVISION_CONFLICT/)
  assert.match(repo,/MAX_HISTORY=8/)
  assert.match(repo,/input\.answer\.length>1000/)
  assert.match(repo,/answer\.length>800/)
  assert.match(repo,/PERSONAL_COACH_ANSWER_REQUIRED/)
  assert.match(repo,/onlyKeys\(input/)
  assert.match(repo,/current\.status='completed'/)
  assert.match(sql,/create table if not exists app_private\.personal_coaching_sessions/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/revoke all on table app_private\.personal_coaching_sessions from public,anon,authenticated/)
  assert.match(sql,/for update to hh_app_backend[\s\S]*with check\(account_id=/)
  assert.match(sql,/\(select app_private\.account_active\(\)\)/)
  assert.match(old,/hh-business-90-v1/)
  assert.match(old,/BUSINESS_COURSE_PAUSED/)
  assert.match(source('lib/business-coaching/program.js'),/BUSINESS_COURSE_INTAKE_PAUSED = true/)
  assert.match(old,/app_private\.business_coaching_programs/)
  assert.doesNotMatch(repo,/app_private\.business_coaching_programs/)
})

test('private API verifies session and matching account for GET/POST; OAuth continues coaching',()=>{
  const api=source('app/api/app/[...path]/route.js')
  const screen=source('components/app/app-workspace.jsx')
  const route=source('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(api,/await auth\.verified\(\)/)
  assert.match(api,/joined === 'personal-coaching'/)
  assert.match(api,/x-hh-account-id/)
  assert.match(api,/readPersonalCoaching\(config, actor\)/)
  assert.match(api,/savePersonalCoaching\(config, actor, await readBody\(request, 8192\)\)/)
  assert.match(api,/exported\.personalCoaching/)
  assert.match(api,/continueTo === 'coaching'/)
  assert.match(screen,/page === 'coaching'/)
  assert.match(screen,/PersonalCoaching/)
  assert.match(route,/['"]coaching['"]/)
})

test('one question per screen, account persisted before Continue, explicit completion and exit guard',()=>{
  const ui=source('components/app/personal-coaching.jsx')
  const css=source('components/app/personal-coaching.module.css')
  const used=[...new Set([...ui.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(m=>m[1]))]
  const available=new Set([...css.matchAll(/(?<![\w-])\.([A-Za-z_][A-Za-z_0-9-]*)/g)].map(m=>m[1]))
  assert.deepEqual(used.filter(name=>!available.has(name)),[])
  assert.match(ui,/data-coaching-one-question/)
  assert.match(ui,/data-coaching-question=\{question\.id\}/)
  assert.match(ui,/<textarea/)
  assert.match(ui,/onClick=\{\(\)=>next\(false\)\}/)
  assert.match(ui,/command\('answer',\{questionId:question\.id,answer\}\)/)
  assert.match(ui,/commandAfterSave\(saved,'complete'\)/)
  assert.match(ui,/beforeunload/)
  assert.match(ui,/PERSONAL_COACH_QUESTIONS\.map\(item=>/)
  assert.match(css,/@media\(max-width:370px\)/)
  assert.match(css,/safe-area-inset-bottom/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage|dangerouslySetInnerHTML|autoComplete="off"/)
})

test('promotions link to short personal session without advertising 90 days',()=>{
  const courses=source('components/app/my-courses-dashboard.jsx')
  const development=source('components/app/development-program.jsx')
  const offers=source('components/direction-offers.tsx')
  const academy=source('components/academy-hub.tsx')
  for(const file of [courses,development,offers,academy])assert.match(file,/app\/coaching/)
  assert.match(courses,/data-personal-coaching-course-link/)
  assert.match(development,/data-development-personal-coaching-course/)
  assert.match(academy,/academy-free-personal-coaching/)
  assert.doesNotMatch(courses,/Business & Career · 90 Days|Бизнес и карьера · 90 дней/)
  assert.doesNotMatch(offers,/90-day Business Development|Развитие бизнеса · 90 дней/)
})
