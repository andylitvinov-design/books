import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createConsultation } from '../lib/consultations/service.js'
import { createClient } from '../lib/clients/service.js'
import { getOwnerCabinetLink, rotateCabinetAccess, revokeCabinetAccess, verifyCabinetSecret, createCabinetSession, authorizeCabinetDocument, authorizeCabinetSession, cabinetSessionTtlSeconds } from '../lib/clients/access.js'
const input={patientName:'Synthetic Client',consultationDate:'2026-09-21',items:[{remedySlug:'arsenicum-album'}],newClient:{fullName:'Synthetic Client',preferredLocale:'en'}}
const environment={NODE_ENV:'test',PRESCRIPTIONS_ADMIN_TOKEN:'synthetic-only'}
test('new-client concurrent retries commit one client and one indexed pair; next consultation uses same client',async()=>{
 const store=createMemoryPrescriptionStore();const requestId=randomUUID()
 const pairs=await Promise.all(Array.from({length:8},()=>createConsultation(input,{store,requestId})))
 assert.equal(new Set(pairs.map(p=>p.recommendation.id)).size,1)
 const id=pairs[0].recommendation.clientId;assert.ok(id);assert.equal(pairs[0].payment.clientId,id)
 assert.equal((await store.listClients()).length,1);assert.equal((await store.listClientDocuments(id)).length,2)
 await createConsultation({...input,newClient:undefined,clientId:id},{store,requestId:randomUUID()})
 assert.equal((await store.listClientDocuments(id)).length,4)
})
test('stable concurrent copy, exact document isolation, rotation and revocation',async()=>{
 const store=createMemoryPrescriptionStore();const client=createClient(input.newClient);await store.saveClient(client)
 const links=await Promise.all(Array.from({length:8},()=>getOwnerCabinetLink(store,client.id,environment)))
 assert.equal(new Set(links.map(l=>l.secret)).size,1)
 const current=await store.findClientById(client.id);const session=createCabinetSession(current)
 assert.equal(cabinetSessionTtlSeconds,30*24*60*60);assert.equal(verifyCabinetSecret(current,links[0].secret),true)
 assert.equal(authorizeCabinetDocument(current,links[0].selector,session,{status:'active',clientId:client.id}),true)
 assert.equal(authorizeCabinetDocument(current,links[0].selector,session,{status:'active',clientId:randomUUID()}),false)
 await rotateCabinetAccess(store,client.id,environment);let next=await store.findClientById(client.id)
 assert.equal(verifyCabinetSecret(next,links[0].secret),false);assert.equal(authorizeCabinetSession(next,links[0].selector,session),false)
 await revokeCabinetAccess(store,client.id);next=await store.findClientById(client.id)
 await assert.rejects(getOwnerCabinetLink(store,client.id,environment),/revoked/i)
 assert.equal(authorizeCabinetSession(next,links[0].selector,session),false)
})

test('legacy assignment races attach a pair once and keep document access intact', async()=>{
 const {assignLegacyConsultation}=await import('../lib/clients/service.js');const store=createMemoryPrescriptionStore()
 const a=createClient(input.newClient),b=createClient({...input.newClient,fullName:'Other Synthetic'});await store.saveClient(a);await store.saveClient(b)
 const pair=await createConsultation({...input,newClient:undefined},{store,requestId:randomUUID()})
 const outcomes=await Promise.allSettled([a,b].map(c=>assignLegacyConsultation(store,pair.recommendation.id,c.id)))
 assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1)
 const r=await store.findById(pair.recommendation.id),p=await store.findById(pair.payment.id);assert.equal(r.clientId,p.clientId)
 assert.equal((await store.listClientDocuments(r.clientId)).length,2)
 assert.equal((await store.listUnassignedConsultations()).records.length,0)
})

