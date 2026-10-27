import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  validatePractitionerEvent, eventPublicProjection,
  normalizeEventTicketPaymentHref, publicEventTicketCheckout, eventTicketReviewSnapshot,
} from '../lib/practitioners/event-contracts.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const masterId = '123e4567-e89b-42d3-a456-426614174008'
const squareTicket = 'https://square.link/u/HEARTCIRCLE40'
const paypalTicket = 'https://www.paypal.com/ncp/payment/HEARTEVENT50'
const draft = {
  title: { en: 'Heart Circle', ru: 'Круг сердца', es: 'Círculo del corazón' },
  description: { en: 'Public workshop', ru: 'Групповая практика', es: 'Práctica de grupo' },
  category: 'connection', format: 'in_person',
  startsAt: '2030-11-11T18:00:00-05:00', endsAt: '2030-11-11T20:00:00-05:00',
  timeZone: 'America/Toronto', city: 'Toronto', location: 'Toronto, ON',
  registrationHref: 'https://example.org/register/heart-circle',
  pricingMode: 'fixed', priceAmount: 40, currency: 'CAD',
  posterUrl: '', ticketPaymentHref: squareTicket,
}
const code = expected => err => err?.code === expected

test('exact moderated CAD 40 event ticket projects price and provider without booking or settled receipt', () => {
  const saved = validatePractitionerEvent(draft, { complete: true })
  assert.equal(saved.ticketPaymentHref, squareTicket)
  const publicEvent = eventPublicProjection(masterId, 'andy', 'Andrey', saved)
  assert.equal(publicEvent.id, 'master-' + masterId)
  assert.equal(publicEvent.ticketPaymentHref, squareTicket)
  assert.equal(publicEvent.ticketAmountMinor, 4000)
  assert.equal(publicEvent.ticketCurrency, 'CAD')
  assert.equal(publicEvent.priceLabel, '40 CAD')
  assert.equal(publicEvent.registrationHref, draft.registrationHref)
  assert.deepEqual(publicEventTicketCheckout(publicEvent, Date.parse('2029-05-01')), {
    url: squareTicket, amountMinor: 4000, currency: 'CAD', provider: 'Square',
  })
  assert.equal(JSON.stringify(publicEvent).includes('paid'), false)
  assert.equal(JSON.stringify(publicEvent).includes('attendee'), false)
})

test('approved PayPal event payment link is EUR-only and does not reuse PayPal.Me personal session', () => {
  const approved = validatePractitionerEvent({
    ...draft, priceAmount: 50, currency: 'EUR', ticketPaymentHref: paypalTicket,
  }, {complete:true})
  const publicEvent = eventPublicProjection(masterId, 'andy', 'Andrey', approved)
  assert.deepEqual(publicEventTicketCheckout(publicEvent, Date.parse('2029-05-01')), {
    url: paypalTicket, amountMinor: 5000, currency: 'EUR', provider: 'PayPal',
  })
  assert.equal(normalizeEventTicketPaymentHref('https://paypal.me/psitrends/50EUR','EUR'), null)
  assert.equal(normalizeEventTicketPaymentHref(paypalTicket,'CAD'), null)
  assert.equal(normalizeEventTicketPaymentHref(squareTicket,'EUR'), null)
})

test('fixed-price ticket must have a real event-specific checkout, separate registration and allowed currency', () => {
  for(const badUrl of [
    'https://square.link/u/Kv0TfvaP', // approved 50 CAD personal Session
    'https://square.link/u/tQheRKN2', // approved 40 CAD personal Session
    'https://square.link/u/HEARTCIRCLE40?src=embed',
    'https://square.link/u/HEARTCIRCLE40?name=private@example.com',
    'https://square.link/u/HEARTCIRCLE40#paid',
    'https://evil.example/u/HEARTCIRCLE40',
    'https://square.link.evil.example/u/HEARTCIRCLE40',
    'javascript:alert(1)',
    'https://www.paypal.com/ncp/payment/HEARTEVENT50',
  ]) {
    assert.throws(
      () => validatePractitionerEvent({...draft, ticketPaymentHref:badUrl}, {complete:true}),
      code('INVALID_EVENT_TICKET_PAYMENT'), badUrl,
    )
  }
  for(const change of [
    {pricingMode:'free'}, {pricingMode:'contact'}, {currency:'USD'}, {currency:'GBP'},
    {priceAmount:0}, {registrationHref:squareTicket},
  ]) {
    assert.throws(
      () => validatePractitionerEvent({...draft,...change}, {complete:true}),
      error => ['INVALID_EVENT_TICKET_PAYMENT','INVALID_EVENT_PRICE'].includes(error?.code),
      JSON.stringify(change),
    )
  }
})

test('older events without ticket checkout retain registration without exposing a payment CTA', () => {
  const old = eventPublicProjection(masterId, 'andy', 'Andrey',
    validatePractitionerEvent({...draft, ticketPaymentHref:''}, {complete:true}))
  assert.equal(old.ticketPaymentHref, undefined)
  assert.equal(publicEventTicketCheckout(old, Date.parse('2029-05-01')), null)
  const free = eventPublicProjection(masterId, 'andy', 'Andrey',
    validatePractitionerEvent({...draft,pricingMode:'free',priceAmount:null,ticketPaymentHref:''}, {complete:true}))
  assert.equal(publicEventTicketCheckout(free, Date.parse('2029-05-01')), null)
})

