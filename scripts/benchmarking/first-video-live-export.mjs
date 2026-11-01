#!/usr/bin/env node
/**
 * On-demand, unauthenticated first-party LIVE video export acceptance.
 * Real browser → actual Canvas/MediaRecorder or Safari WebCodecs → download → ffprobe,
 * decoded audio and moving pixels. Never uses personal media, an AI API or POST.
 * Chromium is the default; opt-in macOS WebKit runs in CI. Neither is a physical iPhone.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {tmpdir} from 'node:os';

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
async function downloadBytes(download) {
  const chunks = [];
  for await (const c of await download.createReadStream()) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}
let browser;
let mediaDir;
try {
  browser=engine==='webkit'
    ?await webkit.launch({headless:!headed})
    :await chromium.launch({headless:true,channel:'chrome'});
  const context = await browser.newContext({
    viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true,
    locale: 'ru-RU', serviceWorkers: 'block', reducedMotion: 'reduce',
    storageState: {cookies: [], origins: []}, acceptDownloads: true,
  });
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
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.name));
  const response = await page.goto(ORIGIN + '/ru/holistic-support/mandala', {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  assert.equal(response?.status(), 200, 'LIVE_MANDALA_NOT_200');
  const first = page.locator('[data-first-free-video][data-first-video-hydrated="true"]');
  await first.waitFor({state: 'visible', timeout: 40000});
  await first.locator('[data-first-video-wish]').fill('Тихое утро на солнечном лугу');
  const prompt = first.locator('[data-first-video-prompt]');
  await page.waitForFunction(() =>
    (document.querySelector('[data-first-video-prompt]')?.value?.length || 0) > 60,
    undefined, {timeout: 25000});
  assert.ok((await prompt.inputValue()).length > 60, 'PROMPT_NOT_PERSONALIZED');
  // Separate the quick-format UI from the actual media export. A broken or
  // occluded quick button must not prevent probing the real rendering path.
  row.quickPortraitButtonCount = await first.locator('[data-first-video-quick-aspect="portrait"]').count();
  await first.locator('[data-first-video-filters] > summary').click();
  await first.locator('[data-first-video-aspect]').selectOption('portrait');
  assert.equal(await first.locator('[data-first-video-aspect]').inputValue(),
    'portrait', 'PORTRAIT_NOT_SELECTED');
  await first.locator('[data-first-video-duration]').selectOption('20');
  await first.locator('[data-first-video-music]').selectOption('meditation');
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
  const save = page.locator('[data-mandala-video-download]');
  await save.waitFor({state: 'visible', timeout: 80000});
  assert.equal(await page.locator('[data-video-result]').getAttribute('data-video-result-mode'),
    'rendered', 'CATALOG_CLIP_IS_NOT_PERSONALIZED_OUTPUT');
  const [download] = await Promise.all([
    page.waitForEvent('download', {timeout: 25000}), save.click(),
  ]);
  const bytes = await downloadBytes(download);
  assert.ok(bytes.length > 20000, 'VIDEO_EXPORT_EMPTY');
  const filename = download.suggestedFilename();
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
  Object.assign(row, {downloadedVideo: true, encodedBytes: bytes.length,
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
  row.status = 'PASS';
  console.log(source===LIVE_ORIGIN?'LIVE_FIRST_VIDEO_REAL_EXPORT_PASS':'LOCAL_FIRST_VIDEO_REAL_EXPORT_PASS', JSON.stringify(row));
  await context.close();
} catch (error) {
  row.failure = String(error?.message || error).slice(0, 200);
  console.error(source===LIVE_ORIGIN?'LIVE_FIRST_VIDEO_REAL_EXPORT_FAIL':'LOCAL_FIRST_VIDEO_REAL_EXPORT_FAIL', row.failure);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (mediaDir) rmSync(mediaDir, {recursive: true, force: true});
  mkdirSync('artifacts/benchmarking', {recursive: true});
  writeFileSync(resolve(ARTIFACT), JSON.stringify(row, null, 2) + '\n');
}
