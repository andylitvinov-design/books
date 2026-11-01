import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  BOOKABLE_SKUS, signSessionBooking, verifySessionBooking, validConfirmedSlot,
} from '../lib/practitioners/public-session-booking.mjs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const id = '13b822f6-8d70-4f63-b9b8-efdeadbeef01'
const op = '13b822f6-8d70-4f63-b9b8-efdeadbeef02'
const config = { encryptionKey: Buffer.alloc(32, 0x33) }

test('signed booking proof carries no PII and resists forging and expiry', () => {
  const now = Date.now()
  const token = signSessionBooking({ id, operationId: op, createdAt: now }, config)
  assert.deepEqual(verifySessionBooking(token, config, now), {
    id, operationId: op, createdAt: Math.floor(now / 1000) * 1000,
  })
  assert.equal(verifySessionBooking(token.slice(0,-2)+'xx',config,now),null)
  assert.equal(verifySessionBooking(token,{encryptionKey:Buffer.alloc(32,0x44)},now),null)
  assert.equal(verifySessionBooking(token,config,now+31*24*3600*1000),null)
  for (const secret of ['+14165550101','person@example.com','health']) assert.ok(!token.includes(secret))
})

test('only fixed public Alchemy tariffs, correct source and consent can be booked', () => {
  assert.deepEqual(BOOKABLE_SKUS, {'express-consultation-30':30,'personal-session-60':60})
  const base = {
    operationId:op, serviceTitle:'Alchemy of the Soul', locale:'en',
    sourcePath:'/en/services/alchemy-of-soul', contactConsent:true,
    contact:{displayName:'Demo Test',email:'example@example.com'}, bookingSku:'personal-session-60',
  }
  assert.equal(normalizePublicServiceEnquiry(base).bookingSku,'personal-session-60')
  for (const mutation of [
    {bookingSku:'personal-session-60?amount=1'}, {bookingSku:'month'},
    {sourcePath:'/en/services/personal-support'},{contactConsent:false},
    {bookingConfirmed:true},{price:1},{bookingSku:null},
  ]) assert.throws(()=>normalizePublicServiceEnquiry({...base,...mutation}))
})

test('owner-confirmed appointment must use future UTC timestamp, never browser timezone guess', () => {
  const now = Date.now()
  assert.ok(validConfirmedSlot(new Date(now+24*3600*1000).toISOString(), now))
  for (const candidate of [
    '2025-10-27T12:00:00Z','2026-10-27T12:00:00-04:00','foo',
    new Date(now+200*24*3600*1000).toISOString(),
  ]) assert.equal(validConfirmedSlot(candidate, now), null)
})

test('server checks practitioner/RLS, prevents double booking and separates payment state', () => {
  const booking = read('lib/practitioners/public-service-enquiry.js')
  const owner = read('lib/practitioners/repository.js')
  const status = read('app/api/service-enquiries/booking-status/route.js')
  const migration = read('supabase/migrations/20261027144834_alchemy_booking_after_owner_confirmation.sql')
  const chooser = read('components/contact-channel-chooser.tsx')
  assert.match(booking,/if \(input.action === 'confirm_booking'\)/)
  assert.match(booking,/for update/)
  assert.match(booking,/SLOT_UNAVAILABLE/)
  assert.match(booking,/remote_booking is not null/)
  assert.match(owner,/publicConflict/)
  assert.match(owner,/confirmedStartAt/)
  assert.match(status,/verifySessionBooking/)
  assert.match(status,/hh.public_enquiry_operation/)
  assert.match(status,/PRIVATE_HEADERS/)
  assert.doesNotMatch(status,/searchParams|getUserEmail|clientPhone|paymentStatus/)
  assert.match(migration,/add column if not exists booking_sku/)
  assert.doesNotMatch(migration,/disable row level security|grant.*to anon/i)
  assert.match(chooser,/bookingConfirmed && Boolean\(saved && bookingStartsAt\)/)
  assert.match(chooser,/credentials: "same-origin", cache: "no-store"/)
  assert.match(chooser,/data-booking-cart-link/)
})
