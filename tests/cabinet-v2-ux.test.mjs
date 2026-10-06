import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import {
  formatReportDate,
  getPortraitNextStep,
  latestCompatibleChange,
  reportTimeline,
} from '../lib/app/cabinet-ux.js'

test('Current State v2 adds optional context without changing the five scored prompts or scorer', () => {
  const v1 = getAssessmentDefinition('hh-current-state', 'v1', 'en')
  const v2 = getAssessmentDefinition('hh-current-state', 'v2', 'en')

  assert.deepEqual(
    v2.questions.map(({ id, text, min, max }) => ({ id, text, min, max })),
    v1.questions.map(({ id, text, min, max }) => ({ id, text, min, max })),
  )
  assert.equal(v2.scoringKey, v1.scoringKey)
  assert.equal(v2.scoringVersion, v1.scoringVersion)
  assert.deepEqual(v2.optionalContext.map(({ id }) => id), [
    'current_focus',
    'trigger',
    'what_helps',
    'desired_change',
    'note',
  ])
})

test('portrait next step follows the real state, request, report and repeat-time priority', () => {
  assert.equal(getPortraitNextStep({ dimensions: [], savedReports: [], requests: [] }).kind, 'state')
  assert.equal(
    getPortraitNextStep({
      dimensions: [{ dimensionClass: 'state' }],
      savedReports: [],
      requests: [],
    }).kind,
    'tendencies',
  )
  assert.equal(
    getPortraitNextStep({
      dimensions: [{ dimensionClass: 'state' }, { dimensionClass: 'trait' }],
      savedReports: [],
      requests: [],
    }).kind,
    'history',
  )
  assert.equal(
    getPortraitNextStep({
      dimensions: [{ dimensionClass: 'state' }, { dimensionClass: 'trait' }],
      savedReports: [{ id: 'report-1', occurredOn: '2026-10-01' }],
      requests: [{ id: 'request-1', status: 'contacted' }],
    }).kind,
    'consultation',
  )
  assert.deepEqual(
    getPortraitNextStep({
      dimensions: [{ dimensionClass: 'state' }, { dimensionClass: 'trait' }],
      savedReports: [{ id: 'report-1', occurredOn: '2026-10-01', unread: true }],
      requests: [],
    }),
    { kind: 'report', href: '/reports/report-1' },
  )
  assert.deepEqual(
    getPortraitNextStep({
      dimensions: [
        { dimensionClass: 'state', measurementAt: '2026-09-01T00:00:00.000Z', suggestedRepeatDays: 14 },
        { dimensionClass: 'trait' },
      ],
      savedReports: [],
      requests: [],
      now: '2026-10-03T00:00:00.000Z',
    }),
    { kind: 'checkin', href: '/tests' },
  )
})

test('report timeline orders original dates newest first without leaking a synthetic noon clock', () => {
  assert.deepEqual(
    reportTimeline([
      { id: 'saved-1', occurredOn: '2026-09-20', savedAt: '2026-10-03T12:00:00.000Z' },
      { id: 'saved-2', occurredOn: '2026-10-01', savedAt: '2026-10-01T12:00:00.000Z' },
      { id: 'saved-0', occurredOn: '2026-09-20', savedAt: '2026-10-04T12:00:00.000Z' },
    ]),
    [
      {
        id: 'saved-2',
        occurredOn: '2026-10-01',
        savedAt: '2026-10-01T12:00:00.000Z',
      },
      {
        id: 'saved-0',
        occurredOn: '2026-09-20',
        savedAt: '2026-10-04T12:00:00.000Z',
      },
      {
        id: 'saved-1',
        occurredOn: '2026-09-20',
        savedAt: '2026-10-03T12:00:00.000Z',
      },
    ],
  )
  assert.equal(formatReportDate('2026-09-20', 'en-CA'), 'Sep 20, 2026')
})

