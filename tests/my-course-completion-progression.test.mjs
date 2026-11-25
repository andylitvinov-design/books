import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { courseLessonProgress, addCalendarDays } from '../lib/inner-growth/course-progress.js'

const time = date => Date.parse(date + 'T16:00:00.000Z')
const saved = (dayNumber, localDate) => ({
  dayNumber, localDate, completedAt: localDate + 'T12:00:00.000Z',
})
const progress = (sessions, date, options = {}) => courseLessonProgress({
  sessions, now:time(date), timeZone:'UTC', duration:14, ...options,
})

test('unfinished lesson 1 is still lesson 1 tomorrow, next week and next month', () => {
  assert.deepEqual(['2026-10-13','2026-10-14','2026-11-19']
    .map(date => progress([],date).day),[1,1,1])
  assert.equal(progress([],'2026-11-19').isAfterCycle,false)
})

test('day 1 remains visible for post-save rewards; only a new local date releases day 2', () => {
  const records=[saved(1,'2026-10-14')]
  const same=progress(records,'2026-10-14')
  assert.equal(same.day,1)
  assert.equal(same.completedToday,true)
  assert.equal(same.nextAvailableLocalDate,'2026-10-15')
  assert.equal(same.streak,1)
  assert.equal(progress(records,'2026-10-15').day,2)
  assert.equal(progress(records,'2026-10-21').day,2)
  assert.equal(progress(records,'2026-10-21').isAfterCycle,false)
})

test('legacy missing lessons are recovered instead of skipping them', () => {
  const records=[saved(1,'2026-10-12'),saved(3,'2026-10-14')]
  assert.equal(progress(records,'2026-10-14').day,3)
  assert.equal(progress(records,'2026-10-15').day,2)
  const recovered=[...records,saved(2,'2026-10-15')]
  assert.equal(progress(recovered,'2026-10-15').day,2)
  assert.equal(progress(recovered,'2026-10-16').day,4)
})

test('streak depends on actual saved local dates, not test results, check-ins or scores', () => {
  assert.equal(progress([saved(1,'2026-10-12'),saved(2,'2026-10-13')],'2026-10-14').streak,2)
  assert.equal(progress([saved(1,'2026-10-12'),saved(2,'2026-10-14')],'2026-10-14').streak,1)
  assert.equal(progress([],'2026-10-14').streak,0)
})

test('all 14 lessons remain available even when completing takes many calendar weeks', () => {
  const dates=Array.from({length:14},(_,i)=>addCalendarDays('2026-10-01',i*3))
  const records=dates.map((date,i)=>saved(i+1,date))
  assert.equal(progress(records,dates[13]).day,14)
  assert.equal(progress(records,dates[13]).completedToday,true)
  assert.equal(progress(records,addCalendarDays(dates[13],1)).day,14)
  assert.equal(progress(records,addCalendarDays(dates[13],1)).isAfterCycle,true)
  assert.equal(progress([],'2026-10-14',{completed:true}).day,14)
})

test('authenticated daily service enforces the day gate; new rewards use saved count', () => {
  const backend=readFileSync(new URL('../lib/app/growth-daily.js',import.meta.url),'utf8')
  const today=readFileSync(new URL('../components/app/course-today.jsx',import.meta.url),'utf8')
  const player=readFileSync(new URL('../components/app/course-slide-player.jsx',import.meta.url),'utf8')
  assert.match(backend,/dayInfo=courseLessonProgress/)
  assert.match(backend,/const today=await requireCurrentDay\(db,actor,cycle\)/)
  assert.match(backend,/if\(today.completedToday\)/)
  assert.match(backend,/notAllowed\('COURSE_NEXT_DAY_ONLY',409\)/)
  assert.match(backend,/progress:\{\.\.\.history,practiceStreak:dayInfo.streak\}/)
  assert.match(today,/response\.cycle\.todayLocalDate/)
  assert.match(player,/if \(response\) \{ sessionOp\.current = null; setEarned\(true\); setIndex\(slides\.length\) \}/)
  assert.match(player,/rewardStep===0/)
  assert.match(player,/rewardStep===1/)
  assert.match(player,/practiceStreak/)
  assert.match(player,/data-course-post-lesson-promo/)
  assert.doesNotMatch(player,/localStorage|sessionStorage|leaderboard|penalty|scoreBonus/)
})
