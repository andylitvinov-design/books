import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  ACQUISITION_EVENTS,
  LOCAL_ACQUISITION,
  gbpHref,
} from '../data/local-acquisition.js'

test('the English Maps entry exposes only the approved local acquisition offers', () => {
  const entry = LOCAL_ACQUISITION.en

  assert.deepEqual(entry.services.map(({ id }) => id), [
    'hypnotherapy',
    'systemic-constellations',
    'business-decision-constellations',
    'reiki-energy-work',
  ])
  assert.equal(entry.selfCheck.href, '/en/app')
  assert.doesNotMatch(JSON.stringify(entry), /psychotherapist|homeopath|cure/i)
})

test('GBP links preserve the controlled attribution contract without replacing the destination path', () => {
  assert.equal(
    gbpHref('/en/app?from=home'),
    '/en/app?from=home&utm_source=google&utm_medium=organic&utm_campaign=gbp&utm_content=profile',
  )
})

test('acquisition events are an allowlist and never describe personal or assessment data', () => {
  assert.deepEqual(ACQUISITION_EVENTS, [
    'gbp_landing_view',
    'service_view',
    'practitioner_view',
    'self_check_start',
    'contact_click',
    'service_request_start',
  ])
  assert.doesNotMatch(JSON.stringify(ACQUISITION_EVENTS), /answer|score|email|name|health/i)
})

test('the public home keeps local acquisition; Services now leads with client questions', () => {
  const home = readFileSync(new URL('../components/holistic-house-home.tsx', import.meta.url), 'utf8')
  const services = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8')
  const solutions = readFileSync(new URL('../components/services-solutions.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../app/holistic-house-home.css', import.meta.url), 'utf8')

  assert.match(home, /LOCAL_ACQUISITION/)
  assert.match(styles, /\.service-home-self-check/)
  assert.match(services, /<ServicesSolutions locale=/)
  assert.doesNotMatch(services, /<CatalogShowcase/)
  assert.match(solutions, /free-situation-review\?topic=/)
  for (const topic of ['personal', 'goal', 'business', 'wellbeing']) {
    assert.ok(solutions.includes('topic: "' + topic + '"'), topic)
  }
})

test('Services preserves source-backed videos in optional method explanations, not in competing cards', () => {
  const services = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8')
  const start = services.indexOf('<details className={solutionStyles.extra} id="method-videos">')
  const end = services.indexOf('</details>', start)
  const videoSection = services.slice(start, end)

  assert.ok(start > services.indexOf('<ServicesSolutions'))
  assert.match(videoSection, /PageVideo slot="services-intro"/)
  assert.match(videoSection, /method-hypnotherapy/)
  assert.match(videoSection, /method-constellations/)
  assert.match(videoSection, /PageVideo slot="consultation"/)
  assert.doesNotMatch(services.slice(services.indexOf('<main className='), start), /<PageVideo/)
})

test('event instrumentation is consent-gated and has no personal-data payload path', () => {
  const source = readFileSync(new URL('../components/acquisition-event-link.tsx', import.meta.url), 'utf8')

  assert.match(source, /analyticsConsent/)
  assert.match(source, /holistic-house:acquisition/)
  assert.match(source, /ACQUISITION_EVENTS/)
  assert.doesNotMatch(source, /FormData|assessment|email|score|answer|contact/i)
})

test('the GBP handoff package uses the verified review destination and factual media rules', () => {
  const pack = readFileSync(new URL('../docs/gbp/2026-10-05-content-and-review-pack.md', import.meta.url), 'utf8')
  const inventory = readFileSync(new URL('../docs/gbp/2026-10-05-asset-inventory.md', import.meta.url), 'utf8')
  const qr = readFileSync(new URL('../public/gbp/holistic-house-review-qr.svg', import.meta.url), 'utf8')

  assert.match(pack, /https:\/\/g\.page\/r\/CT0jS16IuG4wEBM\/review/)
  assert.equal((pack.match(/^## Post [1-8] /gm) || []).length, 8)
  assert.match(inventory, /DO NOT USE/)
  assert.match(inventory, /AI-generated|AI generated/i)
  assert.match(qr, /https:\/\/g\.page\/r\/CT0jS16IuG4wEBM\/review/)
  assert.match(qr, /<svg/)
})

test('the JavaScript acquisition model has an explicit TypeScript boundary', () => {
  const types = readFileSync(new URL('../data/local-acquisition.d.ts', import.meta.url), 'utf8')

  assert.match(types, /LOCAL_ACQUISITION/)
  assert.match(types, /AcquisitionService/)
})
