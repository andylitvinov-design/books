import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const server=read('lib/clients/local-narration-service.js')
const access=read('lib/clients/report-narration-access.js')
const redis=read('lib/clients/local-narration-redis.js')
const storage=read('lib/clients/local-narration-media.js')
const client=read('components/local-report-narration-player.jsx')
const route=read('app/api/report-narration/local/route.js')
const audio=read('app/api/report-narration/local/audio/route.js')
const claim=read('app/api/report-narration/local/worker/claim/route.js')
const worker=read('scripts/andrey-voice/local_worker.py')

test('Mac narration is fail-closed behind approval, token and a disabled-by-default flag',()=>{
  assert.match(server,/HH_LOCAL_NARRATION_ENABLED==='true'/)
  assert.match(server,/HH_LOCAL_NARRATION_OWNER_APPROVED==='true'/)
  assert.match(server,/HH_LOCAL_NARRATION_END_TO_END_VERIFIED==='true'/)
  assert.match(server,/HH_LOCAL_NARRATION_WORKER_TOKEN/)
  assert.match(server,/timingSafeEqual/)
  assert.match(server,/workerToken\(request\)/)
  assert.doesNotMatch(server,/HEYGEN_API_KEY|create_speech|speechSynthesis/)
})

test('client can only queue an authorized server-side approved snapshot',()=>{
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/validNarrationRequest\(body\)/)
  assert.match(route,/smallJson\(request,1024\)/)
  assert.match(server,/authorizedNarrationAnalysis\(request,body,config,store\)/)
  assert.match(server,/splitApprovedAnalysis\(analysis\)/)
  assert.match(server,/narrationVersionKey/)
  assert.match(server,/seal\(\{text:source\.text\}/)
  assert.match(server,/consumeAccessAttempt/)
  assert.doesNotMatch(route,/body\.text|voiceId|audioBlob|speechSynthesis/)
})

test('six private scopes retain their shared authorization checks',()=>{
  for (const needle of ['authorizeSessionGuest','authorizeCabinetRequest',
    'authorizePrescriptionRequest','readSavedSession','readSavedDocument',
    'getPublishedSessionReport','getClientPrescription']) {
    assert.ok(access.includes(needle),needle)
  }
  assert.match(audio,/authorizedLocalNarrationAudio\(getAppConfig\(\),request,body/)
  assert.match(audio,/validNarrationRequest\(body\)/)
  assert.match(audio,/status:result\.status/)
  assert.match(audio,/Content-Disposition':'inline'/)
  assert.match(storage,/Content-Range/)
  assert.match(storage,/Accept-Ranges/)
  assert.match(storage,/privateVoiceStorage/)
})

test('queued report text stays encrypted and worker transport is restricted',()=>{
  assert.match(server,/openSealed\(job\.encryptedPayload/)
  assert.match(server,/createLocalVoiceUpload/)
  assert.match(server,/verifyLocalVoiceUpload/)
  assert.match(server,/readPrivateLocalVoice/)
  assert.match(redis,/ENQUEUE_SCRIPT/)
  assert.match(redis,/CLAIM_SCRIPT/)
  assert.match(redis,/COMPLETE_SCRIPT/)
  assert.match(redis,/FAILURE_SCRIPT/)
  assert.match(redis,/ZRANGEBYSCORE/)
  assert.match(redis,/EVAL/)
  assert.match(storage,/checkPrivateMediaStorage\(config\)/)
  assert.match(storage,/3_000_000/)
  assert.match(worker,/HH_LOCAL_NARRATION_SUPABASE_HOST/)
  assert.match(worker,/HTTPRedirectHandler/)
  assert.match(worker,/TemporaryDirectory/)
  assert.doesNotMatch(worker,/api\.heygen\.com|elevenlabs\.com|modal\.com/)
})

test('UI only requests audio on Play and shows offline queue state',()=>{
  assert.match(client,/onClick=\{toggle\}/)
  assert.match(client,/fetch\('\/api\/report-narration\/local'/)
  assert.match(client,/queued/)
  assert.match(client,/processing/)
  assert.match(client,/audioSrc\.current=result\.audioUrl/)
  assert.match(client,/preload="none"/)
  assert.match(client,/onEnded=\{ended\}/)
  assert.doesNotMatch(client,/speechSynthesis|new AudioContext|onMount\(/)
  const parent=read('components/prescription-document.jsx')
  assert.match(parent,/localNarrationEnabled\(\)/)
  assert.match(parent,/LocalReportNarrationPlayer/)
})

test('worker routes never accept voice content from a browser',()=>{
  assert.match(claim,/claimLocalNarration\(getAppConfig\(\),request\)/)
  assert.doesNotMatch(claim,/body\.text|body\.voiceId/)
  assert.doesNotMatch(server,/console\.log\(source\.text\)/)
  assert.match(audio,/sec-fetch-site/)
  assert.match(audio,/new Set\(pairs\.map/)
})


test('worker completion and bounded failure handling require the private worker route', () => {
  const completed = read('app/api/report-narration/local/worker/complete/route.js')
  const rejected = read('app/api/report-narration/local/worker/failed/route.js')
  assert.match(completed, /finalizeLocalNarration/)
  assert.match(rejected, /failLocalNarration/)
  assert.match(server, /workerToken\(request\)/)
  assert.match(server, /verifyLocalVoiceUpload/)
  assert.match(server, /store\.complete/)
  assert.match(server, /store\.fail/)
  for (const source of [completed, rejected]) {
    assert.match(source, /getAppConfig/)
    assert.doesNotMatch(source, /export async function GET/)
  }
})

test('worker request body is size-limited and authorized before buffering', () => {
  const helper = read('lib/clients/local-narration-worker-request.js')
  const complete = read('app/api/report-narration/local/worker/complete/route.js')
  const failed = read('app/api/report-narration/local/worker/failed/route.js')
  assert.match(helper, /requireLocalWorker\(request\)/)
  assert.match(helper, /const MAX_BODY = 2048/)
  assert.match(helper, /request\.body\.getReader\(\)/)
  assert.match(helper, /reader\.cancel\(\)/)
  for (const route of [complete, failed]) {
    assert.match(route, /readAuthenticatedWorkerJson\(request\)/)
    assert.doesNotMatch(route, /request\.text\(\)/)
  }
})
