import test from 'node:test'
import assert from 'node:assert/strict'
import { getPrescriptionRemedyOptions } from '../lib/prescriptions/service.js'
import { searchConsultationRemedies } from '../lib/consultations/remedy-search.js'
const options = getPrescriptionRemedyOptions()
test('consultation autocomplete finds Latin, Russian and abbreviated canonical names', () => {
  for (const [query, slug] of [['arsenicum', 'arsenicum-album'], ['aurum', 'aurum-metallicum'], ['золото', 'aurum-metallicum'], ['nat mur', 'natrum-muriaticum'], ['gelsemium', 'gelsemium']]) {
    assert.ok(searchConsultationRemedies(options, query).some((r) => r.slug === slug), query)
  }
  assert.deepEqual(searchConsultationRemedies(options, 'not-a-remedy-name'), [])
})
