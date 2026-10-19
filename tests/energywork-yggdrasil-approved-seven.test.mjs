import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_VERSION, ENERGYWORK_P7_VERSION,
  ENERGYWORK_QUESTIONS, ENERGYWORK_REPORT_IDS, ENERGYWORK_LESSON_ANSWER_IDS,
  ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS, ENERGYWORK_PREVIOUS_YGGDRASIL_STUDY_QUESTION_IDS,
  energyworkP7ResumeId, energyworkP6ResumeId, energyworkInitiationReady,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const approved = read('data/academy/yggdrasil-preparation-questions.ts')
const landing = read('components/yggdrasil-free-initiation.tsx')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const player = read('components/energywork-ai-learner.tsx')

function sourceQuestions(locale) {
  const match = new RegExp('  ' + locale + ': \\[\\n([\\s\\S]*?)\\n  \\],').exec(approved)
  assert.ok(match, 'Source list missing for ' + locale)
  return JSON.parse('[' + match[1].trim().replace(/,$/, '') + ']')
}

test('Approved seven questions match the teacher page in EN/RU/ES and share one source', () => {
  const english = sourceQuestions('en')
  assert.deepEqual(english, [
    'Which is more fundamental to the Runic Reiki system: Reiki, runes, or their combination?',
    'What differences does the author claim between Runic Reiki and classical Usui Reiki, and how are these claims explained within the tradition?',
    'What does Yggdrasil, the World Tree, represent in Scandinavian tradition and in the course?',
    'What is the Healing stream or attunement in Runic Reiki, and how is it traditionally described as being used?',
    'How is the Protection stream described, and in what situations do students practise it?',
    'What is the Money Stream Activation attunement, and what symbolic or practical purposes does the course associate with it?',
    'Which pantheons and deities does the course introduce for study at Level 5?',
  ])
  for(const locale of ['en','ru','es']) {
    assert.equal(sourceQuestions(locale).length,7)
    assert.ok(landing.includes('questions: [...yggdrasilPreparationQuestions.' + locale + ']'))
  }
  assert.match(landing,/import \{ yggdrasilPreparationQuestions \}/)
  assert.match(curriculum,/import \{ yggdrasilPreparationQuestions \}/)
  assert.doesNotMatch(curriculum,/How can the World Tree support reflection without promising a medical result/)
  assert.ok(player.includes('yggdrasil/free-initiation'))
})

test('All seven interactive Yggdrasil screens use the matching approved question in order', () => {
  assert.equal(ENERGYWORK_VERSION,'2026-10-19.p8')
  assert.equal(ENERGYWORK_P7_VERSION,'2026-10-19.p7')
  assert.equal(ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS.length,7)
  let last = -1
  for (const [index,id] of ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS.entries()) {
    assert.equal(id, 'ygg-study-v2-' + String(index + 1).padStart(2,'0'))
    assert.equal(ENERGYWORK_QUESTIONS[id], 'text')
    const position = curriculum.indexOf('id: "' + id + '"')
    assert.ok(position > last, id + ' missing or out of order')
    last=position
    const prompt = 'prompt: l(yggdrasilPreparationQuestions.en[' + index + '], yggdrasilPreparationQuestions.ru[' + index + '])'
    assert.ok(curriculum.slice(position,position+500).includes(prompt),id+' does not use approved text')
  }
})

test('Historic private Yggdrasil answers survive but cannot pass the new initiation checklist', () => {
  const first = ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS[0]
  for (const old of ENERGYWORK_PREVIOUS_YGGDRASIL_STUDY_QUESTION_IDS) {
    assert.equal(ENERGYWORK_QUESTIONS[old],'text','Keep encrypted historic response readable')
    assert.equal(ENERGYWORK_LESSON_ANSWER_IDS.includes(old),false,'Old response is not a new question')
    assert.equal(energyworkP7ResumeId(old),first)
    assert.equal(energyworkP6ResumeId(old),first)
  }
  assert.equal(energyworkP7ResumeId('ygg-done'),first)
  assert.equal(energyworkP7ResumeId('tan-01'),'tan-01')
  const previous = Object.fromEntries([...ENERGYWORK_REPORT_IDS,...ENERGYWORK_LESSON_ANSWER_IDS]
    .map(id=>[id,'Completed written answer']))
  for(const id of ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS) delete previous[id]
  for(const id of ENERGYWORK_PREVIOUS_YGGDRASIL_STUDY_QUESTION_IDS) previous[id]='Prior question answer'
  assert.equal(energyworkInitiationReady(previous),false)
  for(const id of ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS) previous[id]='Corrected question answer'
  assert.equal(energyworkInitiationReady(previous),true)
})
