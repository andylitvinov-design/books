import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function assertUploadPreflight(recorder) {
  const start=recorder.indexOf('async function chooseFile(event) {')
  const end=recorder.indexOf('  const busy=',start)
  assert.ok(start>=0&&end>start,'upload function must be bounded')
  const upload=recorder.slice(start,end)
  const preflight=upload.indexOf('const availability=await checkReady()')
  const ready=upload.indexOf("if(video&&availability.videoReady===false)throw new Error('VIDEO_STORAGE_NOT_CONFIGURED')")
  const size=upload.indexOf('if(video&&file.size>Number(availability.videoLimitBytes||45_000_000))')
  const sizeThrow=upload.indexOf('throw new Error(',size)
  const session=upload.indexOf('const sid=await ensureSession()')
  const send=upload.indexOf('await upload(job)')
  assert.ok(preflight>=0&&preflight<ready&&ready<size&&size<sizeThrow&&sizeThrow<session&&session<send,
    'await storage readiness and both rejecting video guards before creating a session or uploading')
}


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
  assert.match(page,/mode==='owner'\?'\/admin\/api\/documents\//)
  assert.match(page,/href=\{pdfPath\}/)
  assert.doesNotMatch(owner,/Download PDF|Скачать PDF/,'owner toolbar must not duplicate the inline PDF button')
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
  assert.match(page,/className=\{styles\.fullReportContent\}>\{reportContent\}/)
  assert.doesNotMatch(page,/<details className=\{styles\.reportDetails\}>/)
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
  assert.match(recorder,/if\(video&&availability\.videoReady===false\)throw new Error\('VIDEO_STORAGE_NOT_CONFIGURED'\)/)
  assert.ok(recorder.indexOf('const availability=await checkReady()',recorder.indexOf('async function chooseFile'))<recorder.indexOf('const sid=await ensureSession()',recorder.indexOf('async function chooseFile')))
  assertUploadPreflight(recorder)
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


test('videos lead the complete canonical HTML report, with audio, attachments and one PDF action',()=>{
  const page=src('components/client-session-page.jsx')
  const css=src('components/client-session.module.css')
  const owner=src('app/admin/documents/[id]/session-preview/page.js')
  const canonical=src('components/prescription-document.jsx')
  assert.match(page,/const hasFullReport=Boolean\(reportContent\)/)
  assert.match(page,/\{hasFullReport&&<section id="session-report"/)
  assert.match(page,/className=\{styles\.fullReportContent\}>\{reportContent\}/)
  assert.ok(page.indexOf('id="session-video"') <
    page.indexOf('className={styles.fullReportContent}>{reportContent}'),
    'video appears first, before the canonical full report')
  assert.ok(page.indexOf('className={styles.fullReportContent}>{reportContent}') <
    page.indexOf('id="session-message"'),'the original report remains before audio')
  assert.match(page,/!hasFullReport&&hasRecommendation/,'do not duplicate visible recommendation cards')
  assert.match(page,/!hasFullReport&&hasRecommendation&&<SessionPrescriptionOverview/)
  assert.match(page,/id="session-photos"/)
  assert.match(page,/id="session-video"/)
  assert.match(page,/function PrivatePlayer/)
  assert.match(page,/SaveClientSessionToAccount/)
  assert.match(page,/SessionExitSaveGuard/)
  assert.equal(page.match(/href=\{pdfPath\}/g)?.length,1,'only one PDF action in the client report')
  assert.doesNotMatch(owner,/href=\{pdf[+}]/,'owner toolbar does not add another PDF action')
  assert.match(css,/\.cabinetSessionPage \.fullReportContent :global\(\.prescription-shell\.canonical-shell\)/)
  assert.match(css,/\.cabinetSessionPage \.fullReportSection/)
  for(const selector of ['canonical-report-brandline','canonical-progress',
    'canonical-report-analysis','canonical-remedy-group','canonical-guidance',
    'canonical-follow-up-appointment','DocumentSignature','canonical-remedy--unified']) {
    assert.ok(canonical.includes(selector),'original signed document keeps '+selector)
  }
})
