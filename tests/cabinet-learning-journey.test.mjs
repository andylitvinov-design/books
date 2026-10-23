import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { summarizeLearningJourney } from '../lib/app/learning-journey.mjs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const milestone = (journey, id) => journey.steps.find(step => step.id === id)

test('new account sees stage one, five real milestones and no fictional points', () => {
  const value = summarizeLearningJourney()
  assert.equal(value.level, 1)
  assert.equal(value.xp, 0)
  assert.equal(value.nextId, 'tests')
  assert.deepEqual(value.steps.map(step => step.id), ['tests','course','consultation','master','author'])
  assert.ok(value.steps.every(step => !step.done))
})

test('tests award XP once per DISTINCT saved definition, up to three tests', () => {
  const one = summarizeLearningJourney({ completedTests: 1 })
  const three = summarizeLearningJourney({ completedTests: 3 })
  const many = summarizeLearningJourney({ completedTests: 300 })
  assert.equal(one.xp, 30)
  assert.equal(three.xp, 90)
  assert.equal(many.xp, 90)
  assert.equal(milestone(many, 'tests').count, 3)
  assert.match(source('lib/app/learning-journey-repository.js'), /count\(distinct a\.provenance->>'definitionKey'\)/)
})

test('a course is rewarded only after its persisted completion', () => {
  const enrolled = summarizeLearningJourney({ freeCourseCompleted: false })
  const completed = summarizeLearningJourney({ freeCourseCompleted: true })
  assert.equal(milestone(enrolled, 'course').earned, 0)
  assert.equal(milestone(completed, 'course').earned, 130)
  assert.match(source('lib/app/learning-journey-repository.js'), /c\.status='completed' and c\.completed_at is not null/)
})

test('consultation request is a request, not a performed meeting or medical result', () => {
  const sent = summarizeLearningJourney({ freeConsultationRequested: true })
  assert.equal(milestone(sent, 'consultation').earned, 20)
  assert.equal(milestone(sent, 'consultation').requested, true)
  assert.equal(milestone(sent, 'consultation').attended, false)
  assert.match(source('lib/app/learning-journey-repository.js'), /s\.slug='free-intro-availability-request'/)
  assert.match(source('components/app/cabinet-journey.jsx'), /consultationPending:/)
})

test('XP, self-reported authority, or pending status never grants master approval', () => {
  const forged = summarizeLearningJourney({
    completedTests: 100, freeCourseCompleted: true, freeConsultationRequested: true,
    practitionerStatus: 'approved', practitionerActive: false,
    hasAuthoredCourse: true, hasPublishedCourse: true,
  })
  assert.equal(forged.practitionerApproved, false)
  assert.equal(forged.authoredPublished, false)
  assert.notEqual(forged.level, 5)
  const pending = summarizeLearningJourney({ practitionerStatus:'submitted', hasAuthoredCourse:true })
  assert.equal(milestone(pending, 'master').done, false)
  assert.equal(milestone(pending, 'master').earned, 45)
  assert.equal(milestone(pending, 'author').earned, 120)
})

test('all verified milestones are bounded, non-repeatable and role-gated', () => {
  const evidence = {
    completedTests: 3, freeCourseCompleted: true, freeConsultationRequested: true,
    practitionerStatus: 'approved', practitionerActive: true,
    hasAuthoredCourse: true, hasPublishedCourse: true,
  }
  const value = summarizeLearningJourney(evidence)
  assert.equal(value.xp, 540)
  assert.equal(value.maxXp, 540)
  assert.equal(value.level, 5)
  assert.equal(value.nextId, null)
  assert.ok(value.steps.every(step => step.done))
  assert.deepEqual(summarizeLearningJourney(evidence), summarizeLearningJourney(evidence))
})

