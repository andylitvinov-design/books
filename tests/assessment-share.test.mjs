import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assessmentShareSecret,
  createPendingReportClaim,
  publicAssessmentView,
  readPendingReportClaim,
  verifyAssessmentShareSecret,
} from '../lib/clients/assessment-share.js'

const env = {
  NODE_ENV: 'test',
  PRESCRIPTIONS_DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
}
const record = {
  id: '10000000-0000-4000-8000-000000000101',
  clientId: '10000000-0000-4000-8000-000000000102',
  schemaVersion: 1,
  kind: 'research_result',
  title: 'Synthetic report',
  occurredOn: '2026-10-02',
  language: 'en',
  sourceName: 'Synthetic source',
  sourceVersion: 'v1',
  description: 'Description',
  originalResult: 'Result',
  practitionerComment: 'Comment',
  relatedDocumentIds: ['10000000-0000-4000-8000-000000000103'],
  status: 'shared',
  revision: 2,
}

test('shared assessment bearer is opaque, revision-bound and fail-closed', () => {
  const secret = assessmentShareSecret(record, env)
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(verifyAssessmentShareSecret(record, secret, env), true)
  assert.equal(verifyAssessmentShareSecret({ ...record, revision: 3 }, secret, env), false)
  assert.equal(verifyAssessmentShareSecret({ ...record, status: 'draft' }, secret, env), false)
})

test('public report view excludes legacy client identity and sibling documents', () => {
  const view = publicAssessmentView(record)
  assert.equal(view.id, record.id)
  assert.equal(view.title, record.title)
  assert.equal('clientId' in view, false)
  assert.equal('relatedDocumentIds' in view, false)
})

test('pending claim is signed, short-lived and contains no bearer secret', () => {
  const now = Date.parse('2026-10-02T20:00:00Z')
  const secret = assessmentShareSecret(record, env)
  const claim = createPendingReportClaim(record, env, now)
  assert.ok(claim)
  assert.equal(claim.includes(secret), false)
  assert.deepEqual(readPendingReportClaim(claim, env, now + 60_000), {
    id: record.id,
    revision: record.revision,
    expiresAt: now + 15 * 60_000,
  })
  assert.equal(readPendingReportClaim(claim, env, now + 16 * 60_000), undefined)
  assert.equal(readPendingReportClaim(claim.slice(0, -1) + 'x', env, now), undefined)
})
