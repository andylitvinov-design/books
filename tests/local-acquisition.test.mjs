import { homeFixture, assertDeferredHome, components, elements, links, nodes, textOf } from './helpers/home-source-render-fixture.mjs';
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

test('public Home keeps four photo offers while Services renders the approved free-first studio', async () => {
  // Owner-merged #1153 replaced the old ServicesSolutions placement, not its routes.
  for (const locale of ['en', 'ru', 'es']) {
    const fixture = homeFixture({ locale });
    await assertDeferredHome(fixture, locale);
    const services = await fixture.renderServices();
    const cards = elements(services, 'article').filter(node => node.props['data-services-studio-card']);
    const routes = { tests: 'tests', situation: 'services/free-situation-review', dao: 'services/dao-health-profile', alchemy: 'services/alchemy-of-soul', hypnotherapy: 'services/hypnotherapy-course', constellations: 'services/systemic-constellations', business: 'services/business-consulting', 'remote-energy-support': 'services/remote-energy-support' };
    assert.deepEqual(cards.map(node => node.props['data-services-studio-card']), Object.keys(routes));
    for (const card of cards) {
      assert.equal(card.props.hidden, false);
      assert.ok(links(card).some(link => link.props.href === `/${locale}/${routes[card.props['data-services-studio-card']]}`));
      assert.ok(elements(card, 'h3').some(title => textOf(title).length > 4));
    }
    assert.equal(components(services, 'CatalogShowcase').length, 0);
    assert.ok(links(services).some(link => link.props.href === `/${locale}/services/catalog`));
    assert.match(textOf(services), { en: /do not replace medical assessment or treatment/, ru: /не заменяют медицинскую диагностику и лечение/, es: /no sustituyen la atención médica/ }[locale]);
    assert.doesNotMatch(textOf(services), /client answer|assessment score|diagnosed condition/i);
  }
});

test('Services retains source-backed introduction and method videos in the approved studio order', async () => {
  for (const locale of ['en', 'ru', 'es']) {
    const tree = await homeFixture({ locale }).renderServices();
    const flat = nodes(tree);
    const order = ['ServicesStudioOffers', 'ServicesIntroMedia', 'PersonalTestimonials', 'ServicesMethodVideos', 'PublicConsultationCta', 'ServicesDirectoryInvitation'];
    let previous = -1;
    for (const name of order) {
      const matches = components(tree, name); assert.equal(matches.length, 1, name);
      const index = flat.indexOf(matches[0]); assert.ok(index > previous, name); previous = index;
    }
    const intro = components(tree, 'ServicesIntroMedia')[0];
    const methods = components(tree, 'ServicesMethodVideos')[0];
    const disclosure = elements(methods, 'details').find(node => node.props.id === 'method-videos');
    assert.equal(disclosure?.props.open, true);
    assert.ok(textOf(elements(disclosure, 'summary')[0]).length > 10);
    if (locale === 'es') {
      assert.deepEqual(components(intro, 'ServiceVideoShowcase').map(node => node.props.topic), ['overview']);
      assert.deepEqual(components(methods, 'ServiceVideoShowcase').map(node => node.props.topic), ['hypnotherapy', 'constellations']);
    } else {
      assert.deepEqual(components(intro, 'PageVideo').map(node => node.props.slot), ['services-intro']);
      assert.deepEqual(components(methods, 'PageVideo').map(node => node.props.slot), ['method-hypnotherapy', 'method-constellations', 'service-business', 'service-alchemy', 'service-archetypal', 'consultation']);
      assert.ok(components(methods, 'PageVideo').every(node => node.props.locale === locale));
    }
    assert.equal(components(tree, 'PublicConsultationCta')[0].props.id, 'consultation');
  }
});

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
