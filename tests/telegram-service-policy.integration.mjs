// UNEXECUTED locally: requires the explicitly isolated, fresh hosted PG17 service.
// Exact three-policy composition over MINIMAL SYNTHETIC prerequisites only.
// This is NOT production-schema, authenticated-account or provider-delivery parity.
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {assertTelegramIsolationEnvironment} from './helpers/telegram-service-isolation-guard.mjs'
const endpoints=assertTelegramIsolationEnvironment()
const {default:pg}=await import('pg')
const {setupTelegramPolicyFixture,LEGACY}=await import('./helpers/telegram-service-policy-fixture.mjs')
const {runtime,request,config,cipher,A,B,PA,PB,OA,OB}=await import('./helpers/telegram-service-runtime.mjs')

const title='Verified synthetic service'
const websitePath=(practitioner=PB,offering=OB)=>`/en/services/synthetic-${practitioner}/synthetic-${offering}`
function websiteRequest(offering=OB,patch={}) {
 const {serviceOfferingId,...input}=request(offering)
 return {...input,serviceId:offering,serviceTitle:title,
  sourcePath:websitePath(offering===OA?PA:PB,offering),
  contact:{displayName:'Synthetic website visitor',email:'website@example.invalid',phone:''},...patch}
}

test('PG17 exact legacy+website+Telegram PERMISSIVE INSERT policies with synthetic prerequisites', {timeout:60000}, async t=>{
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
 const counts=async()=>({
  enquiries:Number((await admin.query('select count(*)::int as count from app.public_service_enquiries')).rows[0].count),
  crm:Number((await admin.query('select count(*)::int as count from app.crm_contacts')).rows[0].count),
 })
 const insertContact=(db,owner)=>db.query(`insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source)
  values($1,$2,'synthetic-ciphertext',$3,null,'en','lead','website')`,[randomUUID(),owner,randomUUID()])
 const op=async(db,operation)=>db.query("select set_config('hh.public_enquiry_operation',$1,true)",[operation])
 const allowedContact=(operation,owner=B)=>as('hh_app_backend',null,async db=>{await op(db,operation);await insertContact(db,owner)})
 const deniedContact=(operation,owner=B)=>assert.rejects(allowedContact(operation,owner),{code:'42501'})
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
  await t.test('all three exact INSERT policies are PERMISSIVE and FORCE RLS remains enabled',async()=>{
   const policies=(await admin.query("select policyname,permissive,roles::text[] as roles,cmd from pg_policies where schemaname='app' and tablename='crm_contacts' and cmd='INSERT' order by policyname")).rows
   assert.deepEqual(policies.map(x=>x.policyname),[
    'crm_contact_marketplace_service_enquiry_insert',
    'crm_contact_public_enquiry_insert',
    'crm_contact_telegram_master_enquiry_insert',
   ])
   for(const p of policies){assert.equal(p.permissive,'PERMISSIVE');assert.deepEqual(p.roles,['hh_app_backend'])}
   const rows=(await admin.query("select relrowsecurity,relforcerowsecurity from pg_class where oid in ('app.crm_contacts'::regclass,'app.public_service_enquiries'::regclass,'app_private.crm_tg_diagnostic_sessions'::regclass)")).rows
   assert.equal(rows.length,3);assert.ok(rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity))
  })
  const original=[]
  await t.test('both real runtime channels create separate encrypted recipient-bound requests for A and B',async()=>{
   for(const make of [request,websiteRequest])for(const offering of [OA,OB]){
    const input=make(offering),receipt=await api.createPublicServiceEnquiry(config,input)
    assert.equal(receipt.saved,true);assert.equal(receipt.contactPending,false)
    assert.match(receipt.referenceCode,/^HH-[A-F0-9]{12}$/)
    original.push({input,receipt})
   }
   assert.deepEqual(await counts(),{enquiries:4,crm:4})
   for(const {input,receipt} of original){
    const e=(await admin.query('select * from app.public_service_enquiries where id=$1',[receipt.id])).rows[0]
    const offering=input.serviceId||input.serviceOfferingId,practitioner=offering===OA?PA:PB,owner=offering===OA?A:B
    assert.equal(e.recipient_practitioner_id,practitioner);assert.equal(e.service_title,title)
    assert.equal(e.service_offering_id,input.serviceOfferingId||null,'website preserves its original null-FK contract')
    assert.equal(e.source_path,input.sourcePath);assert.equal(e.reference_code,receipt.referenceCode)
    const decrypted=cipher.openSealed(e.description_ciphertext,{accountId:practitioner,recordId:e.id,field:'public_lead.message'},config)
    assert.equal(decrypted,input.description)
    assert.throws(()=>cipher.openSealed(e.description_ciphertext,{accountId:practitioner===PA?PB:PA,recordId:e.id,field:'public_lead.message'},config))
    const hash=cipher.operationHash({scope:'crm-email',owner,email:input.contact.email},config)
    const c=(await admin.query('select * from app.crm_contacts where owner_id=$1 and email_hash=$2',[owner,hash])).rows[0]
    assert.equal(cipher.openSealed(c.contact_ciphertext,{accountId:owner,recordId:c.id,field:'crm.contact'},config).email,input.contact.email)
    assert.throws(()=>cipher.openSealed(c.contact_ciphertext,{accountId:owner===A?B:A,recordId:c.id,field:'crm.contact'},config))
   }
  })
  await t.test('exact enquiry read/update RLS separates both-channel A/B rows and anonymous operation scope',async()=>{
   for(const [owner,own,other] of [[A,PA,PB],[B,PB,PA]])await as('hh_app_backend',owner,async db=>{
    const rows=(await db.query('select recipient_practitioner_id from app.public_service_enquiries')).rows
    assert.equal(rows.length,2);assert.ok(rows.every(x=>x.recipient_practitioner_id===own))
    assert.equal((await db.query("update app.public_service_enquiries set status='closed' where recipient_practitioner_id=$1",[other])).rowCount,0)
   })
   await as('hh_app_backend',null,async db=>{
    assert.equal((await db.query('select id from app.public_service_enquiries')).rowCount,0)
    await op(db,original[0].input.operationId);assert.equal((await db.query('select id from app.public_service_enquiries')).rowCount,1)
   })
   // CRM owner-read policy is intentionally synthetic, not production parity.
   for(const owner of [A,B])await as('hh_crm_backend',owner,async db=>{
    const rows=(await db.query('select owner_id from app.crm_contacts')).rows
    assert.equal(rows.length,2);assert.ok(rows.every(x=>x.owner_id===owner))
   })
  })
  await t.test('both channels preserve receipt replay after rename/unpublication, reject changed payload and roll back CRM failures',async()=>{
   const before=await counts()
   await admin.query("update app.service_offerings set active=false,localized_copy='{}' where id=$1",[OB])
   for(const {input,receipt} of original.filter(x=>(x.input.serviceId||x.input.serviceOfferingId)===OB)){
    const replay=await api.createPublicServiceEnquiry(config,input)
    assert.equal(replay.id,receipt.id);assert.equal(replay.referenceCode,receipt.referenceCode)
    const stored=(await admin.query('select created_at from app.public_service_enquiries where id=$1',[receipt.id])).rows[0]
    assert.equal(replay.createdAt,stored.created_at.toISOString())
    await assert.rejects(api.createPublicServiceEnquiry(config,{...input,description:'Changed synthetic note'}),{code:'IDEMPOTENCY_CONFLICT'})
   }
   for(const make of [request,websiteRequest])await assert.rejects(api.createPublicServiceEnquiry(config,make(OB)))
   await admin.query('update app.service_offerings set active=true,localized_copy=$2 where id=$1',[OB,{en:{title}}])
   // Deliberate synthetic constraint fails the second write; never relax RLS.
   const hash=cipher.operationHash({scope:'crm-email',owner:B,email:'rollback@example.invalid'},config)
   await admin.query("alter table app.crm_contacts add constraint synthetic_fail_contact check(email_hash <> '"+hash+"')")
   for(const make of [request,websiteRequest])await assert.rejects(api.createPublicServiceEnquiry(config,
    make(OB,{contact:{displayName:'Rollback',email:'rollback@example.invalid',phone:''}})),{code:'23514'})
   assert.deepEqual(await counts(),before)
  })
  await t.test('mixed IDs, cross-channel paths, absent consent and forged targets cannot fall through to legacy owner',async()=>{
   const before=await counts()
   const invalid=[
    {...websiteRequest(),serviceOfferingId:OB},
    {...request(),serviceId:OB},
    {...websiteRequest(),sourcePath:'/en/services/telegram-request'},
    {...request(),sourcePath:websitePath()},
    {...websiteRequest(),contactConsent:false},
    {...request(),contactConsent:false},
    {...websiteRequest(),practitionerId:PA},
    {...request(),practitionerId:PA},
    {...websiteRequest(),serviceId:undefined,sourcePath:websitePath().replace('/en/','/ru/')},
    {...request(),serviceOfferingId:undefined,sourcePath:'/ru/services/telegram-request'},
    {...websiteRequest(),serviceId:undefined,sourcePath:websitePath()+'/'},
    {...request(),serviceOfferingId:undefined,sourcePath:'/services/telegram-request/'},
    {...websiteRequest(),serviceId:undefined,sourcePath:websitePath().replace(/\/([^/]+)$/, '%2F$1')},
   ]
   for(const input of invalid)await assert.rejects(api.createPublicServiceEnquiry(config,input),{code:'INVALID_SERVICE_ENQUIRY'})
   for(const make of [request,websiteRequest])await assert.rejects(api.createPublicServiceEnquiry(config,make(randomUUID())))
   assert.deepEqual(await counts(),before)
  })
  await t.test('website retains approved public snapshots during review while Telegram remains strict',async()=>{
   for(const practitionerStatus of ['approved','submitted','changes_requested'])for(const serviceStatus of ['published','submitted','changes_requested']){
    if(practitionerStatus==='approved'&&serviceStatus==='published')continue
    await admin.query('update app.practitioners set status=$1 where id=$2',[practitionerStatus,PB])
    await admin.query('update app.service_offerings set status=$1 where id=$2',[serviceStatus,OB])
    const input=websiteRequest(OB,{contact:{displayName:'Review snapshot',email:randomUUID()+'@example.invalid',phone:''}})
    assert.equal((await api.createPublicServiceEnquiry(config,input)).saved,true)
    const afterWebsite=await counts()
    await assert.rejects(api.createPublicServiceEnquiry(config,request(OB)),{code:'SERVICE_UNAVAILABLE'})
    assert.deepEqual(await counts(),afterWebsite)
    await allowedContact(await seedEnquiry({source:websitePath(),offering:null}))
    await deniedContact(await seedEnquiry())
   }
   await admin.query("update app.practitioners set status='approved' where id=$1",[PB])
   await admin.query("update app.service_offerings set status='published' where id=$1",[OB])
  })
  await t.test('three OR policies reject absent/wrong operation, wrong owner, missing consent and route mismatch',async()=>{
   await assert.rejects(as('hh_app_backend',null,db=>insertContact(db,B)),{code:'42501'})
   await deniedContact(randomUUID())
   for(const source of ['/en/services/telegram-request',websitePath()]){
    const good=await seedEnquiry({source,offering:source===websitePath()?null:OB})
    await deniedContact(good,A)
    await deniedContact(await seedEnquiry({source,contact:null}))
   }
   for(const input of [
    {recipient:PA,offering:OB}, {offering:null},
    {source:'/en/services/not-telegram'}, {source:'/ru/services/telegram-request'},
    {source:websitePath(PA,OA)}, {source:websitePath(PB,OA)},
    {source:websitePath().replace('/en/','/ru/')},
   ])await deniedContact(await seedEnquiry(input),input.recipient===PA?A:B)
  })
  await t.test('both policies deny initially unpublished or inactive records even with privileged synthetic receipt',async()=>{
   for(const [table,id,column,value,restore] of [
    ['service_offerings',OB,'active',false,true],['service_offerings',OB,'status','draft','published'],
    ['service_offerings',OB,'localized_copy',{}, {en:{title}}],
    ['practitioners',PB,'active',false,true],['practitioners',PB,'status','draft','approved'],
    ['practitioners',PB,'public_profile',{}, {displayName:'Synthetic practitioner'}],
    ['practitioners',PB,'trusted_auth_user_id',null,B],
   ]){
    await admin.query(`update app.${table} set ${column}=$1 where id=$2`,[value,id])
    for(const source of ['/en/services/telegram-request',websitePath()])
     await deniedContact(await seedEnquiry({source,offering:source===websitePath()?null:OB}))
    for(const make of [request,websiteRequest])await assert.rejects(api.createPublicServiceEnquiry(config,make(OB)))
    await admin.query(`update app.${table} set ${column}=$1 where id=$2`,[restore,id])
   }
  })
  await t.test('document exact legacy and website OR allowances: NOT universal FK binding or a demonstrated production exploit',async()=>{
   const legacy=await seedEnquiry({recipient:LEGACY,offering:null,source:'/en/services/legacy'})
   await allowedContact(legacy,A)
   // Existing legacy policy does not inspect offering_id or Telegram route.
   await allowedContact(await seedEnquiry({recipient:LEGACY,offering:OB}),A)
   // Website policy authorizes canonical public path/recipient ownership, not FK.
   // This seeded receipt bypasses application validation using the fixture admin.
   // Exact same foreign offering is denied by Telegram's path, but website's OR
   // policy permits it. Runtime channel tests must not infer a universal SQL tuple constraint.
   await deniedContact(await seedEnquiry({offering:OA}))
   await allowedContact(await seedEnquiry({offering:OA,source:websitePath()}))
   await allowedContact(await seedEnquiry({offering:null,source:websitePath()}))
  })
 } finally {await pool.end();await admin.end()}
})
