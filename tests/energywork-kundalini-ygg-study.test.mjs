import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_VERSION, ENERGYWORK_P6_VERSION, ENERGYWORK_BRANCH,
  ENERGYWORK_LESSON_ANSWER_IDS, ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,
  ENERGYWORK_P6_KUNDALINI_ANSWER_IDS, ENERGYWORK_KUNDALINI_CHOICE_VALUES,
  ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS, ENERGYWORK_QUESTIONS,
  energyworkReikiStudyAnswerComplete, energyworkSequence, energyworkLessonRanges,
  energyworkInitiationReady, energyworkAnswerValid, energyworkP6ResumeId,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const ui = read('components/energywork-ai-learner.tsx')
const db = read('lib/academy/energywork-course-repository.js')
const browser = read('scripts/verify-reiki-all-slides-browser.mjs')

const questions = [
  'Если бы энергия Кундалини была рекой, откуда начиналось бы её путешествие по вашему телу?',
  'Почему Кундалини называют «внутренним огнём»?',
  'Что важнее в Reiki: управлять энергией или позволить ей свободно течь?',
  'В чём маленький секрет Reiki: в особенных движениях рук, концентрации или силе намерения?',
  'Если бы ваши ладони передавали одно качество, что бы вы выбрали: тепло, спокойствие, любовь или силу?',
  'Если бы вы направили внимание в любую часть тела, какое место больше всего нуждается в заботе?',
  'Можно ли передавать Reiki на расстоянии?',
  'Что меняется на втором уровне Kundalini Reiki?',
  'Чем отличается практика второго и третьего уровней?',
]

test('Nine owner-approved Kundalini slides appear in exact order, with their exact Russian wording', () => {
  assert.equal(ENERGYWORK_VERSION,'2026-10-19.p7')
  assert.equal(ENERGYWORK_P6_VERSION,'2026-10-19.p6')
  assert.equal(energyworkSequence().length,70)
  assert.deepEqual(energyworkLessonRanges().map(x=>x.count),[7,15,16,22,8])
  assert.equal(ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS.length,9)
  assert.deepEqual(ENERGYWORK_BRANCH.kundalini.slice(6,15),[...ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS])
  const extract=curriculum.slice(curriculum.indexOf('  kundalini: ['),curriculum.indexOf('    { id: "kun-done"'))
  for(let i=0;i<questions.length;i++){
    const id='kun-question-'+String(i+1).padStart(2,'0')
    const next=i+1===questions.length?'kun-done':'kun-question-'+String(i+2).padStart(2,'0')
    assert.equal(ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS[i],id)
    assert.ok(extract.includes('id: "'+id+'"'),id)
    assert.ok(extract.includes(questions[i]),id)
    assert.ok(extract.indexOf('id: "'+id+'"')<extract.indexOf('id: "'+next+'"'),id+' order')
    assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(id),id)
    assert.equal(ENERGYWORK_QUESTIONS[id],i===5?'text':'choice')
  }
  assert.ok(!ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS.some(id=>ENERGYWORK_P6_KUNDALINI_ANSWER_IDS.includes(id)))
})

test('Multiple-choice questions have validated choices; personal body question remains free text', () => {
  assert.equal(Object.keys(ENERGYWORK_KUNDALINI_CHOICE_VALUES).length,8)
  for(const id of ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS){
    assert.equal(energyworkAnswerValid(id,'unknown-choice'),false)
    if(id==='kun-question-06'){
      assert.equal(energyworkAnswerValid(id,'My shoulders'),true)
      continue
    }
    assert.ok(ENERGYWORK_KUNDALINI_CHOICE_VALUES[id].length>=3)
    for(const option of ENERGYWORK_KUNDALINI_CHOICE_VALUES[id]){
      assert.equal(energyworkAnswerValid(id,option),true,id+':'+option)
    }
  }
  assert.match(ui,/data-kundalini-answer-explanation/)
  assert.match(ui,/item.questionCount}\/\u0024\{item.questionIds.length}/)
  assert.match(ui,/data-reiki-study-hint/)
  assert.match(browser,/id\.startsWith\("kun-question-"\)/)
})

test('Existing encrypted p6 answers are preserved, not relabelled as new questions', () => {
  assert.deepEqual(ENERGYWORK_P6_KUNDALINI_ANSWER_IDS,
    ['kun-06','kun-study-02','kun-study-03','kun-study-04','kun-study-05','kun-study-06','kun-study-07'])
  for(const id of ENERGYWORK_P6_KUNDALINI_ANSWER_IDS){
    assert.equal(energyworkP6ResumeId(id),'kun-question-01',id)
    assert.equal(ENERGYWORK_QUESTIONS[id],'text',id)
    assert.ok(!ENERGYWORK_LESSON_ANSWER_IDS.includes(id))
  }
  assert.equal(energyworkP6ResumeId('kun-05'),'kun-05')
  assert.equal(energyworkP6ResumeId('kun-done'),'kun-question-01')
  assert.equal(energyworkP6ResumeId('ygg-06'),'ygg-06')
  assert.match(db,/ENERGYWORK_P6_VERSION/)
  assert.match(db,/energyworkP6ResumeId\(row\.slide_id\)/)
  assert.match(db,/openSealed/)
  assert.match(db,/seal\(answers/)
})

test('Initiation checks all nine Kundalini and seven Yggdrasil questions', () => {
  assert.equal(ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS.length,7)
  const answers=Object.fromEntries(ENERGYWORK_LESSON_ANSWER_IDS.map(id=>[id,'My learning']))
  for(const id of ['flight-04','tan-04','kun-04','ygg-04','end-01']) answers[id]='My reflection is long enough.'
  assert.equal(energyworkInitiationReady(answers),true)
  for(const id of [...ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,...ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS])
    assert.equal(energyworkInitiationReady({...answers,[id]:'  '}),false,id)
  assert.equal(energyworkReikiStudyAnswerComplete('   '),false)
  assert.equal(energyworkReikiStudyAnswerComplete(' My answer '),true)
  assert.match(db,/REIKI_STUDY_ANSWER_REQUIRED/)
  assert.match(db,/MAX_RESPONSES = 64/)
})
