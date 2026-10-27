// UNEXECUTED locally unless an explicitly isolated, fresh PG17 service is present.
// This is a minimal prerequisite MODEL, not complete production RLS/provider parity.
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {assertTelegramIsolationEnvironment} from './helpers/telegram-service-isolation-guard.mjs'
const endpoints=assertTelegramIsolationEnvironment()
const {default:pg}=await import('pg')
const {setupTelegramPolicyFixture,LEGACY}=await import('./helpers/telegram-service-policy-fixture.mjs')
const {runtime,request,config,cipher,A,B,PA,PB,OA,OB}=await import('./helpers/telegram-service-runtime.mjs')

test('PG17 exact combined public+Telegram INSERT policies with synthetic prerequisites', {timeout:60000}, async t=>{
 const admin=new pg.Client({connectionString:endpoints.adminUrl,connectionTimeoutMillis:5000,statement_timeout:5000})
 const pool=new pg.Pool({connectionString:endpoints.appUrl,max:2,connectionTimeoutMillis:5000,statement_timeout:5000})
 async function as(role,owner,fn) {
  assert.ok(['hh_app_backend','hh_crm_backend'].includes(role))
  const db=await pool.connect()
  try {
   await db.query('begin')
   const safe=(await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
   assert.equal(safe.rolsuper,false);assert.equal(safe.rolbypassrls,false)
   await db.query('set local role '+role)
   const actual=(await db.query('select current_user as name')).rows[0];assert.equal(actual.name,role)
   await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(owner?{sub:owner}:{})])
   const result=await fn(db);await db.query('commit');return result
  } catch(error){await db.query('rollback');throw error} finally{db.release()}
 }
 const api=runtime({transaction:(_config,actor,fn)=>as('hh_app_backend',actor?.id,fn),databasePool:()=>{throw new Error('WEBHOOK_DATABASE_NOT_IN_MINIMAL_FIXTURE')}})
 const count=async()=>Number((await admin.query('select count(*)::int as count from app.public_service_enquiries')).rows[0].count)
 const counts=async()=>({enquiries:await count(),crm:Number((await admin.query('select count(*)::int as count from app.crm_contacts')).rows[0].count)})
 const insertContact=(db,owner)=>db.query(`insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source)
  values($1,$2,'synthetic-ciphertext',$3,null,'en','lead','website')`,[randomUUID(),owner,randomUUID()])
 const op=async(db,operation)=>db.query("select set_config('hh.public_enquiry_operation',$1,true)",[operation])
 async function seedEnquiry({recipient=PB,offering=OB,source='/en/services/telegram-request',contact='synthetic-contact'}={}){
  const id=randomUUID(),operation=randomUUID()
  await admin.query(`insert into app.public_service_enquiries(id,recipient_practitioner_id,service_title,source_path,locale,reference_code,
   description_ciphertext,contact_ciphertext,operation_id,operation_hash,service_offering_id)
   values($1,$2,'Synthetic policy probe',$3,'en',$4,$5,$6,$7,$8,$9)`,
   [id,recipient,source,'HH-'+id.replaceAll('-','').slice(0,12).toUpperCase(),'s'.repeat(40),contact,operation,'a'.repeat(64),offering])
  return operation
 }
 try {
  await admin.connect();await setupTelegramPolicyFixture(admin)
  await t.test('both real permissive INSERT policies and FORCE RLS are present',async()=>{
   const policies=(await admin.query("select policyname,permissive,roles::text[] as roles,cmd from pg_policies where schemaname='app' and tablename='crm_contacts' and cmd='INSERT' order by policyname")).rows
   assert.deepEqual(policies.map(x=>x.policyname),['crm_contact_public_enquiry_insert','crm_contact_telegram_master_enquiry_insert'])
   for(const p of policies){assert.equal(p.permissive,'PERMISSIVE');assert.deepEqual(p.roles,['hh_app_backend'])}
   const rows=(await admin.query("select relrowsecurity,relforcerowsecurity from pg_class where oid in ('app.crm_contacts'::regclass,'app.public_service_enquiries'::regclass,'app_private.crm_tg_diagnostic_sessions'::regclass)")).rows
   assert.equal(rows.length,3);assert.ok(rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity))
  })
  let first,firstInput
  await t.test('real runtime writes one enquiry and encrypted owner-bound CRM lead for A and B',async()=>{
   firstInput=request(OB);first=await api.createPublicServiceEnquiry(config,firstInput)
   await api.createPublicServiceEnquiry(config,request(OA))
   assert.deepEqual(await counts(),{enquiries:2,crm:2})
   const entries=(await admin.query('select * from app.public_service_enquiries order by recipient_practitioner_id')).rows
   assert.deepEqual(entries.map(e=>e.recipient_practitioner_id),[PA,PB])
   const contacts=(await admin.query('select * from app.crm_contacts order by owner_id')).rows
   assert.deepEqual(contacts.map(e=>e.owner_id),[A,B])
   for(const [index,owner,practitioner] of [[0,A,PA],[1,B,PB]]){
    const e=entries[index],c=contacts[index]
    assert.equal(cipher.openSealed(e.description_ciphertext,{accountId:practitioner,recordId:e.id,field:'public_lead.message'},config),'A synthetic scheduling request only.')
    assert.throws(()=>cipher.openSealed(e.description_ciphertext,{accountId:index?PA:PB,recordId:e.id,field:'public_lead.message'},config))
    assert.equal(cipher.openSealed(c.contact_ciphertext,{accountId:owner,recordId:c.id,field:'crm.contact'},config).email,'visitor@example.invalid')
   }
  })
  await t.test('exact enquiry read/update RLS separates A/B and anonymous operation scope',async()=>{
   for(const [owner,own,other] of [[A,PA,PB],[B,PB,PA]])await as('hh_app_backend',owner,async db=>{
    const rows=(await db.query('select recipient_practitioner_id from app.public_service_enquiries')).rows
    assert.deepEqual(rows.map(x=>x.recipient_practitioner_id),[own])
    assert.equal((await db.query("update app.public_service_enquiries set status='closed' where recipient_practitioner_id=$1",[other])).rowCount,0)
    // CRM read policy here is explicitly synthetic, not a production parity claim.
   })
   await as('hh_app_backend',null,async db=>{
    assert.equal((await db.query('select id from app.public_service_enquiries')).rowCount,0)
    await op(db,firstInput.operationId);assert.equal((await db.query('select id from app.public_service_enquiries')).rowCount,1)
   })
   for(const owner of [A,B])await as('hh_crm_backend',owner,async db=>assert.deepEqual(
    (await db.query('select owner_id from app.crm_contacts')).rows.map(x=>x.owner_id),[owner]))
  })
  await t.test('consent before transaction, immutable retry, conflict and real atomic rollback',async()=>{
   const before=await counts()
   await assert.rejects(api.createPublicServiceEnquiry(config,request(OB,{contactConsent:false})),{code:'INVALID_SERVICE_ENQUIRY'})
   await admin.query("update app.service_offerings set active=false,localized_copy='{}' where id=$1",[OB])
   assert.equal((await api.createPublicServiceEnquiry(config,firstInput)).id,first.id)
   await assert.rejects(api.createPublicServiceEnquiry(config,{...firstInput,description:'Changed synthetic note'}),{code:'IDEMPOTENCY_CONFLICT'})
   await assert.rejects(api.createPublicServiceEnquiry(config,request(OB)),{code:'SERVICE_UNAVAILABLE'})
   await admin.query('update app.service_offerings set active=true,localized_copy=$2 where id=$1',[OB,{en:{title:'Verified synthetic service'}}])
   // Deliberate test-only constraint causes the second write to fail; never relax RLS.
   const hash=cipher.operationHash({scope:'crm-email',owner:B,email:'rollback@example.invalid'},config)
   await admin.query("alter table app.crm_contacts add constraint synthetic_fail_contact check(email_hash <> '"+hash+"')")
   await assert.rejects(api.createPublicServiceEnquiry(config,request(OB,{contact:{displayName:'Rollback',email:'rollback@example.invalid',phone:''}})),{code:'23514'})
   assert.deepEqual(await counts(),before)
  })
  await t.test('combined OR policies reject absent receipt, owner mismatch, wrong offering-recipient pair, nonconsent and wrong path',async()=>{
   await assert.rejects(as('hh_app_backend',null,db=>insertContact(db,B)),{code:'42501'})
   await assert.rejects(as('hh_app_backend',null,async db=>{await op(db,firstInput.operationId);await insertContact(db,A)}),{code:'42501'})
   for(const input of [{recipient:PA,offering:OB},{contact:null},{source:'/en/services/not-telegram'}]){
    const operation=await seedEnquiry(input)
    await assert.rejects(as('hh_app_backend',null,async db=>{await op(db,operation);await insertContact(db,input.recipient===PA?A:B)}),{code:'42501'})
   }
  })
  await t.test('exact Telegram SQL policy rejects unpublished/inactive/unapproved offerings even with seeded receipt',async()=>{
   for(const [table,id,column,value,restore] of [
    ['service_offerings',OB,'active',false,true],['service_offerings',OB,'status','draft','published'],
    ['practitioners',PB,'active',false,true],['practitioners',PB,'status','submitted','approved'],
   ]){
    const operation=await seedEnquiry();await admin.query(`update app.${table} set ${column}=$1 where id=$2`,[value,id])
    await assert.rejects(as('hh_app_backend',null,async db=>{await op(db,operation);await insertContact(db,B)}),{code:'42501'})
    await admin.query(`update app.${table} set ${column}=$1 where id=$2`,[restore,id])
   }
  })
  await t.test('legacy permissive policy remains an explicit boundary, NOT universal SQL offering binding',async()=>{
   const legacy=await seedEnquiry({recipient:LEGACY,offering:null,source:'/en/services/legacy'})
   await as('hh_app_backend',null,async db=>{await op(db,legacy);await insertContact(db,A)})
   // Expected legacy OR allowance: old policy does not inspect offering_id.
   // This must not be represented as a secure universal tuple constraint.
   const forgedLegacy=await seedEnquiry({recipient:LEGACY,offering:OB})
   await as('hh_app_backend',null,async db=>{await op(db,forgedLegacy);await insertContact(db,A)})
  })
 } finally {await pool.end();await admin.end()}
})
