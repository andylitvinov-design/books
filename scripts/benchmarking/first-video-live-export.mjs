#!/usr/bin/env node
/**
 * On-demand, unauthenticated first-party LIVE video export acceptance.
 * Real browser → real Canvas/MediaRecorder → real downloaded bytes → ffprobe,
 * decoded audio and moving pixels. Never uses personal media, an AI API or POST.
 * This is desktop Chromium at a mobile viewport, NOT physical iPhone Safari.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const ORIGIN = 'https://holistichouse.vercel.app';
const ARTIFACT = 'artifacts/benchmarking/first-video-live-export.json';
const driver = process.env.HH_LIVE_VIDEO_PLAYWRIGHT;
const source = process.env.HH_LIVE_VIDEO_SOURCE || ORIGIN;
if (!driver || !driver.startsWith('/') || source !== ORIGIN) {
  throw new Error('LIVE_VIDEO_SMOKE_CONFIG_UNSAFE');
}
const {chromium} = await import(driver);
const row = {target: ORIGIN, engine: 'chromium', viewport: '390x844',
  origin: 'anonymous-public', method: 'local-canvas-export',
  paidVideoProviderUsed: false, aiPromptRequested: false,
  physicalIPhoneVerified: false, status: 'FAIL', blockedRequests: 0};

function mediaTool(exe, args, input, maxBuffer = 1024 * 1024) {
  const done = spawnSync(exe, args, {input, timeout: 30000, maxBuffer});
  if (done.error || done.status !== 0) {
    throw new Error(`LIVE_VIDEO_${exe.toUpperCase()}_FAILED:${done.status ?? done.error?.code}`);
  }
  return done.stdout;
}
function movingPixels(blob, at) {
  return mediaTool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
    '-ss', String(at), '-frames:v', '1', '-vf', 'scale=96:54,format=rgb24',
    '-f', 'rawvideo', 'pipe:1'], blob, 200 * 1024);
}
function rmsPcm(blob) {
  const pcm = mediaTool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
    '-map', '0:a:0', '-t', '2', '-ar', '8000', '-ac', '1', '-f', 's16le', 'pipe:1'], blob,
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
try {
  browser = await chromium.launch({headless: true});
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
  // Attach a first-party music track and request a real portrait export.
  await first.locator('[data-first-video-quick-aspect="portrait"]').click();
  assert.equal(await first.locator('[data-first-video-quick-aspect="portrait"]')
    .getAttribute('aria-pressed'), 'true', 'PORTRAIT_NOT_SELECTED');
  await first.locator('[data-first-video-filters] > summary').click();
  await first.locator('[data-first-video-duration]').selectOption('20');
  await first.locator('[data-first-video-music]').selectOption('meditation');
  assert.equal(await first.locator('[data-first-video-ai-consent]').isChecked(), false,
    'SYNTHETIC_LIVE_SMOKE_SHOULD_NOT_SEND_AI');
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
  const probe = JSON.parse(mediaTool('ffprobe', ['-v', 'error', '-show_streams',
    '-show_format', '-of', 'json', 'pipe:0'], bytes).toString());
  const video = probe.streams.find(s => s.codec_type === 'video');
  const audio = probe.streams.find(s => s.codec_type === 'audio');
  assert.ok(video, 'ENCODED_VIDEO_STREAM_MISSING');
  assert.ok(audio, 'SELECTED_SOUNDTRACK_MISSING_FROM_EXPORT');
  assert.equal(video.width, 720, 'WRONG_PORTRAIT_WIDTH');
  assert.equal(video.height, 1280, 'WRONG_PORTRAIT_HEIGHT');
  const seconds = Number(probe.format?.duration || video.duration || 0);
  assert.ok(seconds >= 17 && seconds <= 26, 'WRONG_VIDEO_DURATION');
  const energy = rmsPcm(bytes);
  assert.ok(energy > 0.003, 'SOUNDTRACK_IS_SILENT');
  const a = movingPixels(bytes, 1);
  const b = movingPixels(bytes, 11);
  assert.equal(a.length, 96 * 54 * 3, 'FRAME_A_UNDECODABLE');
  assert.equal(b.length, a.length, 'FRAME_B_UNDECODABLE');
  let delta = 0;
  for (let i = 0; i < a.length; i++) delta += Math.abs(a[i] - b[i]);
  const avgPixelDifference = delta / a.length;
  assert.ok(avgPixelDifference > 0.35, 'EXPORTED_FRAMES_NOT_MOVING');
  assert.deepEqual(errors, [], 'BROWSER_JAVASCRIPT_EXCEPTION');
  Object.assign(row, {status: 'PASS', downloadedVideo: true, encodedBytes: bytes.length,
    container: filename.endsWith('.webm') ? 'webm' : 'mp4',
    width: video.width, height: video.height, durationSeconds: Number(seconds.toFixed(2)),
    audioStreamPresent: true, decodedAudioRms: Number(energy.toFixed(4)),
    pixelDifference: Number(avgPixelDifference.toFixed(2))});
  console.log('LIVE_FIRST_VIDEO_REAL_EXPORT_PASS', JSON.stringify(row));
  await context.close();
} catch (error) {
  row.failure = String(error?.message || error).slice(0, 200);
  console.error('LIVE_FIRST_VIDEO_REAL_EXPORT_FAIL', row.failure);
  process.exitCode = 1;
} finally {
  await browser?.close();
  mkdirSync('artifacts/benchmarking', {recursive: true});
  writeFileSync(resolve(ARTIFACT), JSON.stringify(row, null, 2) + '\n');
}