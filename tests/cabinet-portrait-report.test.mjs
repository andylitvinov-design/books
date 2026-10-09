import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildCabinetReport, buildImagePdf } from '../lib/app/cabinet-report.js'

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')

const result = {
  id: 'account-owned-result',
  definitionKey: 'hh-current-state',
  definitionId: 'hh-current-state:v2:ru',
  measurementAt: '2026-10-08T16:20:00Z',
  instrumentLocale: 'ru',
  dimensions: [{ key: 'state.resource', value: 3, min: 0, max: 5, direction: 'higher-reported-resource', sourceConstruct: 'Resource' }],
}

test('PDF report contains ONLY actually measured self-report axes; no fictional 100% data', () => {
  const report = buildCabinetReport({ account: { displayName: 'Test user' }, results: [result] }, 'ru')
  assert.equal(report.tests.length, 1)
  assert.equal(report.measuredCount, 1)
  assert.equal(report.axes.find((axis) => axis.axis === 'resource')?.value, 60)
  assert.ok(report.axes.some((axis) => axis.value === null))
  assert.equal(report.lang, 'ru')
  assert.match(report.text.caution, /не.*диагноз/)
})

test('Empty cabinet report keeps scales unmeasured', () => {
  const model = buildCabinetReport({ results: [] })
  assert.equal(model.tests.length, 0)
  assert.equal(model.measuredCount, 0)
  assert.ok(model.axes.every((entry) => entry.value === null))
})

test('PDF writer creates a real page tree and a downloadable PDF Blob without external services', async () => {
  const blob = buildImagePdf([new Uint8Array([255,216,255,217])], 20, 20)
  assert.equal(blob.type, 'application/pdf')
  const bytes = Buffer.from(await blob.arrayBuffer())
  const pdf = bytes.toString('latin1')
  assert.match(pdf, /^%PDF-1\.4/)
  assert.match(pdf, /\/Count 1/)
  assert.match(pdf, /\/Filter \/DCTDecode/)
  assert.match(pdf, /startxref/)
  assert.match(pdf, /%%EOF$/)
})

test('Portrait actions are directly after figure, recommendations use only a non-sensitive intent', async () => {
  const visual = await read('components/app/test-explorer-visual.jsx')
  const actions = await read('components/app/portrait-report-actions.jsx')
  const app = await read('components/app/app-workspace.jsx')
  assert.match(visual, /portraitActions = null, compactPortrait = false/)
  assert.match(visual, /\{portrait && portraitActions\}/)
  assert.match(visual, /<details className={styles\.portraitDisclosure}/)
  assert.match(actions, /drawCabinetReportPdf\(model\)/)
  assert.match(actions, /disabled=\{!hasResults \|\| busy\}/)
  assert.match(actions, /\/app\/consultations\?intent=recommendations/)
  assert.match(app, /<PortraitReportActions data=\{data\} locale=\{locale\} \/>/)
  assert.match(app, /requestRecommendations=\{searchParams.get\('intent'\) === 'recommendations'\}/)
  assert.match(app, /shareConfirmed: confirmed/)
  assert.match(app, /shareResultId: shareId \|\| null/)
  for (const source of [visual, actions, await read('lib/app/cabinet-report.js')]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage|service_role|dangerouslySetInnerHTML/)
  }
})
