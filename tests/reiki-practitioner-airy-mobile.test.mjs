import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { energyworkSequence } from "../data/academy/energywork-ai-schema.js"
import { ENERGYWORK_FIRST_LESSON_STORAGE_KEY, energyworkCreateFirstLessonHandoff, energyworkReadFirstLessonHandoff } from "../data/academy/energywork-first-lesson.js"

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8")
const ui = read("components/energywork-ai-learner.tsx")
const styles = read("components/energywork-ai-learner.module.css")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const sky = read("public/images/holistic-house/reiki-heaven-sky.svg")

test("Reiki airy v2 removes welcome duplications but preserves one unified course", () => {
  assert.equal(energyworkSequence().length,64)
  assert.match(ui,/data-course-visual="reiki-airy-v2"/)
  assert.match(ui,/data-energywork-screen=\{slide\.kind === "welcome" \? "welcome" : "lesson"\}/)
  assert.match(ui,/welcomeRequirement: "Study all five lessons in order\."/)
  assert.match(ui,/welcomeRequirement: "Проходите все пять уроков по очереди\."/)
  assert.match(ui,/className=\{styles\.welcomeReward\}/)
  assert.match(ui, /className=\{styles\.coverFacts\} aria-label=\{t\.benefits\}/)
  const facts = ui.slice(ui.indexOf('<div className={styles.coverFacts}'), ui.indexOf('<details className={styles.welcomeGift}'))
  for (const benefit of ["shortLessons", "practicalTasks", "privateProgress"])
    assert.ok(facts.includes('{t.' + benefit + '}'), benefit + " remains visible")
  assert.doesNotMatch(ui,/<p className=\{styles\.welcomeTeacher\}>/)
  assert.match(curriculum,/energyworkSlides\(_legacyPath:/)
})

test("Inner slides have no duplicate top buttons but all five steps and one bottom back action", () => {
  assert.match(ui,/\{slide\.kind === "welcome" \? \(\s*<header className=\{styles\.top\}>/)
  assert.match(ui,/<nav className=\{styles\.journey\} aria-label=\{t\.fiveLessons\}>/)
  assert.match(ui,/energyworkLessons\.map\(\(lesson, number\) =>/)
  assert.match(ui,/onClick=\{previous\}/)
  assert.match(ui,/onClick=\{next\}/)
  assert.match(ui,/experienceMissing/)
  assert.match(styles,/\.page\[data-course-visual\] \.actions \{\s*flex-direction:row;/)
})

test("Programme disclosure and consented private saving remain separate from teacher sharing", () => {
  const programme = ui.slice(ui.indexOf('<section className={styles.programme}'), ui.indexOf('<footer className={styles.footer}>'))
  assert.match(programme, /hidden=\{!programmeOpen\}/)
  assert.match(programme, /id="reiki-journey-help"/)
  assert.match(programme, /aria-expanded=\{programmeOpen\} aria-controls="reiki-journey-help"/)
  assert.match(programme, /onClick=\{\(\) => setProgrammeOpen\(\(open\) => !open\)\}/)
  assert.match(programme, /t\.programmeIntro/)
  assert.match(programme, /energyworkPathChoices\.map/)
  assert.match(programme, /target="_blank" rel="noopener noreferrer"/)
  assert.doesNotMatch(programme, /styles\.preview/)
  const savedLine = ui.slice(ui.indexOf('<div className={styles.savedLine}'), ui.indexOf('<section className={styles.programme}'))
  assert.match(savedLine, /data-reiki-private-save-status aria-live="polite"/)
  assert.match(savedLine, /sync === "consent"/)
  assert.match(savedLine, /slide\.id === "flight-done" \? null/)
  assert.match(savedLine, /<details className=\{styles\.saveSettings\}>/)
  assert.match(savedLine, /checked=\{consented\}/)
  assert.match(savedLine, /disabled=\{!consented \|\| busy\} onClick=\{startSaving\}/)
  assert.match(ui, /checked=\{firstLessonConsent\}/)
  assert.match(ui, /if \(busy \|\| !firstLessonConsent \|\| !\["guest", "consent"\]\.includes\(sync\) \|\|\s*slide\.id !== "flight-done"\) return;/)
  assert.match(ui, /if \(sync === "guest"\) await signIn\(\);\s*else await completeFirstLesson\(pending\);/)
  assert.match(ui, /if \(busy \|\| !shareConsented \|\| sync !== "ready"\) return;/)
  assert.match(ui, /const savedInitiationReady = initiationReady && sync === "ready" &&\s*!busy && !saveError && dirtyRef\.current\.size === 0;/)
})

test("The sky landscape is local and mobile screens remain readable in tight heights", () => {
  assert.match(sky,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(sky,/id="sky"/)
  assert.match(sky,/id="sunlight"/)
  assert.doesNotMatch(sky,/<image[^>]+href="https?:/)
  assert.match(styles,/reiki-heaven-sky\.svg/)
  assert.match(styles,/\.page\[data-course-visual\] \.slide \{/)
  assert.match(styles,/background: rgba\(255,255,255,\.57\)/)
  assert.match(styles,/\.page\[data-course-visual\] \.slideMain \{[\s\S]*?overflow-y:auto/)
  assert.match(styles,/\.page\[data-course-visual\] \.programme\[open\]/)
  assert.match(styles,/max-height:min\(45dvh,340px\)/)
  assert.match(styles,/@media \(max-width: 760px\) and \(max-height: 700px\)/)
  assert.match(styles,/env\(safe-area-inset-bottom\)/)
  assert.match(styles,/focus-visible/)
})

test("Original videos and personal initiation reporting rules have not been touched", () => {
  for(const key of ['flight-to-sun','tantra-reiki','kundalini-reiki','reiki-yggdrasil']){
    assert.match(curriculum,new RegExp('videoKey: "'+key+'"'))
  }
  assert.match(ui,/<AcademyVideoPlayer/)
  const readiness = ui.match(/const readyCount = ([^;]+);\s*const readyTargetCount = ([^;]+);\s*const initiationReady = ([^;]+);/)
  assert.ok(readiness)
  const evaluate = new Function("initiationItems", "const readyCount = " + readiness[1] + "; const readyTargetCount = " + readiness[2] + "; return { readyCount, readyTargetCount, ready: " + readiness[3] + " };")
  const requirementLiteral = curriculum.match(/export const energyworkInitiationRequirements:[\s\S]*?= (\[[\s\S]*?\n\]);/)
  assert.ok(requirementLiteral)
  const requirements = new Function("return (" + requirementLiteral[1] + ");")()
  assert.deepEqual(requirements.map(item => item.lesson), ["flight", "tantra", "kundalini", "yggdrasil", "initiation"])
  assert.deepEqual(requirements.map(item => item.questionIds), [
    ["flight-05"], ["tan-study-04", "tan-06", "tan-study-06", "tan-study-07", "tan-study-02"],
    Array.from({ length: 9 }, (_, i) => "kun-study-v2-0" + (i + 1)),
    Array.from({ length: 7 }, (_, i) => "ygg-study-v2-0" + (i + 1)), []])
  assert.deepEqual(requirements.map(item => item.reportId), ["flight-04", "tan-04", "kun-04", "ygg-04", "end-01"])
  const complete = requirements.map(item => ({ ...item, reportDone: true, questionCount: item.questionIds.length }))
  assert.deepEqual(evaluate(complete), { readyCount: 27, readyTargetCount: 27, ready: true })
  for (let index = 0; index < complete.length; index++) {
    const missingReport = complete.map((item, i) => i === index ? { ...item, reportDone: false } : item)
    assert.equal(evaluate(missingReport).ready, false)
    if (complete[index].questionCount) {
      const missingQuestion = complete.map((item, i) => i === index ? { ...item, questionCount: item.questionCount - 1 } : item)
      assert.equal(evaluate(missingQuestion).ready, false)
    }
  }
  assert.match(ui, /questionCount: item\.questionIds\.filter\(\(id\) => Boolean\(answers\[id\]\?\.trim\(\)\)\)\.length/)
  assert.match(ui, /questionDone: item\.questionIds\.every\(\(id\) => Boolean\(answers\[id\]\?\.trim\(\)\)\)/)
  assert.match(ui,/savedInitiationReady/)
  assert.match(ui,/data-initiation-readiness/)
  assert.match(ui,/data-energywork-next/)
  assert.doesNotMatch(ui,/autoPlay|autoplay|localStorage/)
  // The approved exception is one consented, expiring first-lesson handoff, not general persistence.
  const save = ui.slice(ui.indexOf('async function saveLessonOneToCabinet('), ui.indexOf('const slides = useMemo'))
  const guard = save.indexOf('if (busy || !firstLessonConsent')
  const write = save.indexOf('window.sessionStorage.setItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY, value)')
  assert.ok(guard >= 0 && write > guard)
  assert.match(save, /!\["guest", "consent"\]\.includes\(sync\) \|\|\s*slide\.id !== "flight-done"\) return;/)
  assert.match(save, /energyworkCreateFirstLessonHandoff\(answersRef\.current, locale, Date\.now\(\), afterSave\)/)
  assert.equal([...ui.matchAll(/sessionStorage\.setItem\(/g)].length, 1)
  const completion = ui.slice(ui.indexOf('const completeFirstLesson ='), ui.indexOf('const completeFirstLesson =') + 3300)
  assert.match(completion, /action: "start", consent: true, teacherConsent: false/)
  assert.match(completion, /if \(!value\.enrolled \|\| !value\.slideId \|\| !Number\.isSafeInteger\(value\.revision\) \|\|\s*!value\.answers\?\.\["flight-04"\]\)/)
  assert.match(completion, /hydrate\(value\);[^\n]*\n\s*window\.sessionStorage\.removeItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY\)/)
  assert.equal(ENERGYWORK_FIRST_LESSON_STORAGE_KEY, 'hh-reiki-first-lesson-oauth-v1')
  const now = 1000000
  const answers = { 'welcome-02': 'beginner', 'flight-04': 'A fictional learning reflection for offline testing only.'.repeat(2) }
  const raw = energyworkCreateFirstLessonHandoff({ ...answers, 'tan-04': 'must not enter handoff' }, 'en', now)
  assert.deepEqual(JSON.parse(raw).answers, answers)
  assert.equal(JSON.parse(raw).expiresAt, now + 15 * 60 * 1000)
  assert.deepEqual(energyworkReadFirstLessonHandoff(raw, 'en', now).answers, answers)
  assert.equal(energyworkReadFirstLessonHandoff(raw, 'en', now + 15 * 60 * 1000), null)
  assert.equal(energyworkReadFirstLessonHandoff(raw, 'ru', now), null)
  const oversizedLifetime = JSON.stringify({ ...JSON.parse(raw), expiresAt: now + 15 * 60 * 1000 + 1 })
  assert.equal(energyworkReadFirstLessonHandoff(oversizedLifetime, 'en', now), null)
  const extraAnswer = JSON.stringify({ ...JSON.parse(raw), answers: { ...answers, 'tan-04': 'not permitted' } })
  assert.equal(energyworkReadFirstLessonHandoff(extraAnswer, 'en', now), null)
})
