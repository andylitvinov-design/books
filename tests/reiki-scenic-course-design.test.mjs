import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { energyworkSequence } from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const learner = read('components/energywork-ai-learner.tsx')
const css = read('components/energywork-ai-learner.module.css')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const design = read('docs/design/REIKI_PRACTITIONER_SCENIC_V1_APPROVED.md')

test('approved Reiki design is one scoped immersive theme, not a new course engine', () => {
  assert.match(learner, /data-course-theme="reiki-scenic-v1"/)
  assert.match(learner, /data-course-one-screen="v1"/)
  assert.match(css, /REIKI SCENIC COURSE DESIGN V1/)
  assert.match(css, /\.page\[data-course-theme="reiki-scenic-v1"\]/)
  assert.match(css, /course-focus-mountain-boy\.webp/)
  assert.match(design, /Owner approval:.*18 October 2026/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-17.p0"/)
  for (const path of ['yggdrasil', 'tantra', 'kundalini']) {
    assert.equal(energyworkSequence(path).length, 29, path)
  }
})

test('three stage labels reflect actual explicit path rather than saving a visual preview', () => {
  assert.match(learner, /<nav className=\{styles\.journey\} aria-label=\{t\.journey\}>/)
  assert.match(learner, /energyworkPathChoices\.map\(\(choice, position\) =>/)
  assert.match(learner, /aria-current=\{path === choice\.id \? "step" : undefined\}/)
  assert.match(learner, /!path && position === 0 \? styles\.journeyIntro/)
  assert.match(learner, /onClick=\{\(\) => choosePath\(choice\.id\)\}/)
  assert.match(learner, /slide\.kind === "path-choice" && !path/)
})

test('all visual slide kinds use the same scoped glass typography and safe interactions', () => {
  const kinds = ['welcome', 'lesson', 'video', 'practice', 'reflection', 'path-choice', 'finish']
  for (const kind of kinds) assert.ok(curriculum.includes('kind: "' + kind + '"'), kind)
  for (const selector of ['.slide', '.description', '.video', '.pathCard', '.question', '.choice', '.practiceTimer', '.final']) {
    assert.ok(css.includes('.page[data-course-theme] ' + selector), selector)
  }
  assert.match(learner, /<PracticeTimer key=\{slide\.id\} locale=\{locale\}/)
  assert.match(learner, /<AcademyVideoPlayer/)
  assert.match(learner, /onClick=\{copyNotes\}/)
  assert.match(learner, /onClick=\{\(\) => window\.print\(\)\}/)
  assert.doesNotMatch(learner, /autoplay|autoPlay/)
  assert.doesNotMatch(learner, /(?:localStorage|sessionStorage)\s*[.\[]/)
})

test('welcome respects all three Level 1 requests and distinguishes studying from initiation', () => {
  assert.match(learner, /3 possible Level 1 initiations/)
  assert.match(learner, /3 возможные инициации первой ступени/)
  assert.match(learner, /finishing the course does not grant it automatically/)
  assert.match(learner, /завершение курса не заменяет инициацию/)
  assert.match(learner, /styles\.welcomeReward/)
  assert.match(learner, /styles\.benefits/)
  for (const name of ['Short lessons', 'Practical tasks', 'Private progress']) {
    assert.ok(learner.includes(name), name)
  }
  assert.match(learner, /startFree: "Start free program"/)
  assert.match(learner, /startFree: "Начать бесплатный курс"/)
})

test('bottom progress and mobile viewport safe area are retained for every slide', () => {
  const progressPosition = learner.indexOf('className={styles.progressFooter}')
  assert.ok(progressPosition > learner.indexOf('</section>'))
  assert.ok(progressPosition < learner.indexOf('className={styles.programme}'))
  assert.match(learner, /aria-valuenow=\{index \+ 1\}/)
  assert.match(learner, /t\.completedLabel/)
  assert.match(learner, /className=\{styles\.disclaimer\}/)
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /@media \(max-width: 380px\)/)
  assert.match(css, /@media \(max-width: 760px\) and \(max-height: 700px\)/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /overflow-y: auto/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /@media print/)
  assert.match(css, /:focus-visible/)
})

test('progress privacy and versioned saved answers retain their original contracts', () => {
  assert.match(learner, /action: "start", consent: true/)
  assert.match(learner, /expectedRevision: revisionRef\.current/)
  assert.match(learner, /await store\(nextId\)/)
  assert.match(learner, /dirtyRef\.current/)
  assert.match(learner, /t\.previewHelp/)
  assert.match(learner, /t\.consentText/)
  assert.match(learner, /t\.stop/)
  assert.match(learner, /setSaveError\(t\.saveFailed\)/)
})

test('Reiki-specific clean mobile sunrise artwork is local and shipped without UI text', () => {
  const image = readFileSync(new URL('../public/images/holistic-house/reiki-practitioner-sunrise.webp', import.meta.url))
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF')
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP')
  assert.ok(image.length > 3000 && image.length < 50000, 'photographic asset should be present and mobile efficient')
  assert.match(css, /reiki-practitioner-sunrise\.webp/)
  assert.match(css, /course-focus-mountain-boy\.webp/)
})
