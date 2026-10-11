import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { GROWTH_GOALS } from '../lib/inner-growth/course-model.js'
import { TRACKS,COURSE_CONTENT_VERSION,lessonFor,allLessonIds,isCompleteLibrary } from '../lib/inner-growth/lesson-library.js'
import { localDateKey, addCalendarDays, courseToday, courseDayFromDates,
  describeCycle, optionalRating, validateDailyRatings } from '../lib/inner-growth/course-progress.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all 84 approved original bilingual track/day cards are distinct and fully structured',()=>{
 assert.equal(Object.keys(TRACKS).length,6)
 assert.equal(allLessonIds().length,84)
 assert.equal(new Set(allLessonIds()).size,84)
 assert.ok(isCompleteLibrary())
 const contentTexts=[]
 for(const goal of Object.keys(GROWTH_GOALS)){
  const enTitles=[],ruTitles=[]
  for(let day=1;day<=14;day++){
   const en=lessonFor(goal,day,'en'),ru=lessonFor(goal,day,'ru'),
     short=lessonFor(goal,day,'ru','quick')
   assert.ok(en&&ru&&short,goal+': '+day)
   assert.equal(en.version,COURSE_CONTENT_VERSION)
   assert.equal(en.sections.length,5)
   assert.equal(en.sections.filter(s=>s.seconds>0).length,5)
   assert.ok(ru.sections.every(s=>s.text.trim().length>40))
   assert.ok(en.sections.every(s=>s.text.trim().length>40))
   assert.ok(en.aphorism.length>18&&ru.aphorism.length>18)
   assert.ok(en.ritual.length>30&&ru.ritual.length>30)
   assert.ok(short.durationSeconds<ru.durationSeconds)
   assert.ok(en.accessibility.eyesOpen&&en.accessibility.naturalBreathing)
   enTitles.push(en.title);ruTitles.push(ru.title)
   contentTexts.push(en.sections.find(x=>x.kind==='meditation').text)
  }
  assert.equal(new Set(enTitles).size,14)
  assert.equal(new Set(ruTitles).size,14)
 }
 assert.equal(new Set(contentTexts).size,84,'distinct guided scripts by goal and day')
 assert.equal(lessonFor('unknown',1),null)
 assert.equal(lessonFor('calm_regulation',15),null,'do not silently recycle day 1-14 as 28-day content')
})

test('local date keys and consecutive lesson days are DST-safe in Toronto',()=>{
 assert.equal(localDateKey('2026-03-08T04:45:00Z','America/Toronto'),'2026-03-07')
 assert.equal(localDateKey('2026-03-08T07:15:00Z','America/Toronto'),'2026-03-08')
 assert.equal(localDateKey('2026-11-01T05:30:00Z','America/Toronto'),'2026-11-01')
 assert.equal(localDateKey('2026-11-01T06:30:00Z','America/Toronto'),'2026-11-01')
 assert.equal(courseDayFromDates('2026-03-07','2026-03-09',14),3)
 assert.equal(addCalendarDays('2026-03-07',14),'2026-03-21')
 assert.equal(courseToday('2026-03-07','America/Toronto',14,Date.parse('2026-03-08T07:15:00Z')).day,2)
 assert.equal(courseToday('2026-03-07','America/Toronto',14,Date.parse('2026-04-01T00:00:00Z')).isAfterCycle,true)
 assert.throws(()=>localDateKey(Date.now(),'not/a/timezone'))
})

test('daily scales accept real zero, distinguish optional omissions, and reject invalid ratings',()=>{
 assert.deepEqual(validateDailyRatings({severity:0}),{severity:0,interference:null,resource:null})
 assert.deepEqual(validateDailyRatings({severity:10,interference:0,resource:10}),
  {severity:10,interference:0,resource:10})
 assert.equal(optionalRating(null),null)
 assert.equal(optionalRating(10.1),undefined)
 assert.throws(()=>validateDailyRatings({severity:-1}))
 assert.throws(()=>validateDailyRatings({severity:11}))
 assert.throws(()=>validateDailyRatings({severity:'7'}))
 assert.throws(()=>validateDailyRatings({severity:7,resource:11}))
})

test('report shows missing days as missing, engagement apart from symptom scores',()=>{
 const r=describeCycle({startLocalDay:'2026-10-01',duration:14,
   checkins:[
    {localDate:'2026-10-01',severity:8,interference:6,resource:2},
    {localDate:'2026-10-03',severity:0,interference:null,resource:7},
   ],sessions:[{dayNumber:1,completedAt:'2026-10-01T16:00:00Z',feedback:'neutral'}]})
 assert.equal(r.days.length,14)
 assert.equal(r.days[0].severity,8)
 assert.equal(r.days[1].severity,null)
 assert.equal(r.days[2].severity,0)
 assert.equal(r.practiceCount,1)
 assert.equal(r.observations,2)
 assert.deepEqual(r.comparison,{from:8,to:0,change:-8})
 assert.deepEqual(r.weeklyMedian,[null,null])
})

test('review median uses four real observations and never substitutes missing zeros',()=>{
 const r=describeCycle({startLocalDay:'2026-10-01',checkins:[
  {localDate:'2026-10-01',severity:2},{localDate:'2026-10-02',severity:4},
  {localDate:'2026-10-05',severity:6},{localDate:'2026-10-07',severity:8},
 ],sessions:[]})
 assert.equal(r.weeklyMedian[0],5)
 assert.equal(r.weeklyMedian[1],null)
})

test('daily course API and private migration do not create public client ownership or store notes in URLs',()=>{
 const routes=read('app/api/app/[...path]/route.js')
 const repo=read('lib/app/growth-daily.js')
 const schema=read('supabase/migrations/20261011203000_hh_growth_daily_r2.sql')
 const app=read('components/app/course-today.jsx')
 const page=read('components/app/my-course.jsx')
 assert.match(routes,/createDailyCourseRepository/)
 assert.match(routes,/const actor = await auth\.verified\(\)/)
 assert.match(repo,/transaction\(config,actor/)
 assert.match(repo,/localDateKey/)
 assert.match(repo,/seal\(label/)
 assert.match(repo,/where account_id=\$1/)
 assert.match(repo,/operationId/)
 assert.match(repo,/on conflict\(cycle_id,day_number\) do nothing/)
 assert.match(schema,/enable row level security/)
 assert.match(schema,/foreign key \(cycle_id,account_id\)/)
 assert.match(schema,/revoke all on table/)
 assert.match(schema,/app_private\.account_active\(\)/)
 assert.match(schema,/on delete cascade/)
 assert.match(app,/data-course-card/)
 assert.match(app,/progress\.days/)
 assert.match(app,/t\.history/)
 assert.match(page,/<CourseToday locale=\{locale\}/)
 assert.doesNotMatch(app,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
 assert.doesNotMatch(repo,/ga4|analytics|sendBeacon/)
})
