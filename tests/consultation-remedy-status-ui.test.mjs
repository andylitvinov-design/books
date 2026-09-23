import test from 'node:test'
import assert from 'node:assert/strict'
import * as search from '../lib/consultations/remedy-search.js'
import * as editor from '../lib/consultations/editor.js'
import { readFile } from 'node:fs/promises'

const remedies = [
  { slug: 'aconitum', label: 'Aconitum', sourceStatus: 'canonical', importNames: ['Аконит', 'Аконитум', 'Aconite'] },
  { id: 'source-example', slug: null, label: 'Source Example', sourceStatus: 'source_only', importNames: ['Пример источника'] },
]

test('search supports transliterated aliases and keeps prefix selection explicit', () => {
  for (const query of ['aconit', 'Аконит', 'Аконитум', 'Aconitum', 'akonit', 'АКОНИТ']) {
    assert.equal(search.searchConsultationRemedies(remedies, query)[0]?.slug, 'aconitum', query)
  }
})

test('exact aliases suppress custom duplication, but unknown and ambiguous prefixes allow explicit custom', () => {
  const suggestions = search.consultationRemedySuggestions
  assert.equal(suggestions(remedies, ' ACONITE ').some((r) => r.sourceStatus === 'custom'), false)
  assert.equal(suggestions(remedies, 'Example New Remedy XYZ').at(-1)?.sourceStatus, 'custom')
  assert.equal(suggestions(remedies, 'aco').length, 2)
  assert.equal(suggestions(remedies, '  ').length, 0)
})

test('existing source and custom rows survive editing alongside canonical rows', async () => {
  const items = [
    { remedySlug: 'aconitum', sourceStatus: 'canonical', dosage: '' },
    { remedySlug: null, displayNameOverride: 'Source Example', sourceStatus: 'source_only', potency: '' },
    { remedySlug: null, displayNameOverride: '<b>Example New Remedy XYZ</b>', sourceStatus: 'custom', dosage: 'one' },
  ]
  const rows = editor.initialConsultationRows({ items }, remedies)
  assert.equal(rows.every((row) => row.selected), true)
  assert.deepEqual(editor.serializeConsultationRows(rows).map(({ remedySlug, displayNameOverride, sourceStatus }) => ({ remedySlug, displayNameOverride, sourceStatus })), items.map(({ remedySlug, displayNameOverride = null, sourceStatus }) => ({ remedySlug, displayNameOverride, sourceStatus })))
  assert.equal(editor.validateConsultationRows([...rows, { query: 'pending', selected: false }]), false)
  assert.equal(editor.validateConsultationRows([...rows, { query: ' ', selected: false }]), true)
  assert.equal(editor.validateConsultationRows([]), false)
})


test('consultation suggestion selection happens on pointer down before mobile blur can close the list', async () => {
  const source = await readFile('components/consultation-form.jsx', 'utf8')
  assert.match(source, /function selectRemedy\(index, remedy\)/)
  assert.match(source, /onPointerDown=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\)[\s\S]*?selectRemedy\(index, remedy\)/)
  assert.match(source, /onClick=\{\(\) => selectRemedy\(index, remedy\)\}/)
})

test('mobile consultation UI has compact controls, bounded dropdowns and a full-width primary action', async () => {
  const css = await readFile('app/globals.css', 'utf8')
  assert.match(css, /Practitioner consultation mobile polish/)
  assert.match(css, /\.consultation-form input\[type="date"\][\s\S]*?max-width: 100%/)
  assert.match(css, /\.consultation-form \.prescription-remedy-results[\s\S]*?max-height: min\(18rem, 42vh\)/)
  assert.match(css, /\.consultation-primary-action[\s\S]*?width: 100%/)
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.prescription-admin-header h1[\s\S]*?font-size: 34px/)
})


test('new consultation remedy rows default to 5 granules three times per day and serialize the chosen values', () => {
  const [row] = editor.initialConsultationRows(null, remedies, 1)
  assert.equal(row.granules, '5')
  assert.equal(row.timesPerDay, '3')
  row.remedySlug = 'aconitum'
  row.sourceStatus = 'canonical'
  row.selected = true
  row.query = 'Aconitum'
  row.granules = '7'
  row.timesPerDay = '2'
  const [saved] = editor.serializeConsultationRows([row])
  assert.equal(saved.granules, '7')
  assert.equal(saved.timesPerDay, '2')
})

test('existing consultations do not receive invented dose defaults when historical values are absent', () => {
  const [row] = editor.initialConsultationRows({ items: [{ remedySlug: 'aconitum', sourceStatus: 'canonical' }] }, remedies)
  assert.equal(row.granules, '')
  assert.equal(row.timesPerDay, '')
})

test('consultation UI exposes two compact numeric dose fields beside each remedy', async () => {
  const [source, css] = await Promise.all([
    readFile('components/consultation-form.jsx', 'utf8'),
    readFile('app/globals.css', 'utf8'),
  ])
  assert.match(source, /labels\.granules/)
  assert.match(source, /labels\.timesPerDay/)
  assert.match(source, /type="number"/)
  assert.match(css, /Compact per-remedy granule schedule/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\).*72px.*72px.*40px/s)
})
