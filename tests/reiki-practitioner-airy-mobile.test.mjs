import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { ENERGYWORK_VERSION, energyworkLessonRanges, energyworkSequence } from "../data/academy/energywork-ai-schema.js"

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8")
const ui = read("components/energywork-ai-learner.tsx")
const styles = read("components/energywork-ai-learner.module.css")
const curriculum = read("data/academy/energywork-ai-curriculum.ts")
const sky = read("public/images/holistic-house/reiki-heaven-sky.svg")

test("Reiki airy v2 removes welcome duplications but preserves one unified course", () => {
  // Owner p10 retains the approved five-lesson, 63-screen course after seven retirements.
  const expectedLessons = [
    ['flight-01','flight-02','flight-voices','flight-05','flight-04','flight-03','flight-done','flight-save'],
    ['tan-01','tan-02','tan-voices','tan-04','tan-05','tan-study-04','tan-06',
      'tan-study-06','tan-study-07','tan-study-02','presence-01','presence-04','tan-03','tan-done'],
    ['kun-01','kun-02','kun-voices','kun-04','kun-05',
      'kun-study-v2-01','kun-study-v2-02','kun-study-v2-03','kun-study-v2-04','kun-study-v2-05',
      'kun-study-v2-06','kun-study-v2-07','kun-study-v2-08','kun-study-v2-09','kun-03','kun-done'],
    ['ygg-01','ygg-02','ygg-voices','ygg-04','ygg-05',
      'ygg-study-v2-01','ygg-study-v2-02','ygg-study-v2-03','ygg-study-v2-04',
      'ygg-study-v2-05','ygg-study-v2-06','ygg-study-v2-07','ygg-03','ygg-done'],
    ['paths-01','intention-01','intention-03','paths-03','init-02','end-01','paths-04','intention-04','end-02'],
  ]
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges(sequence)
  assert.equal(ENERGYWORK_VERSION, '2026-10-20.p10')
  assert.equal(sequence.length, 63)
  assert.equal(new Set(sequence).size, 63)
  assert.deepEqual(sequence, ['welcome-01','welcome-02', ...expectedLessons.flat()])
  assert.deepEqual(ranges.map(({ count }) => count), [8, 14, 16, 14, 9])
  assert.deepEqual(ranges.map(({ start, end }) => sequence.slice(start, end)), expectedLessons)
  const editorialIds = [...curriculum.matchAll(/id: "((?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+)"/g)]
    .map(match => match[1])
  assert.equal(editorialIds.length, 63)
  assert.equal(new Set(editorialIds).size, 63)
  assert.deepEqual([...editorialIds].sort(), [...sequence].sort())
  for (const id of ['intention-02','boundaries-01','boundaries-02','boundaries-04','paths-02','init-01','boundaries-03']) {
    assert.ok(!sequence.includes(id), id + ' must remain retired from navigation')
    assert.ok(!editorialIds.includes(id), id + ' must remain retired from active editorial screens')
  }
  assert.deepEqual(sequence.slice(ranges[0].end - 3, ranges[0].end + 1),
    ['flight-03','flight-done','flight-save','tan-01'], 'save follows practice and congratulations before Lesson 2')
  assert.deepEqual(sequence.slice(-4), ['end-01','paths-04','intention-04','end-02'],
    'the retained application precedes final practice and graduation')
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
