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
  assert.equal(energyworkSequence().length,67)
  assert.match(ui,/data-course-visual="reiki-airy-v2"/)
  assert.match(ui,/data-energywork-screen=\{slide\.kind === "welcome" \? "welcome" : "lesson"\}/)
  assert.match(ui,/welcomeRequirement: "Study all five lessons in order\."/)
  assert.match(ui,/welcomeRequirement: "Проходите все пять уроков по очереди\."/)
  assert.match(ui,/className=\{styles\.welcomeReward\}/)
  assert.match(ui,/className=\{styles\.benefits\}/)
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

test("Save-private function is retained in expanded programme, not an always-visible panel", () => {
  const detailStart=ui.indexOf('<details className={styles.programme} ref={programmeRef}>')
  const preview=ui.indexOf('<aside className={styles.preview}',detailStart)
  const footer=ui.indexOf('<footer className={styles.footer}>',preview)
  assert.ok(detailStart>0 && preview>detailStart && footer>preview)
  assert.ok(ui.slice(preview,footer).includes('</details>'))
  assert.match(ui,/onClick=\{startSaving\}/)
  assert.match(ui,/onClick=\{signIn\}/)
  assert.match(ui,/className=\{styles\.consentLabel\}/)
  assert.match(ui,/const savedInitiationReady = initiationReady && sync === "ready"/)
  assert.match(ui,/<p className=\{styles\.programmeNote\}>\{t\.welcomeTeacher\}<\/p>/)
  assert.match(ui,/className=\{styles\.disclaimer\}>\{t\.stop\}/)
  assert.doesNotMatch(styles,/\.page\[data-course-visual\] \.preview \{[^}]*display:none/s)
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
  assert.match(ui,/readyCount === initiationItems\.length \* 2/)
  assert.match(ui,/savedInitiationReady/)
  assert.match(ui,/data-initiation-readiness/)
  assert.match(ui,/data-energywork-next/)
  assert.doesNotMatch(ui,/autoPlay|autoplay|localStorage|sessionStorage/)
})
