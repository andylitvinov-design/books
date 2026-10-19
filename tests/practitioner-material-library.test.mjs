import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeClientPlan,normalizeDraft,emptySessionDraft,clientPayload,guestSessionProjection} from '../lib/clients/delivery-model.js'

const ID1='d7a9c2de-667e-43c2-9e16-134bbf000001'
const ID2='d7a9c2de-667e-43c2-9e16-134bbf000002'
const ID3='d7a9c2de-667e-43c2-9e16-134bbf000003'
const videoId='AbCdEfGhIj0'
const youtube='https://www.youtube.com/watch?v='+videoId
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('legacy session plans remain byte-compatible without attached library entries',()=>{
  const normalized=normalizeClientPlan({focus:'Relax',resources:[]})
  assert.equal(Object.hasOwn(normalized,'materialIds'),false)
  assert.equal(Object.hasOwn(normalized,'materials'),false)
  const prior=normalizeDraft(emptySessionDraft())
  assert.equal(Object.hasOwn(prior.plan,'materialIds'),false)
  assert.equal(Object.hasOwn(prior.plan,'materials'),false)
})
test('materials store only 24 checked UUIDs, never arbitrary client-supplied URLs',()=>{
  const snap=[
    {id:ID1,kind:'youtube',title:'Meditation',description:'Listen',url:youtube},
    {id:ID2,kind:'image',title:'Breathing diagram',description:'',mime:'image/jpeg'},
    {id:ID3,kind:'video',title:'Guidance',description:'',mime:'video/quicktime'},
  ]
  const plan=normalizeClientPlan({materialIds:[ID3,ID1,ID2],materials:snap})
  assert.deepEqual(plan.materialIds,[ID3,ID1,ID2])
  assert.deepEqual(plan.materials,snap)
  assert.throws(()=>normalizeClientPlan({materialIds:[ID1,ID1]}))
  assert.throws(()=>normalizeClientPlan({materialIds:['../../../secret']}))
  assert.throws(()=>normalizeClientPlan({materialIds:Array(25).fill(ID1).map((_,i)=>(
    'd7a9c2de-667e-43c2-9e16-'+String(i+1).padStart(12,'0')
  ))}))
  assert.throws(()=>normalizeClientPlan({materials:[{...snap[1],url:'https://private.example/asset'}]}))
  assert.throws(()=>normalizeClientPlan({materials:[{...snap[0],url:'https://evil.example/video'}]}))
  assert.throws(()=>normalizeClientPlan({materials:[{...snap[2],mime:'text/html'}]}))
  assert.throws(()=>normalizeClientPlan({materials:[{...snap[0],extra:'unapproved'}]}))
  assert.throws(()=>normalizeClientPlan({materials:[snap[1],snap[1]]}))
})
test('approved library material metadata survives draft, published and guest projection',()=>{
  const draft=normalizeDraft({...emptySessionDraft({title:'Private consultation'}),plan:{
    resources:[],materialIds:[ID1,ID2],materials:[
      {id:ID1,kind:'youtube',title:'Mindful pause',description:'One minute',url:youtube},
      {id:ID2,kind:'image',title:'Illustration',description:'',mime:'image/webp'},
    ]}})
  const published=clientPayload(draft)
  const guest=guestSessionProjection({...published,id:ID3,occurredOn:'2026-10-15',report:null})
  assert.deepEqual(guest.plan.materialIds,[ID1,ID2])
  assert.deepEqual(guest.plan.materials,published.plan.materials)
  assert.equal(guest.plan.materials[0].url,youtube)
  assert.equal(guest.plan.materials[1].mime,'image/webp')
})
test('owners, client and Google-saved readers require session-specific authorization for library files',()=>{
  const files=[
    'app/api/admin/clients/[id]/sessions/[sessionId]/media/[assetId]/route.js',
    'app/api/client-session-viewer/[selector]/media/[assetId]/route.js',
    'app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js',
    'app/api/app/saved-sessions/[id]/media/[assetId]/route.js',
  ]
  for(const file of files){
    const route=read(file)
    assert.match(route,/streamReadyMaterial/)
    assert.match(route,/plan\?\.materials/)
    assert.match(route,/privateMediaStream\(/)
    assert.match(route,/assetId/)
  }
  assert.match(read(files[0]),/getOwnerSession\(/)
  assert.match(read(files[1]),/authorizeSessionGuest\(/)
  assert.match(read(files[2]),/authorizeCabinetRequest\(/)
  assert.match(read(files[3]),/readSavedSession\(/)
})
test('owner library and both consultation editors show expandable checkboxes',()=>{
  const nav=read('components/practitioner-cabinet.jsx')
  const header=read('components/prescription-admin-header.jsx')
  const editor=read('components/admin-session-studio.jsx')
  const consultation=read('app/admin/consultations/[id]/edit/page.js')
  const checkbox=read('components/session-material-picker.jsx')
  assert.match(nav,/href:'\/admin\/materials'/)
  assert.match(header,/href="\/admin\/materials"/)
  assert.match(editor,/SessionMaterialPicker/)
  assert.match(consultation,/ReportVideoMaterialsEditor/)
  assert.match(read('components/report-video-materials-editor.jsx'),/SessionMaterialPicker/)
  assert.match(checkbox,/<details /)
  assert.match(checkbox,/type="checkbox"/)
  assert.match(checkbox,/selectedIds\.includes\(item\.id\)/)
  assert.match(read('components/practitioner-materials-cabinet.jsx'),/preparePhoto/)
  assert.match(read('components/practitioner-materials-cabinet.jsx'),/normalizePhoneVideoFile/)
  assert.match(read('components/practitioner-materials-cabinet.jsx'),/uploadToSignedUrl/)
})
test('selected reusable items appear at the very end of client report without displacing personal video-first section',()=>{
  const report=read('components/client-session-page.jsx')
  const first=report.indexOf('id="session-video"')
  const narrative=report.indexOf('id="session-report"')
  const appendix=report.indexOf('id="session-resources"')
  const footer=report.indexOf('<footer className={styles.clientFooter}>')
  assert.ok(first>=0&&narrative>first&&appendix>narrative&&footer>appendix)
  assert.match(report,/libraryMaterials\.map/)
  assert.match(report,/SessionYouTubePlayer/)
  assert.match(report,/PrivatePlayer/)
  assert.match(report,/encodeURIComponent\(item\.id\)/)
  assert.equal((report.match(/href=\{pdfPath\}/g)||[]).length,1)
})
test('uploads are owner-only; media never receives a public bucket URL or client CDN link',()=>{
  const api=read('app/api/admin/materials/route.js')
  const stream=read('app/api/admin/materials/[id]/media/route.js')
  const library=read('lib/clients/material-library.js')
  const sql=read('sql/practitioner-material-library-20261015.sql')
  const middleware=read('middleware.ts')
  assert.match(api,/ownerMaterialRequest/)
  assert.match(stream,/ownerMaterialRequest/)
  assert.match(library,/checkPrivateMediaStorage/)
  assert.match(library,/sniffPrivateMedia/)
  assert.match(library,/verifyUploadedVideoHeader/)
  assert.match(library,/createVideoUploadUrl/)
  assert.match(library,/selectedMaterialSnapshots/)
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
  assert.match(sql,/public\=FALSE|REVOKE ALL/)
  assert.match(middleware,/materialLibraryPage/)
  assert.match(middleware,/sessionEducationEmbed \? "frame-src https:\/\/www\.youtube-nocookie\.com"/)
})

test('shared resources are created in the separate Materials menu, not in client report editors',()=>{
  const catalog=read('components/practitioner-materials-cabinet.jsx')
  const nav=read('components/practitioner-cabinet.jsx')
  const header=read('components/prescription-admin-header.jsx')
  const picker=read('components/session-material-picker.jsx')
  const studio=read('components/admin-session-studio.jsx')
  const editor=read('components/report-video-materials-editor.jsx')
  const preview=read('app/admin/documents/[id]/page.js')
  const recordings=read('app/admin/clients/[id]/sessions/[sessionId]/recordings/page.js')
  assert.match(nav,/href:'\/admin\/materials'/)
  assert.match(header,/href="\/admin\/materials"/)
  for(const term of ["action:'youtube'","action:'intent'","type=\"file\"","uploadToSignedUrl"]){
    assert.ok(catalog.includes(term),'the catalog owns '+term)
  }
  assert.match(picker,/\/api\/admin\/materials/)
  assert.match(picker,/type="checkbox"/)
  assert.match(picker,/Refresh list/)
  assert.match(editor,/SessionMaterialPicker/)
  assert.match(editor,/materialIds:ids/)
  assert.match(studio,/SessionMaterialPicker/)
  assert.match(studio,/materialIds:ids/)
  assert.match(studio,/\/recordings/)
  assert.doesNotMatch(editor,/addYoutube|placeYoutube|placePrivateVideo|type="file"|ownerMaterialsAdd/)
   assert.match(editor,/SessionAudioRecorder[^\n]*sessionId=\{sessionId\|\|null\}/)
   assert.match(editor,/audioOnly/)
  assert.doesNotMatch(studio,/SessionAudioRecorder|changeResource|Add YouTube video|Add resource link|ownerMaterialsAdd/)
  assert.doesNotMatch(preview,/SessionAudioRecorder/)
  assert.match(recordings,/requireAdminRequest/)
  assert.match(recordings,/getOwnerSession/)
  assert.match(recordings,/showYouTubeQuickAdd=\{false\}/)
  assert.match(recordings,/SessionAudioRecorder/)
})
test('existing legacy report-specific links and recordings are preserved when choosing library resources',()=>{
  const report=read('components/report-video-materials-editor.jsx')
  const service=read('lib/clients/session-delivery-service.js')
  const view=read('components/client-session-page.jsx')
  assert.match(report,/\.\.\.owner\.draft,plan:\{\.\.\.owner\.draft\.plan,materialIds:ids\}/)
  assert.match(report,/reportDocumentId!==documentId/)
  assert.match(service,/selectedMaterialSnapshots/)
  assert.match(view,/materialsYoutubeResources\.map/)
  assert.match(view,/materialsVideos\.map/)
  assert.match(view,/libraryMaterials\.map/)
  assert.match(view,/id="session-resources"/)
})

test('general MP4/MOV uploads use the configured library opt-in, not the client recording opt-in',()=>{
  const library=read('lib/clients/material-library.js')
  const model=read('lib/clients/delivery-model.js')
  assert.match(library,/HH_MATERIAL_VIDEO_SUPABASE_UPLOADS_ALLOWED/)
  assert.doesNotMatch(library,/HH_CLIENT_VIDEO_SUPABASE_UPLOADS_ALLOWED/)
  assert.match(library,/checkPrivateMediaStorage/)
  assert.match(library,/createSignedUploadUrl/)
  assert.match(model,/PRIVATE_MEDIA_BUCKET = 'hh-client-private-media'/)
  assert.match(model,/'video\/mp4'/)
  assert.match(model,/'video\/quicktime'/)
})
