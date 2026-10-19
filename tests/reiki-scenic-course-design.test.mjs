import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  energyworkSequence, ENERGYWORK_LESSON_STARTS, ENERGYWORK_VERSION,
  ENERGYWORK_REPORT_IDS, ENERGYWORK_LESSON_ANSWER_IDS,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const learner = read('components/energywork-ai-learner.tsx')
const css = read('components/energywork-ai-learner.module.css')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const design = read('docs/design/REIKI_PRACTITIONER_SCENIC_V1_APPROVED.md')

test('Approved scenic design is preserved across new unified five-lesson course', () => {
  assert.match(learner, /data-course-theme="reiki-scenic-v1"/)
  assert.match(learner, /data-course-one-screen="v1"/)
  assert.match(css, /REIKI SCENIC COURSE DESIGN V1/)
  assert.match(css, /\.page\[data-course-theme="reiki-scenic-v1"\]/)
  assert.match(css, /course-focus-mountain-boy\.webp/)
  assert.match(design, /Owner approval:.*18 October 2026/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-18.p1"/)
  assert.equal(ENERGYWORK_VERSION, '2026-10-18.p1')
  assert.equal(energyworkSequence().length,53)
  for(const legacyPath of ['yggdrasil','tantra','kundalini'])
    assert.deepEqual(energyworkSequence(legacyPath),energyworkSequence())
})

test('Immersive journey dots now follow the actual five lessons, not a path-selection', () => {
  assert.match(learner, /<nav className=\{styles\.journey\} aria-label=\{t\.fiveLessons\}>/)
  assert.match(learner, /energyworkLessons\.map\(\(lesson, number\) =>/)
  assert.match(learner, /aria-current=\{lessonNumber === number \+ 1 \|\| \(lessonNumber === 0 && number === 0\) \? "step" : undefined\}/)
  assert.match(learner, /className=\{styles\.journeyDot\}/)
  assert.doesNotMatch(learner, /onClick=\{\(\) => choosePath\(choice\.id\)\}/)
  assert.doesNotMatch(learner, /slide\.kind === "path-choice" && !path/)
  assert.deepEqual(ENERGYWORK_LESSON_STARTS,['flight-01','tan-01','kun-01','ygg-01','paths-01'])
})

test('Every type of teaching screen uses existing glass typography and safe controls', () => {
  const kinds = ['welcome', 'lesson', 'video', 'practice', 'reflection', 'finish']
  for(const kind of kinds)assert.ok(curriculum.includes('kind: "'+kind+'"'),kind)
  for(const selector of ['.slide','.description','.video','.question','.choice','.practiceTimer','.final'])
    assert.ok(css.includes('.page[data-course-theme] '+selector),selector)
  assert.match(learner, /<PracticeTimer key=\{slide\.id\} locale=\{locale\}/)
  assert.match(learner, /<AcademyVideoPlayer/)
  assert.match(learner, /onClick=\{copyNotes\}/)
  assert.match(learner, /onClick=\{\(\) => window\.print\(\)\}/)
  assert.doesNotMatch(learner, /autoplay|autoPlay/)
  assert.doesNotMatch(learner, /(?:localStorage|sessionStorage)\s*[.\[]/)
})

test('Welcome keeps the free course scenic illustration and three benefits while describing all five lessons', () => {
  assert.match(learner, /One course · 5 lessons · 3 Reiki systems/)
  assert.match(learner, /Один курс · 5 уроков · 3 системы Рейки/)
  assert.match(learner, /Course completion alone does not grant any initiation/)
  assert.match(learner, /styles\.welcomeReward/)
  assert.match(learner, /styles\.benefits/)
  for(const name of ['Short lessons','Practical tasks','Private progress'])
    assert.ok(learner.includes(name),name)
  assert.match(learner, /startFree: "Start free program"/)
  assert.match(learner, /startFree: "Начать бесплатный курс"/)
})

test('Course has teacher initiation readiness checklist with five private reports + five answers', () => {
  assert.equal(ENERGYWORK_REPORT_IDS.length,5)
  assert.equal(ENERGYWORK_LESSON_ANSWER_IDS.length,5)
  assert.match(learner, /const initiationReady = readyCount === initiationItems\.length \* 2/)
  assert.match(learner, /data-initiation-readiness/)
  assert.match(css, /\.page\[data-course-theme\] \.reviewChecklist/)
  assert.match(learner, /jumpToSlide\(item\.reportId\)/)
  assert.match(learner, /jumpToSlide\(item\.questionId\)/)
  assert.match(learner, /initiationReady \? \(savedInitiationReady \? t\.reviewDone : t\.reviewSaveNeeded\) : t\.reviewNeeded/)
})

test('Bottom progress and mobile viewport safe-area fit remain approved', () => {
  const position = learner.indexOf('className={styles.progressFooter}')
  assert.ok(position > learner.indexOf('</section>'))
  assert.ok(position < learner.indexOf('className={styles.programme}'))
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

test('Private consent and optimistic saving survive the visual design transition', () => {
  assert.match(learner, /action: "start", consent: true/)
  assert.match(learner, /expectedRevision: revisionRef\.current/)
  assert.match(learner, /await store\(nextId\)/)
  assert.match(learner, /dirtyRef\.current/)
  assert.match(learner, /t\.previewHelp/)
  assert.match(learner, /t\.consentText/)
  assert.match(learner, /t\.stop/)
  assert.match(learner, /setSaveError\(t\.saveFailed\)/)
})

test('Public catalogue systems and descriptions match the interactive learning order', () => {
  const landing = read('components/principles-of-energywork.tsx')
  const paths = landing.split('const paths = [')[1].split('] as const;')[0]
  const order = [...paths.matchAll(/key: "(tantra|kundalini|yggdrasil)"/g)].map(x => x[1])
  assert.deepEqual(order, ['tantra','kundalini','yggdrasil'])
  assert.match(landing, /systemsTitle: "Three Reiki paths"/)
  assert.match(landing, /systemsTitle: "Три пути Рейки"/)
  assert.match(landing, /systemsTitle: "Tres caminos de Reiki"/)
})
