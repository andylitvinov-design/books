import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  momentScore, compareLessonMoments, buildLessonFocusTrends, focusTrendAria, changeAmount,
  momentChangeMeaning,
} from '../lib/inner-growth/course-moment-trends.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('0 is a real rating; missing, invalid and skipped scores are never fabricated', () => {
  assert.equal(momentScore(0), 0)
  for (const value of [undefined, null, -1, 11, 4.5, '0', NaN]) {
    assert.equal(momentScore(value), null)
  }
  assert.deepEqual(compareLessonMoments(8, 5), { before: 8, after: 5, change: -3 })
  assert.deepEqual(compareLessonMoments(0, 0), { before: 0, after: 0, change: 0 })
  assert.deepEqual(compareLessonMoments(2, 7), { before: 2, after: 7, change: 5 })
  assert.equal(compareLessonMoments(null, 7), null)
  assert.equal(compareLessonMoments(7, null), null)
  assert.equal(changeAmount(-1, 'ru'), '1 балл')
  assert.equal(changeAmount(2, 'ru'), '2 балла')
  assert.equal(changeAmount(-5, 'ru'), '5 баллов')
  assert.equal(changeAmount(1, 'en'), '1 point')
  assert.equal(changeAmount(-3, 'en'), '3 points')
})

test('each chosen scale retains its own non-consecutive day trajectory', () => {
  const roadmap = [
    {day:1,focusScaleId:'hh-a::confidence',focusGoal:'inner_support',scaleLabel:'Confidence'},
    {day:2,focusScaleId:'hh-b::anxiety',focusGoal:'calm_regulation',scaleLabel:'Tension'},
    {day:4,focusScaleId:'hh-a::confidence',focusGoal:'inner_support',scaleLabel:'Confidence'},
    {day:6,focusScaleId:'hh-c::confidence',focusGoal:'inner_support',scaleLabel:'Another confidence scale'},
  ]
  const days = [
    {day:1,date:'2026-10-13',sessionCompleted:true,beforeNow:8,afterNow:5},
    {day:2,date:'2026-10-14',sessionCompleted:true,beforeNow:0,afterNow:0},
    {day:4,date:'2026-10-16',sessionCompleted:true,beforeNow:6,afterNow:null},
    {day:6,date:'2026-10-18',sessionCompleted:false,beforeNow:10,afterNow:0},
  ]
  const groups=buildLessonFocusTrends(days,roadmap)
  assert.equal(groups.length,3)
  assert.deepEqual(groups[0].points.map(p=>[p.day,p.before,p.after]),[[1,8,5],[4,6,null]])
  assert.deepEqual(groups[1].points.map(p=>[p.day,p.before,p.after]),[[2,0,0]])
  assert.equal(groups[2].ratedDays,0)
  assert.deepEqual(groups[2].points,[])
  assert.equal(groups[0].dayCount,2)
  assert.match(focusTrendAria(groups[0]),/Day 1: before 8\/10, after 5\/10/)
})

test('daily sessions expose optional paired ratings only from the account-scoped cycle', () => {
  const repo=read('lib/app/growth-daily.js')
  const progress=read('lib/inner-growth/course-progress.js')
  assert.match(repo,/growth_sessions where account_id=\$1 and cycle_id=\$2/)
  assert.match(repo,/beforeNow:r\.before_now,afterNow:r\.after_now/)
  assert.match(repo,/focusScaleId:focus\.scaleId\|\|null/)
  assert.match(progress,/beforeNow:optionalRating\(session\?\.beforeNow\)/)
  assert.match(progress,/afterNow:optionalRating\(session\?\.afterNow\)/)
})

test('a separate pre-practice focus step and after-practice step surround real lessons', () => {
  const slide=read('components/app/course-slide-player.jsx')
  const today=read('components/app/course-today.jsx')
  const graph=read('components/app/course-moment-trends.jsx')
  assert.ok(slide.indexOf("kind: 'baseline'") < slide.indexOf("kind: 'idea'"))
  assert.ok(slide.indexOf("kind: 'idea'") < slide.indexOf("kind: 'moment'"))
  assert.match(slide,/beforeNow,afterNow,reflection/)
  assert.match(slide,/data-course-moment-result/)
  assert.match(slide,/compareLessonMoments/)
  assert.match(today,/data-course-today-primary/)
  assert.match(today,/<CourseMomentTrends/)
  assert.match(graph,/data-course-focus-trends/)
  assert.match(graph,/aria-pressed=\{group\.key === item\.key\}/)
  assert.match(graph,/viewBox="0 0 520 151"/)
  assert.doesNotMatch(slide + graph,/localStorage|sessionStorage|sendBeacon|dangerouslySetInnerHTML/)
})

test('paired ratings keep distinct directions for historical OPORA V6 availability and distress', () => {
  assert.equal(momentChangeMeaning(-3, 'higher_is_more_difficult'), 'less_difficult')
  assert.equal(momentChangeMeaning(3, 'higher_is_more_difficult'), 'more_difficult')
  assert.equal(momentChangeMeaning(-3, 'higher_is_more_available'), 'less_available')
  assert.equal(momentChangeMeaning(3, 'higher_is_more_available'), 'more_available')
  assert.equal(momentChangeMeaning(0, 'higher_is_more_difficult'), 'same')
  assert.equal(momentChangeMeaning(0, 'higher_is_more_available'), 'same')
  assert.equal(momentChangeMeaning(null, 'higher_is_more_difficult'), null)
  assert.equal(momentChangeMeaning(5, 'unrecognised'), null)
  assert.equal(momentChangeMeaning(11, 'higher_is_more_available'), null)
  assert.deepEqual(compareLessonMoments(0, 8), {before:0, after:8, change:8})
  // Raw stored values never get rewritten as 10 - value.
  const oldPair=compareLessonMoments(2, 8)
  assert.deepEqual(oldPair,{before:2,after:8,change:6})
  assert.equal(momentChangeMeaning(oldPair.change,'higher_is_more_available'),'more_available')
  assert.equal(momentChangeMeaning(oldPair.change,'higher_is_more_difficult'),'more_difficult')
})

test('legacy V6 availability and modern difficulty ratings remain separated in chart and details', () => {
  const chart=read('components/app/course-moment-trends.jsx')
  const today=read('components/app/course-today.jsx')
  const legacy=read('components/app/opora-v6-slide-player.jsx')
  assert.match(chart,/cycle\.contentVersion === COURSE_ANTISTRESS_SKILLS_V6/)
  assert.match(chart,/momentChangeMeaning\(comparison\.change, direction\)/)
  assert.match(chart,/data-course-rating-direction=\{direction\}/)
  assert.match(chart,/measureAvailability: '0 = not yet available · 10 = feels available'/)
  assert.match(chart,/measure: '0 = no difficulty · 10 = very difficult'/)
  assert.match(today,/legacyAvailabilityRatings = cycle\?\.contentVersion === COURSE_ANTISTRESS_SKILLS_V6/)
  assert.match(today,/legacyAvailabilityRatings\?t\.beforeAvailability:t\.beforeNow/)
  assert.match(today,/legacyAvailabilityRatings\?t\.afterAvailability:t\.afterNow/)
  assert.match(today,/data-course-legacy-availability-direction/)
  assert.match(legacy,/ratingLow:'0 · not yet available',ratingHigh:'10 · feels available'/)
  assert.match(legacy,/feedback,beforeNow,afterNow,practiceWindow:'practice_v15'/)
  assert.doesNotMatch(chart,/before:\s*10\s*-/)
  assert.doesNotMatch(today,/afterNow:\s*10\s*-/)
})