test('latest change compares every compatible current-state dimension to the immediately previous result', () => {
  assert.deepEqual(
    latestCompatibleChange([
      {
        id: 'first',
        definitionKey: 'hh-current-state',
        definitionVersion: 'v2',
        measurementAt: '2026-09-01T00:00:00.000Z',
        dimensions: [{ key: 'state.resource', value: 4 }, { key: 'state.tension', value: 7 }],
      },
      {
        id: 'latest',
        definitionKey: 'hh-current-state',
        definitionVersion: 'v2',
        measurementAt: '2026-10-01T00:00:00.000Z',
        dimensions: [{ key: 'state.resource', value: 6 }, { key: 'state.tension', value: 5 }],
      },
    ]),
    [
      { key: 'state.resource', previous: 4, value: 6 },
      { key: 'state.tension', previous: 7, value: 5 },
    ],
  )
})

test('workspace keeps four primary sections and exposes Reports through Portrait, History and direct routes', async () => {
  const [workspace, catalog] = await Promise.all([
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
  ])

  assert.match(workspace, /getPortraitNextStep/)
  assert.doesNotMatch(workspace, /\['reports', c\.reports, '\/reports'\]/)
  assert.match(workspace, /\['consultations', c\.consultations, '\/consultations'\]/)
  assert.match(workspace, /\['monitoring', c\.monitoring, '\/monitoring'\]/)
  assert.match(workspace, /function ReportsIndex/)
  assert.match(workspace, /reportTimeline\(data\.savedReports\)/)
  assert.match(workspace, /LatestChange/)
  assert.match(workspace, /<PortraitGuide locale=\{locale\} dimensions=\{dimensions\}/)
  assert.match(workspace, /<ReportsFromAndy data=\{data\} locale=\{locale\}/)
  assert.match(workspace, /function ResultConsultationCta/)
  assert.match(workspace, /className="hh-result-page"/)
  assert.match(workspace, /className="hh-result-metrics"/)
  assert.match(workspace, /className="hh-result-footer"/)
  assert.match(workspace, /Заказать консультацию специалиста/)
  assert.match(workspace, /Your result stays private and is not shared automatically/)
  assert.match(catalog, /cabinet-result-page/)
  assert.match(catalog, /cabinet-result-actions-grid/)
  assert.match(catalog, /cabinet-result-footer/)
  assert.match(workspace, /c\.contextAtCheckIn/)
  assert.match(workspace, /\['trigger', c\.trigger\]/)
  assert.match(workspace, /\['desired_change', c\.desiredChange\]/)
  assert.match(catalog, /CURRENT_STATE_EN_V2/)
})


