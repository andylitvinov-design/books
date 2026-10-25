import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TRADITION_COURSES} from '../lib/personal-coaching/traditions.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('reuse canonical Egyptian and Greek definitions, never make duplicate master courses',()=>{
 const source=read('components/app/practice-materials.jsx')
 assert.match(source,/import \{TRADITION_COURSES\} from '@\/lib\/personal-coaching\/traditions\.js'/)
 assert.deepEqual(TRADITION_COURSES.map(v=>[v.slug,v.totalScreens]),[['egyptian',11],['greek',10]])
 assert.match(source,/TRADITION_COURSES\.filter\(course=>!query/)
 assert.match(source,/course\.name\[lang\]\|\|course\.name\.en/)
 assert.match(source,/course\.totalScreens/)
 assert.doesNotMatch(source,/coaching\/egyptian\/.*storage|coaching\/greek\/.*storage/)
})

test('canonical My Materials courses and audio tabs both show the same real coaching folder picker',()=>{
 const ui=read('components/app/practice-materials.jsx')
 const css=read('components/app/practice-materials.module.css')
 assert.match(ui,/function CoachingAudioFolders\(/)
 assert.equal((ui.match(/<CoachingAudioFolders /g)||[]).length,2)
 assert.match(ui,/tab==='courses'/)
 assert.match(ui,/tab==='audio'&&isOwner/)
 assert.match(ui,/coachingAudioCourses=isOwner\?TRADITION_COURSES\.filter/)
 assert.match(ui,/data-practice-coaching-audio-folders/)
 assert.match(ui,/data-practice-coaching-audio-folder=\{course\.slug\}/)
 assert.match(ui,/data-coaching-audio-open-root/)
 assert.match(ui,/onOpenCoachingAudio/)
 assert.match(ui,/isOwner&&<div className=\{styles\.featuredCourse\}/)
 assert.match(css,/\.coachingAudioGroup\{/)
 assert.match(css,/\.coachingAudioHeading button\{[^}]*min-height:44px/)
 assert.match(css,/@media\(max-width:430px\)/)
 for(const text of ['Все папки','Todas las carpetas','All folders','Запись','record','Grabar'])
   assert.ok(ui.includes(text),'missing locale label '+text)
})

test('owner handoff has exact fixed destination and no client-controlled redirect paths',()=>{
 const access=read('lib/app/practitioner-access.js')
 const route=read('app/api/app/[...path]/route.js')
 const workspace=read('components/app/practice-workspace.jsx')
 assert.match(access,/coachingAudio: '\/admin\/materials\/coaching'/)
 assert.match(route,/joined === 'practitioner\/open'/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/repo\.isPractitioner\(actor\)/)
 assert.match(route,/issueTrustedAdminSession\(response/)
 assert.match(route,/practitionerDestination\[body\.destination\]/)
 assert.match(workspace,/onOpenCoachingAudio=\{slug=>openOwner\('coachingAudio',undefined,slug\)\}/)
 assert.match(workspace,/\['egyptian','greek'\]\.includes\(lesson\)/)
 assert.match(workspace,/destination==='coachingAudio'&&result\.redirectUrl==='\/admin\/materials\/coaching'/)
 assert.match(workspace,/result\.redirectUrl\+'\/'\+safeTradition/)
 assert.match(workspace,/\['ru','es'\]\.includes\(locale\)/)
 assert.doesNotMatch(workspace,/destination==='coachingAudio'.*window\.open\(/)
 const admin=read('components/practitioner-cabinet.jsx')
 assert.match(admin,/href:'\/admin\/materials\/coaching'/)
})

test('access remains protected and original recording endpoints are reused untouched',()=>{
 for(const folder of ['app/admin/materials/coaching/page.jsx','app/admin/materials/coaching/[tradition]/page.jsx']){
  const src=read(folder)
  assert.match(src,/requireAdminRequest\(\)/)
 }
 const route=read('app/admin/coaching-audio/data/route.js')
 assert.match(route,/requireAdminRequest\(\)/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.doesNotMatch(read('components/app/practice-materials.jsx'),/uploadToSignedUrl|MediaRecorder|storage\.from\(/)
 const api=read('lib/academy/coaching-audio-store.js')
 assert.match(api,/createSignedUploadUrl\(path\)/)
 assert.match(api,/createSignedUrl\(entry\.path,900\)/)
})
