#!/usr/bin/env node
/**
 * On-demand, unauthenticated first-party LIVE video export acceptance.
 * Real browser → actual Canvas/MediaRecorder or Safari WebCodecs → test-owned Blob → ffprobe,
 * decoded audio and moving pixels. Never uses personal media, an AI API or POST.
 * Chromium is the default; opt-in macOS WebKit runs in CI. Neither is a physical iPhone.
 */
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
import {installGuestVideoBlobCapture,readRealGuestVideo} from './real-guest-video-file.mjs';
import {planExpressVideo} from '../../lib/mandala/express-video-director.mjs';
import {getMyTubeScenarioPhotos} from '../../lib/mandala/story-photo-library.mjs';

const LIVE_ORIGIN = 'https://holistichouse.vercel.app';
const LOCAL_ORIGIN = 'http://127.0.0.1:3100';
const ARTIFACT = 'artifacts/benchmarking/first-video-live-export.json';
const EXPRESS_GOAL='A quiet sunrise over a peaceful mountain meadow';
const EXPRESS_RECIPE=planExpressVideo({locale:'ru',goal:EXPRESS_GOAL,theme:'energy'});
if(!EXPRESS_RECIPE.canRender||EXPRESS_RECIPE.clipIds.length!==6||
   new Set(EXPRESS_RECIPE.clipIds).size!==6)throw new Error('EXPRESS_TEST_RECIPE_NOT_SIX_SCENES');
const driver = process.env.HH_LIVE_VIDEO_PLAYWRIGHT;
const requireLicensed = process.env.HH_LIVE_VIDEO_REQUIRE_STOCK === 'true';
if (!['true','false'].includes(process.env.HH_LIVE_VIDEO_REQUIRE_STOCK))
  throw new Error('LIVE_VIDEO_REQUIRE_STOCK_MISSING');
const source = process.env.HH_LIVE_VIDEO_SOURCE || LIVE_ORIGIN;
if (!driver || !driver.startsWith('/') ||
    (source !== LIVE_ORIGIN && !(requireLicensed && source === LOCAL_ORIGIN))) {
  throw new Error('LIVE_VIDEO_SMOKE_CONFIG_UNSAFE');
}
const ORIGIN=source;
const engine=process.env.HH_LIVE_VIDEO_ENGINE||'chromium';
if(!['chromium','webkit'].includes(engine))throw new Error('LIVE_VIDEO_ENGINE_INVALID');
const headed=process.env.HH_LIVE_VIDEO_HEADED==='1';
if(engine==='webkit' && (source!==LOCAL_ORIGIN || !requireLicensed || process.platform!=='darwin' || !headed))
  throw new Error('LIVE_VIDEO_WEBKIT_REQUIRES_LOCAL_HEADED_MACOS');
if(engine!=='webkit' && headed)throw new Error('LIVE_VIDEO_HEADED_REQUIRES_WEBKIT');
const {chromium,webkit} = await import(driver);
const row = {target: ORIGIN, engine, viewport: '390x844',
  origin: source===LIVE_ORIGIN?'anonymous-public':'anonymous-local', method: 'local-canvas-export',
  paidVideoProviderUsed: false, aiPromptRequested: false,
  physicalIPhoneVerified: false, licensedShotVerificationRequested: requireLicensed,
  status: 'FAIL', blockedRequests: 0};

