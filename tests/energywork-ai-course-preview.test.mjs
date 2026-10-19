import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const css = read('components/energywork-ai-learner.module.css')
const route = read('app/[locale]/academy/[[...slug]]/page.tsx')
const landing = read('components/principles-of-energywork.tsx')
const academy = read('components/academy-free-course-banner.tsx')
const cabinet = read('components/app/cabinet-free-course-banners.jsx')
const videos = read('data/academy/english-guided-meditations.ts')

test('Unified Reiki Practitioner course has 53 stable editorial screens and five ordered lessons', () => {
  assert.match(curriculum, /ENERGYWORK_COURSE_ID = "academy-energywork-principles"/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-18.p1"/)
  const ids = [...curriculum.matchAll(/id: "(?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+"/g)]
    .map(match => match[0])
  assert.equal(ids.length, 53)
  assert.equal(new Set(ids).size, ids.length)
  const phases = ['flight', 'tantra', 'kundalini', 'yggdrasil', 'initiation']
  const expected = ['flight-01','tan-01','kun-01','ygg-01','paths-01']
  for (let i = 0; i < phases.length; i++) {
    assert.ok(curriculum.includes('phase: "' + phases[i] + '"'), 'Missing '+phases[i])
    assert.ok(curriculum.includes('firstSlideId: "' + expected[i] + '"'), 'Missing lesson entry '+expected[i])
  }
  assert.match(curriculum, /\.\.\.pathSlides\.tantra,/)
  assert.match(curriculum, /\.\.\.pathSlides\.kundalini,/)
  assert.match(curriculum, /\.\.\.pathSlides\.yggdrasil,/)
  assert.match(curriculum, /_legacyPath: EnergyworkPath \| null = null/)
  assert.doesNotMatch(curriculum, /\.\.\.\(path \? pathSlides\[path\]/)
  assert.match(curriculum, /slide\.id !== "paths-04"/)
  assert.match(curriculum, /commonSlides\.find\(\(slide\) => slide\.id === "paths-04"\)/)
})

test('New peer voices and celebrations appear between the existing lessons', () => {
  for(const id of ['flight-voices','tan-voices','kun-voices','ygg-voices','flight-done','tan-done','kun-done','ygg-done'])
    assert.ok(curriculum.includes('id: "'+id+'"'),id)
  assert.match(learner,/data-meditation-voices/)
  assert.match(learner,/t\.saveAndContinue/)
  assert.match(learner,/t\.voicesComments/)
  assert.doesNotMatch(learner,/data-meditation-feeling/)
  assert.match(learner,/t\.saveReview/)
  assert.match(css,/flex-direction:row;align-items:stretch;gap:7px/)
})

test('Videos reuse the four approved original source recordings; no render or autoplay', () => {
  assert.match(learner, /englishGuidedMeditations\.find/)
  assert.match(learner, /<AcademyVideoPlayer/)
  for (const key of ['flight-to-sun', 'tantra-reiki', 'reiki-yggdrasil', 'kundalini-reiki'])
    assert.ok(curriculum.includes('videoKey: "' + key + '"'), key)
  for (const id of ['HqfixazXqRY', 'w2BN-HYmHUk', '80xZ7jN6o2Y', '_IOX0E8N-To']) {
    assert.ok(videos.includes(id), id)
    assert.ok(!curriculum.includes(id), 'Video IDs belong in the media registry, not the lessons')
  }
  assert.doesNotMatch(learner, /autoplay|autoPlay/)
  assert.match(learner, /t\.unavailable/)
})

test('Sun meditation is followed by gentle warmth-and-light pause, observations, and a lesson question', () => {
  const lesson = curriculum.split('id: "flight-01"')[1].split('id: "presence-01"')[0]
  assert.ok(lesson.indexOf('id: "flight-02"') < lesson.indexOf('id: "flight-03"'))
  assert.ok(lesson.indexOf('id: "flight-03"') < lesson.indexOf('id: "flight-voices"'))
  assert.ok(lesson.indexOf('id: "flight-voices"') < lesson.indexOf('id: "flight-04"'))
  assert.ok(lesson.indexOf('id: "flight-04"') < lesson.indexOf('id: "flight-05"'))
  assert.match(lesson, /warmth or light/)
  assert.match(lesson, /Ваш опыт важен/)
  assert.match(lesson, /question: \{ type: "text"/)
  assert.match(curriculum, /After Tantra Reiki: the foundation of presence/)
})

test('Five lessons have separate post-meditation reports and question answers', () => {
  const assignments = [
    ['flight','flight-04','flight-05'], ['tantra','tan-04','tan-06'],
    ['kundalini','kun-04','kun-06'], ['yggdrasil','ygg-04','ygg-06'],
    ['initiation','end-01','init-01'],
  ]
  for (const [name,report,question] of assignments) {
    assert.ok(curriculum.includes('lesson: "'+name+'", reportId: "'+report+'", questionId: "'+question+'"'))
    assert.ok(curriculum.includes('id: "'+report+'"'))
    assert.ok(curriculum.includes('id: "'+question+'"'))
  }
  assert.match(learner, /const initiationItems = energyworkInitiationRequirements\.map/)
  assert.match(learner, /readyCount === initiationItems\.length \* 2/)
  assert.match(learner, /savedInitiationReady = initiationReady && sync === "ready"/)
  assert.match(learner, /data-initiation-readiness/)
  assert.match(learner, /jumpToSlide\(item\.reportId\)/)
  assert.match(learner, /jumpToSlide\(item\.questionId\)/)
  assert.match(learner, /initiationReady \? \(savedInitiationReady \? t\.reviewDone : t\.reviewSaveNeeded\) : t\.reviewNeeded/)
  assert.match(learner, /Nothing is sent to the teacher automatically/)
})

test('Guest answers stay unsaved; consented Google learners use private versioned progress', () => {
  assert.match(learner, /Guest preview · Answers are not saved/)
  assert.match(learner, /Гостевой просмотр · Ответы не сохраняются/)
  assert.match(learner, /action: "start", consent: true/)
  assert.match(learner, /continueTo: "energywork"/)
  assert.match(learner, /expectedRevision: revisionRef\.current/)
  assert.match(learner, /const queueRef = useRef/)
  assert.match(learner, /950\)/)
  assert.match(learner, /const \[answers, setAnswers\] = useState<AnswerMap>\(\{\}\)/)
  assert.match(learner, /navigator\.clipboard\.writeText\(notes\)/)
  assert.doesNotMatch(learner, /(?:localStorage|sessionStorage)\s*[.\[]|fetch\(|XMLHttpRequest|sendBeacon/)
  assert.match(learner, /maxLength=\{isMeditationFeedback \? undefined : 1600\}/)
  assert.doesNotMatch(learner, /aria-pressed=\{path === choice\.id\}|choosePath\(/)
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| experienceMissing \|\| feedbackMissing\}/)
})

test('Course remains available in Academy, guest cabinet and course page routes', () => {
  assert.match(route, /key === "principles-of-energywork\/learn"/)
  assert.match(route, /EnergyworkAiLearner/)
  assert.match(route, /robots: \{ index: false, follow: false \}/)
  assert.match(landing, /data-energywork-interactive-course/)
  assert.match(landing, /energywork-flight-to-sun/)
  assert.match(academy, /path: "principles-of-energywork\/learn"/)
  assert.match(cabinet, /path: 'principles-of-energywork\/learn'/)
})

test('Mobile course uses teal five-step rail and remains accessible', () => {
  assert.match(learner, /<details className=\{styles\.programme\} ref=\{programmeRef\}>/)
  assert.match(learner, /energyworkLessons\.map/)
  assert.match(learner, /role="progressbar"/)
  assert.match(learner, /aria-labelledby="energywork-slide-title"/)
  assert.match(learner, /type="range" min="0" max="10"/)
  assert.match(learner, /type="radio"/)
  assert.match(css, /\.page\[data-course-theme\] \.journey/)
  assert.match(css, /\.reviewChecklist/)
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /@media \(max-width: 380px\)/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
})

test('Reiki opening explains a single sequential course and separate teacher initiations', () => {
  const opening = curriculum.split('id: "welcome-01"')[1].split('id: "welcome-02"')[0]
  assert.match(opening, /One course, five lessons in sequence/)
  assert.match(opening, /Один курс из пяти последовательных уроков/)
  assert.match(learner, /One course · 5 lessons · 3 Reiki systems/)
  assert.match(learner, /Один курс · 5 уроков · 3 системы Рейки/)
  assert.match(learner, /Want to go further\? You can explore personal Reiki initiation/)
  assert.match(learner, /Studying the material, completing the course or sending a request does not automatically provide initiation\./)
  assert.match(learner, /Просмотр материалов, окончание курса или отправка заявки не предоставляют инициацию автоматически\./)
  assert.match(learner, /<p className=\{styles\.initiationNote\}>\{t\.noInitiation\}<\/p>/)
  assert.match(curriculum, /does not grant Level 1 initiation or certification/)
  assert.match(css, /welcomeSlide \.art/)
})

test('Initial interactive screen asks four prior Reiki experience options in EN/RU', () => {
  const schema = read('data/academy/energywork-ai-schema.js')
  const question = curriculum.split('id: "welcome-02"')[1].split('id: "flight-01"')[0]
  assert.match(question, /How familiar are you with Reiki\?/)
  assert.match(question, /Насколько вы знакомы с Рейки\?/)
  const optionIds = [...question.matchAll(/\{ id: "([^"]+)", label: l\(/g)].map(match=>match[1])
  assert.deepEqual(optionIds, ['beginner','energywork','reiki-1-2','master'])
  assert.match(schema, /ENERGYWORK_EXPERIENCE_VALUES/)
  assert.match(learner, /experienceMissing = slide\.id === "welcome-02"/)
  assert.match(learner, /role="status">\{experienceGuidance\[locale\]/)
  assert.match(css, /\.experienceChoice:has\(input:focus-visible\)/)
})
