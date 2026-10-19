import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_KEY, ENERGYWORK_VERSION, ENERGYWORK_LEGACY_VERSION, ENERGYWORK_PREVIOUS_VERSION,
  ENERGYWORK_COMMON, ENERGYWORK_BRANCH, ENERGYWORK_FINISH,
  ENERGYWORK_INITIATION, ENERGYWORK_QUESTIONS, ENERGYWORK_LESSON_STARTS,
  ENERGYWORK_REPORT_IDS, ENERGYWORK_LESSON_ANSWER_IDS,
  ENERGYWORK_MEDITATION_REPORT_IDS, energyworkMeditationFeedbackComplete,
  energyworkSequence, energyworkAnswerValid, energyworkInitiationReady,
  energyworkLegacyResumeId, energyworkPreviousResumeId,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('data/academy/energywork-ai-curriculum.ts')
const migration = read('supabase/migrations/20261017181000_hh_academy_energywork_progress.sql')
const upgrade = read('supabase/migrations/20261018142000_hh_academy_reiki_unified_five_lessons.sql')
const latest = read('supabase/migrations/20261019044500_hh_academy_reiki_tantra_study_p2.sql')
const repository = read('lib/academy/energywork-course-repository.js')
const route = read('app/api/app/[...path]/route.js')
const learner = read('components/energywork-ai-learner.tsx')

test('Server registry includes exactly 57 editorial IDs in one fixed five-lesson order', () => {
  assert.equal(ENERGYWORK_KEY, 'academy-energywork-principles')
  assert.equal(ENERGYWORK_VERSION, '2026-10-19.p2')
  assert.equal(ENERGYWORK_PREVIOUS_VERSION, '2026-10-18.p1')
  assert.equal(ENERGYWORK_LEGACY_VERSION, '2026-10-17.p0')
  const editorial = [...source.matchAll(/id: "(?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+"/g)]
    .map(match=>match[0].slice(5,-1))
  const registered = [...ENERGYWORK_COMMON,...Object.values(ENERGYWORK_BRANCH).flat(),...ENERGYWORK_INITIATION,...ENERGYWORK_FINISH]
  assert.equal(editorial.length, 57)
  assert.equal(new Set(registered).size,57)
  assert.deepEqual([...editorial].sort(),[...registered].sort())
  const sequence = energyworkSequence()
  assert.equal(sequence.length,57)
  assert.equal(sequence[0],'welcome-01')
  assert.equal(sequence.at(-1),'end-02')
  assert.deepEqual(ENERGYWORK_LESSON_STARTS,['flight-01','tan-01','kun-01','ygg-01','paths-01'])
  for (let i=1;i<ENERGYWORK_LESSON_STARTS.length;i++)
    assert.ok(sequence.indexOf(ENERGYWORK_LESSON_STARTS[i]) > sequence.indexOf(ENERGYWORK_LESSON_STARTS[i-1]))
  assert.ok(sequence.indexOf('presence-01') > sequence.indexOf('tan-02'))
  assert.ok(sequence.indexOf('presence-01') < sequence.indexOf('kun-01'))
  assert.ok(sequence.indexOf('end-01') < sequence.indexOf('paths-04'))
  for(const oldPath of [null,'tantra','yggdrasil','kundalini'])
    assert.deepEqual(energyworkSequence(oldPath),sequence,'Old branches do not change sequence')
})

