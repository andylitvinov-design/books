import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createConsultation } from '../lib/consultations/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { changeConsultationDocumentStatus } from '../lib/consultations/lifecycle.js'
const pair = (store) => createConsultation({patientName:'Synthetic',consultationDate:'2026-09-20',items:[{remedySlug:'aconitum'}]},{store,requestId:randomUUID()})
test('stale reactivation does not invalidate access issued after reactivation',async()=>{
 const store=createMemoryPrescriptionStore();const {recommendation:r,payment:p}=await pair(store)
 await changeConsultationDocumentStatus(store,r.id,p.id,'revoked')
 await changeConsultationDocumentStatus(store,r.id,p.id,'active')
 const active=await store.findById(p.id);await store.save({...active,access:{selector:'new-link',version:1}},active)
 await changeConsultationDocumentStatus(store,r.id,p.id,'active')
 assert.equal((await store.findById(p.id)).access.selector,'new-link')
 assert.equal((await store.findById(r.id)).status,'active')
 await assert.rejects(changeConsultationDocumentStatus(store,r.id,randomUUID(),'active'))
})
test('concurrent reactivation uses atomic pair revision guard',async()=>{
 const store=createMemoryPrescriptionStore();const {recommendation:r,payment:p}=await pair(store)
 await changeConsultationDocumentStatus(store,r.id,p.id,'revoked')
 const outcomes=await Promise.allSettled([1,2].map(()=>changeConsultationDocumentStatus(store,r.id,p.id,'active')))
 assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1)
 assert.equal((await store.findById(p.id)).status,'active')
})
