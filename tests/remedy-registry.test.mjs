import test from 'node:test'
import assert from 'node:assert/strict'
import { getConsultationRemedyOptions, findKnownRemedyName } from '../lib/remedies/registry.js'
import { consultationRemedySuggestions } from '../lib/consultations/remedy-search.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

test('actual registry exposes 95 canonical and 23 source entities without source audit details', () => {
 const options=getConsultationRemedyOptions()
 assert.equal(options.filter(r=>r.sourceStatus==='canonical').length,95)
 assert.equal(options.filter(r=>r.sourceStatus==='source_only').length,23)
 assert.equal(new Set(options.map(r=>r.id)).size,118)
 for(const r of options){assert.equal(r.sourceMessageIds,undefined);assert.equal(r.reviewStatus,undefined)}
})
test('Aconitum aliases resolve one canonical entity and never offer duplicate custom names', () => {
 for(const query of ['aconit','Aconitum','Aconite','Аконит','Аконитум',' AKONIT ']){
  assert.equal(findKnownRemedyName(query)?.slug,'aconitum',query)
  const matches=consultationRemedySuggestions(getConsultationRemedyOptions(),query)
  assert.equal(matches[0]?.slug,'aconitum',query)
  assert.equal(matches.some(r=>r.sourceStatus==='custom'),false,query)
 }
 assert.equal(findKnownRemedyName('Aconitum napellus'),undefined)
})
test('mixed bilingual PDFs link only the canonical remedy and omit internal status', () => {
 const record=createPrescription({status:'active',patientName:'Synthetic Client',practitionerName:'Andrii Litvinov',items:[{remedySlug:'arsenicum-album'},{displayNameOverride:'Medorrhinum'},{displayNameOverride:'Example New Remedy XYZ'}]})
 for(const locale of ['ru','en']){
  const projection=getClientPrescription(record,locale)
  const pdf=buildPrescriptionPdf(projection,locale,'https://synthetic.invalid').toString('latin1')
  assert.equal((pdf.match(/\/Subtype \/Link/g)||[]).length,1)
  assert.ok(pdf.includes(`/URI (https://synthetic.invalid/${locale}/homeopathy/remedies/arsenicum-album)`))
  assert.doesNotMatch(pdf,/source_only|custom|NaN|undefined/)
  assert.equal(projection.items[1].displayName,'Medorrhinum')
  assert.equal(projection.items[2].displayName,'Example New Remedy XYZ')
 }
})
