import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizePlaudImport } from '../lib/business-context/connectors.mjs'

test('Plaud import contract is manual, bounded and deterministic', () => {
  const record = normalizePlaudImport({ mode: 'manual', filename: 'call.txt', content: 'We decided to send the proposal. Alex will review it.' })
  assert.equal(record.provider, 'plaud_import')
  assert.equal(record.importMode, 'manual')
  assert.match(record.providerRecordId, /^[a-f0-9]{64}$/)
  assert.match(record.revisionHash, /^[a-f0-9]{64}$/)
})

test('private API exposes only consented Plaud import and review boundaries', () => {
  const route = readFileSync(new URL('../app/api/app/[...path]/route.js', import.meta.url), 'utf8')
  assert.match(route, /business-context/)
  assert.match(route, /plaud-import/)
  assert.match(route, /reviewBusinessInsight/)
  assert.doesNotMatch(route, /linear.*mutation/i)
})

test('Plaud import never falls back to provider API mode', () => {
  assert.throws(() => normalizePlaudImport({ mode: 'api', filename: 'x', content: 'x' }), /PLAUD_IMPORT_MODE_UNSUPPORTED/)
})
