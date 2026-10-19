import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validatePractitionerEvent, eventPublicProjection } from '../lib/practitioners/event-contracts.js'

const event = {
  title:{en:'Heart Circle',ru:'Круг сердца'},
  description:{en:'A gentle gathering',ru:'Мягкая встреча'},
  category:'connection', format:'in_person',
  startsAt:'2026-11-11T18:00:00-05:00',
  endsAt:'2026-11-11T20:00:00-05:00',
  timeZone:'America/Toronto',city:'Toronto',location:'Toronto, ON',
  registrationHref:'https://example.org/registration',pricingMode:'fixed',priceAmount:30,currency:'CAD',
  posterUrl:'',
}
const errorCode = expected => error => error?.code === expected

test('private draft can be incomplete but public submission cannot', () => {
  assert.equal(validatePractitionerEvent({}).startsAt,'')
  assert.throws(()=>validatePractitionerEvent({}, {complete:true}),errorCode('EVENT_DATE_REQUIRED'))
})

test('validate a localized complete public event and preserve its schedule', () => {
  const draft=validatePractitionerEvent(event,{complete:true})
  assert.equal(draft.timeZone,'America/Toronto')
  assert.equal(draft.endsAt,'2026-11-11T20:00:00-05:00')
  const published=eventPublicProjection('afe0b1ab-3b75-4ce6-a8b0-0085437f24b8','an-example','The host',draft)
  assert.equal(published.title.ru,'Круг сердца')
  assert.equal(published.title.es,'Heart Circle')
  assert.equal(published.organizerHref,'/en/masters/an-example')
  assert.equal(published.priceLabel,'30 CAD')
  assert.equal(published.status,'published')
})

test('missing registration, venue, or content prevents publishing', () => {
  assert.throws(()=>validatePractitionerEvent({...event,registrationHref:''},{complete:true}),errorCode('EVENT_REGISTRATION_REQUIRED'))
  assert.throws(()=>validatePractitionerEvent({...event,location:''},{complete:true}),errorCode('EVENT_LOCATION_REQUIRED'))
  assert.throws(()=>validatePractitionerEvent({...event,title:{en:''}},{complete:true}),errorCode('EVENT_CONTENT_REQUIRED'))
})

test('reject unsafe links, invalid timestamps, and unknown time zones', () => {
  assert.throws(()=>validatePractitionerEvent({...event,registrationHref:'javascript:alert(1)'}),errorCode('INVALID_EVENT_REGISTRATION'))
  assert.throws(()=>validatePractitionerEvent({...event,registrationHref:'//bad.example.org'}),errorCode('INVALID_EVENT_REGISTRATION'))
  assert.throws(()=>validatePractitionerEvent({...event,startsAt:'2026-11-11T18:00'}),errorCode('INVALID_EVENT_DATE'))
  assert.throws(()=>validatePractitionerEvent({...event,timeZone:'Fake/Fake'}),errorCode('INVALID_EVENT_TIMEZONE'))
  assert.throws(()=>validatePractitionerEvent({...event,endsAt:event.startsAt}),errorCode('INVALID_EVENT_END'))
  assert.throws(()=>validatePractitionerEvent({...event,priceAmount:-3}),errorCode('INVALID_EVENT_PRICE'))
})

test('public calendar displays approved events while private API requires account authentication', () => {
  const eventsRoute=readFileSync(new URL('../app/[locale]/events/page.tsx',import.meta.url),'utf8')
  const api=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
  const repository=readFileSync(new URL('../lib/practitioners/events-repository.js',import.meta.url),'utf8')
  assert.match(eventsRoute,/createPractitionerEventsRepository/)
  assert.match(eventsRoute,/\.publicEvents\(\)/)
  assert.match(api,/const actor = await auth\.verified\(\)/)
  assert.match(api,/joined === 'practice\/events' && method === 'GET'/)
  assert.match(api,/eventsRepo\.save\(actor/)
  assert.match(repository,/where e\.status in \('published','submitted','changes_requested'\)/)
  assert.match(repository,/and e\.published<>'\{\}'::jsonb/)
  assert.match(repository,/checkOwnedPoster\(draft, actor\.id, config\)/)
  assert.match(repository,/current\.revision !== input\.expectedRevision/)
})

test('event table is private by default and only authenticated masters can change it', () => {
  const migration=readFileSync(new URL('../supabase/migrations/20261019160000_hh_practitioner_events.sql',import.meta.url),'utf8')
  assert.match(migration,/enable row level security/)
  assert.match(migration,/revoke all on app\.practitioner_events from public, anon, authenticated/)
  assert.match(migration,/trusted_auth_user_id=\(select auth\.uid\(\)\)/)
  assert.match(migration,/current_setting\('hh\.moderator',true\)/)
  assert.match(migration,/published <> '\{\}'::jsonb/)
})
