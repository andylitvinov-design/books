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

import { consultationSavingAvailable } from '../lib/consultations/availability.js'
test('serverless Preview cannot claim saved documents using an isolated memory store', () => {
  assert.equal(consultationSavingAvailable({ NODE_ENV: 'development' }), true)
  assert.equal(consultationSavingAvailable({ VERCEL_ENV: 'preview' }), false)
  assert.equal(consultationSavingAvailable({ VERCEL_ENV: 'preview', PRESCRIPTIONS_KV_REST_API_URL: 'https://example.invalid' }), false)
  assert.equal(consultationSavingAvailable({ VERCEL_ENV: 'preview', PRESCRIPTIONS_KV_REST_API_URL: 'https://example.invalid', PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic', PRESCRIPTIONS_DATA_ENCRYPTION_KEY: 'synthetic' }), true)
})
