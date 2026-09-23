import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createMemoryPrescriptionStore} from '../lib/prescriptions/store.js'
import {createConsultation, updateConsultation} from '../lib/consultations/service.js'
import {getClientPrescription} from '../lib/prescriptions/service.js'
import {getClientPaymentDocument} from '../lib/documents/payment.js'
const input = {patientName:'Synthetic Client', consultationDate:'2026-09-18',items:[{remedySlug:'arsenicum-album'}]}
const create = (store, extra={}) => createConsultation({...input,...extra},{store,requestId:randomUUID()})
test('consultation defaults and bilingual projections isolate payment and clinical fields',async()=>{
 const store=createMemoryPrescriptionStore(); const {recommendation:r,payment:p}=await create(store,{internalNotes:'private',items:[{remedySlug:'arsenicum-album',purpose:'Purpose'}]})
 assert.equal(r.status,'active'); assert.equal(p.status,'active'); assert.equal(r.paymentDocumentId,p.id); assert.equal(p.consultationId,r.id); assert.equal(p.amount,23000); assert.equal(p.currency,'CAD'); assert.equal(p.paymentStatus,'received'); assert.equal(r.languagePreference,'en'); assert.equal(r.dateIssued,p.dateOfService); assert.equal(r.items[0].dosage,undefined)
 for(const locale of ['en','ru']){ const rc=getClientPrescription({...r,status:'active'},locale); const pc=getClientPaymentDocument({...p,status:'active'},locale); assert.match(rc.items[0].remedyPath,new RegExp(`^/${locale}/`)); assert.equal(rc.amount,undefined); assert.equal(pc.items,undefined); assert.equal(rc.internalNotes,undefined); assert.equal(pc.consultationId,undefined) }
})
test('validation rejects either invalid document before store mutation',async()=>{
 let writes=0;const store={saveConsultationPair(){writes++}}
 for(const extra of [{amount:'bad'},{items:[{}]},{items:[{remedySlug:'unknown'}]},{consultationDate:'2026-02-30'}]) await assert.rejects(create(store,extra))
 assert.equal(writes,0)
})
test('concurrent creation retries return one pair and survive a lost response',async()=>{
 const store=createMemoryPrescriptionStore(); const requestId=randomUUID();const pairs=await Promise.all(Array.from({length:8},()=>createConsultation(input,{store,requestId})))
 assert.equal(new Set(pairs.map(p=>p.recommendation.id)).size,1); assert.equal(new Set(pairs.map(p=>p.payment.id)).size,1)
 const retried=await createConsultation(input,{store,requestId});assert.deepEqual(retried,pairs[0])
})
test('pair edits preserve independently revoked and active access and reject stale writes',async()=>{
 const store=createMemoryPrescriptionStore();let {recommendation:r,payment:p}=await create(store)
 r={...r,status:'active',access:{selector:'rec',version:1}};p={...p,status:'revoked'};await store.save(r);await store.save(p)
 const next=await updateConsultation(r,p,{...input,patientName:'Updated',status:'active',amount:'240.00'},{store})
 assert.equal(next.recommendation.access.selector,'rec');assert.equal(next.payment.status,'revoked');assert.equal(next.payment.access,undefined);assert.equal(next.payment.patientName,'Updated')
 await assert.rejects(updateConsultation(r,p,{...input,patientName:'Stale'},{store}),/changed|conflict/i)
 assert.equal((await store.findById(r.id)).patientName,'Updated');assert.equal((await store.findById(p.id)).patientName,'Updated')
})

test('concurrent edits commit a consistent pair and reject the stale writer', async () => {
 const store=createMemoryPrescriptionStore();const pair=await create(store)
 const outcomes=await Promise.allSettled(['First','Second'].map(patientName=>updateConsultation(pair.recommendation,pair.payment,{...input,patientName},{store})))
 assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1)
 assert.equal((await store.findById(pair.recommendation.id)).patientName,(await store.findById(pair.payment.id)).patientName)
})

