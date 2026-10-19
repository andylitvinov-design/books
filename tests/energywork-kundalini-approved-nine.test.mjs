import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { writeReikiInitiationRequest } from '../data/academy/reiki-initiation-request.js'
import {
  ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS,
  ENERGYWORK_LESSON_ANSWER_IDS,
  ENERGYWORK_QUESTIONS,
  ENERGYWORK_VERSION,
  energyworkP4ResumeId,
  energyworkP6ResumeId,
  energyworkSequence,
  energyworkLessonRanges,
  energyworkInitiationReady,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const interfaceCode = read('components/energywork-ai-learner.tsx')
const server = read('lib/academy/energywork-course-repository.js')
const original = [
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
const ids = Array.from({ length: 9 }, (_, i) => 'kun-study-v2-' + String(i + 1).padStart(2, '0'))
const previousIds = ['kun-06','kun-study-02','kun-study-03','kun-study-04','kun-study-05','kun-study-06','kun-study-07']

test('Lesson three contains exactly nine approved questions in the requested order', () => {
  assert.equal(ENERGYWORK_VERSION, '2026-10-19.p9')
  assert.deepEqual(ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS, ids)
  assert.deepEqual(energyworkLessonRanges().map(({ count }) => count), [7,14,16,22,8])
  assert.equal(energyworkSequence().length, 69)
  for (let i = 0; i < original.length; i++) {
    const start = curriculum.indexOf('id: "' + ids[i] + '"')
    const end = curriculum.indexOf('id: "' + (ids[i + 1] || 'kun-done') + '"', start)
    assert.ok(start >= 0 && end > start, ids[i] + ': ordered')
    const block = curriculum.slice(start, end)
    assert.ok(block.includes(original[i]), ids[i] + ': exact Russian prompt')
    assert.ok(block.includes('kind: "reflection"'))
    assert.ok(block.includes('type: "text"'))
    assert.ok(block.includes('options: ['))
    assert.ok((block.match(/label: l\(/g) || []).length >= 3, ids[i] + ': multiple choices')
    assert.equal(ENERGYWORK_QUESTIONS[ids[i]], 'text')
    assert.ok(ENERGYWORK_LESSON_ANSWER_IDS.includes(ids[i]))
  }
})

test('Choice cards preserve personal text answers and show explanatory guidance', () => {
  assert.match(interfaceCode, /data-kundalini-answer-options/)
  assert.match(interfaceCode, /data-kundalini-answer-explanation/)
  assert.match(interfaceCode, /setAnswer\(option\.label\[locale\]\)/)
  assert.match(interfaceCode, /textarea id=\{"answer-" \+ slide\.id\}/)
  assert.match(interfaceCode, /item\.questionCount\}\/9/)
  assert.match(curriculum, /this is not proof of remote medical effects/)
})

test('Pre-p7 stored responses are archived under their original IDs, not relabeled', () => {
  for (const old of previousIds) {
    assert.ok(!energyworkSequence().includes(old))
    assert.ok(!ENERGYWORK_LESSON_ANSWER_IDS.includes(old))
    assert.equal(ENERGYWORK_QUESTIONS[old], 'text')
    assert.equal(energyworkP6ResumeId(old), ids[0])
    assert.equal(energyworkP4ResumeId(old), ids[0])
  }
  assert.match(server,/ENERGYWORK_P5_VERSION \|\| row\.course_version === ENERGYWORK_P6_VERSION/)
  const completed = Object.fromEntries(ENERGYWORK_LESSON_ANSWER_IDS.map(id => [id, 'done']))
  for (const id of ['flight-04','tan-04','kun-04','ygg-04','end-01']) completed[id] = 'My experience'
  completed['end-01'] = writeReikiInitiationRequest({firstName:'Elena',lastName:'Petrova',location:'Toronto, Canada',timezone:'America/Toronto',preferredTime:'Evenings after 7',freeInitiation:'tantra',donationInitiations:['yggdrasil'],motivation:'I want to learn Reiki with intention and receive a personal initiation.'})
  assert.equal(energyworkInitiationReady(completed), true)
  delete completed[ids[8]]
  assert.equal(energyworkInitiationReady(completed), false)
})
