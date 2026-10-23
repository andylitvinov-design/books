import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { energyworkSequence } from "../data/academy/energywork-ai-schema.js"

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8")
const ui = read("components/energywork-ai-learner.tsx")
const styles = read("components/energywork-ai-learner.module.css")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const sky = read("public/images/holistic-house/reiki-heaven-sky.svg")

test("Reiki airy v2 removes welcome duplications but preserves one unified course", () => {
  assert.equal(energyworkSequence().length,63)
  assert.match(ui,/data-course-visual="reiki-airy-v2"/)
  assert.match(ui,/data-energywork-screen=\{slide\.kind === "welcome" \? "welcome" : "lesson"\}/)
  assert.match(ui,/welcomeRequirement: "Study all five lessons in order\."/)
  assert.match(ui,/welcomeRequirement: "Проходите все пять уроков по очереди\."/)
  assert.match(ui,/className=\{styles\.welcomeReward\} aria-label=\{t\.welcomeOffer\}/)
  assert.match(ui,/className=\{styles\.coverFacts\} aria-label=\{t\.benefits\}/)
  for (const fact of ["shortLessons","practicalTasks","privateProgress"]) assert.ok(ui.includes("{t."+fact+"}</span>"))
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

test("Save-private controls stay separate from the programme with explicit consent", () => {
  const programme=ui.indexOf('<section className={styles.programme} data-expanded=')
  const saving=ui.indexOf('<div className={styles.savedLine} data-reiki-private-save-status')
  const footer=ui.indexOf('<footer className={styles.footer}>')
  assert.ok(saving>0 && programme>saving && footer>programme)
  assert.match(ui,/<details className=\{styles\.saveSettings\}>/)
  assert.match(ui,/disabled=\{!consented \|\| busy\} onClick=\{startSaving\}/)
  assert.match(ui,/if \(sync === "guest"\) await signIn\(\);/)
  assert.match(ui,/className=\{styles\.consentLabel\}/)
  assert.match(ui,/const savedInitiationReady = initiationReady && sync === "ready" &&\s*!busy && !saveError && dirtyRef.current.size === 0/)
  assert.match(ui,/onClick=\{finishForToday\} disabled=\{busy \|\| sync === "checking" \|\| sync === "unavailable" \|\| \(slide\.id === "flight-done" && sync !== "ready" && !firstLessonConsent\)\}/)
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
  assert.match(ui,/readyCount === readyTargetCount/)
  assert.match(ui,/savedInitiationReady/)
  assert.match(ui,/data-initiation-readiness/)
  assert.match(ui,/data-energywork-next/)
  assert.match(ui,/const readyTargetCount = initiationItems.reduce\(\(count, item\) => count \+ 1 \+ item.questionIds.length, 0\)/)
  assert.doesNotMatch(ui,/autoPlay|autoplay|localStorage/)
  const handoff=ui.slice(ui.indexOf('async function saveLessonOneToCabinet('),ui.indexOf('const slides = useMemo'))
  const guard=handoff.indexOf('if (busy || !firstLessonConsent || !["guest", "consent"].includes(sync) ||')
  const exactSlide=handoff.indexOf('slide.id !== "flight-done") return;')
  const write=handoff.indexOf('window.sessionStorage.setItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY, value)')
  assert.ok(guard>=0 && exactSlide>guard && write>exactSlide)
  assert.equal((ui.match(/sessionStorage\.setItem\(/g)||[]).length,1,'No automatic or unrelated private storage writes')
  assert.match(ui,/if \(slide\.id === "flight-done" && sync !== "ready"\) \{\s*if \(sync === "guest" \|\| sync === "consent"\) await saveLessonOneToCabinet\("continue"\);\s*return;/)
})

