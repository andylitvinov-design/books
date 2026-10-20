import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  ENERGYWORK_FIRST_LESSON_NEXT,
  ENERGYWORK_FIRST_LESSON_STORAGE_KEY,
  energyworkCreateFirstLessonHandoff,
  energyworkReadFirstLessonHandoff,
  energyworkFirstLessonAnswers,
} from '../data/academy/energywork-first-lesson.js'
import { energyworkSequence } from '../data/academy/energywork-ai-schema.js'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const learner = source('components/energywork-ai-learner.tsx')
const server = source('lib/academy/energywork-course-repository.js')
const route = source('app/api/app/[...path]/route.js')
const css = source('components/energywork-ai-learner.module.css')

const guestAnswers = Object.freeze({
  'welcome-02': 'beginner',
  'flight-03': 'felt-light',
  'flight-04': 'I noticed a moment of quiet and warmth. I could relax and follow the meditation at my own pace.',
  'flight-05': 'A gentle experience.',
})

test('Lesson 1 congratulations lead to the save-only checkpoint before Lesson 2', () => {
  const slides = energyworkSequence()
  const completed = slides.indexOf('flight-done')
  assert.deepEqual(slides.slice(completed, completed + 3), ['flight-done', 'flight-save', ENERGYWORK_FIRST_LESSON_NEXT])
  assert.equal(ENERGYWORK_FIRST_LESSON_NEXT, 'tan-01')
  assert.match(learner, /async function saveLessonOneToCabinet\(\) \{\s*if \(busy \|\| !firstLessonConsent \|\| !\["guest", "consent"\]\.includes\(sync\) \|\|\s*slide\.id !== "flight-save"\) return;/)
  assert.match(learner, /slide\.id === "flight-save" && sync !== "ready"/)
  assert.match(learner, /slide\.id !== "flight-save" \? \(\s*<button type="button" onClick=\{next\}/)
  assert.match(learner, /onClick=\{sync === "ready" \? next : saveLessonOneToCabinet\}/)
  assert.doesNotMatch(learner, /firstSaveGuest:/)
  assert.match(learner, /data-reiki-first-lesson-save/)
  assert.match(learner, /data-reiki-first-lesson-consent/)
  assert.match(learner, /data-reiki-first-lesson-google-save/)
  assert.match(learner, /href="\/privacy"/)
  assert.match(css, /\.firstLessonSaveAction/)
  assert.match(learner, /!value\.enrolled \|\| !value\.slideId \|\| !Number\.isSafeInteger\(value\.revision\) \|\|\s*!value\.answers\?\.\["flight-04"\]/)
  assert.match(learner, /setIndex\(energyworkSlides\(\)\.findIndex\(item => item\.id === "flight-save"\)\)/)
})

test('Handoff retains all first-lesson reflections only in a short-lived same-tab record', () => {
  const now = 2_000_000
  const encoded = energyworkCreateFirstLessonHandoff(guestAnswers,'ru',now)
  const result = energyworkReadFirstLessonHandoff(encoded,'ru',now+1)
  assert.deepEqual(result, {answers:guestAnswers})
  assert.match(ENERGYWORK_FIRST_LESSON_STORAGE_KEY,/^hh-reiki-first-lesson-oauth-v1$/)
  assert.equal(energyworkReadFirstLessonHandoff(encoded,'en',now+1),null,'Cannot resume on a different locale')
  assert.equal(energyworkReadFirstLessonHandoff(encoded,'ru',now+15*60*1000),null,'Expires after 15 minutes')
  assert.equal(energyworkReadFirstLessonHandoff('not-json','ru',now+1),null)
  assert.equal(energyworkReadFirstLessonHandoff(JSON.stringify({...JSON.parse(encoded),version:'old'}),'ru',now+1),null)
  assert.match(learner,/window\.sessionStorage\.setItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY/)
  assert.match(learner,/window\.sessionStorage\.removeItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY\)/)
  assert.match(learner,/continueTo: "energywork"/)
  assert.match(route,/continueTo === 'energywork'/)
  assert.match(learner,/void completeFirstLesson\(pending\)/)
})

test('Rejects forged slides, missing answers, missing mandatory review, and oversized payloads', () => {
  for (const value of [
    {'flight-04': guestAnswers['flight-04']},
    {'welcome-02':'beginner'},
    {...guestAnswers,'flight-04':'too short'},
    {...guestAnswers,'flight-03':'unapproved'},
    {...guestAnswers,'wrong-slide':'unknown'},
    {...guestAnswers,'flight-04':'x'.repeat(5001)},
    {...guestAnswers,'flight-05':'x'.repeat(1601)},
    {...guestAnswers,'welcome-02':'not-a-choice'},
    null,
    [],
  ]) assert.throws(()=>energyworkFirstLessonAnswers(value),/INVALID_FIRST_LESSON/)
  assert.deepEqual(energyworkFirstLessonAnswers({
    'welcome-02':'master','flight-04':guestAnswers['flight-04'],
  }), {'welcome-02':'master','flight-04':guestAnswers['flight-04']})
})

test('Private onboarding and atomic account-owned save never enroll or share with teacher silently', () => {
  assert.match(learner,/adult: true, necessary: true, marketing: false/)
  assert.match(learner,/firstLesson: handoff/)
  assert.match(learner,/teacherConsent: false/)
  assert.match(server,/body\.teacherConsent === true\)\s+throw new AppError\('INVALID_FIRST_LESSON',400\)/)
  assert.match(server,/let firstLesson = null/)
  assert.match(server,/energyworkFirstLessonAnswers\(body\.firstLesson\.answers\)/)
  assert.match(server,/const merged = \{\.\.\.firstLesson, \.\.\.priorAnswers\}/)
  assert.match(server,/Math\.max\(savedIndex,nextIndex\)/)
  assert.match(server,/const encrypted = seal\(merged,encryption\(progress\),config\)/)
  assert.match(server,/update app_private\.academy_course_progress/)
  assert.match(server,/where account_id=\$1 and id=\$2 returning \*/)
  assert.match(server,/on conflict\(account_id,course_key\) do nothing/)
  assert.match(route,/readBody\(request,32768\)/)
  assert.doesNotMatch(learner,/localStorage\.setItem/)
})
