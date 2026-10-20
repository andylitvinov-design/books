import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUSINESS_COURSE_VERSION, BUSINESS_WEEKS, BUSINESS_QUESTIONS, BUSINESS_DOMAINS,
  BUSINESS_METRICS, BUSINESS_SNAPSHOT_VERSION, businessDay, businessProgress,
  businessSnapshotScores, businessSuggestions, businessSurveyChanges, businessMetricChanges,
} from '../lib/business-coaching/program.js'

test('90-day track is complete, bilingual, stable, nonduplicated and bounded',()=>{
  assert.equal(BUSINESS_COURSE_VERSION,1)
  assert.match(BUSINESS_SNAPSHOT_VERSION,/v1$/)
  assert.equal(BUSINESS_WEEKS.length,12)
  assert.equal(BUSINESS_WEEKS.reduce((n,w)=>n+w.tasks.length,0),84)
  const all=Array.from({length:90},(_,i)=>businessDay(i+1,'en'))
  assert.deepEqual(all.map(d=>d.day),Array.from({length:90},(_,i)=>i+1))
  assert.equal(new Set(all.map(d=>d.action)).size,90)
  for(const lang of ['ru','en']){
    for(let day=1;day<=90;day++){
      const entry=businessDay(day,lang)
      assert.ok(entry.title.length>=5)
      assert.ok(entry.intro.length>=12)
      assert.ok(entry.action.length>=18)
      assert.equal(entry.week,Math.min(13,Math.ceil(day/7)))
    }
  }
  assert.equal(businessDay(0),null)
  assert.equal(businessDay(91),null)
  assert.equal(businessDay(10.5),null)
})
test('source-identified reflection: 18 questions, six domains, 14-day window; missing never becomes zero',()=>{
  assert.equal(BUSINESS_QUESTIONS.length,18)
  assert.equal(BUSINESS_DOMAINS.length,6)
  assert.equal(new Set(BUSINESS_QUESTIONS.map(q=>q.id)).size,18)
  for(const d of BUSINESS_DOMAINS) assert.equal(BUSINESS_QUESTIONS.filter(q=>q.domain===d.id).length,3)
  for(const q of BUSINESS_QUESTIONS) {
    assert.ok(q.ru.length>12&&q.en.length>12)
  }
  const absent=businessSnapshotScores({})
  assert.ok(absent.every(x=>x.count===0&&x.mean===null))
  const first=BUSINESS_QUESTIONS.filter(q=>q.domain==='clarity')
  const one=businessSnapshotScores({[first[0].id]:0}).find(x=>x.id==='clarity')
  assert.equal(one.mean,null)
  assert.equal(one.count,1)
  const two=businessSnapshotScores({[first[0].id]:0,[first[1].id]:4}).find(x=>x.id==='clarity')
  assert.equal(two.mean,2)
  assert.equal(two.count,2)
  const full=Object.fromEntries(BUSINESS_QUESTIONS.map(q=>[q.id,4]))
  assert.ok(businessSnapshotScores(full).every(x=>x.mean===4))
})
test('priority suggestions are advisory and default to user-selected track when no usable survey exists',()=>{
  assert.deepEqual(businessSuggestions({},'idea'),['clarity','customers','planning'])
  assert.deepEqual(businessSuggestions({},'career'),['clarity','opportunities','execution'])
  assert.deepEqual(businessSuggestions({},'owner'),['clarity','execution','customers'])
  const answers={}
  for(const q of BUSINESS_QUESTIONS)answers[q.id]=q.domain==='execution'?0:3
  assert.equal(businessSuggestions(answers)[0],'execution')
  assert.equal(BUSINESS_METRICS.length,6)
})
test('practice completion is distinct from questionnaire position and actual business outcomes',()=>{
  assert.deepEqual(businessProgress(null),{completed:0,total:90,percent:0})
  assert.deepEqual(businessProgress({days:{'1':{done:true},'2':{done:false},'90':{done:true},'100':{done:true}}}),
    {completed:2,total:90,percent:2})
})
test('private API contract: account header, auth and revision, encrypted state, scoped RLS and export',()=>{
  const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
  const repo=readFileSync(new URL('../lib/app/business-coaching.js',import.meta.url),'utf8')
  const sql=readFileSync(new URL('../supabase/migrations/20261020153500_hh_business_coaching_90_private.sql',import.meta.url),'utf8')
  assert.match(route,/await auth\.verified\(\)/)
  assert.match(route,/joined === 'business-coaching'/)
  assert.match(route,/x-hh-account-id/)
  assert.match(route,/readBusinessCoaching\(config, actor\)/)
  assert.match(route,/saveBusinessCoaching\(config, actor/)
  assert.match(route,/exported\.businessCoaching/)
  assert.match(repo,/openSealed\(/)
  assert.match(repo,/seal\(/)
  assert.match(repo,/BUSINESS_REVISION_CONFLICT/)
  assert.match(repo,/assertActive\(db,actor\)/)
  assert.match(repo,/BUSINESS_SURVEY_NOT_DUE/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/revoke all.*anon, authenticated/)
  assert.match(sql,/using \(account_id=\(select auth\.uid\(\)\)/)
  assert.doesNotMatch(sql,/grant .* to anon/i)
})
test('integration: business journey appears in My Courses and Development programme without mislabeling OPORA',()=>{
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const panel=readFileSync(new URL('../components/app/development-program.jsx',import.meta.url),'utf8')
  const courses=readFileSync(new URL('../components/app/my-courses-dashboard.jsx',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  assert.match(workspace,/page === 'business'/)
  assert.match(panel,/data-development-business-course/)
  assert.match(courses,/data-business-coaching-course-link/)
  assert.match(ui,/data-business-coaching/)
  assert.match(ui,/\bconsent\b/)
  assert.match(ui,/\bwindow\.print\(\)/)
})

test('actual business KPIs only compare non-overlapping, same-period, same-unit and same-currency entries',()=>{
  const rows=[
    {metric:'revenue',unit:'money',currency:'CAD',value:100,from:'2026-09-01',to:'2026-09-07',recordedAt:'2026-09-08T00:00:00Z'},
    {metric:'revenue',unit:'money',currency:'CAD',value:150,from:'2026-09-08',to:'2026-09-14',recordedAt:'2026-09-15T00:00:00Z'},
    {metric:'revenue',unit:'money',currency:'EUR',value:200,from:'2026-09-15',to:'2026-09-21',recordedAt:'2026-09-22T00:00:00Z'},
    {metric:'revenue',unit:'money',currency:'CAD',value:999,from:'2026-09-15',to:'2026-09-30',recordedAt:'2026-10-01T00:00:00Z'},
    {metric:'enquiries',unit:'count',value:0,from:'2026-09-01',to:'2026-09-07'},
    {metric:'enquiries',unit:'count',value:7,from:'2026-09-08',to:'2026-09-14'},
  ]
  const changes=businessMetricChanges(rows)
  const revenue=changes.find(x=>x.metric==='revenue')
  assert.equal(revenue.previous.value,100)
  assert.equal(revenue.latest.value,150)
  assert.equal(revenue.delta,50)
  assert.equal(revenue.percentage,50)
  const enquiries=changes.find(x=>x.metric==='enquiries')
  assert.equal(enquiries.delta,7)
  assert.equal(enquiries.percentage,null)
  assert.deepEqual(businessMetricChanges([]),[])
  assert.deepEqual(businessMetricChanges([{metric:'sales',unit:'count',value:4,from:'2026-10-01',to:'2026-10-07'}]),[])
})
test('formative survey changes are raw same-version mean deltas, never fake normative percentiles',()=>{
  const first={version:BUSINESS_SNAPSHOT_VERSION,referenceDays:14,recordedAt:'2026-09-01T10:00:00Z',answers:{}}
  const last={version:BUSINESS_SNAPSHOT_VERSION,referenceDays:14,recordedAt:'2026-09-28T10:00:00Z',answers:{}}
  const firstDomain=BUSINESS_QUESTIONS.filter(q=>q.domain==='clarity')
  first.answers[firstDomain[0].id]=0
  first.answers[firstDomain[1].id]=2
  last.answers[firstDomain[0].id]=4
  last.answers[firstDomain[1].id]=2
  const change=businessSurveyChanges(first,last)
  assert.deepEqual(change,[{id:'clarity',previous:1,latest:3,delta:2}])
  assert.deepEqual(businessSurveyChanges(first,{...last,version:'wrong-version'}),[])
  assert.deepEqual(businessSurveyChanges(first,{...last,referenceDays:30}),[])
  assert.deepEqual(businessSurveyChanges(first,{...last,recordedAt:'2026-08-31T00:00:00Z'}),[])
})
test('approved public business page and auth page point to a real allowed and private account route',()=>{
  const page=readFileSync(new URL('../app/[locale]/explore/[theme]/page.tsx',import.meta.url),'utf8')
  const cabinet=readFileSync(new URL('../app/[locale]/app/[[...path]]/page.jsx',import.meta.url),'utf8')
  assert.match(cabinet,/['"]business['"].*\.includes\(path\[0\]\)/)
  assert.match(page,/app\/business/)
  assert.match(cabinet,/robots: \{ index: false, follow: false \}/)
})
