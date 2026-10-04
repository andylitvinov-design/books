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
  assert.match(workspace, /function ReportsIndex/)
  assert.match(workspace, /reportTimeline\(data\.savedReports\)/)
  assert.match(workspace, /LatestChange/)
  assert.match(workspace, /<PortraitGuide locale=\{locale\} dimensions=\{dimensions\}/)
  assert.match(workspace, /<ReportsFromAndy data=\{data\} locale=\{locale\}/)
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
  assert.ok(mood.includes('Do a quick check-in'))
  assert.doesNotMatch(mood, /localStorage|sessionStorage/)
  assert.ok(landing.includes("<MoodCheckIn locale={locale} onQuickCheckin={() => begin('state')} disabled={busy} />"))
  assert.ok(workspace.includes('<MoodCheckIn'))
  assert.ok(workspace.includes("window.location.assign('/' + locale + '/app/tests')"))
})


test('Cabinet entry mirrors Academy hierarchy without changing the mood flow', async () => {
  const [mood, landing, ia] = await Promise.all([
    readFile('components/app/mood-checkin.jsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])
  assert.ok(mood.includes('homeopathy-kicker hh-mood-kicker'))
  assert.ok(landing.includes('<h2 id="cabinet-title">{c.title}</h2>'))
  assert.ok(landing.includes("testsKicker: 'Tests'"))
  assert.ok(landing.includes("testsKicker: 'Тесты'"))
  assert.ok(ia.includes('Cabinet v2.3'))
  assert.ok(ia.includes('.cabinet-landing-shell .hh-mood-checkin'))
  assert.ok(ia.includes('.cabinet-landing-shell .cabinet-google-card'))
  assert.ok(ia.includes('.cabinet-landing-shell .cabinet-guest-tests'))
  assert.ok(ia.includes('max-width: 1040px'))
})
