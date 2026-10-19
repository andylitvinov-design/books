import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_VERSION, ENERGYWORK_P5_VERSION, ENERGYWORK_BRANCH,
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

test('Seven questions in both later Reiki lessons preserve their original answer IDs', () => {
  assert.equal(ENERGYWORK_VERSION,'2026-10-19.p6')
  assert.equal(ENERGYWORK_P5_VERSION,'2026-10-19.p5')
  assert.equal(energyworkSequence().length,68)
  assert.deepEqual(energyworkLessonRanges().map(x=>x.count),[7,15,14,22,8])
  for(const [lesson,prefix,ids] of [
    ['kundalini','kun',ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS],
    ['yggdrasil','ygg',ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS]
  ]) {
    assert.equal(ids.length,7)
    assert.equal(ids[0],prefix+'-06')
    assert.deepEqual(ENERGYWORK_BRANCH[lesson].slice(6,13),[...ids])
    for(const id of ids){
      assert.equal(ENERGYWORK_QUESTIONS[id],'text',id)
      assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(id),id)
      assert.ok(curriculum.includes('id: "'+id+'"'),id)
    }
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
  assert.match(db,/ENERGYWORK_P5_VERSION/)
  assert.match(browser,/id === "kun-06"/)
  assert.match(browser,/id === "ygg-06"/)
})
test('Initiation needs all answers, with existing private keys still present', () => {
  const answers=Object.fromEntries(ENERGYWORK_LESSON_ANSWER_IDS.map(id=>[id,'My learning']))
  for(const id of ['flight-04','tan-04','kun-04','ygg-04','end-01']) answers[id]='My reflection is long enough.'
  assert.equal(energyworkInitiationReady(answers),true)
  for(const id of [...ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,...ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS])
    assert.equal(energyworkInitiationReady({...answers,[id]:'  '}),false,id)
  assert.match(db,/openSealed/)
  assert.match(db,/seal\(answers/)
})
