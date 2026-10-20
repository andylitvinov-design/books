import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  REIKI_REQUEST_PREFIX, REIKI_INITIATION_IDS,
  readReikiInitiationRequest, writeReikiInitiationRequest,
  reikiInitiationRequestValid, formatReikiInitiationRequest,
} from '../data/academy/reiki-initiation-request.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const form = read('components/energywork-ai-learner.tsx')
const editorial = read('data/academy/energywork-ai-curriculum.ts')
const repository = read('lib/academy/energywork-course-repository.js')
const crm = read('lib/academy/reiki-course-leads.js')
const css = read('components/energywork-ai-learner.module.css')

const validRequest = (overrides = {}) => ({
  firstName: 'Elena', lastName: 'Petrova',
  location: 'Toronto, Canada', timezone: 'America/Toronto',
  preferredTime: 'Weekdays after 19:00',
  freeInitiation: 'tantra', donationInitiations: [],
  motivation: 'I would love to explore the Reiki initiation with Andrey after completing the course.',
  ...overrides,
})

test('one of three paths may be free; zero, one or two other initiations can be requested by donation', () => {
  assert.deepEqual([...REIKI_INITIATION_IDS], ['tantra', 'kundalini', 'yggdrasil'])
  for (const freeInitiation of REIKI_INITIATION_IDS) {
    const others = REIKI_INITIATION_IDS.filter((id) => id !== freeInitiation)
    for (const donationInitiations of [[], [others[0]], [others[1]], others]) {
      const answer = writeReikiInitiationRequest(validRequest({freeInitiation, donationInitiations}))
      assert.equal(reikiInitiationRequestValid(answer), true)
      assert.deepEqual(readReikiInitiationRequest(answer).donationInitiations, donationInitiations)
      assert.equal(readReikiInitiationRequest(answer).freeInitiation, freeInitiation)
      assert.ok(answer.length <= 1600, 'Fits existing encrypted answer limit')
    }
  }
})

test('only complete personal details and 20-character motivation permit the explicit CRM handoff', () => {
  const valid = writeReikiInitiationRequest(validRequest())
  assert.equal(reikiInitiationRequestValid(valid), true)
  assert.equal(reikiInitiationRequestValid(''), false)
  assert.equal(reikiInitiationRequestValid('I would like initiation from Andrey'), false)
  for (const patch of [
    {firstName: ''}, {lastName: ' '}, {location: ' '}, {timezone: ''},
    {preferredTime: ' '}, {freeInitiation: ''}, {motivation: 'too short'},
  ]) assert.equal(reikiInitiationRequestValid(writeReikiInitiationRequest(validRequest(patch))), false)
  assert.equal(reikiInitiationRequestValid(REIKI_REQUEST_PREFIX+'{"arbitrary":"json"}'),false)
  assert.equal(reikiInitiationRequestValid(valid+' '),false)
})

test('free choice never repeats as a paid donation and legacy letters remain readable', () => {
  const raw = writeReikiInitiationRequest(validRequest({
    freeInitiation: 'kundalini', donationInitiations: ['kundalini','tantra','tantra','yggdrasil'],
  }))
  const parsed = readReikiInitiationRequest(raw)
  assert.ok(!parsed.donationInitiations.includes('kundalini'))
  assert.equal(new Set(parsed.donationInitiations).size, parsed.donationInitiations.length)
  assert.equal(reikiInitiationRequestValid(raw), true)
  const oldLetter = 'I wish to learn and grow in my Reiki practice through this course.'
  assert.equal(readReikiInitiationRequest(oldLetter).motivation,oldLetter)
  assert.equal(formatReikiInitiationRequest(oldLetter,'ru'),oldLetter)
  assert.equal(reikiInitiationRequestValid(oldLetter),false)
  assert.equal(reikiInitiationRequestValid('bad-prefix:[]'),false)
})

test('private human-readable CRM and journal expose the options in English and Russian, not raw JSON', () => {
  const answer=writeReikiInitiationRequest(validRequest({
    freeInitiation:'yggdrasil',donationInitiations:['tantra','kundalini'],
  }))
  const english=formatReikiInitiationRequest(answer,'en')
  const russian=formatReikiInitiationRequest(answer,'ru')
  for(const output of [english,russian]) {
    assert.match(output,/Elena/)
    assert.match(output,/Toronto/)
    assert.match(output,/Reiki Yggdrasil/)
    assert.match(output,/Tantra Reiki/)
    assert.match(output,/Kundalini Reiki/)
    assert.match(output,/Weekdays after 19:00/)
    assert.doesNotMatch(output,/hh-reiki-personal-request-v1|\{"firstName"/)
  }
  assert.match(russian,/Бесплатная инициация/)
  assert.match(english,/By donation|Additional initiations by donation/)
})

test('Lesson 5 uses stable end-01 ID and explicit opt-in rather than direct public or paid checkout', () => {
  assert.match(editorial,/id: "end-01"/)
  assert.match(editorial,/Choose your personal Reiki initiation/)
  assert.match(form,/data-reiki-initiation-choice-form/)
  assert.match(form,/data-reiki-free-choices/)
  assert.match(form,/data-reiki-donation-choices/)
  assert.match(form,/type="radio" name="reiki-free-initiation"/)
  assert.match(form,/type="checkbox" value=\{choice\.id\}/)
  assert.match(form,/input type="text" autoComplete="given-name"/)
  assert.match(form,/input type="text" autoComplete="family-name"/)
  assert.match(form,/maxLength=\{700\} value=\{request\.motivation\}/)
  assert.match(form,/slide\.id === "end-01" \? \(/)
  assert.match(form,/reikiInitiationRequestValid\(answers\["end-01"\]\)/)
  assert.match(form,/applicationConsented/)
  assert.match(form,/action: "apply"/)
  assert.match(repository,/energyworkInitiationReady\(answers\)/)
  assert.match(crm,/if \(!reikiInitiationRequestValid\(reason\)\)/)
  assert.match(crm,/initiationRequest,\s*answers,/)
  assert.match(crm,/seal\(payload/)
  assert.match(css,/initiationChoiceSelected/)
  assert.match(css,/data-energywork-slide-id="end-01"/)
  assert.doesNotMatch(form,/window\.localStorage|sessionStorage\.setItem\([^)]*initiation/)
})
