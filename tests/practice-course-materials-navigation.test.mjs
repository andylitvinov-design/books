import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = name => readFileSync(new URL('../'+name,import.meta.url),'utf8')

const workspace=source('components/app/practice-workspace.jsx')
const materialTab=source('components/app/practice-materials.jsx')
const access=source('lib/app/practitioner-access.js')
const backend=source('app/api/app/[...path]/route.js')
const ownerPage=source('app/admin/materials/courses/reiki-practitioner/page.jsx')
const folderPage=source('app/admin/materials/courses/page.jsx')
const middleware=source('middleware.ts')
const audio=source('components/admin-reiki-audio.jsx')

test('My Practice Materials offers Reiki course recordings only to the owner',()=>{
  assert.match(workspace,/isOwner=\{isOwner\} onOpenReikiCourse=\{\(lesson,mode\)=>openOwner\('reikiCourse',undefined,lesson,mode\)\}/)
  assert.match(materialTab,/<button type="button" role="tab"[\s\S]{0,200}data-practice-materials-courses-tab/)
  assert.match(materialTab,/tab==='courses'\?<section/)
  // The universal authoring tool is visible to masters, but Reiki recordings
  // and owner-only lesson shortcuts are still guarded separately.
  assert.match(materialTab,/\{isOwner&&<div\b/)
  assert.match(materialTab,/onClick=\{\(\)=>onOpenReikiCourse\?\.\(\)\} data-open-reiki-course-audio/)
  assert.match(materialTab,/Практик Рейки/)
  assert.match(materialTab,/Reiki Practitioner/)
  assert.match(materialTab,/Practicante de Reiki/)
  assert.match(materialTab,/data-practice-materials-audio-tab/)
  assert.match(materialTab,/data-unified-material-nav/)
  assert.match(materialTab,/lang|locale/)
  assert.match(access,/reikiCourse: '\/admin\/materials\/courses\/reiki-practitioner'/)
  assert.match(backend,/if \(joined === 'practitioner\/open' && method === 'POST'\)/)
  assert.match(backend,/practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(backend,/issueTrustedAdminSession\(response/)
})

test('New Routes reuse protected audio editor without spawning duplicate media storage',()=>{
  assert.match(folderPage,/requireAdminRequest\(\)/)
  assert.match(ownerPage,/requireAdminRequest\(\)/)
  assert.match(ownerPage,/REIKI_INTRO_LESSONS\.includes\(query\?\.lesson\)/)
  assert.match(ownerPage,/\['ru','en'\]\.includes\(query\?\.lang\)/)
  assert.match(ownerPage,/<AdminReikiAudio initialLocale=\{language\} initialLesson=\{lesson\} initialMode=/)
  assert.match(audio,/uploadToSignedUrl/)
  assert.match(audio,/action:'publish'/)
  assert.match(audio,/action:'preview'/)
  assert.match(audio,/action:'unpublish'/)
  assert.doesNotMatch(audio,/autoPlay|autoplay/)
})

test('Canonical course editor CSP permits scoped private draft upload and preview',()=>{
  assert.match(middleware,/reikiIntroAudioManager = .*courses/)
  // Use the actual signed-origin/route/connect expressions. A coaching learner
  // may play audio but must not inherit the owner upload connection allowance.
  const connect=middleware.match(/"connect-src 'self'"[^\n]+?(?=, "object-src 'none'")/)?.[0]
  assert.ok(connect,'Actual connect-src expression is required')
  const origin=middleware.match(/const reikiIntroAudioOrigin = ([\s\S]+?)\n  \}\)\(\)/)?.[1]
  assert.ok(origin,'Actual signed audio origin expression is required')
  const originExpression=origin+'\n  })()'
  const gate=(name,pathname)=>{
    const expression=middleware.match(new RegExp('const '+name+' = ([^\\n]+)'))?.[1]
    assert.ok(expression,name)
    return vm.runInNewContext(expression,{pathname},{timeout:1000})
  }
  const syntheticOrigin='https://aaaaaaaaaaaaaaaaaaaa.supabase.co'
  for(const [pathname,uploadAllowed] of [
    ['/admin/materials/courses/reiki-practitioner',true],
    ['/admin/materials/coaching/egyptian',true],['/admin/materials/coaching/greek/',true],
    ['/admin/materials/coaching/other',false],['/admin/materials/courses/other',false],
    ['/en/app/coaching/egyptian',false],['/ru/app/coaching/greek',false],
    ['/en/academy/principles-of-energywork/learn',false],
    ['/en/about',false],['/en/client',false],
  ]){
    const gates=Object.fromEntries(['reikiIntroAudioManager','reikiLessonAudioPage',
      'coachingOwnerAudioManager','coachingLearnerAudioPlayer'].map(name=>[name,gate(name,pathname)]))
    for(const databaseOrigin of [syntheticOrigin,'http://aaaaaaaaaaaaaaaaaaaa.supabase.co','https://example.test']){
      const signedOrigin=vm.runInNewContext(originExpression,{...gates,URL,
        process:{env:{HH_APP_SUPABASE_URL:databaseOrigin}}},{timeout:1000})
      const value=vm.runInNewContext(connect,{...gates,reikiIntroAudioOrigin:signedOrigin,
        youtubeOAuthUploadAllowed:false,deliveryOrigin:'',externalVideoUploadOrigin:'',
        practitionerCourseMediaOrigin:'',privateDocument:true},{timeout:1000})
      assert.equal(value,"connect-src 'self'"+(uploadAllowed&&databaseOrigin===syntheticOrigin?' '+syntheticOrigin:''),pathname+' '+databaseOrigin)
    }
  }
  assert.match(middleware,/media-src 'self'/)
  assert.match(middleware,/connect-src 'self'/)
})
