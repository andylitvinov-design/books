import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createConsultation } from '../lib/consultations/service.js'
import { getOwnerClientLink } from '../lib/consultations/owner-links.js'
import { issuePrescriptionAccess, verifyPrescriptionSecret } from '../lib/prescriptions/access.js'
const environment = { NODE_ENV: 'test', PRESCRIPTIONS_ADMIN_TOKEN: 'synthetic-owner-key' }
async function setup() {
 const store = createMemoryPrescriptionStore()
 const pair = await createConsultation({ patientName: 'Test Client', consultationDate: '2026-09-18', items: [{remedySlug:'arsenicum-album'}] }, {store,requestId:randomUUID()})
 return {store,...pair}
}
test('owner copies across reloads/locales reuse access; documents keep independent credentials', async () => {
 const {store,recommendation,payment}=await setup()
 const links=await Promise.all(Array.from({length:3},()=>getOwnerClientLink(store,recommendation.id,environment)))
 assert.deepEqual(links[0],links[1]);assert.deepEqual(links[1],links[2])
 assert.deepEqual(await getOwnerClientLink(store,recommendation.id,environment),links[0])
 const p=await getOwnerClientLink(store,payment.id,environment)
 assert.notEqual(p.selector,links[0].selector);assert.notEqual(p.secret,links[0].secret)
 const saved=await store.findById(recommendation.id)
 assert.equal(verifyPrescriptionSecret(saved,links[0].secret),true)
 assert.equal(JSON.stringify(saved).includes(links[0].secret),false)
})
test('owner link recovery fails closed on key change, legacy access, or revocation without rotation', async()=>{
 const {store,recommendation,payment}=await setup()
 await getOwnerClientLink(store,recommendation.id,environment)
 const current=await store.findById(recommendation.id)
 await assert.rejects(getOwnerClientLink(store,recommendation.id,{...environment,PRESCRIPTIONS_ADMIN_TOKEN:'different'}))
 assert.deepEqual(await store.findById(recommendation.id),current)
 await store.save({...current,status:'revoked'},current)
 await assert.rejects(getOwnerClientLink(store,recommendation.id,environment))
 const legacy=issuePrescriptionAccess(payment).record;await store.save(legacy,payment)
 await assert.rejects(getOwnerClientLink(store,payment.id,environment))
 assert.deepEqual(await store.findById(payment.id),legacy)
})
