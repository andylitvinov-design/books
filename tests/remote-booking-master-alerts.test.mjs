import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('first remote booking creates exactly one master arrival event; idempotent replay is silent', () => {
  const repo = read('lib/app/repository.js')
  const route = read('app/api/app/[...path]/route.js')
  assert.match(repo, /if \(prior\) \{[\s\S]*?return requestView\(prior, config\)/)
  assert.match(repo, /bookingNotice: true, bookingMessageId: id/)
  assert.match(route, /if \(joined === 'requests'\) \{[\s\S]*?repo\.createRequest\(actor,body\)[\s\S]*?notifyBookingParticipants\(config,actor,result\.id,'master',\{[\s\S]*?event:'new'/)
  assert.match(route, /delete result\.bookingNotice/)
  assert.match(route, /messageId:result\.bookingMessageId/)
  assert.match(route, /delete result\.bookingMessageId/)
})

test('master and client updates create only neutral in-app notices, with opt-in push or Telegram', () => {
  const route = read('app/api/app/[...path]/route.js')
  assert.match(route, /notifyBookingParticipants\(config,actor,path\[2\],'client'\)/)
  assert.match(route, /notifyBookingParticipants\(config,actor,path\[1\],'master',\{[\s\S]*?event:'update'/)
  assert.match(route, /createPractitionerClientMessages\(config\)\.send\(actor/)
  assert.match(route, /dispatchClientMessagePush\(config,messageId\)/)
  assert.match(route, /dispatchPractitionerMessagePush\(config,messageId\)/)
  assert.match(route, /dispatchClientTelegramNotification\(config,messageId\)/)
  assert.match(route, /HH_BOOKING_IN_APP_NOTIFICATION_FAILED/)
})

test('owner booking email channel is opt-in, Resend-authorized, idempotent and privacy neutral', () => {
  const src = read('lib/practitioners/booking-master-email.js')
  const route = read('app/api/app/[...path]/route.js')
  for (const name of [
    'HH_BOOKING_EMAIL_ENABLED', 'HH_BOOKING_EMAIL_PRODUCTION_APPROVED',
    'HH_BOOKING_RESEND_API_KEY', 'HH_BOOKING_FROM_EMAIL',
    'HH_BOOKING_VERIFIED_DOMAIN', 'HH_BOOKING_SENDER_VERIFIED',
    'HH_PRACTITIONER_OWNER_EMAIL',
  ]) assert.ok(src.includes(name), name)
  assert.match(src, /practitionerId !== PRACTITIONER_ID/)
  assert.match(src, /Idempotency-Key': 'hh-booking-' \+ requestId \+ '-r' \+ revision/)
  assert.match(src, /https:\/\/api\.resend\.com\/emails/)
  assert.match(src, /to: \[mail\.to\]/)
  assert.match(src, /!UUID\.test/)
  assert.match(src, /does not include private goals, contact details, messages or photos/)
  assert.doesNotMatch(src, /input\.message|remoteBooking\.goal|contact_ciphertext|message_ciphertext/)
  assert.match(route, /sendBookingMasterEmail\(\{requestId,revision,practitionerId,event\}\)/)
})
