import test from 'node:test'
import assert from 'node:assert/strict'
import {bookingMasterEmailConfig,sendBookingMasterEmail} from '../lib/practitioners/booking-master-email.js'
import {PRACTITIONER_ID} from '../data/app-services.js'

const env={VERCEL_ENV:'production',HH_BOOKING_EMAIL_ENABLED:'true',
  HH_BOOKING_EMAIL_PRODUCTION_APPROVED:'true',HH_BOOKING_RESEND_API_KEY:'re_test_only_no_secret',
  HH_BOOKING_FROM_EMAIL:'booking@example.org',HH_BOOKING_VERIFIED_DOMAIN:'example.org',
  HH_BOOKING_SENDER_VERIFIED:'true',HH_PRACTITIONER_OWNER_EMAIL:'owner@example.org'}
const event={requestId:'10000000-0000-4000-8000-000000000001',revision:0,
  practitionerId:PRACTITIONER_ID,event:'new'}
const accepted=()=>new Response(JSON.stringify({id:'provider-receipt'}),{status:200})

test('real adapter sends an invariant neutral payload with stable per-revision idempotency',async()=>{
  const calls=[],fetcher=async(url,options)=>{calls.push({url,...options});return accepted()}
  for(let n=0;n<2;n++)assert.deepEqual(await sendBookingMasterEmail({...event,
    message:'PRIVATE_MESSAGE',goal:'PRIVATE_GOAL',contact:'PRIVATE_CONTACT',photo:'PRIVATE_PHOTO'},env,fetcher),
  {attempted:true,accepted:true})
  assert.equal(calls.length,2)
  assert.equal(calls[0].url,'https://api.resend.com/emails')
  assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key'])
  assert.equal(calls[0].body,calls[1].body)
  const payload=JSON.parse(calls[0].body)
  assert.deepEqual(payload.to,['owner@example.org'])
  assert.equal(payload.from,'Holistic House <booking@example.org>')
  assert.equal(payload.subject,'New booking request · Holistic House')
  assert.match(payload.text,/https:\/\/holistichouse\.vercel\.app\/en\/app\/practice\?panel=requests/)
  assert.doesNotMatch(calls[0].body,/PRIVATE_|10000000|remoteBooking|photo_url/)
  await sendBookingMasterEmail({...event,event:'update',revision:1},env,fetcher)
  assert.notEqual(calls[0].headers['Idempotency-Key'],calls[2].headers['Idempotency-Key'])
  assert.equal(JSON.parse(calls[2].body).subject,'Booking updated · Holistic House')
})

test('disabled, unapproved and malformed config never reaches the provider',async()=>{
  for(const patch of [{HH_BOOKING_EMAIL_ENABLED:'false'},{HH_BOOKING_EMAIL_PRODUCTION_APPROVED:'false'},
    {HH_BOOKING_SENDER_VERIFIED:'false'},{HH_BOOKING_RESEND_API_KEY:''},
    {HH_BOOKING_VERIFIED_DOMAIN:'other.org'},
    {HH_BOOKING_FROM_EMAIL:'sender@gmail.com',HH_BOOKING_VERIFIED_DOMAIN:'gmail.com'},
    {HH_PRACTITIONER_OWNER_EMAIL:'owner@example.org\r\nBcc: other@example.org'},
    {HH_PRACTITIONER_OWNER_EMAIL:'owner\u0000@example.org'},
    {HH_BOOKING_FROM_EMAIL:'sender\u007f@example.org'}]){
    assert.equal(bookingMasterEmailConfig({...env,...patch}),null,JSON.stringify(patch))
    assert.deepEqual(await sendBookingMasterEmail(event,{...env,...patch},()=>assert.fail('provider called')),
      {attempted:false,reason:'not_configured'})
  }
})

test('another assigned practitioner cannot use the owner destination; invalid events cannot send',async()=>{
  assert.deepEqual(await sendBookingMasterEmail({...event,
    practitionerId:'10000000-0000-4000-8000-000000000009'},env,()=>assert.fail('provider called')),
  {attempted:false,reason:'other_practitioner'})
  for(const patch of [{requestId:'invalid'},{revision:-1},{revision:0.5},{event:'cancelled'}])
    await assert.rejects(sendBookingMasterEmail({...event,...patch},env,()=>assert.fail('provider called')),
      /BOOKING_EMAIL_INVALID_EVENT/)
})

test('bad receipts and provider rejection never claim acceptance or expose provider payloads',async()=>{
  for(const response of [new Response('{}'),new Response('{'),new Response(JSON.stringify({id:'   '})),
    new Response(JSON.stringify({id:'receipt',error:'PRIVATE_PROVIDER_ERROR'}),{status:503})])
    await assert.rejects(sendBookingMasterEmail(event,env,async()=>response),
      error=>error.message==='BOOKING_EMAIL_DELIVERY_UNCONFIRMED')
  await assert.rejects(sendBookingMasterEmail(event,env,async()=>{throw new Error('PRIVATE_PROVIDER_ERROR')}),
    error=>error.message==='BOOKING_EMAIL_DELIVERY_UNCONFIRMED')
})

test('ten-second timeout aborts the real adapter without automatically resending',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  let attempts=0,signal
  const promise=sendBookingMasterEmail(event,env,async(_url,options)=>{
    attempts++;signal=options.signal
    return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout'))))
  })
  const check=assert.rejects(promise,/BOOKING_EMAIL_DELIVERY_UNCONFIRMED/)
  t.mock.timers.tick(10000)
  await check
  assert.equal(signal.aborted,true)
  assert.equal(attempts,1)
})
