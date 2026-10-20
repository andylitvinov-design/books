import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { writeReikiInitiationRequest } from '../data/academy/reiki-initiation-request.js'
import {
  ENERGYWORK_VERSION, ENERGYWORK_P5_VERSION, ENERGYWORK_P6_VERSION, ENERGYWORK_BRANCH,
  ENERGYWORK_LESSON_ANSWER_IDS, ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,
  ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS, ENERGYWORK_QUESTIONS,
  energyworkReikiStudyAnswerComplete, energyworkSequence, energyworkLessonRanges,
  energyworkInitiationReady,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const ui = read('components/energywork-ai-learner.tsx')
const db = read('lib/academy/energywork-course-repository.js')
const browser = read('scripts/verify-reiki-all-slides-browser.mjs')

test('Nine approved Kundalini questions and seven Yggdrasil questions preserve private answer IDs', () => {
  assert.equal(ENERGYWORK_VERSION,'2026-10-19.p9')
  assert.equal(ENERGYWORK_P6_VERSION,'2026-10-19.p6')
  assert.equal(ENERGYWORK_P5_VERSION,'2026-10-19.p5')
  assert.equal(energyworkSequence().length,70)
  assert.deepEqual(energyworkLessonRanges().map(x=>x.count),[8,14,16,14,16])
  const kundalini = ["kun-study-v2-01","kun-study-v2-02","kun-study-v2-03","kun-study-v2-04","kun-study-v2-05","kun-study-v2-06","kun-study-v2-07","kun-study-v2-08","kun-study-v2-09"]
  assert.deepEqual(ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,kundalini)
  assert.deepEqual(ENERGYWORK_BRANCH.kundalini.slice(6,15),kundalini)
  assert.equal(ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS.length,7)
  assert.deepEqual(ENERGYWORK_BRANCH.yggdrasil.slice(6,13),[...ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS])
  for(const id of [...kundalini,...ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS]){
    assert.equal(ENERGYWORK_QUESTIONS[id],'text',id)
    assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(id),id)
    assert.ok(curriculum.includes('id: "'+id+'"'),id)
  }
  for(const old of ['kun-06','kun-study-02','kun-study-03','kun-study-04','kun-study-05','kun-study-06','kun-study-07']) {
    assert.equal(ENERGYWORK_QUESTIONS[old],'text')
    assert.ok(!energyworkSequence().includes(old))
    assert.ok(!ENERGYWORK_LESSON_ANSWER_IDS.includes(old))
  }
})
test('Source links and Next validation reuse the secure existing question mechanism', () => {
  assert.equal(energyworkReikiStudyAnswerComplete('   '),false)
  assert.equal(energyworkReikiStudyAnswerComplete('  Ответ '),true)
  assert.match(ui,/isKundaliniStudyQuestion/)
  assert.match(ui,/isYggdrasilStudyQuestion/)
  assert.match(ui,/otherStudyMissing/)
  assert.match(ui,/data-kundalini-study-link/)
  assert.match(ui,/data-yggdrasil-study-link/)
  assert.match(ui,/data-reiki-study-hint/)
  assert.match(db,/REIKI_STUDY_ANSWER_REQUIRED/)
  assert.match(db,/MAX_RESPONSES = 64/)
  assert.match(db,/ENERGYWORK_P6_VERSION/)
  assert.match(browser,/id === "kun-study-v2-01"/)
  assert.match(browser,/id === "ygg-study-v2-01"/)
})
test('Initiation needs all answers, with existing private keys still present', () => {
  const answers=Object.fromEntries(ENERGYWORK_LESSON_ANSWER_IDS.map(id=>[id,'My learning']))
  for(const id of ['flight-04','tan-04','kun-04','ygg-04','end-01']) answers[id]='My reflection is long enough.'
  answers['end-01'] = writeReikiInitiationRequest({firstName:'Elena',lastName:'Petrova',location:'Toronto, Canada',timezone:'America/Toronto',preferredTime:'Evenings after 7',freeInitiation:'tantra',donationInitiations:['yggdrasil'],motivation:'I want to learn Reiki with intention and receive a personal initiation.'})
  assert.equal(energyworkInitiationReady(answers),true)
  for(const id of [...ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,...ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS])
    assert.equal(energyworkInitiationReady({...answers,[id]:'  '}),false,id)
  assert.match(db,/openSealed/)
  assert.match(db,/seal\(answers/)
})
