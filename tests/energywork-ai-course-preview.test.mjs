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
const originalVideos = read('data/academy/english-guided-meditations.ts')

test('Energywork course has a distinct versioned identity and stable slide IDs', () => {
  assert.match(curriculum, /ENERGYWORK_COURSE_ID = "academy-energywork-principles"/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-17.p0"/)
  const ids = [...curriculum.matchAll(/id: "(welcome-|flight-|presence-|intention-|boundaries-|paths-|ygg-|tan-|kun-|end-)[^"]+"/g)].map(match => match[0])
  assert.equal(ids.length, 39)
  assert.equal(new Set(ids).size, ids.length)
  for (const phase of ['welcome', 'flight', 'presence', 'intention', 'boundaries', 'paths', 'personal', 'complete']) {
    assert.ok(curriculum.includes(phase + ':'), phase)
  }
  for (const track of ['yggdrasil', 'tantra', 'kundalini']) {
    assert.match(curriculum, new RegExp('id: "' + ({ yggdrasil: 'ygg', tantra: 'tan', kundalini: 'kun' })[track] + '-01"'))
  }
  assert.ok(curriculum.includes('...commonSlides, ...(path ? pathSlides[path]'))
})

test('Original source videos, and only original source videos, are used', () => {
  assert.match(learner, /englishGuidedMeditations\.find/)
  assert.match(learner, /<AcademyVideoPlayer/)
  for (const key of ['flight-to-sun', 'tantra-reiki', 'reiki-yggdrasil', 'kundalini-reiki']) {
    assert.ok(curriculum.includes('videoKey: "' + key + '"'), key)
  }
  for (const id of ['HqfixazXqRY', 'w2BN-HYmHUk', '80xZ7jN6o2Y', '_IOX0E8N-To']) {
    assert.ok(originalVideos.includes(id), id)
    assert.ok(!curriculum.includes(id), 'video URLs remain in approved registry: ' + id)
  }
  assert.match(learner, /t\.unavailable/)
})

test('Guests are unsaved; signed-in learners use consent and durable authenticated progress', () => {
  assert.match(learner, /Guest preview · Answers are not saved/)
  assert.match(learner, /Гостевой просмотр · Ответы не сохраняются/)
  assert.match(learner, /action: "start", consent: true/)
  assert.match(learner, /continueTo: "energywork"/)
  assert.match(learner, /expectedRevision: revisionRef.current/)
  assert.match(learner, /const queueRef = useRef/)
  assert.match(learner, /950\)/)
  assert.match(learner, /const \[answers, setAnswers\] = useState<AnswerMap>\(\{\}\)/)
  assert.match(learner, /navigator\.clipboard\.writeText\(notes\)/)
  assert.doesNotMatch(learner, /(?:localStorage|sessionStorage)\s*[.\[]|fetch\(|XMLHttpRequest|sendBeacon/)
  assert.match(learner, /maxLength=\{1600\}/)
  assert.match(learner, /aria-pressed=\{path === choice\.id\}/)
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| experienceMissing \|\| \(slide\.kind === "path-choice" && !path\)\}/)
  assert.match(curriculum, /does not grant Level 1 initiation or certification/)
})

test('Preview navigation is integrated into Academy and the original source page remains', () => {
  assert.match(route, /key === "principles-of-energywork\/learn"/)
  assert.match(route, /EnergyworkAiLearner/)
  assert.match(route, /robots: \{ index: false, follow: false \}/)
  assert.match(route, /key === "principles-of-energywork"\) return <PrinciplesOfEnergywork/)
  assert.match(landing, /data-energywork-interactive-course/)
  assert.match(landing, /energywork-flight-to-sun/)
  assert.match(landing, /energywork-systems/)
  assert.match(academy, /path: "principles-of-energywork\/learn"/)
  assert.match(academy, /detailsPath: "academy\/principles-of-energywork"/)
  assert.match(cabinet, /path: 'principles-of-energywork\/learn'/)
})

test('Mobile-first teal learner has accessible buttons, outlines and no automatic video playback', () => {
  assert.match(learner, /<details className=\{styles\.programme\}>/)
  assert.match(learner, /role="progressbar"/)
  assert.match(learner, /aria-labelledby="energywork-slide-title"/)
  assert.match(learner, /type="range" min="0" max="10"/)
  assert.match(learner, /type="radio"/)
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /@media \(max-width: 380px\)/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
  assert.doesNotMatch(learner, /autoplay|autoPlay/)
})

test('Reiki Practitioner opening slide explains all three initiation opportunities and learning tasks', () => {
  const opening = curriculum.split('id: "welcome-01"')[1].split('id: "welcome-02"')[0]
  assert.match(opening, /Reiki Practitioner/)
  assert.match(opening, /Практик Рейки/)
  assert.match(learner, /3 possible Level 1 initiations/)
  assert.match(learner, /3 возможные инициации первой ступени/)
  assert.match(learner, /energyworkPathChoices\.map\(\(choice\) => <li key=\{choice\.id\}>/)
  assert.match(learner, /watch the course videos, complete the tasks and answer the questions/)
  assert.match(learner, /посмотрите учебные видео, выполните задания и ответьте на вопросы/)
  assert.match(learner, /finishing the course does not grant it automatically/)
  assert.match(css, /welcomeSlide \.art/)
})

test('First Reiki reflection asks about prior experience with four EN/RU options', () => {
  const schema = read('data/academy/energywork-ai-schema.js')
  const question = curriculum.split('id: "welcome-02"')[1].split('id: "flight-01"')[0]
  assert.match(question, /How familiar are you with Reiki\?/)
  assert.match(question, /Насколько вы знакомы с Рейки\?/)
  assert.match(question, /type: "choice"/)
  const optionIds = [...question.matchAll(/\{ id: "([^"]+)", label: l\(/g)].map((match) => match[1])
  assert.deepEqual(optionIds, ['beginner', 'energywork', 'reiki-1-2', 'master'])
  for (const ru of ['Пока не знаком', 'энергетических практик', '1-я или 2-я ступень', 'мастер Рейки']) {
    assert.ok(question.includes(ru), ru)
  }
  assert.match(schema, /'welcome-02': 'choice'/)
  assert.match(schema, /ENERGYWORK_EXPERIENCE_VALUES = Object\.freeze\(\['beginner','energywork','reiki-1-2','master'\]\)/)
  assert.match(schema, /ENERGYWORK_EXPERIENCE_VALUES\.includes\(answer\)/)
  assert.match(learner, /experienceMissing = slide\.id === "welcome-02"/)
  assert.match(learner, /if \(busy \|\| experienceMissing \|\|/)
  assert.match(learner, /role="status">\{experienceGuidance\[locale\]/)
  assert.match(css, /\.experienceChoice:has\(input:focus-visible\)/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-17\.p0"/)
  assert.match(schema, /ENERGYWORK_VERSION = '2026-10-17\.p0'/)
})
