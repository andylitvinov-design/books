import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_KEY, ENERGYWORK_VERSION, ENERGYWORK_COMMON, ENERGYWORK_BRANCH,
  ENERGYWORK_FINISH, ENERGYWORK_QUESTIONS, ENERGYWORK_CHOICE_INDEX,
  energyworkSequence, energyworkAnswerValid,
} from '../data/academy/energywork-ai-schema.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const source = read('data/academy/energywork-ai-curriculum.ts')
const migration = read('supabase/migrations/20261017181000_hh_academy_energywork_progress.sql')
const repository = read('lib/academy/energywork-course-repository.js')
const route = read('app/api/app/[...path]/route.js')
const learner = read('components/energywork-ai-learner.tsx')

test('server registry exactly matches the 39 versioned editorial slide identifiers',()=>{
  assert.equal(ENERGYWORK_KEY, 'academy-energywork-principles')
  assert.equal(ENERGYWORK_VERSION, '2026-10-17.p0')
  const editorial=[...source.matchAll(/id: "(welcome-|flight-|presence-|intention-|boundaries-|paths-|ygg-|tan-|kun-|end-)[^"]+"/g)].map(x=>x[0].slice(5,-1))
  const registered=[...ENERGYWORK_COMMON,...Object.values(ENERGYWORK_BRANCH).flat(),...ENERGYWORK_FINISH]
  assert.equal(editorial.length,39)
  assert.equal(new Set(registered).size,39)
  assert.deepEqual([...editorial].sort(),[...registered].sort())
  assert.equal(ENERGYWORK_CHOICE_INDEX,21)
  for(const path of ['yggdrasil','tantra','kundalini']){
    const steps=energyworkSequence(path)
    assert.equal(steps.length,29)
    assert.equal(steps[0],'welcome-01')
    assert.equal(steps.at(-1),'end-02')
    assert.equal(steps[ENERGYWORK_CHOICE_INDEX+1],ENERGYWORK_BRANCH[path][0])
    for(const other of ['yggdrasil','tantra','kundalini'].filter(v=>v!==path))
      assert.equal(steps.some(id=>ENERGYWORK_BRANCH[other].includes(id)),false)
  }
  assert.equal(energyworkSequence(null).length,22)
})

test('private answers follow checked types and cannot become arbitrary JSON',()=>{
  for(const id of Object.keys(ENERGYWORK_QUESTIONS)){
    assert.ok(energyworkAnswerValid(id,'a'.repeat(1600))=== (ENERGYWORK_QUESTIONS[id]==='text'))
  }
  assert.equal(energyworkAnswerValid('flight-04','a'.repeat(1601)),false)
  assert.equal(energyworkAnswerValid('flight-04',null),false)
  assert.equal(energyworkAnswerValid('flight-02','notes'),false)
  for(const val of ['0','5','10'])assert.equal(energyworkAnswerValid('presence-03',val),true)
  for(const val of ['-1','11','05','no','999'])assert.equal(energyworkAnswerValid('presence-03',val),false)
  for(const val of ['pause','adapt','ask'])assert.equal(energyworkAnswerValid('boundaries-02',val),true)
  assert.equal(energyworkAnswerValid('boundaries-02','force'),false)
  for (const id of ['flight-03','presence-02','intention-04','boundaries-03','ygg-03','tan-03','kun-03']) {
    assert.equal(energyworkAnswerValid(id,'tried'),true)
    assert.equal(energyworkAnswerValid(id,'skipped'),true)
    assert.equal(energyworkAnswerValid(id,'pause'),false)
  }
})

test('encrypted owner-only DB includes restricted RLS policies and no public grants',()=>{
  assert.match(migration,/app_private\.academy_course_progress/)
  assert.match(migration,/answers_ciphertext text/)
  assert.match(migration,/references app\.accounts\(id\) on delete cascade/)
  assert.match(migration,/enable row level security/)
  assert.match(migration,/force row level security/)
  assert.match(migration,/revoke all on app_private\.academy_course_progress from\s+public, anon, authenticated, hh_app_inbox/)
  assert.match(migration,/grant select,insert,delete on app_private\.academy_course_progress to hh_app_backend/)
  for(const op of ['select','insert','update','delete'])
    assert.match(migration,new RegExp('policy academy_course_progress_'+op))
  assert.ok(migration.match(/account_id=\(select auth\.uid\(\)\)/g).length>=4)
  assert.ok(migration.match(/app_private\.account_active\(\)/g).length>=4)
  assert.doesNotMatch(migration,/grant\s+select.+to\s+(?:authenticated|anon)\b/i)
})

test('server requires private actor, explicit consent, optimistic revision and authenticated cipher',()=>{
  assert.match(repository,/transaction\(config,actor/)
  assert.match(repository,/body\.consent !== true/)
  assert.match(repository,/row\.revision !== body\.expectedRevision/)
  assert.match(repository,/openSealed\(row\.answers_ciphertext/)
  assert.match(repository,/seal\(answers,encryption\(row\),config\)/)
  assert.match(repository,/COURSE_PATH_CONFIRM_REQUIRED/)
  assert.match(repository,/COURSE_STEP_NOT_READY/)
  assert.match(repository,/body\.answer === ''/)
  assert.match(repository,/delete from app_private\.academy_course_progress where account_id=\$1/)
  assert.doesNotMatch(repository,/localStorage|fetch\(|console\.log/)
  assert.match(route,/await auth\.verified\(\)/)
  assert.match(route,/joined === 'academy-energywork'/)
  assert.match(route,/continueTo === 'energywork'/)
  assert.match(route,/request\.headers\.get\('x-hh-account-id'\)/)
})

test('client only continues after a successful save, supports retry and print-to-PDF',()=>{
  assert.match(learner,/await store\(nextId\)/)
  assert.match(learner,/revisionRef\.current = value\.revision/)
  assert.match(learner,/setSaveError\(t\.saveFailed\)/)
  assert.match(learner,/await appFetch\("academy-energywork"/)
  assert.match(learner,/onClick=\{\(\) => window\.print\(\)\}/)
  assert.match(learner,/window\.confirm\(t\.resetConfirm\)/)
  assert.match(learner,/dirtyRef\.current/)
  assert.match(learner,/function PracticeTimer/)
  assert.match(learner,/window\.setInterval/)
  assert.match(learner,/setRunning\(false\)/)
  assert.doesNotMatch(learner,/(?:localStorage|sessionStorage)\s*[.\[]/)
})
