import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { initialConsultationRows, serializeConsultationRows } from '../lib/consultations/editor.js'
import { updateConsultation } from '../lib/consultations/service.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('new and edit routes render the same consultation report form', () => {
  const fresh = read('app/admin/consultations/new/page.js')
  const edit = read('app/admin/consultations/[id]/edit/page.js')
  assert.match(fresh, /<ConsultationForm\b/)
  assert.match(edit, /<ConsultationForm\b/)
  assert.match(fresh, /getRecommendedTestOptions\('ru'\)/)
  assert.match(edit, /getRecommendedTestOptions\('ru'\)/)
  assert.match(edit, /ReportVideoMaterialsEditor/)
})

test('all legacy edit and new-entry links converge on the report editor', () => {
  const result = read('app/admin/consultations/[id]/page.js')
  const oldEdit = read('app/admin/prescriptions/[id]/page.js')
  const oldNew = read('app/admin/prescriptions/new/page.js')
  assert.match(result, /editHref: `\/admin\/consultations\/\$\{recommendation\.id\}\/edit#edit-recommendation`/)
  assert.match(oldEdit, /redirect\(`\/admin\/consultations\/\$\{encodeURIComponent\(prescription\.id\)\}\/edit#edit-recommendation`\)/)
  assert.match(oldNew, /redirect\('\/admin\/consultations\/new'\)/)
  assert.doesNotMatch(oldEdit, /<PrescriptionForm/)
})

test('the shared editor retains existing detailed remedy properties', () => {
  const previous = {
    recommendationType: 'bach',
    items: [{ itemType:'bach', displayNameOverride:'Walnut', sourceStatus:'custom',
      purpose:'Transition', sequence:'Evening', dosage:'one', frequency:'weekly',
      duration:'a week', instructions:'Observe', notes:'Legacy detail' }],
  }
  const rows = initialConsultationRows(previous, [], 1)
  const serialized = serializeConsultationRows(rows)
  assert.equal(serialized.length, 1)
  for (const key of ['purpose', 'sequence', 'dosage', 'frequency', 'duration', 'instructions', 'notes'])
    assert.equal(serialized[0][key], previous.items[0][key])
})

test('editing a legacy report retains identity, status and custom letterhead', async () => {
  const old = {
    id:'legacy-report-id', createdAt:'2026-09-01T00:00:00.000Z', updatedAt:'2026-10-01T00:00:00.000Z',
    status:'draft', patientName:'A Client', patientDob:'1984-05-01', internalNotes:'For practitioner only',
    practitionerName:'A Practitioner', practitionerRole:'Custom role',
    practitionerBackground:'Custom background', practitionerContact:'Custom contact',
    recommendationType:'bach', languagePreference:'ru', dateIssued:'2026-10-01',
    items:[{itemType:'bach',displayNameOverride:'Walnut',sourceStatus:'custom'}],
  }
  let persisted
  const store = { async save(record, existing) { persisted = {record, existing} } }
  await updateConsultation(old, undefined, {
    patientName:'A Client', consultationDate:'2026-10-18', languagePreference:'ru',
    includeRecommendation:true, includeInvoice:false, analysis:'Edited',
    items:[{itemType:'bach',displayNameOverride:'Walnut',sourceStatus:'custom'}],
  }, {store, now:'2026-10-18T00:00:00.000Z'})
  assert.equal(persisted.existing, old)
  for (const key of ['id','createdAt','status','patientDob','internalNotes','practitionerName','practitionerRole','practitionerBackground','practitionerContact'])
    assert.equal(persisted.record[key], old[key], key)
  assert.equal(persisted.record.analysis, 'Edited')
})
