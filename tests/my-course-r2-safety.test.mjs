import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { lessonFor, allLessonIds, isCompleteLibrary } from '../lib/inner-growth/lesson-library.js'
import { GROWTH_GOALS } from '../lib/inner-growth/course-model.js'
import { localDateKey,courseToday,describeCycle } from '../lib/inner-growth/course-progress.js'

const read = file=>readFileSync(new URL('../'+file,import.meta.url),'utf8')

test('all six personal goals have fourteen distinct, bilingual complete sessions',()=>{
  assert.equal(allLessonIds().length,84)
  assert.equal(new Set(allLessonIds()).size,84)
  assert.equal(isCompleteLibrary(),true)
  const names=Object.keys(GROWTH_GOALS)
  const meditation=new Set()
  for(const goal of names)for(let day=1;day<=14;day++){
    const en=lessonFor(goal,day,'en'),ru=lessonFor(goal,day,'ru')
    assert.equal(en.sections.length,5)
    assert.equal(ru.sections.length,5)
    assert.ok(en.sections[2].text.length>110)
    assert.ok(ru.sections[2].text.length>110)
    assert.ok(en.aphorism && ru.aphorism && en.reflection && ru.reflection)
    meditation.add(en.sections[2].text)
  }
  assert.equal(meditation.size,84)
  assert.equal(lessonFor('calm_regulation',15),null)
})

test('DST boundary does not duplicate daily course dates and absent ratings stay absent',()=>{
  const zone='America/Toronto'
  const spring1=localDateKey('2026-03-08T06:50:00Z',zone)
  const spring2=localDateKey('2026-03-08T07:50:00Z',zone)
  assert.equal(spring1,'2026-03-08')
  assert.equal(spring2,'2026-03-08')
  assert.equal(courseToday('2026-03-07',zone,14,Date.parse('2026-03-09T16:00:00Z')).day,3)
  const snapshot=describeCycle({
    startLocalDay:'2026-10-11',checkins:[{localDate:'2026-10-11',severity:0}],
    sessions:[{dayNumber:1,completedAt:'2026-10-11T20:00:00.000Z',feedback:'neutral'}],
  })
  assert.equal(snapshot.days[0].severity,0)
  assert.equal(snapshot.days[1].severity,null)
  assert.equal(snapshot.practiceCount,1)
  assert.equal(snapshot.observations,1)
  assert.equal(snapshot.comparison,null)
})

test('daily UI requires user-selected zero-to-ten rating and allows skipping',()=>{
  const content=read('components/app/course-today.jsx')
  assert.match(content,/\[severity,setSeverity\]=useState\(null\)/)
  assert.match(content,/!Number\.isInteger\(severity\)/)
  assert.match(content,/option value="" disabled=\{!optional\}/)
  assert.match(content,/setExpanded\('thought'\)/)
  assert.match(content,/data-course-card/)
  assert.doesNotMatch(content,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
})

test('server disallows backdated completion after course cycle expires',()=>{
  const source=read('lib/app/growth-daily.js')
  assert.match(source,/if\(today\.isAfterCycle\)notAllowed\('COURSE_CYCLE_FINISHED',409\)/)
  assert.match(source,/if\(!Number\.isInteger\(input\.day\)\|\|input\.day!==today\.day\)/)
  assert.match(source,/on conflict\(cycle_id,day_number\) do nothing/)
  assert.match(source,/expectedRevision/)
  assert.match(source,/operationId/)
})

test('private backend route and migration preserve owner isolation, export, and RLS',()=>{
  const sql=read('supabase/migrations/20261011203000_hh_growth_daily_r2.sql')
  const router=read('app/api/app/[...path]/route.js')
  assert.match(sql,/foreign key \(cycle_id,account_id\)/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/grant select,insert,update/)
  assert.match(sql,/account_id=\(select auth\.uid\(\)\)/)
  assert.match(sql,/on delete cascade/)
  assert.match(router,/auth\.verified\(\)/)
  assert.match(router,/createDailyCourseRepository/)
  assert.match(router,/exported\.growthCycles/)
  assert.doesNotMatch(router,/joined === 'course\/daily'/)
})
