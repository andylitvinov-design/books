import test from 'node:test'
import assert from 'node:assert/strict'
import * as search from '../lib/consultations/remedy-search.js'
import * as editor from '../lib/consultations/editor.js'

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
