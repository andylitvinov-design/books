import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { energyworkSequence } from '../data/academy/energywork-ai-schema.js'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const css = read('components/energywork-ai-learner.module.css')
const route = read('app/[locale]/academy/[[...slug]]/page.tsx')
const landing = read('components/principles-of-energywork.tsx')
const academy = read('components/academy-free-course-banner.tsx')
const cabinet = read('components/app/cabinet-free-course-banners.jsx')
const videos = read('data/academy/english-guided-meditations.ts')

test('Unified Reiki Practitioner course has 63 published editorial screens and five ordered lessons', () => {
  assert.match(curriculum, /ENERGYWORK_COURSE_ID = "academy-energywork-principles"/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-20.p10"/)
  const ids = [...curriculum.matchAll(/id: "(?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+"/g)]
    .map(match => match[0]).filter(id => id !== 'id: "tan-study-03"')
  assert.equal(ids.length, 63)
  assert.equal(new Set(ids).size, ids.length)
  const phases = ['flight', 'tantra', 'kundalini', 'yggdrasil', 'initiation']
  const expected = ['flight-01','tan-01','kun-01','ygg-01','paths-01']
  for (let i = 0; i < phases.length; i++) {
    assert.ok(curriculum.includes('phase: "' + phases[i] + '"'), 'Missing '+phases[i])
    assert.ok(curriculum.includes('firstSlideId: "' + expected[i] + '"'), 'Missing lesson entry '+expected[i])
  }
  assert.match(curriculum, /\.\.\.pathSlides\.tantra,/)
  assert.match(curriculum, /withClosingPractices\(pathSlides\.kundalini, \["kun-03"\], "kun-done"\)/)
  assert.match(curriculum, /withClosingPractices\(pathSlides\.yggdrasil, \["ygg-03"\], "ygg-done"\)/)
  assert.match(curriculum, /_legacyPath: EnergyworkPath \| null = null/)
  assert.doesNotMatch(curriculum, /\.\.\.\(path \? pathSlides\[path\]/)
  assert.match(curriculum, /slide\.id !== "paths-01" && slide\.id !== "paths-04"/)
  assert.match(curriculum, /commonSlides\.find\(\(slide\) => slide\.id === "paths-04"\)/)
})

test('New peer voices and celebrations appear between the existing lessons', () => {
  for(const id of ['flight-voices','tan-voices','kun-voices','ygg-voices','flight-done','tan-done','kun-done','ygg-done'])
    assert.ok(curriculum.includes('id: "'+id+'"'),id)
  assert.match(learner,/data-meditation-voices/)
  // Milestone primary CTA lives in the anchored footer, not duplicated in the card.
  assert.match(learner,/slide\.kind === "milestone" \? t\.saveAndContinue/)
  assert.match(learner,/saveAndContinue: "Save my lesson and continue"/)
  assert.match(learner,/data-reiki-milestone-choices/)
  assert.match(learner,/data-energywork-next/)
  assert.match(learner,/data-reiki-tomorrow-choice/)
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

test('Lesson 1 Sun meditation review uses the approved two questions and one answer field', () => {
  const review = curriculum.split('id: "flight-04"')[1]?.split('id: "flight-done"')[0] ?? ''
  assert.match(review, /body: l\("Did you manage to fly up to the Sun during the Sun meditation\?"/)
  assert.match(review, /prompt: l\("Describe please how was the Sun energy flow\?"/)
  assert.match(review, /type: "text"/)
  assert.match(review, /Удалось ли вам подняться к Солнцу/)
  assert.match(learner, /isMeditationFeedback \? meditationReview/)
  assert.match(learner, /textarea id=\{"answer-" \+ slide\.id\}/)
})

test('Lesson 1 practice with music comes after reflections, immediately before congratulations', () => {
  assert.deepEqual(energyworkSequence().slice(2, 9), [
    'flight-01', 'flight-02', 'flight-voices', 'flight-05',
    'flight-04', 'flight-03', 'flight-done',
  ])
  const lesson = curriculum.split('id: "flight-01"')[1].split('id: "presence-01"')[0]
  assert.match(lesson, /Sun’s light and warmth/)
  assert.match(lesson, /Удалось ли вам подняться к Солнцу во время медитации/)
  assert.match(lesson, /question: \{ type: "text"/)
  assert.match(curriculum, /slide\.phase === "flight" && slide\.id !== "flight-save"/)
  assert.match(curriculum, /commonSlides\.find\(\(slide\) => slide\.id === "flight-save"\)!/)
  assert.match(curriculum, /After Tantra Reiki: the foundation of presence/)
})

test('Sun practice uses two optional choices for the one-minute exercise', () => {
  const schema = read('data/academy/energywork-ai-schema.js')
  const slide = curriculum.split('id: "flight-03"')[1].split('id: "flight-done"')[0]
  assert.match(slide, /question: sunPracticeQuestion/)
  assert.doesNotMatch(slide, /question: practiceQuestion/)
  assert.match(curriculum, /const sunPracticeQuestion: EnergyworkQuestion = \{\s*type: "choice"/)
  assert.match(curriculum, /I could feel the light and warmth/)
  assert.match(curriculum, /I need more practice/)
  assert.match(schema, /'flight-03': 'choice'/)
  assert.match(learner, /flightPracticeResponse\(answer, locale\)/)
  assert.match(css, /\[data-energywork-slide-id="flight-03"\]/)
  assert.match(css, /\.choices/)
})

test('Five lesson reports and four sets of study questions gate initiation', () => {
  const assignments = [
    ['flight','flight-04','flight-05'], ['tantra','tan-04','tan-study-04'],
    ['kundalini','kun-04','kun-study-v2-01'], ['yggdrasil','ygg-04','ygg-study-v2-01'],
  ]
  for (const [name,report,question] of assignments) {
    assert.ok(curriculum.includes('lesson: "'+name+'", reportId: "'+report+'", questionId: "'+question+'"'))
    assert.ok(curriculum.includes('id: "'+report+'"'))
    assert.ok(curriculum.includes('id: "'+question+'"'))
  }
  assert.match(curriculum, /lesson: "initiation", reportId: "end-01", questionId: "end-01", questionIds: \[\]/)
  assert.doesNotMatch(curriculum, /id: "init-01", phase:/)
  assert.match(learner, /const initiationItems = energyworkInitiationRequirements\.map/)
  assert.match(learner, /readyTargetCount/)
  assert.match(learner, /savedInitiationReady = initiationReady && sync === "ready"/)
  assert.match(learner, /data-initiation-readiness/)
  assert.match(learner, /jumpToSlide\(item\.reportId\)/)
  assert.match(learner, /jumpToSlide\(item\.nextQuestionId\)/)
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
  // Explicit, time-limited OAuth handoff is permitted; no client-side persistent answer store.
  assert.doesNotMatch(learner, /localStorage\s*[.\[]|(?<!app)fetch\(|XMLHttpRequest|sendBeacon/)
  assert.match(learner, /window\.sessionStorage\.setItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY/)
  assert.match(learner, /maxLength=\{isMeditationFeedback \? undefined : 1600\}/)
  assert.doesNotMatch(learner, /aria-pressed=\{path === choice\.id\}|choosePath\(/)
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| experienceMissing \|\| feedbackMissing \|\| tantraStudyMissing \|\| otherStudyMissing\}/)
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
  assert.match(learner, /<section className=\{styles\.programme\} data-expanded=/)
  assert.match(learner, /aria-expanded=\{programmeOpen\}/)
  assert.match(learner, /<ReikiCourseReferralShare locale=\{locale\} \/>/)
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
  assert.match(opening, /Reiki Practitioner — a five-day journey/)
  assert.match(opening, /Практик Рейки — пятидневный курс/)
  assert.match(opening, /Kundalini Reiki, Tantra Reiki and Reiki Yggdrasil/)
  assert.match(opening, /Кундалини Рейки, Тантра Рейки и Рейки Иггдрасиль/)
  assert.match(opening, /Each day brings a short exercise and a meditation/)
  assert.match(opening, /Каждый день вас ждут небольшое упражнение и медитация/)
  assert.match(learner, /welcomeGiftText: "After completing all five lessons/)
  assert.match(learner, /одну бесплатную инициацию I ступени с Андреем в чате/)
  assert.match(learner, /One course · 5 lessons · 3 Reiki systems/)
  assert.match(learner, /Один курс · 5 уроков · 3 системы Рейки/)
  assert.match(learner, /Want individual guidance\? Ask about a personal session with Andrey/)
  assert.match(curriculum, /not an initiation or certification/)
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

test('Kundalini slide includes all three screenshot-supplied reflections in English and Russian', () => {
  const examples = curriculum.split('export const kundaliniVoices: EnergyworkTestimonial[] = [')[1]?.split('\n];')[0] ?? ''
  assert.ok(examples, 'The Kundalini review collection must exist')
  for (const id of ['kundalini-example-01', 'kundalini-example-02', 'kundalini-example-03']) {
    assert.ok(examples.includes('id: "' + id + '"'), id)
  }
  assert.equal((examples.match(/quote: l\(/g) || []).length, 3)
  assert.equal((examples.match(/attribution: l\(/g) || []).length, 3)
  for (const name of ['Breanna', 'Ritu', 'Aesthesia']) {
    assert.ok(examples.includes(name), 'Keep the facilitator reference ' + name)
  }
  for (const phrase of ['Бреанной', 'Риту', 'Во время практики с Aesthesia']) {
    assert.ok(examples.includes(phrase), 'Missing Russian translation detail: ' + phrase)
  }
  assert.ok(examples.includes('felt like healing'), 'Keep reported experiences subjective')
  assert.doesNotMatch(examples, /sourcePath:/, 'Screenshots are not verified source URLs')
  const slide = curriculum.split('id: "kun-voices"')[1]?.split('id: "kun-04"')[0] ?? ''
  assert.match(slide, /testimonials: kundaliniVoices/)
  assert.match(slide, /not reviews of this exact video/)
  assert.match(slide, /а не отзывы об этом конкретном видео/)
  assert.match(learner, /currentReview\?\.sourcePath/)
  assert.match(learner, /data-review-next/)
  assert.match(learner, /data-review-prev/)
  assert.match(css, /\.voiceQuote p \{[\s\S]*?overflow-y:auto;[\s\S]*?max-height:175px;/)
})

test('Flight to the Sun invites curiosity, removes clinical caveats and only offers published audio', () => {
  const opening = curriculum.slice(curriculum.indexOf('id: "flight-01"'), curriculum.indexOf('id: "flight-02"'))
  const audio = read('components/reiki-lesson-intro-audio.tsx')
  assert.match(opening, /The Sun is calling\. Ready\?/)
  assert.match(opening, /Солнце зовёт\. Готовы\?/)
  assert.match(opening, /Join Andrey on a gentle journey toward the Sun/)
  assert.match(opening, /воображаемый полёт к Солнцу/)
  assert.equal((opening.match(/\n\s+l\("/g) || []).length, 3)
  assert.doesNotMatch(opening, /physical or medical claim|не медицинское утверждение/i)
  assert.match(audio, /if \(!audio\) return null;/)
  assert.doesNotMatch(audio, /will be added here|скоро появится/)
  assert.match(css, /Flight to the Sun: warmer, more evocative opening/)
  assert.ok(css.includes('.slide[data-reiki-art-layout="background"][data-energywork-slide-id="flight-01"] .slideMain > .art img'))
  assert.match(css, /\[data-energywork-slide-id="flight-01"\] \.lessonIntroPanel/)
})


test('All five Reiki introductions say what to expect in simple, compact EN/RU copy', () => {
  const learner = read('components/energywork-ai-learner.tsx')
  assert.match(learner, /"What to expect"/)
  assert.match(learner, /"Что вас ждёт"/)
  for (const id of ['flight-01', 'tan-01', 'kun-01', 'ygg-01', 'paths-01']) {
    const intro = curriculum.match(new RegExp('id: "' + id + '"[\\s\\S]*?body: l\\("([^"]+)"[\\s\\S]*?introTopics: \\[([\\s\\S]*?)\\] \\}'))
    assert.ok(intro, id + ' should keep its established intro slide and topics')
    const enBody = intro[1]
    const topics = [...intro[2].matchAll(/l\("([^"]+)", "([^"]+)"\)/g)]
    assert.ok(enBody.split(/\s+/).length <= 28, id + ' has too much body copy')
    assert.equal(topics.length, 3, id + ' should still preview three activities')
    for (const [, en, ru] of topics) {
      assert.ok(en.length <= 45, id + ' EN topic wraps excessively')
      assert.ok(ru.length <= 51, id + ' RU topic wraps excessively')
    }
  }
})
