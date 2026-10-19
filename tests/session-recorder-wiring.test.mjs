import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('client report editors select shared resources while personal uploads use their dedicated screen',()=>{
  const consultation=read('app/admin/consultations/[id]/edit/page.js')
  assert.match(consultation,/requireAdminRequest\(\)/)
  assert.match(consultation,/deliveryEnabled\(\)/)
  assert.match(consultation,/documentId:\s*consultation\.id/)
  assert.match(consultation,/ReportVideoMaterialsEditor/)
  const legacy=read('app/admin/prescriptions/[id]/page.js')
  assert.match(legacy,/requireAdminRequest\(\)/)
  // Legacy edits now redirect into the one shared consultation report constructor.
  assert.match(legacy,/redirect\(`\/admin\/consultations\//)
  const assessment=read('app/admin/clients/[id]/assessments/[assessmentId]/edit/page.js')
  assert.match(assessment,/requireAdminRequest\(\)/)
  assert.match(assessment,/deliveryEnabled\(\)/)
  assert.match(assessment,/assessmentId=\{assessmentId\}/)
  const preview=read('app/admin/documents/[id]/page.js')
  assert.match(preview,/requireAdminRequest/)
  assert.doesNotMatch(preview,/SessionAudioRecorder/)
  const recordings=read('app/admin/clients/[id]/sessions/[sessionId]/recordings/page.js')
  assert.match(recordings,/requireAdminRequest/)
  assert.match(recordings,/getOwnerSession/)
  assert.match(recordings,/SessionAudioRecorder/)
  assert.match(recordings,/showYouTubeQuickAdd/)
})
test('report editor can record private client audio without using shared Materials or auto-publishing',()=>{
  const editor=read('components/report-video-materials-editor.jsx')
  const recorder=read('components/session-audio-recorder.jsx')
  assert.match(editor,/SessionAudioRecorder clientId=\{clientId\} sessionId=\{sessionId\|\|null\}/)
  assert.match(editor,/documentId=\{documentId\} locale=\{locale\} audioOnly/)
  assert.match(editor,/onSaved=\{savedId=>/)
  assert.match(recorder,/!audioOnly&&<button type="button" onClick=\{\(\)=>startRecording\('video'\)\}/)
  assert.match(recorder,/!audioOnly&&<SessionPhotoUploader/)
  assert.match(recorder,/if\(audioOnly&&!file\.type\.startsWith\('audio\/'\)\)/)
  assert.match(recorder,/saveRecording\(job/)
  assert.match(recorder,/reviewFirst:scope==='client'/)
  assert.match(recorder,/SessionRecordingReview/)
  assert.match(recorder,/setPlayback\(''\);setLocalPlaybackError\(false\)/)
  const manager=read('components/session-recording-review.jsx')
  assert.match(manager,/Attach to client/)
  assert.match(manager,/Прикрепить клиенту/)
  assert.match(manager,/action:'delete'/)
  assert.match(manager,/role:visible\?'personal':'hidden'/)
  assert.match(manager,/onError=/)
  assert.match(manager,/publishedIds\.has/)
  const owner=read('app/api/admin/clients/[id]/sessions/[sessionId]/media/route.js')
  assert.match(owner,/case 'delete'/)
})

test('Storage CSP expansion stays confined to explicit session/editor routes',()=>{
 const source=read('middleware.ts');const expression=source.split('const deliveryPath =')[1].split('const deliveryOrigin')[0].trim()
 const libraryBinding=source.match(/const materialLibraryPage = [^\n]+/)[0]
 const matches=new Function('pathname',libraryBinding+';return '+expression)
 for(const path of ['/admin/materials','/admin/clients/a/assessments/b/edit','/admin/prescriptions/a','/admin/consultations/a/edit','/admin/documents/a','/admin/clients/a/sessions/b','/en/client/session/a','/ru/client/a/sessions/b'])assert.equal(matches(path),true,path)
 for(const path of ['/admin/materials/other','/api/admin/materials','/en/app/materials','/admin/login','/en/app/profile','/en/reports/a','/admin/clients/a/assessments/new','/admin/clients/a','/api/client/session/a','/en/academy/reiki'])assert.equal(matches(path),false,path)
 assert.ok(source.includes("(process.env.HH_CLIENT_DELIVERY_ENABLED !== 'true'&&!materialLibraryPage) || !deliveryPath"))
 assert.ok(source.includes("process.env.HH_CLIENT_VIDEO_EXTERNAL_ENABLED!=='true'"))
})


test('owner preview contains client-scope materials only, not practitioner notes',()=>{
 const studio=read('components/admin-session-studio.jsx')
 assert.match(studio,/showClientPreview/)
 assert.match(studio,/filter\(item=>item.scope==='client'&&item.role!=='hidden'\)/)
 assert.match(studio,/some\(item=>item.scope==='client'&&item.role!=='hidden'\)/)
 assert.match(studio,/ПРЕДПРОСМОТР · НЕ ОПУБЛИКОВАНО/)
 assert.match(studio,/Owner-only notes are omitted/)
 assert.match(studio,/action==='publish'/)
})


test('recording permission is granted only on authenticated practitioner editor URLs',()=>{
  const config=read('next.config.ts')
  assert.ok(config.includes('const practitionerRecordingSources = ['))
  const values=config.split('const practitionerRecordingSources = [')[1].split('];')[0]
  const sources=[...values.matchAll(/"([^"]+)"/g)].map(match=>match[1])
  assert.deepEqual(sources,[
    '/admin/consultations/:id/edit',
    '/admin/documents/:id',
    '/admin/prescriptions/:id',
    '/admin/clients/:id/assessments/:assessmentId/edit',
    '/admin/clients/:id/sessions/:path*',
  ])
  assert.ok(!sources.some(path=>/^\/(?:en|ru|es|api)/.test(path)))
  assert.ok(config.includes('value: "camera=(), microphone=(), geolocation=()"'))
  assert.ok(config.includes('value: "camera=(self), microphone=(self), geolocation=()"'))
  const global=config.indexOf('source: "/:path*"')
  const override=config.indexOf('...practitionerRecordingSources.map((source)')
  assert.ok(global!==-1 && override>global,'scoped policy must override the global denial last')
  const recorder=read('components/session-audio-recorder.jsx')
  assert.ok(recorder.includes('navigator.mediaDevices.getUserMedia'))
})


test('report-only voice UI remains compact while keeping safe publish and deletion controls',()=>{
  const recorder=read('components/session-audio-recorder.jsx')
  const takes=read('components/session-recording-review.jsx')
  const css=read('components/client-session.module.css')
  assert.match(recorder,/audioOnly\?styles\.compactRecorder/)
  assert.match(recorder,/audioOnly&&<details className=\{styles\.audioHelp\}>/)
  assert.match(recorder,/compact=\{audioOnly\}/)
  assert.match(recorder,/reviewFirst:scope==='client'/)
  assert.match(takes,/compact=false/)
  assert.match(takes,/compact\?styles\.compactTakeSection/)
  assert.match(takes,/type="checkbox"/)
  assert.match(takes,/disabled=\{Boolean\(busy\)\|\|inPublished\}/)
  assert.match(takes,/aria-label=\{ru\?'Удалить '\+displayTitle/)
  assert.match(css,/\.compactRecorder \.recordControls\{\s*display:grid;/)
  assert.match(css,/\.compactRecorder \.audioHelp summary\{/)
  assert.match(css,/\.compactTakeSection \.takeActions button\{\s*flex:none;/)
})
