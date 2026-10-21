import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { servicesStudioContract } from './helpers/services-studio-contract.mjs'

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
  assert.equal(entry.selfCheck.href, '/en/client#cabinet-tests')
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

test('public Home and Services use four shared offers without exposing private answers', async () => {
  const home = readFileSync(new URL('../components/holistic-house-home.tsx', import.meta.url), 'utf8');
  const services = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../components/services-solutions.tsx', import.meta.url), 'utf8');
  const offers = readFileSync(new URL('../data/core-service-offers.ts', import.meta.url), 'utf8');
  assert.match(home, /LOCAL_ACQUISITION/);
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home"/);
  const sharedRoutes = {
    situation: 'free-situation-review',
    dao: 'dao-health-profile',
    alchemy: 'alchemy-of-soul',
    hypnotherapy: 'hypnotherapy-course',
  };
  for (const locale of ['en', 'ru']) {
    const view = await servicesStudioContract(locale);
    assert.deepEqual([...view.homeIds].sort(), Object.keys(sharedRoutes).sort(), locale + ': Home retains exactly the four shared offers');
    for (const [id, route] of Object.entries(sharedRoutes)) {
      const href = '/' + locale + '/services/' + route;
      const core = view.core.filter(offer => offer.id === id);
      assert.equal(core.length, 1, locale + ': shared core offer exists once: ' + id);
      assert.equal(core[0].href, href, locale + ': shared core route remains unchanged: ' + id);
      const cards = view.cards.filter(card => card.props['data-services-studio-card'] === id);
      assert.equal(cards.length, 1, locale + ': shared Services offer exists once: ' + id);
      assert.equal(cards[0].props.hidden, false, locale + ': shared offer is visible by default: ' + id);
      assert.equal(view.isVisible(cards[0]), true, locale + ': no hidden ancestor conceals shared offer: ' + id);
      const links = view.descendants(cards[0]).filter(node => node.type === 'a');
      assert.ok(links.length >= 3, locale + ': shared offer keeps photo, title and details destinations: ' + id);
      for (const link of links) assert.equal(link.props.href, href, locale + ': shared offer keeps its localized destination: ' + id);
    }
  }
  assert.doesNotMatch(services, /<CatalogShowcase/);
  assert.match(ui, /coreServiceOffers\(locale\)/);
  assert.match(offers, /dao-health-profile/);
  assert.match(offers, /alchemy-of-soul/);
  assert.match(offers, /hypnotherapy-course/);
});

test('Services exposes source-backed method videos after service cards, booking and testimonials', () => {
  const services = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8')
  const start = services.indexOf('<details className={solutionStyles.extra} id="method-videos" open>')
  const end = services.indexOf('</details>', start)
  const videoSection = services.slice(start, end)

  assert.ok(start > services.indexOf('<ServicesSolutions'))
  assert.ok(start > services.indexOf('<PersonalTestimonials'))
  assert.ok(services.indexOf('<PersonalTestimonials') > services.indexOf('<PublicConsultationCta'))
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
