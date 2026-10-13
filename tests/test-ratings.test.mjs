import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { compareTestRatings, ratingSummary, RATING_COPY, RATING_MINIMUM_COUNT, topRatedSelection } from '../lib/assessments/test-ratings.js'
import { validateRatingInput } from '../lib/assessments/test-ratings.js'
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const entry = key => ({ key, definition: { id: key } })
test('ratings validate integer stars and concurrency revision without coercion or client identity fields', () => {
  for (let stars = 1; stars <= 5; stars++) assert.deepEqual(validateRatingInput({ uiLocale: 'en', stars, expectedRevision: 0 }), { uiLocale: 'en', stars, expectedRevision: 0 })
  for (const stars of [0, 6, -1, 4.5, '5', null, true, undefined, NaN]) assert.throws(() => validateRatingInput({ uiLocale: 'en', stars, expectedRevision: 0 }))
  for (const expectedRevision of [-1, 0.5, '0', undefined, Infinity]) assert.throws(() => validateRatingInput({ uiLocale: 'en', stars: 4, expectedRevision }))
  for (const uiLocale of ['es', 'EN', '', null, undefined]) assert.throws(() => validateRatingInput({ stars: 4, expectedRevision: 0, uiLocale }))
  for (const key of ['accountId', 'definitionId', 'resultId', 'ratingCount']) assert.throws(() => validateRatingInput({ uiLocale: 'en', stars: 4, expectedRevision: 0, [key]: 'forged' }))
})
test('aggregate DTO accepts only honest counts and means', () => {
  assert.deepEqual(ratingSummary({ rating_count: '5', rating_sum: '23', account_id: 'private' }), { count: 5, average: 4.6, ranked: true })
  assert.deepEqual(ratingSummary({ rating_count: 1, rating_sum: 5 }), { count: 1, average: 5, ranked: false })
  for (const row of [null, {}, { rating_count: 0, rating_sum: 0 }, { rating_count: 2, rating_sum: 11 }, { rating_count: 2, rating_sum: 1 }, { rating_count: 1.5, rating_sum: 5 }]) assert.equal(ratingSummary(row), null)
})
test('highest rated uses minimum five, mean then volume, and preserves relevance for unranked tests', () => {
  assert.equal(RATING_MINIMUM_COUNT, 5)
  const summaries = { one: { count: 1, average: 5 }, five: { count: 5, average: 4.8 }, many: { count: 40, average: 4.8 }, low: { count: 100, average: 4.1 } }
  const ordered = ['one', 'unknown', 'low', 'five', 'many'].map(entry).sort((a, b) => compareTestRatings(a, b, summaries))
  assert.deepEqual(ordered.map(e => e.key), ['many', 'five', 'low', 'one', 'unknown'])
  assert.equal(compareTestRatings(entry('new-version'), entry('one'), summaries), 0, 'ratings never cross versions or languages by key')
})
test('EN/RU/ES labels cover the same accessible feedback states and explain the limits', () => {
  for (const locale of ['ru', 'es']) assert.deepEqual(Object.keys(RATING_COPY[locale]).sort(), Object.keys(RATING_COPY.en).sort())
  assert.match(RATING_COPY.en.note, /not scientific validity/)
  assert.match(RATING_COPY.ru.note, /не научной достоверности/)
  assert.match(RATING_COPY.en.method, /at least 5/)
  const ui = source('components/app/test-rating.jsx')
  for (const expected of ['type="radio"', '<fieldset', '<legend', 'aria-label', 'role="status"', 'expectedRevision', 'busy.current', 'mounted.current', "status === 'available'"]) assert.ok(ui.includes(expected), expected)
  assert.match(source('components/app/test-rating.module.css'), /min-width:44px;min-height:48px/)
  assert.match(source('components/app/test-rating.module.css'), /focus-visible/)
  for (const file of ['components/app/app-workspace.jsx', 'components/app/cabinet-landing.jsx']) assert.match(source(file), /<TestRating /)
  for (const file of ['components/app/test-explorer.jsx', 'components/app/simple-test-picker.jsx']) assert.match(source(file), /TestRatingSummary/)
})
test('private storage, database eligibility and narrow aggregate interface are explicit in migration', () => {
  const filename = readdirSync(new URL('../supabase/migrations/', import.meta.url)).find(name => name.endsWith('_hh_client_test_ratings.sql'))
  assert.ok(filename, 'CLI-generated migration is committed')
  const sql = source('supabase/migrations/' + filename)
  assert.match(sql, /primary key \(account_id, definition_key\)/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /from public, anon, authenticated, hh_app_inbox/)
  assert.match(sql, /run.status = 'completed'/)
  assert.match(sql, /foreign key \(source_result_id, account_id\)/)
  assert.match(sql, /security definer set search_path = ''/)
  assert.match(sql, /returns table\(definition_id uuid, rating_count bigint, rating_sum bigint\)/)
  assert.doesNotMatch(sql, /grant .* to (anon|authenticated)/)
  assert.doesNotMatch(sql, /create (table|view|function) public\./)
  const repo = source('lib/app/test-ratings.js')
  assert.match(repo, /run.status='completed'/)
  assert.match(repo, /RATING_CONFLICT/)
  assert.match(repo, /requirePublishedInterpretation\(db, source, input.uiLocale\)/)
  assert.match(repo, /i.ui_locale=\$2 and i.interpretation_version=\$3/)
  assert.match(repo, /i.instrument_content_hash=v.content_hash/)
  assert.match(repo, /where r.id=\$1 and r.account_id=\$2/)
  assert.match(repo, /for update/)
  assert.doesNotMatch(repo, /db\.query\([\x27\x60]select [^\x27\x60]*\b(answers|dimensions|provenance)\b/)
  const route = source('app/api/app/[...path]/route.js')
  assert.match(route, /test-rating-write/)
  assert.match(route, /30, 600/)
  assert.match(route, /readBody\(request, 1024\)/)
})

test('explicit top-rated set respects current filtered input, availability, minimum count and opt-in safety', () => {
  const entries = ['a','b','c','low','opt-in','unavailable'].map(key => ({...entry(key), selectable:key!=='unavailable', starterEligible:key!=='opt-in'}))
  const summaries=Object.fromEntries(entries.map(e=>[e.key,{count:e.key==='low'?1:10,average:5}]))
  assert.deepEqual(topRatedSelection(entries,summaries).map(e=>e.key),['a','b','c'])
  assert.deepEqual(topRatedSelection(entries.filter(e=>e.key==='b'),summaries).map(e=>e.key),['b'])
  assert.deepEqual(topRatedSelection(entries,{}),[])
})

test('highest-rated mode does not relabel rating rank as a best clinical/topic match', () => {
  assert.match(source('components/app/test-explorer.jsx'), /sort === 'recommended' && index === 0/)
})


test('rating footer follows the current account and guest report without replacing its new structure', () => {
  const account = source('components/app/app-workspace.jsx')
  const guest = source('components/app/cabinet-landing.jsx')
  assert.match(account, /<PersonalResultReport result=\{result\}[^\n]*\/>\s*<TestRating result=\{result\}/)
  assert.match(guest, /<PersonalResultReport result=\{guestResult\}[^\n]*\/>\s*<TestRating result=\{guestResult\}[^\n]*\/>\s*<details className="cabinet-result-raw-details"/)
  assert.equal((guest.match(/<PersonalResultReport result=\{guestResult\}/g) || []).length, 1)
  assert.match(account, /<InsightTestScales/)
})
