import {test} from 'node:test'
import assert from 'node:assert/strict'
import {planVideoStart as plan,settleVideoReservation as settle,VIDEO_STATUS_COPY} from '../lib/coaching/lukas-video-quota.mjs'
import {requireLukasGoogleActor,resolveLukasVideoAccess} from '../lib/coaching/lukas-video-auth.mjs'
const base={googleVerified:true,enabled:true,privacyApproved:true,hardStopVerified:true,sharedLedgerVerified:true,providerCycleVerified:true,busy:false,personalUsed:0,customerUsed:0,totalUsed:0,providerRemaining:3000,secondsToMonthEnd:90000,secondsToCycleEnd:90000,overheadSeconds:5}
const code=(override,c)=>assert.deepEqual(plan({...base,...override}),{allowed:false,code:c})
test('new Google user gets 300 seconds; separate overhead',()=>assert.deepEqual(plan(base),{allowed:true,videoSeconds:300,providerReserved:305}))
test('80 + 40 + 90 seconds leave 90 seconds',()=>assert.equal(plan({...base,personalUsed:210}).videoSeconds,90))
test('guest blocked',()=>code({googleVerified:false},'AUTH_REQUIRED'))
test('every missing launch gate fails closed',()=>{for(const k of ['enabled','privacyApproved','hardStopVerified','sharedLedgerVerified','providerCycleVerified'])code({[k]:false},'UNAVAILABLE')})
test('second caller gets BUSY, not a reservation',()=>code({busy:true},'BUSY'))
test('personal limit reached',()=>code({personalUsed:300},'PERSONAL_QUOTA_EXHAUSTED'))
test('customer budget retains 10 minutes reserve',()=>code({customerUsed:2400,totalUsed:2400},'GLOBAL_QUOTA_EXHAUSTED'))
test('owner/coach usage also counts in total',()=>assert.equal(plan({...base,totalUsed:2950}).videoSeconds,45))
test('provider real balance limits allocation',()=>assert.equal(plan({...base,providerRemaining:20}).videoSeconds,15))
test('no credit after connection overhead',()=>code({providerRemaining:5},'GLOBAL_QUOTA_EXHAUSTED'))
test('month/cycle boundaries cannot be crossed',()=>{assert.equal(plan({...base,secondsToMonthEnd:30}).videoSeconds,25);assert.equal(plan({...base,secondsToCycleEnd:15}).videoSeconds,10)})
test('invalid inputs deny',()=>{for(const x of [null,-1,NaN,1.2,Infinity])code({providerRemaining:x},'UNAVAILABLE');code({customerUsed:10,totalUsed:0},'UNAVAILABLE')})
const reservation={sessionId:'s1',state:'reserved',videoSeconds:300,providerReserved:305}
const receipt={verified:true,ended:true,sessionId:'s1',videoSeconds:80,providerSeconds:84}
test('confirmed usage settles and restores remaining balance',()=>{const s=settle(reservation,receipt);assert.equal(s.videoCharged,80);assert.equal(s.providerCharged,84);assert.equal(plan({...base,personalUsed:s.videoCharged}).videoSeconds,220)})
test('browser stop, missing evidence, wrong ID or incomplete receipt never release',()=>{for(const r of [null,{ended:true},{...receipt,verified:false},{...receipt,ended:false},{...receipt,sessionId:'other'},{...receipt,videoSeconds:90}])assert.equal(settle(reservation,r).state,'uncertain')})
test('settlement is idempotent',()=>{const s=settle(reservation,receipt);assert.equal(settle(s,{...receipt,videoSeconds:30}),s)})
test('actual overrun retained for operator stop',()=>{const s=settle(reservation,{...receipt,videoSeconds:310,providerSeconds:312});assert.equal(s.overrun,true);assert.equal(s.providerCharged,312);assert.equal(s.videoCharged,300)})
test('confirmed failure without video costs client zero, provider cost preserved',()=>{const s=settle(reservation,{...receipt,videoSeconds:0,providerSeconds:3});assert.equal(s.videoCharged,0);assert.equal(s.providerCharged,3)})
test('localization has all 3 languages and voice alternative',()=>{for(const l of ['ru','en','es'])for(const k of ['BUSY','AUTH_REQUIRED','PERSONAL_QUOTA_EXHAUSTED','GLOBAL_QUOTA_EXHAUSTED','UNAVAILABLE','voice','later','available','warning'])assert.ok(VIDEO_STATUS_COPY[l][k])})
const actor={id:'user1',claims:{sub:'user1'}}
const auth=(user,error=null)=>({verified:async()=>actor,client:{auth:{getUser:async()=>({data:{user},error})}}})
test('verified linked Google identity is accepted',async()=>assert.equal(await requireLukasGoogleActor(auth({id:'user1',identities:[{provider:'google',user_id:'user1'}]})),actor))
test('Google authorization rejects anonymous, other provider, forged actor or identity',async()=>{for(const u of [{id:'user1',is_anonymous:true,identities:[{provider:'google',user_id:'user1'}]},{id:'user1',identities:[{provider:'email',user_id:'user1'}],user_metadata:{provider:'google'}},{id:'other',identities:[{provider:'google',user_id:'other'}]},{id:'user1',identities:[{provider:'google',user_id:'other'}]},null])assert.equal(await requireLukasGoogleActor(auth(u)),null)})
test('auth service errors and failed sessions deny',async()=>{assert.equal(await requireLukasGoogleActor(auth(null,new Error('denied'))),null);assert.equal(await requireLukasGoogleActor({verified:async()=>{throw Error('expired')}}),null)})

test('owner skips personal and customer pool ceilings but never provider or global cap',()=>{assert.equal(plan({...base,ownerExempt:true,personalUsed:999,customerUsed:2400,totalUsed:2900}).videoSeconds,95);code({ownerExempt:true,totalUsed:3000},'GLOBAL_QUOTA_EXHAUSTED');code({ownerExempt:true,busy:true},'BUSY');code({ownerExempt:true,googleVerified:false},'AUTH_REQUIRED');code({ownerExempt:true,privacyApproved:false},'UNAVAILABLE')})
test('owner identity and active practitioner are both required; browser metadata cannot exempt',async()=>{const a=auth({id:'user1',identities:[{provider:'google',user_id:'user1'}],user_metadata:{ownerExempt:true}});assert.equal((await resolveLukasVideoAccess(a,{ownerEmailAllowed:()=>false,ownerPractitionerActive:async()=>true})).ownerExempt,false);assert.equal((await resolveLukasVideoAccess(a,{ownerEmailAllowed:()=>true,ownerPractitionerActive:async()=>false})).ownerExempt,false);assert.equal((await resolveLukasVideoAccess(a,{ownerEmailAllowed:()=>true,ownerPractitionerActive:async()=>true})).ownerExempt,true);assert.equal(await resolveLukasVideoAccess(a,{ownerEmailAllowed:()=>true,ownerPractitionerActive:async()=>{throw Error('db')}}),null)})
