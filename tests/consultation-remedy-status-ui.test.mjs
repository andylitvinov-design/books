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
  assert.match(source, /function selectItem\(index, remedy\)/)
  assert.match(source, /onPointerDown=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\)[\s\S]*?selectItem\(index, remedy\)/)
  assert.match(source, /onClick=\{\(\) => selectItem\(index, remedy\)\}/)
})

test('mobile consultation UI has compact controls, bounded dropdowns and a full-width primary action', async () => {
  const css = await readFile('app/globals.css', 'utf8')
  assert.match(css, /Practitioner consultation mobile polish/)
  assert.match(css, /\.consultation-form input\[type="date"\][\s\S]*?max-width: 100%/)
  assert.match(css, /\.consultation-form \.prescription-remedy-results[\s\S]*?max-height: min\(18rem, 42vh\)/)
  assert.match(css, /\.consultation-primary-action[\s\S]*?width: 100%/)
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.prescription-admin-header h1[\s\S]*?font-size: 34px/)
})


test('new consultation remedy rows default to potency 30, 5 granules and three times per day and serialize edited values', () => {
  const [row] = editor.initialConsultationRows(null, remedies, 1)
  assert.equal(row.potency, '30')
  assert.equal(row.granules, '5')
  assert.equal(row.timesPerDay, '3')
  row.remedySlug = 'aconitum'
  row.sourceStatus = 'canonical'
  row.selected = true
  row.query = 'Aconitum'
  row.potency = '200'
  row.granules = '7'
  row.timesPerDay = '2'
  const [saved] = editor.serializeConsultationRows([row])
  assert.equal(saved.potency, '200')
  assert.equal(saved.granules, '7')
  assert.equal(saved.timesPerDay, '2')
})

test('existing consultations do not receive invented dose defaults when historical values are absent', () => {
  const [row] = editor.initialConsultationRows({ items: [{ remedySlug: 'aconitum', sourceStatus: 'canonical' }] }, remedies)
  assert.equal(row.potency, '')
  assert.equal(row.granules, '')
  assert.equal(row.timesPerDay, '')
})

test('consultation UI exposes a compact potency / granules / times-per-day dose strip', async () => {
  const [source, css] = await Promise.all([
    readFile('components/consultation-form.jsx', 'utf8'),
    readFile('app/globals.css', 'utf8'),
  ])
  assert.match(source, /labels\.potency/)
  assert.match(source, /labels\.granules/)
  assert.match(source, /labels\.timesPerDay/)
  assert.match(source, /type="number"/)
  assert.match(css, /Mixed recommendation \+ compact editable dose controls/)
  assert.match(css, /\.consultation-dose-strip[\s\S]*grid-template-columns: repeat\(3/)
})


test('consultation UI can switch between Homeopathy, Bach and mixed modes with per-item type controls', async () => {
  const source = await readFile('components/consultation-form.jsx', 'utf8')
  assert.match(source, /name="recommendationType"/)
  assert.match(source, /value="homeopathy"/)
  assert.match(source, /value="bach"/)
  assert.match(source, /value="mixed"/)
  assert.match(source, /labels\.bach/)
  assert.match(source, /consultation-remedy-row--bach/)
  assert.match(source, /recommendationType === 'mixed'/)
  assert.match(source, /consultation-item-type/)
})


test('mixed rows serialize explicit Homeopathy and Bach item types without dose fields on Bach items', () => {
  const rows = editor.initialConsultationRows(null, remedies, 2)
  rows[0] = { ...rows[0], selected: true, remedySlug: 'aconitum', query: 'Aconitum', sourceStatus: 'canonical', itemType: 'homeopathy' }
  rows[1] = { ...rows[1], selected: true, remedySlug: null, displayNameOverride: 'Mimulus', query: 'Mimulus', sourceStatus: 'custom', itemType: 'bach', potency: '', granules: '', timesPerDay: '' }
  const saved = editor.serializeConsultationRows(rows)
  assert.equal(saved[0].itemType, 'homeopathy')
  assert.equal(saved[0].potency, '30')
  assert.equal(saved[1].itemType, 'bach')
  assert.equal(saved[1].displayNameOverride, 'Mimulus')
  assert.equal(saved[1].potency, '')
  assert.equal(saved[1].granules, '')
})
