import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function sessionPageSource(source) {
  const start=source.indexOf('export function ClientSessionPage(')
  const end=source.indexOf('\n}',start)
  assert.ok(start>=0&&end>start,'ClientSessionPage must have a bounded component body')
  return source.slice(start,end+2)
}

function assertCanonicalComposition(source) {
  const page=sessionPageSource(source)
  const video=page.indexOf('id="session-video"')
  const report=page.indexOf('className={styles.fullReportContent}>{reportContent}')
  const fallbackAudio=page.indexOf('!audioEmbedded&&!hasFullReport&&<ClientSessionVoiceMessage')
  const reportAudio=page.indexOf('!audioEmbedded&&hasFullReport&&<ClientSessionVoiceMessage')
  assert.ok(video>=0&&fallbackAudio>video&&report>fallbackAudio&&reportAudio>report,
    'video leads; mutually exclusive nonembedded voice slots surround the full report')
  const fallback=page.match(/\{!hasFullReport&&hasRecommendation&&<>([\s\S]*?)<\/>\}/)?.[1]
  assert.ok(fallback,'fallback prescriptions must be guarded from a full report')
  assert.match(fallback, /<SessionPrescriptionOverview recommendation=\{recommendation\} locale=\{locale\} part="summary"\/>/)
  assert.match(fallback, /<SessionPrescriptionOverview recommendation=\{recommendation\} locale=\{locale\} part="remedies"\/>/)
  assert.doesNotMatch(fallback, /DaoStageDisclosure/, 'the optional stage now follows the complete session content')
  const stage=page.match(/\{!hasFullReport&&hasRecommendation&&<DaoStageDisclosure\s+score=\{recommendation\?\.daoResourceScore\} locale=\{locale\}\s+published=\{recommendation\?\.daoResourcePublished !== false\}\/>\}/)?.[0]
  assert.ok(stage,'fallback Dao stage must retain its full-report and publication guards')
  assert.equal((page.match(/<DaoStageDisclosure\b/g)||[]).length,1,'one optional fallback stage')
  const stagePosition=page.indexOf(stage)
  const materials=page.indexOf('id="session-materials-title"')
  const actions=page.indexOf('data-hh-report-next-actions')
  const tests=page.indexOf('id="session-recommended-tests"')
  const pdf=page.indexOf("id={hasFullReport?'session-download':'session-report'}")
  assert.ok(materials>=0&&stagePosition>materials&&stagePosition<actions&&actions<tests&&tests<pdf,
    'optional fallback stage follows content before Cabinet save → test cards → final PDF')
  assert.match(page, /!hasFullReport&&hasRecommendation&&<SessionPrescriptionOverview recommendation=\{recommendation\} locale=\{locale\} part="extra"\/>/)
  assert.equal((page.match(/<SessionPrescriptionOverview\b/g)||[]).length,3,
    'summary, remedies and extra instructions appear only in guarded fallbacks')
}

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
    assert.match(text,/<PrescriptionDocument\b[^>]*\bembedded(?:\s|\/>)/,
      'the shared document stays embedded when afterCover props follow it')
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


test('videos lead the canonical report with composed voice, guarded fallback, attachments and one PDF action',()=>{
  const page=src('components/client-session-page.jsx')
  const css=src('components/client-session.module.css')
  const owner=src('app/admin/documents/[id]/session-preview/page.js')
  const canonical=src('components/prescription-document.jsx')
  assert.match(page,/const hasFullReport=Boolean\(reportContent\)/)
  assert.match(page,/\{hasFullReport&&<section id="session-report"/)
  assert.match(page,/className=\{styles\.fullReportContent\}>\{reportContent\}/)
  // Voice now has its own component and is embedded through afterCover by
  // each authorized route. Declaration order is not render order (#1070).
  assertCanonicalComposition(page)
  assert.match(page,/id="session-photos"/)
  assert.match(page,/id="session-video"/)
  assert.match(page,/function PrivatePlayer/)
  assert.match(page,/SaveClientSessionToAccount/)
  assert.match(page,/SessionExitSaveGuard/)
  assert.equal(page.match(/href=\{pdfPath\}/g)?.length,1,'only one PDF download action; the separate owner-approved preview remains available')
  assert.doesNotMatch(owner,/href=\{pdf[+}]/,'owner toolbar does not add another PDF action')
  assert.match(css,/\.cabinetSessionPage \.fullReportContent :global\(\.prescription-shell\.canonical-shell\)/)
  assert.match(css,/\.cabinetSessionPage \.fullReportSection/)
  for(const selector of ['canonical-report-brandline','canonical-progress',
    'canonical-report-analysis','canonical-remedy-group','canonical-guidance',
    'canonical-follow-up-appointment','DocumentSignature','canonical-remedy-profiles']) {
    assert.ok(canonical.includes(selector),'original signed document keeps '+selector)
  }
})

test('full-report composition rejects reordered video and an unguarded prescription fallback',()=>{
  const source=src('components/client-session-page.jsx')
  const reversed=source.replace('id="session-video"','id="moved-video"')
    .replace('className={styles.fullReportContent}>{reportContent}',
      'className={styles.fullReportContent}>{reportContent}<section id="session-video"/>')
  assert.notEqual(reversed,source)
  assert.throws(()=>assertCanonicalComposition(reversed), /video leads/)
  const duplicated=source.replace('!hasFullReport&&hasRecommendation&&<>','hasRecommendation&&<>')
  assert.notEqual(duplicated,source)
  assert.throws(()=>assertCanonicalComposition(duplicated), /fallback prescriptions must be guarded/)
})


test('fallback Dao placement rejects lost publication/full-report guards and an early stage',()=>{
  const source=src('components/client-session-page.jsx')
  for(const [before,after] of [
    ['published={recommendation?.daoResourcePublished !== false}','published={true}'],
    ['!hasFullReport&&hasRecommendation&&<DaoStageDisclosure','hasRecommendation&&<DaoStageDisclosure'],
  ]){
    assert.ok(source.includes(before),'mutation target exists')
    assert.throws(()=>assertCanonicalComposition(source.replace(before,after)), /publication guards/)
  }
  const stage=source.match(/\{!hasFullReport&&hasRecommendation&&<DaoStageDisclosure[\s\S]*?\/>\}/)?.[0]
  assert.ok(stage)
  const early=source.replace(stage,'').replace('{!hasFullReport&&<section className={styles.sessionHero}',stage+'\n    {!hasFullReport&&<section className={styles.sessionHero}')
  assert.notEqual(early,source)
  assert.throws(()=>assertCanonicalComposition(early), /follows content before Cabinet save/)
})

test('fallback Dao placement rejects moving the optional stage after Cabinet or test actions',()=>{
  const source=src('components/client-session-page.jsx')
  const stage=source.match(/\{!hasFullReport&&hasRecommendation&&<DaoStageDisclosure[\s\S]*?\/>\}/)?.[0]
  assert.ok(stage)
  for(const marker of ['    <section id="session-recommended-tests"',"    {session.report&&<section id={hasFullReport?'session-download':'session-report'}"]){
    assert.ok(source.includes(marker),'late-stage mutation target exists')
    const moved=source.replace(stage,'').replace(marker,stage+'\n'+marker)
    assert.throws(()=>assertCanonicalComposition(moved),/follows content before Cabinet save/)
  }
})