test('API only exposes a GET behind verified actor and account header', () => {
  const route = source('app/api/app/[...path]/route.js')
  const server = source('lib/app/learning-journey-repository.js')
  assert.match(route, /joined === 'journey' && method === 'GET'/)
  assert.match(route, /request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
  assert.match(server, /transaction\(config, actor/)
  assert.match(server, /where a\.account_id=\$1/)
  assert.match(server, /where c\.account_id=\$1/)
  assert.match(server, /where p\.trusted_auth_user_id=\$1/)
  assert.doesNotMatch(server, /insert into|update app\.|delete from/i)
})

test('journey is FIRST in signed-in Profile, never duplicated in reports or guest state', () => {
  const workspace = source('components/app/app-workspace.jsx')
  const profile = source('components/app/profile-domains.jsx')
  const journey = source('components/app/cabinet-journey.jsx')
  const profileSection = workspace.slice(workspace.indexOf("{page === 'portrait' && ("))
  assert.match(profileSection, /<CabinetJourney\b[^>]*accountId=\{data\.account\.id\}[^>]*\/>\s*<CabinetToday/)
  assert.match(profileSection, /<CabinetToday[\s\S]*<ProfileDomains/)
  assert.doesNotMatch(profile, /CabinetJourney/)
  assert.match(workspace, /data\.account\.onboardingState !== 'active'/)
  assert.match(journey, /appFetch\('journey', undefined, undefined, \{ accountId, signal:/)
  assert.match(journey, /academy\/principles-of-energywork\/learn/)
  assert.match(journey, /services\/free-consultation/)
  assert.match(journey, /app\/consultations\?service=/)
  assert.match(source('supabase/migrations/20261023154000_hh_journey_free_intro_availability.sql'), /'free', null, null, null/)
  assert.match(source('supabase/migrations/20261023154000_hh_journey_free_intro_availability.sql'), /on conflict \(practitioner_id, slug\) do nothing/)
  assert.match(workspace, /service\.pricingMode === 'free'/)
  assert.match(journey, /materialTab=courses/)
  assert.match(journey, /От первых открытий/)
  assert.match(journey, /From your first discoveries/)
})

test('all five named and clickable journey steps are ALWAYS visible without opening details', () => {
  const journey = source('components/app/cabinet-journey.jsx')
  const css = source('components/app/cabinet-journey.module.css')
  assert.match(journey, /<ol className=\{styles\.roadmap\}[^>]*data-journey-visible-steps/)
  assert.match(journey, /t\.stages\.map\(\(stage, index\) =>/)
  assert.match(journey, /data-journey-stage=\{stage\.id\}/)
  assert.match(journey, /styles\.stepReward/)
  assert.match(journey, /String\(info\.earned\) \+ '\/' \+ String\(info\.reward\) \+ ' XP'/)
  assert.match(journey, /href=\{getRoute\(stage\.id, lang, canAuthor, journey\.freeConsultationServiceId\)\}/)
  assert.match(journey, /aria-current=\{current \? 'step' : undefined\}/)
  assert.match(journey, /<Link href=\{nextHref\}[^>]*className=\{styles\.primary\}/)
  assert.match(journey, /<details className=\{styles\.help\}/)
  assert.doesNotMatch(journey, /<details className=\{styles\.(?:roadmap|milestones|steps)\}/)
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 850px\)/)
  assert.match(css, /@media \(max-width: 430px\)/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /min-height: 49px/)
  assert.match(css, /\.stepTail \{ display: flex; flex-direction: column/)
  assert.match(css, /\.stepReward/)
  assert.match(css, /\.shell \.primary \{/)
  assert.match(css, /\.shell \.stepLink:focus-visible/)
  assert.match(css, /min-width: 0/)
})

test('step copy and statuses describe a request instead of pretending a free appointment happened', () => {
  const journey = source('components/app/cabinet-journey.jsx')
  assert.match(journey, /consultationHint: 'Not a confirmed appointment'/)
  assert.match(journey, /consultationHint: 'Запись ещё не подтверждена'/)
  assert.match(journey, /return t\.consultationSent/)
  assert.match(journey, /masterPending: 'На проверке'/)
  assert.match(journey, /XP earned/)
  assert.match(journey, /Накоплено XP/)
  assert.match(journey, /Master access requires approval/)
  assert.match(journey, /Статус мастера требует одобрения/)
  assert.match(journey, /aria-valuemax=\{t\.stages\.length\} aria-valuenow=\{completed\}/)
})
