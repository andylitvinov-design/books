import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildMyProgress } from '../lib/app/my-progress.mjs'

const time = (day) => '2026-10-' + day + 'T10:00:00.000Z'
function fixture() {
  return {
    bootstrap:{
      results:[
        {id:'test-1',definitionKey:'hh-weekly-pulse',measurementAt:time('21'),dimensions:[{key:'private',value:10}]},
        {id:'test-2',definitionKey:'hh-current-state',measurementAt:time('22')},
      ],
      runs:[{id:'run-1',definitionKey:'hh-current-state',status:'in_progress',startedAt:time('25')}],
      moodCheckins:[{id:'mood-1',occurredAt:time('24'),category:'private-not-displayed'}],
      contextEvents:[{id:'note-1',occurredAt:time('23'),label:'private-intention',note:'private-note'}],
      savedReports:[{id:'report-1',savedAt:time('20'),available:false}],
      savedDocuments:[{id:'doc-1',savedAt:time('19')}],
      savedSessions:[{id:'session-1',savedAt:time('18')}],
      requests:[{id:'request-1',createdAt:time('17'),status:'requested',message:'private-contact'}],
    },
    growth:{
      courses:[
        {id:'growth-1',status:'active',completedLessons:4,durationDays:14,updatedAt:time('27')},
        {id:'growth-2',status:'completed',completedLessons:14,durationDays:14,finishedAt:time('26')},
      ],
      course:{id:'growth-1',dayCompletions:{
        '1':{completedAt:time('22'),feedback:'skip'},
        '2':{feedback:'pending'},
      }},
    },
    energywork:{enrolled:true,courseId:'energywork-practitioner',status:'active',savedAt:time('25')},
    videos:{videos:[
      {id:'mandala-1',status:'ready',theme:'energy',duration:20,aspect:'portrait',readyAt:time('26')},
      {id:'mandala-pending',status:'pending',createdAt:time('28')},
      {id:'mandala-deleted',status:'deleted',createdAt:time('28')},
    ]},
    videoProgress:{records:[
      {videoId:'abcdefghijk',title:'Lesson one',status:'watched',markedAt:time('28')},
      {videoId:'lmnopqrstuv',title:'Lesson two',status:'mastered',markedAt:time('27')},
    ]},
  }
}
test('assembles real saved history across all available categories, ordered by timestamp',()=>{
  const value=buildMyProgress({...fixture(),locale:'ru'})
  assert.equal(value.totals.tests,2)
  assert.equal(value.totals.courses,3)
  assert.equal(value.totals.completedCourses,1)
  assert.equal(value.totals.practices,1)
  assert.equal(value.totals.mandalas,1)
  assert.equal(value.totals.watchedVideos,2)
  assert.equal(value.totals.reports,3)
  assert.equal(value.entries[0].title,'Lesson one')
  assert.ok(value.entries.every((item,i,rows)=>i===0 || Date.parse(rows[i-1].at)>=Date.parse(item.at)))
  assert.equal(value.entries.find(item=>item.id==='services:request-1').status,'requested')
  assert.equal(value.entries.find(item=>item.id==='reports:report-1').href,null)
  assert.equal(value.entries.find(item=>item.id==='mandalas:mandala-1').status,'saved')
  assert.equal(value.entries.find(item=>item.id==='videos:lmnopqrstuv').status,'mastered')
  assert.equal(value.publicVideoWatchHistoryAvailable,true)
})
test('does not promote video opening, incomplete uploads or course engagement to mastery',()=>{
  const data=fixture()
  delete data.videoProgress
  data.growth.courses[0].completedLessons=0
  const value=buildMyProgress(data)
  assert.equal(value.totals.watchedVideos,0)
  assert.equal(value.publicVideoWatchHistoryAvailable,false)
  assert.equal(value.totals.mandalas,1)
  assert.equal(value.totals.completedCourses,1)
  assert.equal(value.entries.find(item=>item.id==='courses:growth-1').completed,false)
  assert.ok(!value.entries.some(item=>item.id.includes('mandala-pending')))
  assert.ok(!value.entries.some(item=>item.id.includes('mandala-deleted')))
})
test('timeline never exposes raw answers, contact, notes, private goals or test dimensions',()=>{
  const value=JSON.stringify(buildMyProgress(fixture()))
  for(const secret of ['private-not-displayed','private-intention','private-note','private-contact','private']) {
    assert.equal(value.includes(secret),false,secret)
  }
})
test('discards duplicate IDs and invalid dates without inventing records',()=>{
  const value=buildMyProgress({bootstrap:{results:[
    {id:'a',measurementAt:'bad'}, {id:'b',measurementAt:time('20')},
    {id:'b',measurementAt:time('21')},
  ]}})
  assert.equal(value.entries.length,1)
})
test('signed-in route, navigation and active Academy video control are wired',()=>{
  const page=readFileSync(new URL('../app/[locale]/app/[[...path]]/page.jsx',import.meta.url),'utf8')
  const app=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const library=readFileSync(new URL('../components/academy-video-library-client.tsx',import.meta.url),'utf8')
  const endpoint=readFileSync(new URL('../app/api/app/video-progress/route.js',import.meta.url),'utf8')
  const migration=readFileSync(new URL('../supabase/migrations/20261029013500_hh_my_progress_video_marks_20261028.sql',import.meta.url),'utf8')
  assert.match(page,/'progress'/)
  assert.match(app,/href: root \+ '\/progress'/)
  assert.match(app,/page === 'progress' && <MyProgress/)
  assert.match(library,/<AcademyVideoProgress key=\{lesson.id\}/)
  assert.match(endpoint,/const actor=await auth.verified\(\)/)
  assert.match(endpoint,/requireSameOrigin\(request,config\)/)
  assert.match(migration,/enable row level security/)
  assert.match(migration,/account_id=\(select auth.uid\(\)\)/)
  assert.doesNotMatch(migration,/grant .* on app_private.learning_video_progress to .*authenticated/)
})
