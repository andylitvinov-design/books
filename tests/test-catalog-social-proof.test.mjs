import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compareTestSocialProof } from '../lib/assessments/test-popularity.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const A = { key: 'test-a' }, B = { key: 'test-b' }, C = { key: 'test-c' }

test('popularity counts real starts and weighted completions, not arbitrary pageviews', () => {
  const stats = {
    [A.key]: { starts: 100, completions: 0 },
    [B.key]: { starts: 40, completions: 30 },
    [C.key]: { starts: 0, completions: 0 },
  }
  assert.ok(compareTestSocialProof(A, B, 'popular', stats) > 0)
  assert.ok(compareTestSocialProof(B, A, 'popular', stats) < 0)
  assert.ok(compareTestSocialProof(B, C, 'popular', stats) < 0)
  assert.equal(compareTestSocialProof(A, A, 'popular', stats), 0)
})

test('rated tests sort above unrated and Bayesian smoothing protects against one-vote bias', () => {
  const stats = {
    [A.key]: { averageRating: 5, ratingCount: 1 },
    [B.key]: { averageRating: 4.5, ratingCount: 25 },
  }
  assert.ok(compareTestSocialProof(A, B, 'rating', stats) > 0)
  assert.ok(compareTestSocialProof(B, C, 'rating', stats) < 0)
  assert.ok(compareTestSocialProof(C, A, 'rating', stats) > 0)
})

test('sorting has stable key tie breaks and never mutates stats', () => {
  const stats = { [A.key]: { starts: 0, completions: 0 } }
  const frozen = Object.freeze(stats[A.key])
  assert.ok(compareTestSocialProof(A, B, 'popular', stats) < 0)
  assert.equal(compareTestSocialProof(A, B, 'recommended', stats), 0)
  assert.strictEqual(stats[A.key], frozen)
})

test('test ratings require a completed matching account or guest result', () => {
  const model = read('lib/app/test-catalog-social-proof.js')
  assert.match(model, /app\.assessment_results r/)
  assert.match(model, /app_private\.guest_results r/)
  assert.match(model, /v\.definition_key=\$2/)
  assert.match(model, /RATING_REQUIRES_COMPLETION/)
  assert.match(model, /guest_sessions/)
  assert.match(model, /secret_hash=\$2/)
  assert.match(model, /app_private\.test_catalog_public_stats\(\)/)
  assert.doesNotMatch(model, /r\.answers/)
})

test('migration tracks anonymous activity and stores at most one rating per tester and test', () => {
  const sql = read('supabase/migrations/20261017183000_hh_test_catalog_social_proof.sql')
  assert.match(sql, /create trigger test_catalog_account_start/)
  assert.match(sql, /create trigger test_catalog_guest_start/)
  assert.match(sql, /create trigger test_catalog_account_finish/)
  assert.match(sql, /create trigger test_catalog_guest_finish/)
  assert.match(sql, /unique\(account_id, definition_key\)/)
  assert.match(sql, /unique\(guest_session_id, definition_key\)/)
  assert.match(sql, /rating between 1 and 5/)
  assert.match(sql, /revoke all on app_private\.test_catalog_ratings/)
  assert.match(sql, /security definer/)
  assert.doesNotMatch(sql, /answers jsonb/)
})

test('public catalog uses an anonymous stats endpoint and real sorting options in all locales', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const publicRoute = read('app/api/test-catalog/stats/route.js')
  assert.match(explorer, /value="popular"/)
  assert.match(explorer, /value="rating"/)
  assert.match(explorer, /По популярности/)
  assert.match(explorer, /По оценкам/)
  assert.match(explorer, /Most popular/)
  assert.match(explorer, /Top rated/)
  assert.match(explorer, /Mejor valoradas/)
  assert.match(explorer, /data-test-social-proof/)
  assert.match(explorer, /compareTestSocialProof/)
  assert.match(publicRoute, /readTestCatalogStats/)
  assert.doesNotMatch(publicRoute, /app\.assessment_results/)
})

test('five-star feedback is optional and offered after persisted results to guests and accounts', () => {
  const card = read('components/app/test-rating-card.jsx')
  const routes = read('app/api/app/[...path]/route.js')
  assert.match(card, /\[1, 2, 3, 4, 5\]\.map/)
  assert.match(card, /aria-pressed/)
  assert.match(card, /test-ratings/)
  assert.match(read('components/app/app-workspace.jsx'), /<TestRatingCard locale=\{locale\} definitionKey=\{result.definitionKey\}/)
  assert.match(read('components/app/cabinet-landing.jsx'), /<TestRatingCard locale=\{locale\} definitionKey=\{guestResult.definitionKey\} guest/)
  assert.match(routes, /saveGuestTestRating/)
  assert.match(routes, /saveAccountTestRating/)
  assert.match(routes, /consumeRate\(config, \{ op: 'guest-test-rating'/)
})
