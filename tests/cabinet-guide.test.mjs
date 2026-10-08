import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildCabinetGuideSteps } from '../lib/app/cabinet-guide.js'

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('A new account sees a real test-discovery action and no invented score', () => {
  const steps = buildCabinetGuideSteps({ results: [], runs: [] }, { locale: 'ru' })
  assert.equal(steps[0].key, 'first')
  assert.equal(steps[0].href, '/ru/app/tests')
  assert.ok(steps.every((step) => step.title && step.body && step.action && step.href))
  assert.doesNotMatch(JSON.stringify(steps), /\b\d+%|diagnosed|cured/i)
})

test('Drafts take precedence, followed by review and topic selection', () => {
  const data = {
    runs: [{ id: 'run-123', status: 'in_progress' }],
    results: [{ id: 'result-123', measurementAt: '2026-10-08T12:00:00Z' }],
  }
  const steps = buildCabinetGuideSteps(data, { locale: 'en', page: 'portrait' })
  assert.equal(steps[0].key, 'continue')
  assert.equal(steps[0].href, '/en/app/runs/run-123')
  assert.ok(steps.some((entry) => entry.href === '/en/app/history'))
})

test('An active test battery offers a useful existing route without inventing a run', () => {
  const steps = buildCabinetGuideSteps({
    activeTestPlan: { status: 'active', definitionIds: ['a', 'b'], completedRunIds: ['a'] },
  }, { locale: 'en' })
  assert.equal(steps[0].key, 'plan')
  assert.equal(steps[0].href, '/en/app/tests')
})

test('A results page links only to a known account-owned result', () => {
  const data = { results: [{ id: 'known-id' }], runs: [] }
  const owned = buildCabinetGuideSteps(data, { page: 'results', recordId: 'known-id' })
  const unknown = buildCabinetGuideSteps(data, { page: 'results', recordId: 'different-id' })
  assert.equal(owned[0].href, '/en/app/results/known-id')
  assert.ok(unknown.every((entry) => !entry.href.includes('different-id')))
})

test('Optional or malformed account data is handled without exposing answers', () => {
  const a = buildCabinetGuideSteps()
  const b = buildCabinetGuideSteps({ results: null, runs: null, activeTestPlan: {} })
  assert.ok(a.length >= 2 && b.length >= 2)
  assert.equal(buildCabinetGuideSteps({ runs: [{ id: '../../bad', status: 'draft' }] })[0].href, '/en/app/runs/..%2F..%2Fbad')
})

test('The helper is accessible, non-interfering during test runs, and responsive', async () => {
  const jsx = await read('components/app/cabinet-guide.jsx')
  const css = await read('components/app/cabinet-guide.module.css')
  const app = await read('components/app/app-workspace.jsx')
  assert.match(jsx, /<aside.*aria-label=/)
  assert.match(jsx, /aria-pressed=/)
  assert.match(jsx, /aria-live="polite"/)
  assert.match(jsx, /aria-expanded=/)
  assert.match(jsx, /<GuideFigure \/>/)
  assert.match(jsx, /buildCabinetGuideSteps/)
  assert.match(app, /<CabinetGuide data={data}/)
  assert.match(app, /\['portrait', 'tests', 'history', 'results', 'portfolio'\]\.includes\(page\)/)
  assert.doesNotMatch(app, /'runs', 'tests', 'history', 'results', 'portfolio'\]\.includes\(page\)/)
  assert.match(css, /position:sticky/)
  assert.match(css, /@media\(max-width:680px\)/)
  assert.match(css, /prefers-reduced-motion/)
  for (const content of [jsx, css, await read('lib/app/cabinet-guide.js')]) {
    assert.doesNotMatch(content, /localStorage|sessionStorage|fetch\(|dangerouslySetInnerHTML|service_role/i)
  }
})