test('Meditation feedback gates the next screen; five reports and answers gate initiation', () => {
  assert.deepEqual(ENERGYWORK_REPORT_IDS,['flight-04','tan-04','kun-04','ygg-04','end-01'])
  assert.deepEqual(ENERGYWORK_MEDITATION_REPORT_IDS,['flight-04','tan-04','kun-04','ygg-04'])
  // New course feedback is plain text; older encrypted entries with a score still work.
  for(const text of ['I felt more relaxed.', 'Nothing special yet.', '  Quiet, but I noticed it.  '])
    assert.equal(energyworkMeditationFeedbackComplete(text),true)
  for(const rating of [0,2,5,10]) assert.equal(energyworkMeditationFeedbackComplete(`Feeling:${rating}/10\nNothing unusual yet.`),true)
  for(const feedback of ['', '   ', 'Just words', '12345678901234', 'Feeling:5/10\n', 'Feeling:11/10\nNote','Feeling:3/10\n   '])
    assert.equal(energyworkMeditationFeedbackComplete(feedback),false)
  assert.equal(energyworkMeditationFeedbackComplete('123456789012345'),true)
  assert.equal(energyworkMeditationFeedbackComplete('12345678901234'),false)
  assert.match(learner,/feedbackMissing = isMeditationFeedback && feedbackLength < 15/)
  assert.match(learner,/saveReview: "Save review"/)
  assert.match(learner,/saveReview: "Сохранить отзыв"/)
  assert.doesNotMatch(learner,/data-meditation-feeling|joinMeditationFeedback|splitMeditationFeedback/)
  assert.match(learner,/isMeditationFeedback \? t\.saveReview/)
  assert.match(repository,/MEDITATION_FEEDBACK_REQUIRED/)
  assert.match(learner,/feedbackMissing = isMeditationFeedback/)
  assert.match(learner,/experienceMissing \|\| feedbackMissing/)
  assert.deepEqual(ENERGYWORK_LESSON_ANSWER_IDS,['flight-05','tan-06','tan-study-02','tan-study-03','tan-study-04','tan-study-05','tan-study-06','tan-study-07','kun-06','ygg-06','init-01'])
  assert.equal(energyworkInitiationReady(null),false)
  assert.equal(energyworkInitiationReady({}),false)
  const complete = Object.fromEntries([...ENERGYWORK_REPORT_IDS,...ENERGYWORK_LESSON_ANSWER_IDS].map(id=>[id,'My own note']))
  assert.equal(energyworkInitiationReady(complete),true)
  for(const id of [...ENERGYWORK_REPORT_IDS,...ENERGYWORK_LESSON_ANSWER_IDS]){
    assert.equal(energyworkInitiationReady({...complete,[id]:'  '}),false,'Must not accept blank '+id)
    assert.equal(ENERGYWORK_QUESTIONS[id],'text')
  }
  assert.match(learner,/experienceMissing = slide\.id === "welcome-02"/)
  assert.doesNotMatch(learner,/reportMissing\s*\|\|\s*busy/)
  assert.match(learner,/initiationReady \? \(savedInitiationReady \? t\.reviewDone : t\.reviewSaveNeeded\) : t\.reviewNeeded/)
})

test('Private answers retain normal limits but allow longer meditation reviews', () => {
  assert.ok(Object.keys(ENERGYWORK_QUESTIONS).length <= 32)
  for(const id of Object.keys(ENERGYWORK_QUESTIONS))
    assert.equal(energyworkAnswerValid(id,'a'.repeat(1600)),ENERGYWORK_QUESTIONS[id]==='text')
  for(const id of ENERGYWORK_MEDITATION_REPORT_IDS)
    assert.equal(energyworkAnswerValid(id,'a'.repeat(5000)),true)
  assert.equal(energyworkAnswerValid('flight-05','a'.repeat(1601)),false)
  assert.equal(energyworkAnswerValid('flight-04',null),false)
  assert.equal(energyworkAnswerValid('flight-02','notes'),false)
  for(const val of ['pause','adapt','ask'])assert.equal(energyworkAnswerValid('boundaries-02',val),true)
  assert.equal(energyworkAnswerValid('boundaries-02','force'),false)
  for(const id of ['flight-03','intention-04','boundaries-03','ygg-03','tan-03','kun-03']){
    assert.equal(energyworkAnswerValid(id,'tried'),true)
    assert.equal(energyworkAnswerValid(id,'skipped'),true)
    assert.equal(energyworkAnswerValid(id,'pause'),false)
  }
})