test('client-session expiry, wrong selector, inactive documents and archive fail closed',async()=>{
 const store=createMemoryPrescriptionStore();const c=createClient(input.newClient);await store.saveClient(c)
 const link=await getOwnerCabinetLink(store,c.id,environment);const current=await store.findClientById(c.id);const session=createCabinetSession(current)
 assert.equal(authorizeCabinetSession(current,link.selector,{...session,expiresAt:0}),false)
 assert.equal(authorizeCabinetSession(current,'wrong',session),false)
 assert.equal(authorizeCabinetSession({...current,status:'archived'},link.selector,session),false)
 assert.equal(authorizeCabinetDocument(current,link.selector,session,{clientId:c.id,status:'revoked'}),false)
 assert.equal(verifyCabinetSecret(current,'invalid'),false)
 await store.createCabinetSession(session,cabinetSessionTtlSeconds);const saved=await store.findCabinetSession(session.digest)
 assert.equal(saved.token,undefined);assert.equal(saved.digest,undefined);assert.equal(saved.clientId,c.id)
})

test('client identity is immutable in independent document writes',async()=>{
 const store=createMemoryPrescriptionStore();const pair=await createConsultation(input,{store,requestId:randomUUID()})
 await assert.rejects(store.save({...pair.recommendation,clientId:randomUUID()},pair.recommendation),/immutable/)
})

