import assert from 'node:assert/strict'
import test from 'node:test'
import { samplesEnabled, getDocumentSample } from '../lib/documents/samples.js'
test('synthetic review is disabled in production and never reads private records', () => {
  assert.equal(samplesEnabled({ NODE_ENV: 'production' }), false)
  assert.equal(samplesEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'production' }), false)
  assert.equal(samplesEnabled({ NODE_ENV: 'development', VERCEL_ENV: 'production' }), false)
  assert.equal(samplesEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), true)
  assert.equal(getDocumentSample('unknown'), undefined)
  assert.equal(getDocumentSample('receipt').id, undefined)
  assert.match(getDocumentSample('receipt').patientName, /SYNTHETIC/)
  assert.equal(getDocumentSample('recommendation').amount, undefined)
})
