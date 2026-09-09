import assert from 'node:assert/strict'
import test from 'node:test'
import { initialPrescriptionRows, serializePrescriptionRows } from '../lib/prescriptions/editor.js'

test('new editor opens four independent blank rows and omits unused rows from submission', () => {
  const rows = initialPrescriptionRows(null, [])
  assert.equal(rows.length, 4)
  assert.equal(new Set(rows.map((row) => row.rowKey)).size, 4)
  rows[0].remedySlug = 'aurum-metallicum'
  rows[0].dosage = 'Test dosage'
  const submitted = JSON.parse(serializePrescriptionRows(rows))
  assert.equal(submitted.length, 1)
  assert.equal(submitted[0].dosage, 'Test dosage')
  assert.equal(submitted[0].rowKey, undefined)
  assert.equal(submitted[0].query, undefined)
})

test('editing resolves display names and removal keeps every remaining dose paired with its remedy', () => {
  const rows = initialPrescriptionRows({ items: [{ remedySlug: 'a', dosage: 'first' }, { remedySlug: 'b', dosage: 'second', instructions: 'Keep me' }] }, [{ slug: 'a', label: 'Remedy A' }, { slug: 'b', label: 'Remedy B' }])
  assert.equal(rows[1].query, 'Remedy B')
  const retained = JSON.parse(serializePrescriptionRows(rows.filter((_, index) => index !== 0)))
  assert.equal(retained[0].remedySlug, 'b')
  assert.equal(retained[0].dosage, 'second')
  assert.equal(retained[0].instructions, 'Keep me')
})

test('partially entered rows are not silently discarded', () => {
  const rows = initialPrescriptionRows(null, [])
  rows[2].dosage = 'Unassigned dose'
  assert.equal(JSON.parse(serializePrescriptionRows(rows)).length, 1)
})
