#!/usr/bin/env node
/**
 * On-demand, unauthenticated first-party LIVE video export acceptance.
 * Real browser → actual Canvas/MediaRecorder or Safari WebCodecs → test-owned Blob → ffprobe,
 * decoded audio and moving pixels. Never uses personal media, an AI API or POST.
 * Chromium is the default; opt-in macOS WebKit runs in CI. Neither is a physical iPhone.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';
import {installGuestVideoBlobCapture,readRealGuestVideo} from './real-guest-video-file.mjs';

const LIVE_ORIGIN = 'https://holistichouse.vercel.app';
const LOCAL_ORIGIN = 'http://127.0.0.1:3100';
const ARTIFACT = 'artifacts/benchmarking/first-video-live-export.json';
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
  assert.equal(a.length,54*96*3,'FRAME_UNDECODABLE');
  assert.equal(b.length,a.length,'SOURCE_FRAME_UNDECODABLE');
  let meanA=0,meanB=0;
  for(let i=0;i<a.length;i++){meanA+=a[i];meanB+=b[i];}
  meanA/=a.length;meanB/=b.length;
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
// The compact fourth Story is deliberately review-only. Advanced timeline
// and source settings are in the fifth Montage tab; no hidden Story click.
async function openMontageSettings(page) {
  const montage=page.locator('[data-video-montage-tab="promo"]');
  await montage.waitFor({state:'visible',timeout:20000});
  row.phase='fifth-montage-native-selection';
  if(engine==='webkit')await montage.tap();
  else await montage.click();
  await page.waitForFunction(()=>
    document.querySelector('[data-video-basic-editor]')?.getAttribute('data-montage-panel')==='promo',
    undefined,{timeout:15000});
  const advanced=page.locator('[data-video-stories-advanced]');
  await advanced.waitFor({state:'visible',timeout:20000});
  if(!await advanced.evaluate(node=>node.open)){
    row.phase='fifth-montage-advanced-options';
    if(engine==='webkit')await advanced.locator(':scope > summary').tap();
    else await advanced.locator(':scope > summary').click();
  }
  const settings=advanced.locator('[data-video-stories-settings]');
  await settings.waitFor({state:'visible',timeout:20000});
  row.phase='fifth-montage-settings';
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
  // Visitor route: Goals → Ideas → Montage Style → Settings deep Concept → verified timeline.
  // Use the real visitor actions; do not bypass hydration, rights, or editor.
  const continueToIdeas=page.locator('[data-video-continue-scenarios]');
  await continueToIdeas.waitFor({state:'visible',timeout:40000});
  row.phase='goals-to-ideas-native-tap';
  if(engine==='webkit')await continueToIdeas.tap();
  else await continueToIdeas.click();
  const ideas=page.locator('[data-video-quick-control="phrases"]');
  assert.equal(await ideas.getAttribute('aria-pressed'),'true','GOALS_MUST_OPEN_IDEAS');
  const editorTab=page.locator('[data-video-quick-control="editor"]');
  row.phase='ideas-to-editor-native-tap';
  if(engine==='webkit')await editorTab.tap();
  else await editorTab.click();
  row.phase='editor-workspace-commit';
  await page.waitForFunction(()=>
    document.querySelector('[data-video-quick-control="editor"]')
      ?.getAttribute('aria-pressed')==='true',undefined,{timeout:15000});
  assert.equal(await page.locator('[data-video-montage-tab="effects"]').getAttribute('aria-pressed'),
    'true','MONTAGE_MUST_START_WITH_STYLE');
  const montageStyle=page.locator('[data-video-montage-tab="effects"]');
  await montageStyle.waitFor({state:'visible',timeout:20000});
  row.phase='montage-style-native-tap';
  if(engine==='webkit')await montageStyle.tap();
  else await montageStyle.click();
  row.phase='montage-style-commit';
  await page.waitForFunction(()=>{
    const studio=document.querySelector('[data-mandala-free-video]');
    const style=document.querySelector('[data-video-montage-tab="effects"]');
    const panel=document.querySelector('[data-video-basic-editor]');
    return studio?.getAttribute('data-active-workspace')==='editor' &&
      panel?.getAttribute('data-montage-panel')==='effects' &&
      style?.getAttribute('aria-pressed')==='true';
  },undefined,{timeout:15000});
  assert.equal(await editorTab.getAttribute('aria-pressed'),'true','MONTAGE_TAB_MUST_ACTIVATE');
  // Only a physical Next action advances the real Style → Audio stage.
  const styleNext=page.locator('[data-video-montage-effects] [data-video-montage-next="audio"]');
  await styleNext.waitFor({state:'visible',timeout:15000});
  row.phase='style-to-audio-native-tap';
  if(engine==='webkit')await styleNext.tap();
  else await styleNext.click();
  row.phase='style-to-audio-commit';
  await page.waitForFunction(()=>document.querySelector('[data-video-montage-tab="audio"]')
    ?.getAttribute('aria-pressed')==='true',undefined,{timeout:15000});
  assert.equal(await page.locator('[data-video-montage-tab="audio"]').getAttribute('aria-pressed'),
    'true','VISIBLE_STYLE_NEXT_MUST_OPEN_AUDIO');
  // Concept is reviewed in Ideas, not in the removed Montage Concept panel.
  row.phase='editor-to-ideas-native-tap';
  if(engine==='webkit')await page.locator('[data-video-quick-control="phrases"]').tap();
  else await page.locator('[data-video-quick-control="phrases"]').click();
  row.phase='ideas-concept-native-tap';
  if(engine==='webkit')await page.locator('[data-video-ideas-tab="concept"]').tap();
  else await page.locator('[data-video-ideas-tab="concept"]').click();
  const concept=page.locator('[data-video-ideas-concept-panel]');
  await concept.waitFor({state:'visible',timeout:15000});
  row.phase='concept-approve-native-tap';
  if(engine==='webkit')await concept.locator('[data-video-concept-approve]').tap();
  else await concept.locator('[data-video-concept-approve]').click();
  row.phase='ideas-to-editor-return-native-tap';
  if(engine==='webkit')await page.locator('[data-video-quick-control="editor"]').tap();
  else await page.locator('[data-video-quick-control="editor"]').click();
  await openMontageSettings(page);
  row.phase='editor-to-ideas-native-tap';
  if(engine==='webkit')await page.locator('[data-video-quick-control="phrases"]').tap();
  else await page.locator('[data-video-quick-control="phrases"]').click();
  row.phase='ideas-concept-native-tap';
  if(engine==='webkit')await page.locator('[data-video-ideas-tab="concept"]').tap();
  else await page.locator('[data-video-ideas-tab="concept"]').click();
  assert.equal(await page.locator('[data-video-concept-auto]').getAttribute('data-concept-approved'),
    'true','GUEST_APPROVAL_MUST_SURVIVE_TAB_NAVIGATION');
  row.phase='ideas-to-editor-return-native-tap';
  if(engine==='webkit')await page.locator('[data-video-quick-control="editor"]').tap();
  else await page.locator('[data-video-quick-control="editor"]').click();
  await openMontageSettings(page);
  const textTools=page.locator('[data-video-concept-text-tools]');
  await textTools.locator(':scope > summary').click();
  await textTools.evaluate(node=>{if(!node.open)throw Error('CONCEPT_TEXT_TOOLS_DID_NOT_OPEN')});
  const addVideo=page.locator('[data-video-timeline-add-video]');
  await addVideo.waitFor({state:'visible',timeout:20000});
  row.phase='add-source-native-tap';
  if(engine==='webkit')await addVideo.tap();
  else await addVideo.click();
  row.phase='source-editor-open-commit';
  await page.waitForFunction(()=>
    document.querySelector('[data-mandala-free-video]')?.getAttribute('data-video-scenario-open')==='true',
    undefined,{timeout:15000});
  await page.waitForFunction(() =>
    document.querySelector('[data-mandala-free-video]')?.getAttribute('data-video-advanced-open')==='true',
    undefined,{timeout:15000});
  row.phase='source-advanced-section-visibility';
  const advanced=page.locator('[data-video-first-video-advanced]');
  await advanced.waitFor({state:'visible',timeout:40000});
  if(await advanced.getAttribute('open')===null)
    await advanced.locator(':scope > summary').click();
  assert.equal(await advanced.count(),1,'FIRST_VIDEO_ADVANCED_SECTION_MISSING');
  const first = page.locator('[data-first-free-video][data-first-video-hydrated="true"]');
  await first.waitFor({state: 'visible', timeout: 40000});
  await first.locator('[data-first-video-wish]').fill('Тихое утро на солнечном лугу');
  const prompt = first.locator('[data-first-video-prompt]');
  await page.waitForFunction(() =>
    (document.querySelector('[data-first-video-prompt]')?.value?.length || 0) > 60,
    undefined, {timeout: 25000});
  assert.ok((await prompt.inputValue()).length > 60, 'PROMPT_NOT_PERSONALIZED');
  // Validate the REAL visible mobile aspect action. Safari can restore an
  // already-open <details>; blindly clicking summary then hid its select.
  const portrait=first.locator('[data-first-video-quick-aspect="portrait"]');
  row.quickPortraitButtonCount=await portrait.count();
  assert.equal(row.quickPortraitButtonCount,1,'MOBILE_ASPECT_CONTROL_MISSING');
  row.phase='portrait-real-click';
  // WebKit's actual iPhone gesture is touch, as for the visible Style step.
  // Do not replace the user's tap with a forced click or synthetic state.
  if(engine==='webkit')await portrait.tap();
  else await portrait.click();
  row.phase='portrait-selection-confirmation';
  // Verify React committed the selection on the actual visible, hydrated
  // first-video widget, not another hidden or detached mobile host.
  try {
    await page.waitForFunction(()=>[...document.querySelectorAll(
      '[data-first-free-video][data-first-video-hydrated="true"]'
    )].some(root=>root.getClientRects().length>0&&
      root.querySelector('[data-first-video-quick-aspect="portrait"]')
        ?.getAttribute('aria-pressed')==='true'),undefined,{timeout:15000});
  } catch {
    // Structural-only diagnostic: no prompts, audio, scene names, URLs or PII.
    const state=await page.evaluate(()=>{
      const roots=[...document.querySelectorAll('[data-first-free-video]')];
      return {
        workspace:document.querySelector('[data-mandala-free-video]')?.getAttribute('data-active-workspace')||null,
        advancedOpen:Boolean(document.querySelector('[data-video-first-video-advanced]')?.open),
        roots:roots.map(root=>({
          hydrated:root.getAttribute('data-first-video-hydrated')==='true',
          visible:root.getClientRects().length>0,
          portraitPressed:root.querySelector('[data-first-video-quick-aspect="portrait"]')?.getAttribute('aria-pressed')||null,
          selectedAspect:root.querySelector('[data-first-video-aspect]')?.value||null
        }))
      };
    }).catch(()=>({status:'DOM_DIAGNOSTIC_UNAVAILABLE'}));
    row.portraitSelectionState=state;
    console.error('LIVE_VIDEO_PORTRAIT_SELECTION_STATE',JSON.stringify(state));
    throw Error('LIVE_VIDEO_PORTRAIT_SELECTION_NOT_REFLECTED');
  }
  // Advanced settings remain genuine native select interactions. Open the
  // disclosure only if closed; never force-select a hidden/disabled field.
  const filters=first.locator('[data-first-video-filters]');
  const openFilters=async()=>{
    row.phase='native-filters-opening';
    await filters.waitFor({state:'visible',timeout:15000});
    if(!await filters.evaluate(element=>element instanceof HTMLDetailsElement&&element.open))
      await filters.locator(':scope > summary').click();
    const fieldset=filters.locator('fieldset');
    await fieldset.waitFor({state:'visible',timeout:15000});
    assert.equal(await fieldset.isEnabled(),true,'LIVE_VIDEO_FILTERS_DISABLED');
    assert.equal(await filters.evaluate(element=>element.open),true,
      'LIVE_VIDEO_FILTERS_NOT_OPEN');
    row.phase='native-filters-ready';
  };
  await openFilters();
  assert.equal(await first.locator('[data-first-video-aspect]').inputValue(),
    'portrait','PORTRAIT_NOT_SELECTED');
  await first.locator('[data-first-video-duration]').selectOption('20');
  await openFilters();
  await first.locator('[data-first-video-music]').selectOption('meditation');
  assert.equal(await first.locator('[data-first-video-music]').inputValue(),
    'meditation','MEDITATION_MUSIC_NOT_SELECTED');
  assert.equal(await first.locator('[data-first-video-ai-consent]').isChecked(), false,
    'SYNTHETIC_LIVE_SMOKE_SHOULD_NOT_SEND_AI');
  let licensedSources=[];
  if(requireLicensed){
    const catalogue=JSON.parse(readFileSync('data/video-catalog/scene-taxonomy.json','utf8'));
    const verifiedSources=new Map(catalogue.scenes.filter(s=>s.status==='approved'&&
      s.media==='licensed_mp4'&&s.rightsReference).map(s=>[s.id,s.video]));
    await page.waitForFunction(()=>{
      const videos=[...document.querySelectorAll('[data-free-film-source]')];
      return videos.length===4&&videos.every(v=>v.readyState>=2&&v.videoWidth>0);
    },undefined,{timeout:90000});
    licensedSources=await page.locator('[data-free-film-source]').evaluateAll(videos=>
      videos.map(video=>({id:video.dataset.freeFilmSource,src:video.getAttribute('src')})));
    assert.equal(new Set(licensedSources.map(item=>item.id)).size,4,'FOUR_DISTINCT_SOURCES_REQUIRED');
    for(const item of licensedSources){
      assert.match(item.src||'',/^\/videos\/holistic-house\/[a-z0-9_/-]+\.mp4$/,'SOURCE_NOT_FIRST_PARTY');
      assert.equal(item.src,verifiedSources.get(item.id), 'SOURCE_NOT_APPROVED_IN_CATALOGUE_'+item.id);
    }
  }
  const create = first.locator('[data-first-video-generate]');
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-first-video-generate]');
    return Boolean(button && !button.disabled);
  }, undefined, {timeout: 40000});
  await create.click({timeout: 15000});
  // First Video only navigates; the distinct Ready gesture starts real
  // rendering after React has committed the chosen format and four sources.
  row.phase='first-video-navigation-ready';
  await page.waitForFunction(()=>
    document.querySelector('[data-mandala-free-video]')
      ?.getAttribute('data-active-workspace')==='ready',
    undefined,{timeout:15000});
  const ready=page.locator('[data-video-ready]');
  await ready.waitFor({state:'visible',timeout:15000});
  assert.equal(await ready.getAttribute('data-ready-state'),'choose',
    'FIRST_VIDEO_NAVIGATION_MUST_NOT_BE_AN_EXPORT');
  const readyGenerate=ready.locator('[data-ready-generate]');
  await readyGenerate.waitFor({state:'visible',timeout:15000});
  assert.equal(await readyGenerate.isEnabled(),true,'READY_RENDER_MUST_BE_AVAILABLE');
  row.phase='first-video-ready-generate';
  if(engine==='webkit')await readyGenerate.tap();
  else await readyGenerate.click();
  // Guests watch the original encoded movie in Ready; protected Save is login-gated.
  // Read the real test-owned Blob without fake sign-in, download or provider calls.
  const captured=await readRealGuestVideo(page,{timeout:80000});
  const bytes=captured.bytes;
  row.anonymousSaveAuthGateVerified=captured.authGateVerified;
  row.recordedBlobVerified=true;row.downloadedVideo=false;
  assert.ok(bytes.length > 20000, 'VIDEO_EXPORT_EMPTY');
  const filename = 'holistic-house-guest.'+captured.extension;
  assert.match(filename, /\.(mp4|webm)$/, 'INCORRECT_VIDEO_FILENAME');
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
  assert.equal(video.width, 720, 'WRONG_PORTRAIT_WIDTH');
  assert.equal(video.height, 1280, 'WRONG_PORTRAIT_HEIGHT');
  const seconds = Number(probe.format?.duration || video.duration || 0);
  assert.ok(seconds >= 17 && seconds <= 26, 'WRONG_VIDEO_DURATION');
  const energy = rmsPcm(mediaFile);
  Object.assign(row, {recordedBlobVerified: true, encodedBytes: bytes.length,
    container: filename.endsWith('.webm') ? 'webm' : 'mp4',
    width: video.width, height: video.height, durationSeconds: Number(seconds.toFixed(2)),
    audioStreamPresent: true, decodedAudioRms: Number(energy.toFixed(4))});
  assert.ok(energy > 0.003, 'SOUNDTRACK_IS_SILENT');
  // A single pair can coincide with the same repeated shot in a short loop.
  // Sample several separate seconds to distinguish a real moving video from
  // a static or frozen Canvas recording without uploading any frame images.
  const times = [1, 3, 6, 10, 14, 18];
  const frames = times.map(t => movingPixels(mediaFile, t));
  for (const [index, frame] of frames.entries()) {
    assert.equal(frame.length, 96 * 54 * 3, 'FRAME_UNDECODABLE_' + times[index]);
  }
  const differences = frames.slice(1).map(frame => {
    let delta = 0;
    const first = frames[0];
    for (let i = 0; i < frame.length; i++) delta += Math.abs(frame[i] - first[i]);
    return Number((delta / frame.length).toFixed(3));
  });
  const avgPixelDifference = Math.max(...differences);
  row.motionSampleSeconds = times;
  row.motionAverageDeltas = differences;
  row.pixelDifference = avgPixelDifference;
  assert.ok(avgPixelDifference > 0.35, 'EXPORTED_FRAMES_NOT_MOVING');
  if(requireLicensed){
    const root=resolve('public');
    const references=licensedSources.map(item=>{
      const path=resolve(root,'.'+item.src);
      assert.ok(path.startsWith(root+'/'),'SOURCE_PATH_INVALID');
      return [0.5,1,2,2.5,3,4].map(t=>portraitPixels(path,t));
    });
    const matrix=licensedSources.map((_,index)=>{
      const frame=portraitPixels(mediaFile,index*5+2.5);
      return references.map(samples=>Math.max(...samples.map(sample=>correlation(frame,sample))));
    });
    for(let i=0;i<4;i++){
      assert.ok(matrix[i][i]>.6,'LICENSED_SCENE_NOT_VISIBLE_'+i);
      assert.ok(matrix[i].every((score,j)=>j===i||matrix[i][i]>score+.08),'LICENSED_SCENE_ORDER_MISMATCH_'+i);
    }
    const motion=licensedSources.map((_,index)=>{
      const a=portraitPixels(mediaFile,index*5+1),b=portraitPixels(mediaFile,index*5+3);
      let difference=0;
      for(let i=0;i<a.length;i++)difference+=Math.abs(a[i]-b[i]);
      return difference/a.length;
    });
    assert.ok(motion.every(value=>value>.3),'LICENSED_SHOT_NOT_MOVING');
    const black=spawnSync('ffmpeg',['-hide_banner','-i',mediaFile,'-vf',
      'blackdetect=d=0.15:pix_th=0.05','-an','-f','null','-'],{timeout:30000,maxBuffer:1024*1024});
    assert.equal(black.status,0,'BLACK_GAP_INSPECTION_FAILED');
    assert.doesNotMatch(String(black.stderr),/black_start:/,'BLACK_GAP_IN_EXPORT');
    row.licensedSourceIds=licensedSources.map(item=>item.id);
    row.licensedFrameCorrelations=matrix.map((scores,index)=>Number(scores[index].toFixed(3)));
    row.motionPerLicensedShot=motion.map(value=>Number(value.toFixed(3)));
    row.blackGaps=false;
  }
  assert.equal(requireLicensed ? licensedSources.length : 4, 4,
    'FOUR_LICENSED_SHOTS_VERIFICATION_NOT_COMPLETED');
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
