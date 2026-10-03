import assert from 'node:assert/strict'
import test from 'node:test'

import { publicAssessmentView } from '../lib/clients/assessment-share.js'

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

test('public report view contains only the approved single-report projection', () => {
  const view = publicAssessmentView(record)
  assert.deepEqual(Object.keys(view).sort(), [
    'description',
    'id',
    'kind',
    'language',
    'occurredOn',
    'originalResult',
    'practitionerComment',
    'sourceName',
    'sourceVersion',
    'title',
  ].sort())
  assert.equal(view.id, record.id)
  assert.equal('clientId' in view, false)
  assert.equal('relatedDocumentIds' in view, false)
})

test('unshared legacy assessment cannot become a public report projection', () => {
  assert.equal(publicAssessmentView({ ...record, status: 'draft' }), undefined)
  assert.equal(publicAssessmentView({ ...record, status: 'archived' }), undefined)
})