function mediaTool(exe, args, maxBuffer = 1024 * 1024) {
  // FFprobe and one-frame FFmpeg decoders may close pipe:0 before Node has
  // written the whole media blob, producing EPIPE even with exit status 0.
  // Always read a local ephemeral file instead; never upload its contents.
  const done = spawnSync(exe, args, {timeout: 30000, maxBuffer});
  if (done.error || done.status !== 0) {
    const cause = done.error?.code || 'exit_' + done.status;
    throw new Error(`LIVE_VIDEO_${exe.toUpperCase()}_FAILED:${cause}:` +
      String(done.stderr || '').slice(0, 100));
  }
  return done.stdout;
}
function movingPixels(mediaFile, at) {
  return mediaTool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', mediaFile,
    '-ss', String(at), '-frames:v', '1', '-vf', 'scale=96:54,format=rgb24',
    '-f', 'rawvideo', 'pipe:1'], 200 * 1024);
}
function portraitPixels(mediaFile, at) {
  return mediaTool('ffmpeg', ['-hide_banner','-loglevel','error','-ss',String(at),
    '-i',mediaFile,'-frames:v','1','-vf','scale=54:96,format=rgb24',
    '-f','rawvideo','pipe:1'],200*1024);
}
function correlation(a,b) {
  assert.equal(a.length,54*96*3,'EXPRESS_SOURCE_FRAME_UNDECODABLE');
  assert.equal(b.length,a.length,'EXPRESS_EXPORT_FRAME_UNDECODABLE');
  let meanA=0,meanB=0;
  for(let i=0;i<a.length;i++){meanA+=a[i];meanB+=b[i];}
  meanA/=a.length;meanB/=a.length;
  let aa=0,bb=0,ab=0;
  for(let i=0;i<a.length;i++){
    const x=a[i]-meanA,y=b[i]-meanB;aa+=x*x;bb+=y*y;ab+=x*y;
  }
  return aa&&bb?ab/Math.sqrt(aa*bb):0;
}
function rmsPcm(mediaFile) {
  const pcm = mediaTool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', mediaFile,
    '-map', '0:a:0', '-t', '2', '-ar', '8000', '-ac', '1', '-f', 's16le', 'pipe:1'],
    100 * 1024);
  const samples = Math.floor(pcm.length / 2);
  assert.ok(samples > 4000, 'AUDIO_TOO_SHORT');
  let energy = 0;
  for (let i = 0; i < samples; i++) {
    const v = pcm.readInt16LE(i * 2) / 32768;
    energy += v * v;
  }
  return Math.sqrt(energy / samples);
}
// Extra contains only the three video offers. Original source and advanced
// storyboard settings remain in Story's visible, accessible settings action.
async function openMontageSettings(page) {
  const story=page.locator('[data-video-montage-tab="concept"]');
  await story.waitFor({state:'visible',timeout:20000});
  row.phase='story-native-selection';
  if(engine==='webkit')await story.tap();
  else await story.click();
  await page.waitForFunction(()=>
    document.querySelector('[data-video-basic-editor]')?.getAttribute('data-montage-panel')==='concept',
    undefined,{timeout:15000});
  const openSettings=page.locator('[data-video-story-open-settings]');
  row.phase='story-settings-native-selection';
  await openSettings.waitFor({state:'visible',timeout:20000});
  if(engine==='webkit')await openSettings.tap();
  else await openSettings.click();
  await page.waitForFunction(()=>
    document.querySelector('[data-video-basic-editor]')?.getAttribute('data-montage-panel')==='settings',
    undefined,{timeout:15000});
  const advanced=page.locator('[data-video-stories-advanced]');
  await advanced.waitFor({state:'visible',timeout:20000});
  if(!await advanced.evaluate(node=>node.open)){
    row.phase='story-advanced-options';
    if(engine==='webkit')await advanced.locator(':scope > summary').tap();
    else await advanced.locator(':scope > summary').click();
  }
  const settings=advanced.locator('[data-video-stories-settings]');
  await settings.waitFor({state:'visible',timeout:20000});
  row.phase='story-video-settings';
  if(engine==='webkit')await settings.tap();
  else await settings.click();
  await page.waitForFunction(()=>
    document.querySelector('[data-video-basic-editor]')?.getAttribute('data-montage-panel')==='settings',
    undefined,{timeout:15000});
}

