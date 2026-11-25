import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ads = JSON.parse(readFileSync(new URL('../data/google-ads-pilot-draft.json', import.meta.url), 'utf8'))
const privatePath = /\/(client|app|report|prescriptions|admin)(\/|$)/
const prohibited = /\b(cure|guaranteed healing|treat depression|licensed therapist|registered homeopath|patient)\b/i

test('Google Ads pilot requires explicit approval: no IDs, no budgets, all paused', () => {
  assert.equal(ads.status, 'DRAFT_NOT_CONNECTED')
  assert.equal(ads.approvedSpendCad, null)
  assert.equal(ads.googleAdsAccountId, null)
  assert.equal(ads.measurementPropertyId, null)
  assert.equal(ads.keywordsAreResearchSeedsNotMeasuredVolumes, true)
  assert.ok(ads.campaigns.length >= 2)
  for (const campaign of ads.campaigns) {
    assert.equal(campaign.status, 'PAUSED')
    assert.equal(campaign.dailyBudgetCad, null)
    assert.match(campaign.launchGate, /^BLOCKED_/)
    assert.equal(campaign.channel, 'SEARCH')
    assert.equal(campaign.target.locationOption, 'PRESENCE_ONLY')
    assert.equal(campaign.target.searchPartners, false)
    assert.equal(campaign.target.displayExpansion, false)
    assert.deepEqual(campaign.audiences, [])
  }
})

test('Search drafts are public, exact or phrase and respect Google copy length', () => {
  for (const campaign of ads.campaigns) for (const group of campaign.adGroups) {
    assert.equal(group.status, 'PAUSED')
    assert.match(group.landingPath, /^\/en\/(services|academy)\//)
    assert.doesNotMatch(group.landingPath, privatePath)
    assert.ok(group.keywords.every(k => /^\[.+\]$|^".+"$/.test(k)))
    assert.equal(group.responsiveSearchAd.status, 'PAUSED')
    assert.ok(group.responsiveSearchAd.headlines.length >= 5)
    assert.ok(group.responsiveSearchAd.headlines.length <= 15)
    assert.ok(group.responsiveSearchAd.descriptions.length >= 2)
    assert.ok(group.responsiveSearchAd.descriptions.length <= 4)
    for (const h of group.responsiveSearchAd.headlines) {
      assert.ok(h.length <= 30, 'headline too long: ' + h)
      assert.doesNotMatch(h, prohibited)
    }
    for (const d of group.responsiveSearchAd.descriptions) {
      assert.ok(d.length <= 90, 'description too long: ' + d)
      assert.doesNotMatch(d, prohibited)
    }
  }
})

test('Confirmed leads cannot be inferred from messenger clicks', () => {
  assert.ok(ads.conversionContract.primary.includes('lead_received_verified'))
  assert.ok(ads.conversionContract.neverCountAsConfirmedLead.includes('whatsapp_handoff_click'))
  assert.ok(ads.conversionContract.neverCountAsConfirmedLead.includes('assessment_prepared'))
  assert.match(ads.conversionContract.payload, /never questions/)
  assert.match(ads.notes, /No campaign may be enabled/)
  assert.match(ads.notes, /Do not use patient\/test data/)
})