test('Welcome Home mood check-in keeps sad, neutral, happy order and is reused in landing and portrait', async () => {
  const [mood, landing, workspace] = await Promise.all([
    readFile('components/app/mood-checkin.jsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
  ])
  const sad = mood.indexOf("id: 'sad'")
  const neutral = mood.indexOf("id: 'neutral'")
  const happy = mood.indexOf("id: 'happy'")
  assert.ok(sad >= 0 && sad < neutral && neutral < happy)
  assert.ok(mood.includes('Welcome Home'))
  assert.ok(mood.includes('How are you feeling today?'))
  assert.ok(mood.includes('role="dialog"'))
  assert.ok(mood.includes('aria-modal="true"'))
  assert.ok(mood.includes('Take a free state analysis and get recommendations'))
  assert.ok(mood.includes('Пройти бесплатный тест-анализ состояния и получить рекомендации'))
  assert.ok(mood.includes('const [categories, setCategories] = useState([])'))
  assert.ok(mood.includes('current.includes(id) ? current.filter((item) => item !== id) : [...current, id]'))
  assert.ok(mood.includes('aria-pressed={categories.includes(id)}'))
  assert.ok(mood.includes('latestMood'))
  assert.ok(mood.includes('onMoodChange'))
  assert.ok(mood.includes('onDismiss'))
  assert.doesNotMatch(mood, /localStorage|sessionStorage/)
  assert.ok(landing.includes('<MoodCheckIn'))
  assert.ok(landing.includes('onMoodChange={handleGuestMoodChange}'))
  assert.ok(landing.includes("begin('state', payload)"))
  assert.ok(landing.includes('className="cabinet-monitor-actions"'))
  assert.ok(landing.includes('Take a free state analysis and get recommendations'))
  assert.ok(landing.includes('Build a personal test battery'))
  assert.ok(landing.includes('Пройти бесплатный тест-анализ состояния и получить рекомендации'))
  assert.ok(landing.includes('Подобрать персональную батарею тестов'))
  assert.ok(workspace.includes('<MoodCheckIn'))
  assert.ok(workspace.includes("getAssessmentDefinition('hh-current-state', 'v2', locale)"))
  assert.ok(workspace.includes("window.location.assign('/' + locale + '/app/runs/' + run.id)"))
})


test('Cabinet entry uses a single clean Academy-style hierarchy', async () => {
  const [mood, landing, ia] = await Promise.all([
    readFile('components/app/mood-checkin.jsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])
  assert.ok(mood.includes('<p className="hh-mood-kicker">{c.welcome}</p>'))
  assert.ok(mood.includes('className="hh-mood-title"'))
  assert.ok(!mood.includes('homeopathy-kicker hh-mood-kicker'))
  assert.ok(landing.includes('<h2 id="cabinet-title">{c.title}</h2>'))
  assert.ok(landing.includes("testsKicker: 'Mind–Body Monitor'"))
  assert.ok(landing.includes("tryTitle: 'Your Mind–Body Monitor'"))
  assert.ok(landing.includes("title: 'Your personal space'"))
  assert.ok(landing.includes("title: 'Ваше личное пространство'"))
  assert.ok(ia.includes('Cabinet v2.6'))
  assert.ok(ia.includes('.cabinet-signin-strip'))
  assert.ok(ia.includes('.cabinet-test-list'))
  assert.ok(ia.includes('max-width: 1040px'))
  assert.ok(!ia.includes('Cabinet v2.3'))
  assert.ok(!ia.includes('Cabinet v2.4'))
})

test('Cabinet catalog uses accessible image-led Mind–Body Monitor cards', async () => {
  const [landing, ia] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])
  assert.ok(landing.includes('className="cabinet-signin-strip"'))
  assert.ok(landing.includes('className="cabinet-test-list"'))
  assert.ok(landing.includes('className="cabinet-test-row"'))
  assert.ok(
    landing.indexOf('className="cabinet-guest-tests"') <
      landing.indexOf('className="cabinet-signin-strip"'),
    'public Cabinet should show Mind–Body Monitor before Google sign-in',
  )
  assert.ok(landing.includes("import Image from 'next/image'"))
  assert.ok(landing.includes('className="cabinet-test-image"'))
  assert.ok(landing.includes("stateText: '5 questions · ~1 min'"))
  assert.ok(landing.includes("traitText: '20 questions · ~3 min'"))
  assert.ok(landing.includes('aria-label={`${c.start}: ${c.stateTitle}`}'))
  assert.ok(landing.includes('aria-label={`${c.start}: ${c.traitTitle}`}'))
  assert.ok(!landing.includes('className="cabinet-test-count"'))
  assert.ok(!landing.includes('className="cabinet-account-row"'))
  assert.ok(ia.includes('.cabinet-test-image'))
  assert.ok(ia.includes('grid-template-columns: 128px minmax(0,1fr) 28px'))
  assert.ok(ia.includes('.hh-monitoring-grid'))
  assert.ok(ia.includes('.hh-monitoring-card'))
})


test('signed-in tests use the registry-driven Mind–Body Monitor catalogue', async () => {
  const workspace = await readFile('components/app/app-workspace.jsx', 'utf8')
  assert.ok(workspace.includes("'Tests & self-checks'"))
  assert.ok(workspace.includes("'Recommended'"))
  assert.ok(workspace.includes("'By area'"))
  assert.ok(workspace.includes('MONITORING_CATALOG.filter((item) => item.startable)'))
  assert.ok(workspace.includes('item?.questionCount'))
  assert.ok(workspace.includes('item?.durationMinutes'))
  assert.ok(workspace.includes('className="hh-monitoring-grid"'))
  assert.ok(workspace.includes('hh-monitoring-card'))
  assert.ok(workspace.includes('/images/holistic-house/video-posters/home-en-v2.webp'))
  assert.ok(workspace.includes('/images/holistic-house/video-posters/services-en-v2.webp'))
})

test('external Cabinet does not auto-open an unfinished guest test on page load', async () => {
  const landing = await readFile('components/app/cabinet-landing.jsx', 'utf8')
  assert.ok(landing.includes("setPhase('catalog')"))
  assert.ok(landing.includes("bootstrap.runs.find((item) => item.definitionId === def.id)"))
  assert.ok(!landing.includes("const existing = bootstrap.runs.at(-1)"))
  assert.ok(landing.includes('A saved draft resumes only after the visitor explicitly chooses that test card.'))
})

test('public and signed-in Cabinet share a white mood card with three separate mood buttons', async () => {
  const [mood, ia] = await Promise.all([
    readFile('components/app/mood-checkin.jsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])
  assert.ok(mood.includes("const moods = [c.sad, c.neutral, c.happy]"))
  assert.ok(mood.includes('<p className="hh-mood-kicker">{c.welcome}</p>'))
  assert.ok(mood.includes('<h1 className="hh-mood-title"'))
  assert.ok(mood.includes('<h2 className="hh-mood-title"'))
  assert.ok(ia.includes('.cabinet-landing-shell .hh-mood-checkin'))
  assert.ok(ia.includes('.hh-app .hh-mood-checkin--compact'))
  assert.ok(ia.includes('background: #fffdfa'))
  assert.ok(ia.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'))
  assert.ok(ia.includes('gap: 10px'))
  assert.ok(ia.includes('border: 1px solid #ddcdbb'))
  assert.ok(ia.includes('min-height: 92px'))
  assert.ok(!ia.includes('border-radius: 999px;\n  background: #f6eee3;\n  padding: 3px;'))
})


test('verified practitioner account exposes existing client and document tools only inside My Portrait', async () => {
  const [workspace, route, repository, access, adminSession] = await Promise.all([
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/repository.js', 'utf8'),
    readFile('lib/app/practitioner-access.js', 'utf8'),
    readFile('lib/prescriptions/admin-session.js', 'utf8'),
  ])

  assert.match(workspace, /data\.practitioner && <OwnerTools/)
  assert.match(workspace, /Clients/)
  assert.match(workspace, /New consultation/)
  assert.match(workspace, /Recommendation \/ prescription/)
  assert.match(workspace, /Receipt \/ Invoice/)
  assert.match(workspace, /appFetch\('practitioner\/open'/)

  assert.match(route, /joined === 'practitioner\/open'/)
  assert.match(route, /repo\.isPractitioner\(actor\)/)
  assert.match(route, /issueTrustedAdminSession/)
  assert.doesNotMatch(route, /practitioner\/access/)

  assert.match(repository, /practitionerEmailAllowed/)
  assert.match(repository, /practitioner,/)
  assert.match(repository, /async isPractitioner\(actor\)/)

  assert.match(access, /createHash\('sha256'\)/)
  assert.match(access, /timingSafeEqual/)
  assert.match(access, /clients: '\/admin\/clients'/)
  assert.match(access, /consultation: '\/admin\/consultations\/new'/)
  assert.match(access, /recommendation: '\/admin\/prescriptions\/new'/)
  assert.match(access, /payment: '\/admin\/payments\/new'/)
  assert.doesNotMatch(access, /@gmail\.com/)

  assert.match(adminSession, /issueTrustedAdminSession/)
  assert.match(adminSession, /path: '\/admin'/)
  assert.match(adminSession, /maxAge: 60 \* 60 \* 12/)
})


test('signed-in and guest test runners expose equivalent Quick and Guided modes', async () => {
  const [workspace, landing, workspaceCss, ia] = await Promise.all([
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('app/[locale]/app/[[...path]]/workspace.css', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])

  for (const source of [workspace, landing]) {
    assert.ok(source.includes('Quick'))
    assert.ok(source.includes('Guided'))
    assert.ok(source.includes("setMode('quick')"))
    assert.ok(source.includes("setMode('guided')"))
    assert.ok(source.includes('same questions'))
    assert.ok(source.includes('hh-runner-segments'))
    assert.ok(source.includes('hh-test-mode-toggle'))
  }

  assert.match(
    workspace,
    /mode === 'quick' \? Math\.min\(index \+ 1, def\.questions\.length\) : index/,
  )
  assert.match(
    landing,
    /progress: quick \? Math\.min\(index \+ 1, definition\.questions\.length\) : index/,
  )
  assert.ok(landing.includes("phase === 'mode'"))
  assert.ok(workspaceCss.includes('Test runner v2 — two equivalent completion modes'))
  assert.ok(ia.includes('Cabinet test runner v2 — shared Quick / Guided interaction model'))
  assert.ok(workspaceCss.includes('@media (prefers-reduced-motion:reduce)'))
  assert.ok(ia.includes('@media (prefers-reduced-motion:reduce)'))
})


test('My Profile v3 is action-first, prioritizes one next step, and keeps dense results in Portfolio', async () => {
  const [workspace, workspaceCss, appPage] = await Promise.all([
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('app/[locale]/app/[[...path]]/workspace.css', 'utf8'),
    readFile('app/[locale]/app/[[...path]]/page.jsx', 'utf8'),
  ])

  assert.ok(workspace.includes('function ProfileActionHub'))
  assert.ok(workspace.includes('function profileDashboardNextStep'))
  assert.ok(workspace.includes('function PortfolioPage'))
  assert.ok(workspace.includes("page === 'portfolio' && <PortfolioPage"))
  assert.ok(appPage.includes("'portfolio'"))
  assert.ok(workspace.includes("id: 'state'"))
  assert.ok(workspace.includes("id: 'recommendations'"))
  assert.ok(workspace.includes("id: 'portfolio'"))
  assert.ok(workspace.includes("id: 'history'"))
  assert.ok(workspace.includes("id: 'complete'"))
  assert.ok(workspace.includes("id: 'consultations'"))
  assert.ok(workspace.includes("id: 'reports'"))
  assert.ok(workspace.includes("['monitor', 'Now']"))
  assert.ok(workspace.includes("['data', 'My data']"))
  assert.ok(workspace.includes("['grow', 'Build my profile']"))
  assert.ok(workspace.includes("['support', 'Support']"))
  assert.ok(workspace.includes("['draft', 'in_progress'].includes(run.status)"))
  assert.ok(workspace.includes("${root}/monitoring/hh-current-state"))
  assert.ok(workspace.includes('hh-profile-summary'))
  assert.ok(workspace.includes('hh-profile-next'))
  assert.ok(workspace.includes('<ProfileOverview profile={profile} locale={locale} />'))
  assert.ok(workspace.includes('<MetricCard key={d.key} dimension={d} locale={locale} onSelect={setSelected} />'))
  assert.ok(workspace.includes('if (!reports.length) return null'))
  assert.ok(workspace.includes("definitionKey: def.key"))
  assert.ok(workspace.includes("window.location.assign('/' + locale + '/app/runs/' + run.id)"))
  assert.ok(workspaceCss.includes('.hh-profile-action-groups'))
  assert.ok(workspaceCss.includes('grid-template-columns: 96px minmax(0, 1fr) 24px'))
  assert.ok(workspaceCss.includes('.hh-profile-mood .hh-mood-checkin--compact'))
  assert.ok(workspaceCss.includes('min-height: 66px'))
})
