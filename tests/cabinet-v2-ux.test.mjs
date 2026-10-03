import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { getPortraitNextStep, reportTimeline } from '../lib/app/cabinet-ux.js'

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

test('portrait next step is based only on real saved state', () => {
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
    'history',
  )
})

test('report timeline keeps the original report date and labels a later save separately', () => {
  assert.deepEqual(
    reportTimeline([
      { id: 'saved-1', occurredOn: '2026-09-20', savedAt: '2026-10-03T12:00:00.000Z' },
    ]),
    [
      {
        id: 'saved-1',
        occurredAt: '2026-09-20T12:00:00.000Z',
        savedAt: '2026-10-03T12:00:00.000Z',
      },
    ],
  )
})

test('workspace exposes a real Reports layer and versioned optional Current State context', async () => {
  const [workspace, catalog] = await Promise.all([
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
  ])

  assert.match(workspace, /getPortraitNextStep/)
  assert.match(workspace, /\['reports', c\.reports, '\/reports'\]/)
  assert.match(workspace, /function ReportsIndex/)
  assert.match(workspace, /reportTimeline\(data\.savedReports\)/)
  assert.match(workspace, /c\.contextAtCheckIn/)
  assert.match(workspace, /\['trigger', c\.trigger\]/)
  assert.match(workspace, /\['desired_change', c\.desiredChange\]/)
  assert.match(catalog, /CURRENT_STATE_EN_V2/)
})