test('REST client PII encrypted, ID-only indexes, atomic new-client retries and hashed cabinet sessions',async()=>{
 const {createPrescriptionStore}=await import('../lib/prescriptions/store.js');const saved=new Map(),sets=new Map(),commands=[]
 const add=(k,...ids)=>{const set=sets.get(k)??new Set();ids.forEach(id=>set.add(id));sets.set(k,set)}
 const store=createPrescriptionStore({environment:{PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic.invalid',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic',PRESCRIPTIONS_DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')},fetchFn:async(_url,options)=>{
  const c=JSON.parse(options.body);commands.push(c);let result
  if(c[0]==='GET')result=saved.get(c[1])??null
  else if(c[0]==='MGET')result=c.slice(1).map(k=>saved.get(k)??null)
  else if(c[0]==='SMEMBERS')result=[...(sets.get(c[1])??[])]
  else if(c[0]==='SET'){saved.set(c[1],c[2]);result='OK'}
  else if(c[0]==='EVAL'&&c[2]===3){
   const prior=saved.get(c[5]);if(prior)result=JSON.parse(prior).map(k=>saved.get(k))
   else {const values=JSON.parse(c[10]);const state=JSON.parse(c[11]);assert.match(c[1],/redis.call\('SADD', client.history/)
    if(state.isNew? saved.has(state.key):saved.get(state.key)!==state.expected)return {ok:true,json:async()=>({error:'conflict'})}
    for(let i=0;i<values.length;i+=2)saved.set(values[i],values[i+1]);add(state.directory,state.id);add(state.history,...state.documents);result=[values[1],values[3]]}
  } else throw new Error('Unexpected fixture command')
  return {ok:true,json:async()=>({result})}
 }})
 const requestId=randomUUID();const confidential={...input,newClient:{...input.newClient,email:'synthetic@example.invalid',phone:'+1 synthetic',notes:'Confidential synthetic note'}}
 const first=await createConsultation(confidential,{store,requestId});const retry=await createConsultation(confidential,{store,requestId})
 assert.deepEqual(retry,first);assert.equal((await store.listClients()).length,1);assert.equal((await store.listClientDocuments(first.recommendation.clientId)).length,2)
 const client=await store.findClientById(first.recommendation.clientId);assert.equal(client.notes,confidential.newClient.notes)
 const wire=JSON.stringify(commands);for(const pii of ['Synthetic Client','synthetic@example.invalid','Confidential synthetic note','arsenicum-album'])assert.equal(wire.includes(pii),false)
 const session={token:'raw-never-persist',digest:'hash-only',clientId:client.id,selector:'selector',accessVersion:1,expiresAt:Date.now()+10000};await store.createCabinetSession(session,30)
 assert.equal(JSON.stringify([...saved]).includes(session.token),false)
})

test('legacy standalone recommendation and payment listed and explicitly associated',async()=>{
 const {assignLegacyConsultation}=await import('../lib/clients/service.js');const {createPrescription}=await import('../lib/prescriptions/service.js');const {createPaymentDocument}=await import('../lib/documents/payment.js')
 const store=createMemoryPrescriptionStore();const c=createClient(input.newClient);await store.saveClient(c)
 const r=createPrescription({practitionerName:'Synthetic practitioner',patientName:'Synthetic standalone',dateIssued:'2026-09-21',items:input.items,status:'active'})
 const p=createPaymentDocument({service:'Synthetic consultation',patientName:'Synthetic standalone',dateIssued:'2026-09-21',dateOfService:'2026-09-21',amount:'10.00',status:'active'})
 await store.save(r);await store.save(p)
 assert.equal((await store.listUnassignedConsultations()).records.length,2)
 await assignLegacyConsultation(store,r.id,c.id);await assignLegacyConsultation(store,p.id,c.id)
 assert.equal((await store.listClientDocuments(c.id)).length,2)
})

test('new client legacy assignment double-submit is atomic and idempotent; no orphan client',async()=>{
 const {assignLegacyConsultation}=await import('../lib/clients/service.js');const store=createMemoryPrescriptionStore()
 const pair=await createConsultation({...input,newClient:undefined},{store,requestId:randomUUID()});const requestId=randomUUID()
 const results=await Promise.all(Array.from({length:8},()=>assignLegacyConsultation(store,pair.recommendation.id,{newClient:input.newClient},{requestId})))
 assert.equal(new Set(results.map(r=>r.clientId)).size,1);assert.equal((await store.listClients()).length,1)
 const replay=await assignLegacyConsultation(store,pair.recommendation.id,{newClient:input.newClient},{requestId});assert.equal(replay.clientId,results[0].clientId)
 await assert.rejects(assignLegacyConsultation(store,pair.recommendation.id,{newClient:input.newClient},{requestId:randomUUID()}))
 assert.equal((await store.listClients()).length,1)
})

test('REST legacy assignment encrypts PII and replays lost response without creating another client',async()=>{
 const {createPrescriptionStore}=await import('../lib/prescriptions/store.js');const {assignLegacyConsultation}=await import('../lib/clients/service.js')
 const saved=new Map(),sets=new Map(),wire=[];let lose=false
 const store=createPrescriptionStore({environment:{PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic.invalid',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic',PRESCRIPTIONS_DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')},fetchFn:async(_url,options)=>{
  const c=JSON.parse(options.body);wire.push(c);let result
  if(c[0]==='GET')result=saved.get(c[1])??null
  else if(c[0]==='MGET')result=c.slice(1).map(k=>saved.get(k)??null)
  else if(c[0]==='SET'){saved.set(c[1],c[2]);result='OK'}
  else if(c[0]==='SMEMBERS')result=[...(sets.get(c[1])??[])]
  else if(c[0]==='EVAL'&&c[2]===1){ const values=JSON.parse(c[5]);for(let i=0;i<values.length;i+=2)saved.set(values[i],values[i+1]);result=1 }
  else if(c[0]==='EVAL'&&c[2]===0){
   const state=JSON.parse(c[3]),values=JSON.parse(c[4]);assert.match(c[1],/redis.call\('MSET'/);assert.match(c[1],/state.expected/)
   for(let i=0;i<values.length;i+=2)saved.set(values[i],values[i+1])
   sets.set(state.directory,new Set([state.clientId]));sets.set(state.history,new Set(state.ids));result=state.keys.map(k=>saved.get(k))
   if(lose){lose=false;throw new Error('Synthetic response lost')}
  }else throw new Error('Unexpected command')
  return {ok:true,json:async()=>({result})}
 }})
 const id=randomUUID();await store.save({id,status:'active',patientName:'Synthetic legacy',items:[],createdAt:'2026-09-21'})
 const requestId=randomUUID();lose=true
 await assert.rejects(assignLegacyConsultation(store,id,{newClient:{fullName:'Synthetic legacy client'}},{requestId}),/response lost/)
 const result=await assignLegacyConsultation(store,id,{newClient:{fullName:'Synthetic legacy client'}},{requestId})
 assert.equal(result.records.length,1);assert.equal((await store.listClients()).length,1);assert.equal((await store.listClientDocuments(result.clientId)).length,1)
 assert.equal(wire.filter(c=>c[0]==='EVAL'&&c[2]===0).length,1);assert.equal(JSON.stringify(wire).includes('Synthetic legacy'),false)
})

test('stale independent save cannot erase client ownership assigned after the editor loaded',async()=>{
 const {assignLegacyConsultation}=await import('../lib/clients/service.js');const store=createMemoryPrescriptionStore()
 const c=createClient(input.newClient);await store.saveClient(c)
 const pair=await createConsultation({...input,newClient:undefined},{store,requestId:randomUUID()});const stale=pair.recommendation
 await assignLegacyConsultation(store,stale.id,c.id)
 await assert.rejects(store.save({...stale,patientName:'Stale overwrite'},stale),/changed|immutable/)
 assert.equal((await store.findById(stale.id)).clientId,c.id)
})

test('adding payment to assigned standalone recommendation is atomic, indexed and retry safe',async()=>{
 const {attachPaymentToRecommendation}=await import('../lib/consultations/service.js');const {assignLegacyConsultation}=await import('../lib/clients/service.js');const {createPrescription}=await import('../lib/prescriptions/service.js');const {createPaymentDocument}=await import('../lib/documents/payment.js')
 const store=createMemoryPrescriptionStore();const c=createClient(input.newClient);await store.saveClient(c)
 const r=createPrescription({practitionerName:'Synthetic practitioner',patientName:'Synthetic',dateIssued:'2026-09-21',items:input.items,status:'active'});await store.save(r)
 await assignLegacyConsultation(store,r.id,c.id);const existing=await store.findById(r.id)
 const results=await Promise.all(Array.from({length:5},()=>attachPaymentToRecommendation(store,existing,createPaymentDocument({patientName:'Synthetic',service:'Consultation',dateOfService:'2026-09-21',amount:'10.00',status:'active'}))))
 assert.equal(new Set(results.map(pair=>pair.payment.id)).size,1)
 const pair=results[0];assert.equal(pair.payment.clientId,c.id);assert.equal(pair.payment.consultationId,r.id);assert.equal(pair.recommendation.paymentDocumentId,pair.payment.id)
 assert.equal((await store.listClientDocuments(c.id)).length,2)
})

test('REST independent save CAS cannot overwrite ownership assigned after its GET',async()=>{
 const {createPrescriptionStore}=await import('../lib/prescriptions/store.js');const saved=new Map();let raceEnvelope
 const store=createPrescriptionStore({environment:{PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic.invalid',PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic',PRESCRIPTIONS_DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')},fetchFn:async(_url,options)=>{
  const c=JSON.parse(options.body);let result
  if(c[0]==='GET')result=saved.get(c[1])??null
  else if(c[0]==='EVAL'){
   if(raceEnvelope){saved.set(c[3],raceEnvelope);raceEnvelope=undefined}
   if(c[1].includes("redis.call('EXISTS'")?saved.has(c[3]):saved.get(c[3])!==c[4])result=0
   else {const values=JSON.parse(c[5]);for(let i=0;i<values.length;i+=2)saved.set(values[i],values[i+1]);result=1}
  }else throw new Error('Unexpected command')
  return {ok:true,json:async()=>({result})}
 }})
 const record={id:randomUUID(),status:'active',patientName:'Synthetic'};const clientId=randomUUID();await store.save(record)
 const storageKey=`prescription:record:${record.id}`,old=saved.get(storageKey)
 await store.save({...record,clientId},record);raceEnvelope=saved.get(storageKey);saved.set(storageKey,old)
 await assert.rejects(store.save({...record,patientName:'Stale'},record),/changed/)
 assert.equal((await store.findById(record.id)).clientId,clientId)
})

test('legacy forward-only payment pairs gain reciprocal reference atomically without name matching',async()=>{
 const {assignLegacyConsultation}=await import('../lib/clients/service.js');const store=createMemoryPrescriptionStore()
 const a=createClient(input.newClient),b=createClient(input.newClient);await store.saveClient(a);await store.saveClient(b)
 const pair=await createConsultation({...input,newClient:undefined},{store,requestId:randomUUID()})
 const oldPayment={...pair.payment};delete oldPayment.consultationId;await store.save(oldPayment,pair.payment)
 const result=await assignLegacyConsultation(store,pair.recommendation.id,a.id)
 assert.equal(result.payment.consultationId,pair.recommendation.id);assert.equal(result.payment.clientId,a.id)
 assert.equal((await store.listClientDocuments(a.id)).length,2);assert.equal((await store.listClientDocuments(b.id)).length,0)
})