let browser;
let page;
let mediaDir;
// This test uses synthetic anonymous content; only fixed media status codes
// and numeric decoder details are captured, never user prompts or audio.
const safeEncoderCodes=[];
try {
  browser=engine==='webkit'
    ?await webkit.launch({headless:!headed})
    :await chromium.launch({headless:true,channel:'chrome'});
  const context = await browser.newContext({
    viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true,
    locale: 'ru-RU', serviceWorkers: 'block', reducedMotion: 'reduce',
    storageState: {cookies: [], origins: []}, acceptDownloads: true,
  });
  await installGuestVideoBlobCapture(context);
  await context.route('**/*', route => {
    const request = route.request();
    let firstParty = false;
    try { firstParty = new URL(request.url()).origin === ORIGIN; } catch {}
    if (!firstParty || !['GET', 'HEAD'].includes(request.method())) {
      row.blockedRequests++;
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  page = await context.newPage();
  page.on('console',message=>{
    const match=/^HH_WEBKIT_MP4_EXPORT_FAILURE:([a-z0-9_]+)$/.exec(message.text());
    if(match && safeEncoderCodes.length<8)safeEncoderCodes.push(match[1]);
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.name));
  const response = await page.goto(ORIGIN + '/ru/holistic-support/mandala', {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  assert.equal(response?.status(), 200, 'LIVE_MANDALA_NOT_200');
  // Verify true client hydration before the very first user click in
  // the exact local PR build. A server-rendered button has no React handler yet.
  if(source===LOCAL_ORIGIN){
    await page.waitForFunction(() =>
      document.querySelector('[data-mandala-free-video]')?.getAttribute('data-video-studio-hydrated')==='true',
      undefined,{timeout:40000});
  }
  // Exercise the actual Goal → Just make it → Generate Express journey.
  // Require real, visible controls and native browser taps; never use the
  // hidden legacy Continue control or mutate application state from the test.
  row.phase='goal-visible-express-request';
  // On the approved mobile Magic Mirror, all detailed tools remain behind
  // the visible More goals disclosure. Open it with a genuine user gesture
  // before the existing aspect/instant controls; never force-click hidden
  // legacy controls, bypass the renderer, or create a second test-only path.
  const mirrorMore=page.locator('[data-hh-mirror-more-goals]');
  if(await mirrorMore.count() && await mirrorMore.isVisible()){
    if(engine==='webkit')await mirrorMore.tap();
    else await mirrorMore.click();
    await expect(page.locator('[data-mandala-free-video]'))
      .toHaveAttribute('data-hh-mirror-advanced','true');
    await expect(page.locator('[data-mandala-free-video]'))
      .toHaveAttribute('data-video-scenario-open','true');
  }
  const aspectMenu=page.locator('[data-video-prompt-aspect]');
  const aspectSummary=aspectMenu.locator(':scope > summary');
  await expect(aspectSummary).toBeVisible({timeout:15000});
  // Selecting an aspect closes the native <details>. A WebKit React update
  // may leave it open on the next render, so blindly clicking the summary
  // again sometimes CLOSES the menu and hides the second choice.
  // Inspect the real native state before each trusted user gesture.
  const selectAspect=async format=>{
    if(!await aspectMenu.evaluate(node=>node.open)){
      if(engine==='webkit')await aspectSummary.tap();
      else await aspectSummary.click();
    }
    await expect.poll(()=>aspectMenu.evaluate(node=>node.open),
      {timeout:15000}).toBe(true);
    const choice=aspectMenu.locator(`[data-video-request-aspect="${format}"]`);
    await expect(choice).toBeVisible({timeout:10000});
    if(engine==='webkit')await choice.tap();
    else await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed','true');
  };
  await selectAspect('landscape');
  await selectAspect('portrait');
  const request=page.locator('[data-auto-video-input]');
  await request.waitFor({state:'visible',timeout:40000});
  await request.fill(EXPRESS_GOAL);
  const flow=page.locator('[data-video-prompt-flow]');
  await flow.waitFor({state:'visible',timeout:15000});
  await flow.locator(':scope > summary').click();
  const instant=flow.getByRole('button',{name:'Just make it'});
  await instant.waitFor({state:'visible',timeout:10000});
  if(engine==='webkit')await instant.tap();
  else await instant.click();
  const generate=page.locator('[data-video-request-design][data-video-request-flow="instant"]');
  await generate.waitFor({state:'visible',timeout:15000});
  await expect(generate).toBeEnabled();
  row.phase='goal-just-make-it-native-tap';
  if(engine==='webkit')await generate.tap();
  else await generate.click();
  row.expressGenerateClicks=1;
  row.phase='single-gesture-ready-export';
  await page.waitForFunction(() =>
    document.querySelector('[data-mandala-free-video]')
      ?.getAttribute('data-active-workspace')==='ready',undefined,{timeout:15000});
  await expect(page.locator('[data-video-ready] [data-aspect]'))
    .toHaveAttribute('data-aspect','portrait');
  // Guests watch the original encoded movie in Ready; protected Save is login-gated.
  // Read the real test-owned Blob without fake sign-in, download or provider calls.
  const captured=await readRealGuestVideo(page,{timeout:80000});
  const bytes=captured.bytes;
  row.anonymousSaveAuthGateVerified=captured.authGateVerified;
  row.recordedBlobVerified=true;row.downloadedVideo=false;
  assert.ok(bytes.length > 20000, 'VIDEO_EXPORT_EMPTY');
  const filename = 'holistic-house-guest.'+captured.extension;
  assert.match(filename, /\.(mp4|webm)$/, 'INCORRECT_VIDEO_FILENAME');
  if(engine==='webkit')assert.match(filename,/\.mp4$/,'SAFARI_EXPRESS_EXPORT_MUST_BE_MP4');
  if (filename.endsWith('.webm')) {
    assert.deepEqual(bytes.subarray(0, 4), Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
      'NOT_REAL_WEBM');
  } else assert.equal(bytes.subarray(4, 8).toString(), 'ftyp', 'NOT_REAL_MP4');
  mediaDir = mkdtempSync(join(tmpdir(), 'hh-live-video-probe-'));
  const mediaFile = join(mediaDir, filename.endsWith('.webm') ? 'result.webm' : 'result.mp4');
  writeFileSync(mediaFile, bytes);
  const probe = JSON.parse(mediaTool('ffprobe', ['-v', 'error', '-show_streams',
    '-show_format', '-of', 'json', mediaFile]).toString());
  const video = probe.streams.find(s => s.codec_type === 'video');
  const audio = probe.streams.find(s => s.codec_type === 'audio');
  assert.ok(video, 'ENCODED_VIDEO_STREAM_MISSING');
  assert.ok(audio, 'SELECTED_SOUNDTRACK_MISSING_FROM_EXPORT');
  if(filename.endsWith('.mp4')){
    assert.equal(video.codec_name,'h264','MP4_EXPRESS_VIDEO_MUST_USE_H264');
    assert.equal(audio.codec_name,'aac','MP4_EXPRESS_AUDIO_MUST_USE_AAC');
  }else{
    assert.equal(video.codec_name,'vp8','WEBM_EXPRESS_VIDEO_MUST_USE_VP8');
    assert.equal(audio.codec_name,'opus','WEBM_EXPRESS_AUDIO_MUST_USE_OPUS');
  }
  assert.equal(video.width, 720, 'WRONG_PORTRAIT_WIDTH');
  assert.equal(video.height, 1280, 'WRONG_PORTRAIT_HEIGHT');
  const seconds = Number(probe.format?.duration || video.duration || 0);
  row.probedTiming = {
    containerDurationSeconds: Number(probe.format?.duration) || null,
    videoDurationSeconds: Number(video.duration) || null,
    audioDurationSeconds: Number(audio.duration) || null,
  };
  assert.ok(seconds >= 29 && seconds <= 32, 'EXPRESS_VIDEO_MUST_BE_30_SECONDS');
  const energy = rmsPcm(mediaFile);
  Object.assign(row, {recordedBlobVerified: true, encodedBytes: bytes.length,
    container: filename.endsWith('.webm') ? 'webm' : 'mp4',
    width: video.width, height: video.height, durationSeconds: Number(seconds.toFixed(2)),
    audioStreamPresent: true, decodedAudioRms: Number(energy.toFixed(4))});
  assert.ok(energy > 0.003, 'SOUNDTRACK_IS_SILENT');
  // Check motion inside each of the six five-second scenes, not only between
  // two distant frames. Pixel bytes are inspected locally and never uploaded.
  const times = [1, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 29];
  const frames = times.map(t => movingPixels(mediaFile, t));
  for (const [index, frame] of frames.entries()) {
    assert.equal(frame.length, 96 * 54 * 3, 'FRAME_UNDECODABLE_' + times[index]);
  }
  const differences = Array.from({length:6},(_,index)=>{
    let delta = 0;
    const first = frames[index*2];
    const frame = frames[index*2+1];
    for (let i = 0; i < frame.length; i++) delta += Math.abs(frame[i] - first[i]);
    return Number((delta / frame.length).toFixed(3));
  });
  const avgPixelDifference = Math.min(...differences);
  row.motionSampleSeconds = times;
  row.motionPerExpressScene = differences;
  row.pixelDifference = avgPixelDifference;
  assert.ok(differences.every(value=>value>0.08), 'EXPRESS_SCENE_NOT_MOVING');
  const black=spawnSync('ffmpeg',['-hide_banner','-i',mediaFile,'-vf',
    'blackdetect=d=0.15:pix_th=0.05','-an','-f','null','-'],{timeout:30000,maxBuffer:1024*1024});
  assert.equal(black.status,0,'BLACK_GAP_INSPECTION_FAILED');
  assert.doesNotMatch(String(black.stderr),/black_start:/,'BLACK_GAP_IN_EXPORT');
  if(requireLicensed){
    const selected=new Map(getMyTubeScenarioPhotos(EXPRESS_RECIPE.scenarioId)
      .map(photo=>[photo.id,photo]));
    const sources=EXPRESS_RECIPE.clipIds.map(id=>{
      const photo=selected.get(id);
      assert.ok(photo,'EXPRESS_SCENE_NOT_IN_SELECTED_CANONICAL_STORY');
      assert.ok(photo.src.startsWith('/api/video/story-photo/'),'EXPRESS_PHOTO_NOT_FIRST_PARTY');
      return {id,src:photo.src};
    });
    row.expressSceneCount=sources.length;
    const sourcePixels=await page.evaluate(async items=>{
      const canvas=document.createElement('canvas');canvas.width=54;canvas.height=96;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('EXPRESS_REFERENCE_CANVAS_UNAVAILABLE');
      const rows=[];
      for(const item of items){
        const image=new Image();image.decoding='async';image.src=item.src;
        await image.decode();
        const base=Math.max(54/image.naturalWidth,96/image.naturalHeight);
        const scale=base*1.0225,sw=54/scale,sh=96/scale;
        ctx.clearRect(0,0,54,96);
        ctx.drawImage(image,(image.naturalWidth-sw)/2,
          (image.naturalHeight-sh)/2,sw,sh,0,0,54,96);
        rows.push({id:item.id,pixels:Array.from(ctx.getImageData(0,0,54,96).data)
          .filter((_,index)=>index%4!==3)});
        image.src='';
      }
      canvas.width=0;canvas.height=0;
      return rows;
    },sources);
    const identity=sourcePixels.map((source,index)=>{
      const frame=portraitPixels(mediaFile,index*5+2.5);
      const scores=sourcePixels.map(candidate=>correlation(frame,Buffer.from(candidate.pixels)));
      const own=scores[index];
      assert.ok(own>.25,'EXPRESS_CANONICAL_PHOTO_NOT_VISIBLE_'+index);
      assert.ok(scores.every((score,candidate)=>candidate===index||own>score+.04),
        'EXPRESS_CANONICAL_SCENE_ORDER_OR_IDENTITY_MISMATCH_'+index);
      return Number(own.toFixed(3));
    });
    row.expressSceneSourceIds=sources.map(item=>item.id);
    row.expressSceneIdentityCorrelations=identity;
  }
  assert.deepEqual(errors, [], 'BROWSER_JAVASCRIPT_EXCEPTION');
  // The owner-approved Holistic Light mobile redesign needs REAL browser
  // geometry, source-backed story selection and guided-course clicks, in
  // addition to this existing encoded movie acceptance. Run only on the
  // matching PR branch after genuine export and close its heavy decoder first.
  // No extra CI workflow, second video renderer, paid API or external POST.
  await context.close();
  if(source===LOCAL_ORIGIN && requireLicensed && engine==='chromium' &&
     process.env.GITHUB_HEAD_REF==='fix/video-holistic-light-mobile-20261102'){
    await browser.close();
    browser=undefined;
    await import('../verify-mandala-holistic-light-mobile.mjs');
  }
  row.status = 'PASS';
  console.log(source===LIVE_ORIGIN?'LIVE_FIRST_VIDEO_REAL_EXPORT_PASS':'LOCAL_FIRST_VIDEO_REAL_EXPORT_PASS', JSON.stringify(row));
} catch (error) {
  row.failure = String(error?.message || error).slice(0, 200);
  // A missing download must remain a FAIL. On WebKit inspect only synthetic
  // media readiness and fixed codes; page.evaluate can itself hang when the
  // compositor is blocked, so bound this diagnostic separately to 3 seconds.
  if(engine==='webkit' && page && /locator\.waitFor|Timeout|download/i.test(row.failure)){
    try {
      row.exportDiagnostic = await Promise.race([
        page.evaluate(()=>{
          const result=document.querySelector('[data-video-result]');
          const clips=[...document.querySelectorAll('[data-free-film-source]')];
          const create=document.querySelector('[data-first-video-generate]');
          const progress=document.querySelector('[role="progressbar"]');
          return {
            resultVisible:Boolean(result && !result.hidden),
            resultMode:result?.getAttribute('data-video-result-mode')||null,
            createDisabled:create instanceof HTMLButtonElement?create.disabled:null,
            sourceCount:clips.length,
            sources:clips.slice(0,4).map(video=>({
              // No src URL, scene name, user text, or image content.
              readyState:video.readyState,
              networkState:video.networkState,
              errorCode:video.error?.code||null,
              seeking:video.seeking,
              paused:video.paused,
              duration:Number.isFinite(video.duration)?Math.round(video.duration*100)/100:null,
              clock:Number.isFinite(video.currentTime)?Math.round(video.currentTime*100)/100:null,
              width:video.videoWidth,height:video.videoHeight,
            })),
            progress:Number(progress?.getAttribute('aria-valuenow')||0),
            hadResult:Boolean(document.querySelector('[data-mandala-video-download]')),
            // Structure-only diagnostic: never capture audio, transcript or text.
            firstVideoWidgets:[...document.querySelectorAll('[data-first-free-video]')].slice(0,3)
              .map(root=>({
                hydrated:root.getAttribute('data-first-video-hydrated')==='true',
                visible:root.getClientRects().length>0,
                portraitPressed:root.querySelector('[data-first-video-quick-aspect="portrait"]')
                  ?.getAttribute('aria-pressed')==='true',
                filtersOpen:Boolean(root.querySelector('[data-first-video-filters]')?.open),
                filtersDisabled:root.querySelector('[data-first-video-filters] fieldset')
                  ?.disabled??null,
              })),
            advancedOpen:Boolean(document.querySelector('[data-video-first-video-advanced]')?.open),
            activeWorkspace:document.querySelector('[data-mandala-free-video]')
              ?.getAttribute('data-active-workspace')||null,
          };
        }),
        new Promise((_,reject)=>setTimeout(()=>reject(Error('WEBKIT_MEDIA_DIAGNOSTIC_TIMEOUT')),3000)),
      ]);
    } catch {
      row.exportDiagnostic={status:'WEBKIT_MEDIA_DIAGNOSTIC_UNAVAILABLE'};
    }
  }
  if(safeEncoderCodes.length)row.encoderFailureCodes=[...safeEncoderCodes];
  console.error(source===LIVE_ORIGIN?'LIVE_FIRST_VIDEO_REAL_EXPORT_FAIL':'LOCAL_FIRST_VIDEO_REAL_EXPORT_FAIL', row.failure);
  if(row.phase)console.error('WEBKIT_MOVIE_EXPORT_LAST_PHASE',row.phase);
  if(row.exportDiagnostic)console.error('WEBKIT_MOVIE_EXPORT_SAFE_DIAGNOSTIC',JSON.stringify(row.exportDiagnostic));
  if(row.encoderFailureCodes)console.error('WEBKIT_MOVIE_ENCODER_CODES',row.encoderFailureCodes.join(','));
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (mediaDir) rmSync(mediaDir, {recursive: true, force: true});
  mkdirSync('artifacts/benchmarking', {recursive: true});
  writeFileSync(resolve(ARTIFACT), JSON.stringify(row, null, 2) + '\n');
}
