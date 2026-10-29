import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VIDEO_AREAS, videoAreasFromRow, videoTopicsFromRow,
  prepareVideoReview, prepareDurationReview, videoLinkEligible, videoReviewChecks,
} from '../lib/site-videos/review-model.mjs'

const review = {
  youtubeId: 'DbDoBzGY3vo', revision: 3, action: 'accept',
  areas: ['energy_health'], topics: ['body'], note: 'Gentle practice',
  screened: true,
}

test('review shows the four real life spheres, not a second category tree', () => {
  assert.deepEqual(VIDEO_AREAS.map(area => area.id),
    ['business', 'relationships', 'energy_health', 'personal_growth'])
  assert.deepEqual(videoAreasFromRow({
    goals: ['energy', 'meaning'], subtopics: ['energy_health', 'body'],
  }), ['energy_health', 'personal_growth'])
  assert.deepEqual(videoTopicsFromRow({ subtopics: ['energy_health', 'body'] }), ['body'])
})

test('owner choices translate to original catalog goals and subtopics', () => {
  assert.deepEqual(prepareVideoReview(review), {
    youtubeId: 'DbDoBzGY3vo', revision: 3, action: 'accept',
    areas: ['energy_health'], goals: ['energy'],
    subtopics: ['energy_health', 'body'],
    note: 'Gentle practice', screened: true,
  })
  assert.deepEqual(prepareVideoReview({
    ...review, areas: ['business', 'personal_growth'], topics: ['money', 'goal'],
  }).goals, ['money', 'meaning', 'goals'])
  assert.equal(prepareVideoReview({ ...review, action: 'reject' }).screened, false)
  assert.deepEqual(prepareVideoReview({ ...review, action: 'reject', areas: [], topics: [] }).goals, [])
  assert.equal(prepareVideoReview({ ...review, action: 'save' }).screened, false)
})

test('reject malformed IDs, categories, tags, revisions and arbitrary fields', () => {
  const bad = [
    { youtubeId: 'https://youtu.be/DbDoBzGY3vo' },
    { youtubeId: 'not-valid' }, { revision: -1 }, { revision: 1.2 },
    { action: 'publish' }, { areas: ['energy_health', 'energy_health'] },
    { areas: ['health'] }, { topics: ['unknown'] },
    { topics: ['work'] }, { note: 'a'.repeat(501) },
    { surprise: true },
  ]
  for (const item of bad) assert.throws(() => prepareVideoReview({ ...review, ...item }), /validation/)
})

const linkCandidate = {
  owner_review_status: 'accepted', source_kind: 'external', content_type: 'guided',
  editorial_status: 'candidate',
  duration_verified_seconds: 375, duration_basis: 'metadata_checked', metadata_confidence: 'public_listing',
  metadata_checked_at: '2026-10-29T13:00:00Z', youtube_oembed_checked_at: '2026-10-29T13:00:00Z',
  content_checked_at: '2026-10-29T13:10:00Z', claims_risk: 'low',
  embed_status: 'unverified', rights_status: 'pending_embed_check',
}

test('client link release requires owner, duration, independent listing and screening', () => {
  assert.equal(videoLinkEligible(linkCandidate), true)
  const fields = [
    ['owner_review_status', 'pending'], ['owner_review_status', 'rejected'],
    ['duration_verified_seconds', 601], ['duration_verified_seconds', null],
    ['duration_basis', 'title_only'], ['duration_basis', 'unknown'],
    ['youtube_oembed_checked_at', null], ['metadata_checked_at', null],
    ['content_checked_at', null], ['metadata_confidence', 'candidate'],
    ['claims_risk', 'high'], ['source_kind', 'original'],
    ['content_type', 'talk'], ['editorial_status', 'approved'],
    ['embed_status', 'blocked'], ['rights_status', 'blocked'],
  ]
  for (const [key, value] of fields) assert.equal(
    videoLinkEligible({ ...linkCandidate, [key]: value }), false, key)
  assert.deepEqual(videoReviewChecks(linkCandidate),
    { duration: true, oembed: true, content: true, embed: false })
})

// Source contract for the private server-only write path. Keep this separate from
// browser mocks: an owner checkbox confirms manual screening, not a risk override.
test('screening never downgrades independently flagged risk or bypasses link-only guards', () => {
  const store = readFileSync(new URL('../lib/site-videos/review-store.js', import.meta.url), 'utf8')
  assert.match(store, /const claimsRisk\s*=\s*before\.claims_risk\b/)
  assert.doesNotMatch(store, /const claimsRisk\s*=\s*review\.screened\s*\?\s*['"]low['"]/) 
  assert.equal(videoLinkEligible({ ...linkCandidate, claims_risk: 'high' }), false)
  assert.equal(videoLinkEligible({ ...linkCandidate, owner_review_status: 'pending' }), false)
})

test('owner clock is explicit and restricted to one to ten minutes', () => {
  const base = { youtubeId: 'DbDoBzGY3vo', revision: 2, confirmed: true };
  assert.deepEqual(prepareDurationReview({ ...base, clock: '6:51' }),
    { youtubeId: 'DbDoBzGY3vo', revision: 2, seconds: 411 });
  assert.equal(prepareDurationReview({ ...base, clock: '10:00' }).seconds, 600);
  for (const input of [
    { clock: '10:01' }, { clock: '11:00' }, { clock: '0:00' },
    { clock: '5:99' }, { clock: '5 min' }, { clock: '05:03', confirmed: false },
    { clock: '5:00', revision: -1 }, { clock: '5:00', unexpected: true },
  ]) assert.throws(() => prepareDurationReview({ ...base, clock: '05:00', ...input }), /validation/);
  assert.equal(videoLinkEligible({ ...linkCandidate, duration_basis: 'owner_checked' }), true);
});
