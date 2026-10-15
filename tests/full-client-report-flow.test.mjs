import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('preview / open is owner-only complete consultation HTML, PDF is a distinct action',()=>{
  const owner=src('app/admin/documents/[id]/session-preview/page.js')
  const page=src('components/client-session-page.jsx')
  const actions=src('components/consultation-document-actions.jsx')
  const route=src('lib/consultations/result-actions.js')
  assert.match(owner,/requireAdminRequest/)
  assert.match(owner,/getPublishedClientSession/)
  assert.match(owner,/draftProjection/)
  assert.match(owner,/scope==='client'/)
  assert.match(owner,/ClientSessionPage mode="owner"/)
  assert.match(owner,/PrescriptionDocument document=\{document\}/)
  assert.match(owner,/\/admin\/api\/documents\//)
  assert.match(route,/session-preview/)
  assert.match(actions,/href=\{urls\.open\}/)
  assert.match(actions,/href=\{urls\.previewPdf\}/)
  assert.match(actions,/href=\{urls\.pdf\}/)
  assert.match(page,/mode==='owner'/)
  assert.match(page,/mode!=='saved'&&mode!=='owner'/)
})

test('client and Google-saved session readers include full HTML report and authorized attachments',()=>{
  const page=src('components/client-session-page.jsx')
  for(const path of [
    'app/[locale]/client/session/[shareSelector]/page.js',
    'app/[locale]/client/[selector]/sessions/[sessionId]/page.js',
    'app/[locale]/app/sessions/[id]/page.jsx',
  ]) {
    const text=src(path)
    assert.match(text,/PrescriptionDocument/)
    assert.match(text,/embedded\/>/)
  }
  assert.match(page,/session\.media/)
  assert.match(page,/id="session-photos"/)
  assert.match(page,/id="session-report"/)
  assert.match(page,/id="session-message"/)
  assert.match(page,/Read the full HTML document/)
})

test('sharing the full page requires a published, unchanged single-session grant',()=>{
  const share=src('app/admin/api/documents/[id]/session-link/route.js')
  assert.match(share,/ownerDelivery/)
  assert.match(share,/publishedOnly:true/)
  assert.match(share,/getPublishedClientSession/)
  assert.match(share,/published\?\.report\?\.id!==record\.id/)
  assert.match(share,/changeSessionGrant\(config,store,record\.clientId,row\.id,'copy'\)/)
  assert.doesNotMatch(share,/getOwnerClientLink|createClientSession|issuePrescriptionAccess/)
  const button=src('components/session-link-issuer.jsx')
  assert.match(button,/\/client\/session\//)
  assert.doesNotMatch(button,/\/prescriptions\//)
})

test('mobile recording checks private bucket before camera / microphone permission or file upload',()=>{
  const recorder=src('components/session-audio-recorder.jsx')
  const status=src('app/api/admin/clients/[id]/sessions/status/route.js')
  const storage=src('lib/clients/session-delivery-storage.js')
  assert.match(status,/requireAdminRequest/)
  assert.match(status,/deliveryEnabled/)
  assert.match(status,/config\.secretKey/)
  assert.match(status,/checkPrivateMediaStorage\(config\)/)
  assert.match(storage,/getBucket\(PRIVATE_MEDIA_BUCKET\)/)
  assert.match(storage,/data\.public!==false/)
  assert.ok(recorder.indexOf('await checkReady()')<recorder.indexOf('navigator.mediaDevices.getUserMedia'))
  // The same preflight returns separate audio and video readiness. Video must
  // fail closed before any session, camera prompt or private object upload.
  assert.match(recorder,/const availability=await checkReady\(\)/)
  assert.match(recorder,/if\(video&&availability\.videoReady===false\)throw new Error\('MEDIA_STORAGE_NOT_CONFIGURED'\)/)
  assert.ok(recorder.indexOf('const availability=await checkReady()',recorder.indexOf('async function chooseFile'))<recorder.indexOf('const sid=await ensureSession()',recorder.indexOf('async function chooseFile')))
  const readiness=src('lib/clients/recording-readiness.js')
  assert.match(readiness,/\/api\/admin\/clients\//)
  assert.match(readiness,/\/admin\/api\/recorder-auth/)
  assert.match(recorder,/recordingError\(e,ru\)/)
  const media=src('app/api/admin/clients/[id]/sessions/[sessionId]/media/[assetId]/route.js')
  assert.match(media,/ownerDelivery/)
  assert.match(media,/privateMediaStream/)
  assert.match(media,/export const HEAD/)
  assert.match(media,/export const POST/)
})
