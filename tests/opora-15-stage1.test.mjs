import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describeCycle } from '../lib/inner-growth/course-progress.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('OPORA v1.5 preserves the approved multi-slide sequence, not a four-slide cut', () => {
  const source = read('components/app/course-slide-player.jsx')
  const block = source.match(/function buildSlides\(lesson\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(block)
  const actual = [...block.matchAll(/kind:\s*'([^']+)'/g)].map(match => match[1])
  assert.deepEqual(actual, [
    'welcome','baseline','checkin','recall','idea','understand','phrase','guided',
    'ritual','transfer','symbol','reflection','moment','feedback',
  ])
  assert.match(block, /guided\.map\(\(section, index\) =>/)
  assert.match(block, /lesson\.practiceV3\?\.recall/)
  assert.match(block, /lesson\.practiceV4/)
  assert.match(source, /data-course-global-discomfort/)
  assert.match(source, /!finished && !discomfortOpen && !promoOpen/)
})

test('course history uses actual saved local dates and retains unsaved-day observations', () => {
  const history=describeCycle({
    startLocalDay:'2026-10-14',
    sessions:[
      {dayNumber:1,localDate:'2026-10-14',completedAt:'2026-10-14T20:00:00Z',feedback:'neutral'},
      {dayNumber:2,localDate:'2026-10-20',completedAt:'2026-10-20T20:00:00Z',feedback:'helped',
        beforeNow:7,afterNow:5},
    ],
    checkins:[
      {localDate:'2026-10-14',severity:7},
      {localDate:'2026-10-17',severity:8},
      {localDate:'2026-10-20',severity:5},
    ],
  })
  assert.equal(history.days[1].date,'2026-10-20')
  assert.equal(history.days[1].severity,5)
  assert.equal(history.days[1].beforeNow,7)
  assert.equal(history.observations,3)
  assert.deepEqual(history.comparison,{from:7,to:5,change:-2})
  assert.equal(history.weeklyMedian[0],null)
  assert.equal(history.weeklyMedian[1],null)
  assert.match(read('lib/app/growth-daily.js'),/localDate:dateString\(r\.local_date\)/)
})

test('course progression remains server-owned and preserves all existing learning slides', () => {
  const source=read('lib/app/growth-daily.js')
  assert.match(source,/if\(today\.completedToday\)/)
  assert.match(source,/COURSE_NEXT_DAY_ONLY/)
  assert.match(source,/input\.operationId/)
  const player=read('components/app/course-slide-player.jsx')
  assert.match(player,/data-course-discomfort-support/)
  assert.match(player,/words\.discomfortNeutral/)
  assert.match(player,/words\.discomfortHelp/)
})