test('Existing encrypted owner-only RLS is retained and version upgrade is additive', () => {
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
  assert.match(upgrade,/check \(course_version in \('2026-10-17\.p0', '2026-10-18\.p1'\)\)/)
  assert.match(upgrade,/grant update \(course_version\) on app_private\.academy_course_progress to hh_app_backend/)
  assert.match(latest,/check \(course_version in \('2026-10-17\.p0', '2026-10-18\.p1', '2026-10-19\.p2'\)\)/)
  assert.doesNotMatch(upgrade,/drop table|delete from|drop policy|drop column/i)
})

test('Existing p0 learner keeps private answers and is resumed at first unskipped lesson', () => {
  for(const id of ['welcome-01','welcome-02','flight-01','flight-02','flight-03','flight-04'])
    assert.equal(energyworkLegacyResumeId(id),id)
  assert.equal(energyworkLegacyResumeId('tan-04'),'flight-01')
  assert.equal(energyworkLegacyResumeId('ygg-05'),'flight-01')
  assert.equal(energyworkLegacyResumeId('end-02'),'flight-01')
  assert.match(repository,/row\.course_version === ENERGYWORK_LEGACY_VERSION/)
  assert.match(repository,/energyworkLegacyResumeId\(row\.slide_id\)/)
  assert.match(repository,/const answers=answersFrom\(row,config\)/)
  assert.match(repository,/MAX_RESPONSES = 32/)
  assert.equal(energyworkPreviousResumeId('presence-02'),'tan-study-03')
  assert.equal(energyworkPreviousResumeId('presence-03'),'tan-study-04')
  assert.equal(energyworkPreviousResumeId('flight-03'),'flight-05')
  assert.equal(energyworkPreviousResumeId('flight-05'),'flight-03')
})

test('Server requires owner, consent, optimistic revision and per-owner encrypted writes', () => {
  assert.match(repository,/transaction\(config,actor/)
  assert.match(repository,/body\.consent !== true/)
  assert.match(repository,/row\.revision !== body\.expectedRevision/)
  assert.match(repository,/openSealed\(row\.answers_ciphertext/)
  assert.match(repository,/seal\(answers,encryption\(row\),config\)/)
  assert.match(repository,/COURSE_STEP_NOT_READY/)
  assert.match(repository,/body\.answer === ''/)
  assert.match(repository,/course_version=\$4/)
  assert.match(repository,/delete from app_private\.academy_course_progress where account_id=\$1/)
  assert.doesNotMatch(repository,/COURSE_PATH_CONFIRM_REQUIRED/)
  assert.doesNotMatch(repository,/localStorage|fetch\(|console\.log/)
  assert.match(route,/await auth\.verified\(\)/)
  assert.match(route,/joined === 'academy-energywork'/)
  assert.match(route,/continueTo === 'energywork'/)
  assert.match(route,/request\.headers\.get\('x-hh-account-id'\)/)
})

test('Client writes before navigation, retries conflict and can print protected journal', () => {
  assert.match(learner,/await store\(nextId\)/)
  assert.match(learner,/revisionRef\.current = value\.revision/)
  assert.match(learner,/setSaveError\(t\.saveFailed\)/)
  assert.match(learner,/await appFetch\("academy-energywork"\)/)
  assert.match(learner,/onClick=\{\(\) => window\.print\(\)\}/)
  assert.match(learner,/window\.confirm\(t\.resetConfirm\)/)
  assert.match(learner,/dirtyRef\.current/)
  assert.match(learner,/function PracticeTimer/)
  assert.match(learner,/window\.setInterval/)
  assert.match(learner,/setRunning\(false\)/)
  assert.match(learner,/jumpToSlide/)
  assert.doesNotMatch(learner,/(?:localStorage|sessionStorage)\s*[.\[]/)
})