test('REST pair write sends encrypted atomic script and retries the same committed pair after response loss', async () => {
 const {createPrescriptionStore}=await import('../lib/prescriptions/store.js')
 const saved=new Map();const commands=[];let loseResponse=true
 const store=createPrescriptionStore({environment:{PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic.invalid',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic',PRESCRIPTIONS_DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')},fetchFn:async(_url,options)=>{
  const command=JSON.parse(options.body);commands.push(command)
  // Transport fixture models the Lua script's atomic request boundary, not Redis itself.
  assert.equal(command[0],'EVAL');assert.match(command[1],/redis.call\('MSET'/)
  const requestKey=command[5];const values=JSON.parse(command[10]);let result
  if(saved.has(requestKey)){result=JSON.parse(saved.get(requestKey)).map(key=>saved.get(key))}
  else{ for(let i=0;i<values.length;i+=2)saved.set(values[i],values[i+1]); result=[values[1],values[3]] }
  if(loseResponse){loseResponse=false;throw new Error('Response lost')}
  return {ok:true,json:async()=>({result})}
 }})
 const requestId=randomUUID()
 await assert.rejects(createConsultation(input,{store,requestId}),/Response lost/)
 const pair=await createConsultation(input,{store,requestId})
 assert.equal(saved.size,3);assert.equal(pair.recommendation.paymentDocumentId,pair.payment.id)
 for(const command of commands){assert.equal(JSON.stringify(command).includes(input.patientName),false);assert.equal(JSON.stringify(command).includes('arsenicum-album'),false)}
})

test('access CAS lets one first issuer win and never overwrites a revocation', async () => {
 const store=createMemoryPrescriptionStore();const {recommendation}=await create(store)
 const first={...recommendation,access:{selector:'first',version:1}}
 const second={...recommendation,access:{selector:'second',version:1}}
 const attempts=await Promise.all([store.saveAccessIfUnchanged(recommendation,first),store.saveAccessIfUnchanged(recommendation,second)])
 assert.deepEqual(attempts,[true,false]);assert.equal(await store.findBySelector('second'),undefined)
 const revoked={...first,status:'revoked',access:undefined};await store.save(revoked,first)
 assert.equal(await store.saveAccessIfUnchanged(first,{...first,access:{selector:'stale',version:2}}),false)
 assert.equal((await store.findById(first.id)).status,'revoked');assert.equal(await store.findBySelector('stale'),undefined)
})

test('REST access CAS rejects a write raced by revocation without inserting stale selector', async () => {
 const {createPrescriptionStore}=await import('../lib/prescriptions/store.js')
 const saved=new Map();let race=false
 const store=createPrescriptionStore({environment:{PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic.invalid',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic',PRESCRIPTIONS_DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')},fetchFn:async(_url,options)=>{
  const c=JSON.parse(options.body);let result
  if(c[0]==='SET'){saved.set(c[1],c[2]);result='OK'}
  else if(c[0]==='DEL'){saved.delete(c[1]);result=1}
  else if(c[0]==='GET')result=saved.get(c[1])??null
  else if(c[0]==='EVAL'){
   assert.match(c[1],/redis.call\('(GET|EXISTS)', KEYS\[1\]\)/)
   if(race){race=false;saved.set(c[3],'concurrent replacement')}
   if(c[1].includes("redis.call('EXISTS'") ? saved.has(c[3]) : saved.get(c[3])!==c[4])result=0
   else{const values=JSON.parse(c[5]);for(let i=0;i<values.length;i+=2)saved.set(values[i],values[i+1]);for(const key of JSON.parse(c[6]))saved.delete(key);result=1}
  }else throw new Error('Unexpected command')
  return {ok:true,json:async()=>({result})}
 }})
 const memory=createMemoryPrescriptionStore();const {recommendation}=await create(memory)
 await store.save(recommendation)
 const first={...recommendation,access:{selector:'first',version:1}}
 assert.equal(await store.saveAccessIfUnchanged(recommendation,first),true)
 assert.equal((await store.findBySelector('first')).id,first.id)
 const second={...first,access:{selector:'second',version:2}}
 race=true
 assert.equal(await store.saveAccessIfUnchanged(first,second),false)
 assert.equal(saved.has('prescription:selector:second'),false)
 await store.save(first)
 assert.equal(await store.saveAccessIfUnchanged(first,second),true)
 assert.equal(saved.has('prescription:selector:first'),false)
 assert.equal((await store.findBySelector('second')).id,second.id)
})


test('consultations persist the selected recommendation type and reject unknown types', async () => {
 const store=createMemoryPrescriptionStore()
 const pair=await create(store,{recommendationType:'bach',items:[{displayNameOverride:'Mimulus',sourceStatus:'custom'}]})
 assert.equal(pair.recommendation.recommendationType,'bach')
 assert.equal(getClientPrescription(pair.recommendation,'en').recommendationType,'bach')
 await assert.rejects(create(store,{recommendationType:'unknown'}),/recommendation type/i)
})
