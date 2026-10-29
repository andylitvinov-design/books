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

test('My Progress YouTube-library design maps to the existing private account screen',()=>{
  const view=readFileSync(new URL('../components/app/my-progress.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/my-progress.module.css',import.meta.url),'utf8')
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  for(const region of ['hh-progress-watch-title','hh-progress-library-title','hh-progress-resume-title','hh-progress-mandalas-title','hh-progress-activity-title']){
    assert.ok(view.includes(region),region)
  }
  assert.match(view,/data-my-progress/)
  assert.match(view,/data-progress-video-history/)
  assert.match(view,/data-progress-saved-mandala/)
  assert.match(view,/referrerPolicy="no-referrer"/)
  assert.match(view,/videoId=.*slice\(7\)/)
  assert.match(view,/https:\/\/www\.youtube\.com\/watch\?v=/)
  assert.match(view,/aria-pressed=\{filter===id\}/)
  assert.match(view,/status===['"]mastered['"]/)
  assert.match(css,/--progress-green:\s*#109c77/)
  assert.match(css,/background:\s*linear-gradient\(112deg,\s*#174839/)
  assert.match(css,/\.videoRail.*\.mandalaRail/)
  assert.match(css,/@media \(max-width:\s*750px\)/)
  assert.match(css,/@media \(max-width:\s*390px\)/)
  assert.match(css,/@media \(max-width:\s*350px\)/)
  // The authenticated Cabinet shell owns the fixed mobile dock and the
  // associated iOS safe-area bottom reservation. Adding it again in this
  // child page would create a second empty footer under My Progress.
  const shellCss=readFileSync(new URL('../app/[locale]/app/[[...path]]/workspace.css',import.meta.url),'utf8')
  assert.match(shellCss,/\\.hh-app\\{width:min\\(100% - 24px,1120px\\);padding-top:14px;padding-bottom:calc\\(105px \\+ env\\(safe-area-inset-bottom\\)\\)\\}/)
  assert.match(shellCss,/\\.hh-mobile-app-nav[\\s\\S]*?padding:8px max\\(10px,env\\(safe-area-inset-left\\)\\) calc\\(8px \\+ env\\(safe-area-inset-bottom\\)\\)/)
  assert.doesNotMatch(css,/env\\(safe-area-inset-bottom/)
  assert.match(workspace,/label: locale === 'ru' \? 'Мой прогресс'/)
  assert.match(workspace,/icon: BarChart3/)
  assert.doesNotMatch(view,/autoplay[="]1/)
})
test('saved personal video preview requests a signed, owner-scoped URL on explicit action only',()=>{
  const view=readFileSync(new URL('../components/app/my-progress.jsx',import.meta.url),'utf8')
  const backend=readFileSync(new URL('../app/api/app/personal-videos/[id]/route.js',import.meta.url),'utf8')
  assert.match(view,/async function toggleMandala\(entry\)/)
  assert.match(view,/appFetch\('personal-videos\/'\+id,undefined,'GET',\{accountId\}\)/)
  assert.match(view,/video src=\{active.url\} controls playsInline preload="metadata"/)
  assert.match(view,/useEffect\(\(\)=>\(\)=>\{mandalaEpoch.current\+=1\},\[accountId\]\)/)
  assert.match(backend,/createRequestAuth/)
  assert.match(backend,/verified\(\)/)
  assert.doesNotMatch(view,/<video[^>]*autoPlay/)
})
