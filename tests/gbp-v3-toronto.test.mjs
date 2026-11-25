import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateMarketingLead, MARKETING_SOURCES, marketingSnapshot } from '../lib/crm/marketing.js'
import { safePublicWhatsAppPath } from '../lib/whatsapp-enquiry.js'

const source = relative => readFileSync(new URL('../' + relative, import.meta.url), 'utf8')
const contactId = '123e4567-e89b-42d3-a456-426614174000'

test('Google Maps is owner-confirmed and distinct from search/paid Google', () => {
  assert.ok(MARKETING_SOURCES.includes('google_maps'))
  assert.ok(MARKETING_SOURCES.includes('google_organic'))
  assert.ok(MARKETING_SOURCES.includes('google_ads'))
  const maps = validateMarketingLead({ contactId, source: 'google_maps',
    medium: 'organic_search', campaign: 'gbp', creative: 'profile', offer: 'free_review' })
  assert.equal(maps.source, 'google_maps')
  assert.equal(maps.medium, 'organic_search')
  assert.equal(maps.campaign, 'gbp')
  for (const invalid of [
    { contactId, source: 'google_maps', medium: 'imaginary', offer: 'other' },
    { contactId, source: 'google_maps', medium: 'organic_search', campaign: 'private question', offer: 'other' },
    { contactId, source: 'google_maps', medium: 'organic_search', diagnosis: 'sensitive', offer: 'other' },
  ]) assert.throws(() => validateMarketingLead(invalid))
  const overview = marketingSnapshot([
    { source: 'google_maps', stage: 'booked', contact_id: contactId },
    { source: 'google_organic', stage: 'received', contact_id: contactId },
    { source: 'google_ads', stage: 'qualified', contact_id: '323e4567-e89b-42d3-a456-426614174000' },
  ], [])
  assert.deepEqual(overview.rows.map(x => x.source).sort(), ['google_ads','google_maps','google_organic'])
  assert.equal(overview.totals.booked, 1)
  assert.equal(overview.totals.uniqueContacts, 2)
})

test('source options, source-specific counters and SQL whitelist retain owner-only boundary', () => {
  const ui = source('components/app/crm-marketing.jsx')
  const lib = source('lib/crm/marketing-repository.js')
  const migration = source('supabase/migrations/20261018230048_hh_crm_google_maps_source_20261018.sql')
  assert.match(ui, /\['google_maps','Google Maps'\]/)
  assert.match(ui, /mapsGroup.*google_maps/)
  assert.match(ui, /if\(e\.target\.value==='google_maps'\)setMedium\('organic_search'\)/)
  assert.match(ui, /Only enquiries actually received and confirmed by the owner/)
  assert.match(migration, /crm_marketing_opportunities_source_check/)
  assert.match(migration, /'google_maps'/)
  assert.doesNotMatch(migration, /DROP POLICY|DISABLE ROW LEVEL SECURITY|GRANT .*anon/i)
  assert.match(lib, /withMarketingOwner/)
  assert.match(lib, /provenance:'owner_confirmed'/)
  assert.match(lib, /input\.contactId,actor\.id/)
})

test('dedicated Toronto landing gives three localized routes with truthful request language', () => {
  const route = source('app/[locale]/toronto/page.tsx')
  const stylesheet = source('app/[locale]/toronto/toronto.module.css')
  const siteMap = source('app/sitemap.ts')
  assert.match(route, /data-gbp-toronto-entry/)
  assert.match(route, /<FreeReviewQuickRequest locale=\{locale\}/)
  assert.match(route, /pagePath=\{\"\/\" \+ locale \+ \"\/toronto\"\}/)
  assert.equal(safePublicWhatsAppPath('/en/toronto?private=something'), '/en/toronto')
  assert.equal(safePublicWhatsAppPath('/en/client/private'), '')
  assert.match(route, /<PublicSiteHeader locale=\{locale\}/)
  assert.match(route, /"x-default": "\/en\/toronto"/)
  assert.match(route, /en: \{/)
  assert.match(route, /ru: \{/)
  assert.match(route, /es: \{/)
  assert.match(route, /"services\/systemic-constellations"/)
  assert.match(route, /"services\/business-consulting"/)
  assert.match(route, /No walk-in service is promised/)
  assert.match(route, /not a live call/)
  assert.match(route, /not an automatic booking/)
  assert.doesNotMatch(route, /LocalBusiness|fake review|ratingValue|aggregateRating/)
  assert.match(stylesheet, /@media\(max-width:580px\)/)
  for (const locale of ['en','ru','es']) assert.ok(siteMap.includes("'/" + locale + "/toronto'"))
})

test('clinical client review solicitation is held rather than distributed as a template', () => {
  const pack = source('docs/gbp/2026-10-05-content-and-review-pack.md')
  assert.match(pack, /SAFETY HOLD/)
  assert.match(pack, /CRPO Professional Practice Standard 6\.2\.2/)
  assert.match(pack, /No automated review request/)
  assert.doesNotMatch(pack, /### Neutral request|### WhatsApp version|### Email version/)
  assert.match(pack, /not an authorization to ask clients for reviews/i)
})