test('ticket CTA fails closed for past, unpublished, tampered or unpriced events', () => {
  const event = eventPublicProjection(masterId, 'andy', 'Andrey',
    validatePractitionerEvent(draft,{complete:true}))
  const now = Date.parse('2029-05-01')
  assert.equal(publicEventTicketCheckout(event, Date.parse('2031-01-01')), null)
  for(const patch of [
    {status:'draft'}, {status:'paused'}, {ticketAmountMinor:1}, {ticketCurrency:'EUR'},
    {ticketPaymentHref:'https://square.link/u/Kv0TfvaP'},
    {ticketPaymentHref:'https://square.link/u/HEARTCIRCLE40?amount=1'},
    {ticketPaymentHref:event.registrationHref}, {priceLabel:'10 CAD'},
    {startsAt:'2030-11-11'}, {ticketAmountMinor:null},
  ]) assert.equal(publicEventTicketCheckout({...event,...patch},now),null,JSON.stringify(patch))
})

test('ticket payment stays behind existing moderation, never creates leads, reservations or paid state from a click', () => {
  const editor=read('components/app/practice-events.jsx')
  const contract=read('lib/practitioners/event-contracts.js')
  const repo=read('lib/practitioners/events-repository.js')
  const admin=read('components/practitioner-moderation.jsx')
  const adminRoute=read('app/admin/practitioners/data/route.js')
  for(const s of ['ticketPaymentHref', 'ticketPaymentHelp', 'ticketPayment', 'https://square.link/u/']) {
    assert.ok(editor.includes(s),s)
  }
  assert.match(contract,/normalizeSquarePaymentLink/)
  assert.match(contract,/normalizePayPalHostedLink/)
  assert.match(repo,/EVENT_TICKET_PAYMENT_REVIEW_REQUIRED/)
  assert.match(repo,/input\.ticketPaymentReviewed !== true/)
  assert.match(admin,/data-event-ticket-moderation/)
  assert.match(admin,/ticketReviewed\[e\.id\]===true/)
  assert.match(adminRoute,/ticketPaymentReviewed:body\.ticketPaymentReviewed/)
  assert.doesNotMatch(repo,/markAsPaid|grantEntitlement|capturePayment|sendMoney/)
})

test('moderator review snapshot is invalidated by changed ticket, price, event date or title', () => {
  const verified = validatePractitionerEvent(draft, {complete:true})
  const snapshot = eventTicketReviewSnapshot(verified)
  assert.equal(snapshot, eventTicketReviewSnapshot({...verified}))
  for(const patch of [
    {ticketPaymentHref:'https://square.link/u/OTHERPROGRAM40'},
    {priceAmount:41},
    {startsAt:'2030-11-12T18:00:00-05:00'},
    {registrationHref:'https://example.org/new-registration'},
    {title:{...verified.title,en:'Different event'}},
  ]) assert.notEqual(snapshot,eventTicketReviewSnapshot({...verified,...patch}))
  const repo=read('lib/practitioners/events-repository.js')
  const moderator=read('components/practitioner-moderation.jsx')
  const route=read('app/admin/practitioners/data/route.js')
  assert.ok(repo.includes('input.ticketReviewSnapshot !== eventTicketReviewSnapshot(draft)'))
  assert.ok(moderator.includes('ticketReviewSnapshot:eventTicketReviewSnapshot(e.draft)'))
  assert.ok(moderator.includes('setTicketReviewed({})'))
  assert.ok(route.includes('ticketReviewSnapshot:body.ticketReviewSnapshot'))
})

test('only future approved ticket links appear on directory and detail; master pages and ICS resolve safely', () => {
  const listing=read('components/events-discovery.tsx')
  const detail=read('app/[locale]/events/[eventId]/page.tsx')
  const calendar=read('app/[locale]/events/[eventId]/calendar/route.ts')
  const resolver=read('lib/practitioners/public-event-resolver.ts')
  const data=read('data/public-events.ts')
  for(const source of [listing,detail]) {
    assert.match(source,/publicEventTicketCheckout\(event\)/)
    assert.match(source,/data-event-ticket-checkout/)
    assert.match(source,/referrerPolicy="no-referrer"/)
    assert.doesNotMatch(source,/paymentStatus\s*=\s*['"]paid|sendBeacon|pixelTrack/)
  }
  assert.match(detail,/findPublishedPractitionerEvent\(eventId\)/)
  assert.match(calendar,/findPublishedPractitionerEvent\(eventId\)/)
  assert.match(resolver,/createPractitionerEventsRepository/)
  assert.match(resolver,/\.publicEvents\(\)/)
  assert.match(resolver,/master-\[a-f0-9\]/)
  assert.match(data,/ticketPaymentHref\?: string/)
})
