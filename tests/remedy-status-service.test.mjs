import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createConsultation } from '../lib/consultations/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
const base={patientName:'Synthetic Client',practitionerName:'Andrii Litvinov',status:'active'}
test('server recomputes canonical status and ignores forged display metadata',()=>{
 const r=createPrescription({...base,items:[{remedySlug:'arsenicum-album',displayNameOverride:'Spoof',sourceStatus:'custom'}]})
 assert.equal(r.items[0].sourceStatus,'canonical');assert.equal(r.items[0].displayNameOverride,null)
 assert.equal(r.items[0].displayName,'Arsenicum Album')
})
test('source-only and unknown remedies are accepted with server-derived statuses',()=>{
 const r=createPrescription({...base,items:[{displayNameOverride:'  medorrhinum ',sourceStatus:'canonical'},{displayNameOverride:'Example New Remedy XYZ',sourceStatus:'source_only'}]})
 assert.equal(r.items[0].sourceStatus,'source_only');assert.equal(r.items[0].displayNameOverride,'Medorrhinum');assert.equal(r.items[0].remedySlug,null)
 assert.equal(r.items[1].sourceStatus,'custom');assert.equal(r.items[1].remedySlug,null)
 for(const locale of ['ru','en'])for(const i of getClientPrescription(r,locale).items){assert.equal(i.remedyPath,undefined);assert.equal(i.sourceStatus,undefined)}
})
test('exact known aliases cannot be laundered into custom records',()=>{
 const r=createPrescription({...base,items:[{displayNameOverride:'  ARSENICUM   ALBUM ',sourceStatus:'custom'}]})
 assert.equal(r.items[0].remedySlug,'arsenicum-album');assert.equal(r.items[0].sourceStatus,'canonical')
})
test('mixed names produce one linked pair without invented clinical content',async()=>{
 const pair=await createConsultation({patientName:'Synthetic Client',consultationDate:'2026-09-20',items:[{remedySlug:'arsenicum-album'},{displayNameOverride:'Medorrhinum'},{displayNameOverride:'Example New Remedy XYZ'}]},{store:createMemoryPrescriptionStore(),requestId:randomUUID()})
 assert.equal(pair.payment.amount,23000);assert.equal(pair.recommendation.items.length,3)
 for(const item of pair.recommendation.items)for(const key of ['potency','dosage','frequency','duration','instructions'])assert.equal(item[key],undefined)
 for(const locale of ['en','ru']){const items=getClientPrescription(pair.recommendation,locale).items;assert.equal(items[0].remedyPath,`/${locale}/homeopathy/remedies/arsenicum-album`);assert.equal(items[1].remedyPath,undefined);assert.equal(items[2].remedyPath,undefined)}
})
test('empty, overlong and forged slug items fail before save',async()=>{
 for(const item of [{},{displayNameOverride:' '.repeat(8)},{displayNameOverride:'x'.repeat(201)},{remedySlug:'fake',displayNameOverride:'Example',sourceStatus:'canonical'}])assert.throws(()=>createPrescription({...base,items:[item]}))
})
