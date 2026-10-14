import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('pre/post ratings sit around one actual guided practice while retaining every slide', () => {
  const source=read('components/app/course-slide-player.jsx')
  const guided=source.slice(source.indexOf("{slide.kind === 'guided'"),source.indexOf("{slide.kind === 'ritual'"))
  assert.match(guided,/data-course-practice-pre/)
  assert.match(guided,/data-course-practice-post/)
  assert.ok(guided.indexOf('data-course-practice-pre') < guided.indexOf('slide.section.text'))
  assert.ok(guided.indexOf('slide.section.text') < guided.indexOf('data-course-practice-post'))
  assert.match(source,/slide.kind === 'baseline'/)
  assert.match(source,/slide.kind === 'moment'/)
  assert.match(source,/slide.kind === 'feedback'/)
  assert.match(source,/data-course-global-discomfort/)
  assert.match(source,/practiceWindow:'practice_v15'/)
  assert.match(source,/feedback,beforeNow,afterNow,reflection/)
})

test('comfort, benefit, choice and transfer are separate optional owner-scoped signals', () => {
  const player=read('components/app/course-slide-player.jsx')
  const api=read('lib/app/growth-daily.js')
  assert.match(player,/data-course-comfort/)
  assert.match(player,/data-course-usefulness/)
  assert.match(player,/data-course-flexibility/)
  assert.match(player,/data-course-transfer-stage/)
  assert.match(player,/data-course-day-six-recall/)
  assert.match(api,/optionalChoice\(input\.comfort,comfortOptions\)/)
  assert.match(api,/optionalChoice\(input\.usefulness,usefulnessOptions\)/)
  assert.match(api,/optionalChoice\(input\.flexibility,flexibilityOptions\)/)
  assert.match(api,/optionalChoice\(input\.transferStage,transferOptions\)/)
  assert.match(api,/optionalChoice\(input\.thoughtPath,thoughtOptions\)/)
  assert.match(api,/seal\(transferPlan,context\(actor,id,'course.practice_plan'\),config\)/)
  assert.match(api,/where account_id=\$1 and cycle_id=\$2/)
  assert.doesNotMatch(player,/localStorage|sessionStorage|sendBeacon/)
})

test('new nullable session metadata does not weaken existing RLS or reinterpret historical scores', () => {
  const sql=read('supabase/migrations/20261014205500_hh_opora_v15_practice_signals.sql')
  const orig=read('supabase/migrations/20261011203000_hh_growth_daily_r2.sql')
  const api=read('lib/app/growth-daily.js')
  assert.match(sql,/alter table app_private\.growth_sessions/)
  assert.match(sql,/add column signals jsonb not null default/)
  assert.match(sql,/practice_plan_ciphertext/)
  assert.doesNotMatch(sql,/grant .* to anon|grant .* to authenticated/i)
  assert.match(orig,/enable row level security/)
  assert.match(orig,/account_id=\(select auth\.uid\(\)\)/)
  assert.match(api,/legacy_lesson_v1/)
  assert.match(api,/practice_v15/)
  assert.match(api,/on conflict\(cycle_id,day_number\) do nothing/)
})
