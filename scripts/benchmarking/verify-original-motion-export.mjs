import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {installGuestVideoBlobCapture,readRealGuestVideo} from './real-guest-video-file.mjs';

// Local, anonymous acceptance: exercise actual UI and inspect the real test-owned movie Blob.
const origin = 'http://127.0.0.1:3100';
const engine = process.env.HH_ORIGINAL_MOTION_ENGINE || 'chromium';
assert.ok(['chromium', 'webkit'].includes(engine));
const { [engine]: browserType } = await import(pathToFileURL(process.env.HH_LIVE_VIDEO_PLAYWRIGHT).href);
const ids = [1, 2, 3, 4].map(i => `motion-goals-money-goal-achievement-v${i}`);
const dir = await mkdtemp(path.join(os.tmpdir(), 'hh-original-motion-'));
let movie = path.join(dir, 'export.mp4');
const browser = await browserType.launch({ headless: engine !== 'webkit' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true, serviceWorkers: 'block' });
await installGuestVideoBlobCapture(context);
await context.route('**/*', route => {
  const request = route.request();
  return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method()) ? route.continue() : route.abort();
});
const page = await context.newPage();
const errors = [], safeWarnings = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  const text=message.text();
  if (/^HH_WEBKIT_MP4_EXPORT_FAILURE:[a-z_]+$/.test(text)) safeWarnings.push(text);
});
try {
  await page.goto(`${origin}/ru/holistic-support/mandala`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-video-studio-hydrated="true"]').waitFor({ timeout: 60000 });
  // Select real source footage through the visitor-visible three-stage route.
  await page.locator('[data-video-continue-scenarios]').click();
  assert.equal(await page.locator('[data-video-quick-control="phrases"]').getAttribute('aria-pressed'),
    'true','GOALS_MUST_OPEN_IDEAS');
  const editor=page.locator('[data-video-quick-control="editor"]');
  await editor.click();
  // Use the same actual Montage entry flow proven by the physical voice test.
  // The compact Settings control appears only after activating the visible
  // Style stage; a hidden Settings click must never be force-clicked.
  await page.waitForFunction(()=>
    document.querySelector('[data-video-quick-control="editor"]')
      ?.getAttribute('aria-pressed')==='true',undefined,{timeout:15000});
  await page.locator('[data-video-montage-tab="effects"]').waitFor({state:'visible',timeout:20000});
  // Style is the first visible Montage tab; source selection is an actual tap.
  await page.locator('[data-video-montage-tab="effects"]').click();
  const selectedStyle=page.locator('[data-video-montage-style="3"]');
  await selectedStyle.waitFor({state:'visible',timeout:20000});
  if(engine==='webkit')await selectedStyle.tap();
  else await selectedStyle.click();
  await page.waitForFunction(()=>
    document.querySelector('[data-video-montage-style="3"]')
      ?.getAttribute('aria-pressed')==='true',undefined,{timeout:15000});
  await page.locator('[data-video-montage-tab="concept"]').click();
  const settings=page.locator('[data-video-story-open-settings]');
  await settings.waitFor({state:'visible',timeout:20000});
  await settings.click();
  const sourceFormat=page.locator('[data-video-montage-preference="format"]');
  await sourceFormat.waitFor({state:'visible',timeout:20000});
  await sourceFormat.selectOption('portrait');
  assert.equal(await sourceFormat.inputValue(),'portrait',
    'original-motion source must not masquerade as landscape footage');
  const sourceDuration=page.locator('[data-video-montage-preference="duration"]');
  await sourceDuration.waitFor({state:'visible',timeout:20000});
  await sourceDuration.selectOption('20');
  assert.equal(await sourceDuration.inputValue(),'20',
    'four real source-backed 5-second scenes require 20s before selecting a preset');
  // Style's native Next opens Text. The existing verified source timeline is
  // reachable through Settings → advanced Concept, not a fifth visible tab.
  const styleTab=page.locator('[data-video-montage-tab="effects"]');
  await styleTab.waitFor({state:'visible',timeout:20000});
  await styleTab.click();
  const styleNext=page.locator('[data-video-montage-effects] [data-video-montage-next="text"]');
  await styleNext.waitFor({state:'visible',timeout:20000});
  await styleNext.click();
  await page.waitForFunction(()=>document.querySelector('[data-video-montage-tab="text"]')
    ?.getAttribute('aria-pressed')==='true',undefined,{timeout:15000});
  assert.equal(await page.locator('[data-video-montage-tab="text"]').getAttribute('aria-pressed'),
    'true','VISIBLE_STYLE_NEXT_MUST_OPEN_TEXT');
  await page.locator('[data-video-quick-control="phrases"]').click();
  await page.locator('[data-video-ideas-tab="concept"]').click();
  const conceptPanel=page.locator('[data-video-ideas-concept-panel]');
  await conceptPanel.waitFor({state:'visible',timeout:15000});
  await conceptPanel.locator('[data-video-concept-approve]').click();
  await page.locator('[data-video-quick-control="editor"]').click();
  const settingsTab=page.locator('[data-video-story-open-settings]');
  await page.locator('[data-video-montage-tab="concept"]').click();
  await settingsTab.click();
  await page.locator('[data-video-quick-control="phrases"]').click();
  await page.locator('[data-video-ideas-tab="concept"]').click();
  assert.equal(await page.locator('[data-video-concept-auto]').getAttribute('data-concept-approved'),
    'true','APPROVED_CONCEPT_MUST_PERSIST');
  await page.locator('[data-video-quick-control="editor"]').click();
  await page.locator('[data-video-montage-tab="concept"]').click();
  await settingsTab.click();
  const textTools=page.locator('[data-video-concept-text-tools]');
  await textTools.locator(':scope > summary').click();
  assert.equal(await textTools.getAttribute('open'),'','TIMELINE_DISCLOSURE_MUST_OPEN');
  const addVideo=page.locator('[data-video-timeline-add-video]');
  await addVideo.waitFor({state:'visible',timeout:20000});
  await addVideo.click();
  await page.locator('[data-free-film-compilation-catalog]').waitFor({state:'visible'});
  const preset = page.locator('[data-free-film-preset="motion-film-goal-achievement"]');
  const more = page.locator('[data-free-film-more]');
  if (await more.getAttribute('aria-expanded') !== 'true') await more.click();
  await preset.click();
  // React can commit the selected original-motion plan after Playwright's
  // pointer action resolves. Wait for the actual selection, not a fixed delay;
  // fail closed with diagnostic evidence if the real application never commits.
  try {
    await page.waitForFunction(() =>
      document.querySelector('[data-free-film-preset="motion-film-goal-achievement"]')
        ?.getAttribute('aria-pressed') === 'true',
      undefined, { timeout: 8000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      pressed: document.querySelector('[data-free-film-preset="motion-film-goal-achievement"]')
        ?.getAttribute('aria-pressed') ?? null,
      selected: [...document.querySelectorAll('[data-free-film-preset][aria-pressed="true"]')]
        .map(node => node.getAttribute('data-free-film-preset')),
      sourceIds: [...document.querySelectorAll('[data-free-film-source]')]
        .map(node => node.getAttribute('data-free-film-source')),
      readiness: document.querySelector('[data-free-film-readiness]')?.textContent?.slice(0, 180) ?? null,
    }));
    console.error('HH_ORIGINAL_MOTION_PRESET_SELECTION_DIAGNOSTICS '+JSON.stringify({engine,state,errors}));
    throw error;
  }
  assert.equal(await preset.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.locator('[data-free-film-source]').evaluateAll(nodes => nodes.map(node => node.dataset.freeFilmSource)), ids);
  await page.locator('[data-video-quick-control="editor"]').click();
  // Match the real post-#3676 Montage. Format/duration are available through Story → Video settings.
  await page.locator('[data-video-montage-tab="concept"]').click();
  await settingsTab.waitFor({state:'visible'});
  await settingsTab.click();
  assert.equal(await page.locator('[data-video-basic-editor]').getAttribute('data-montage-panel'),'settings');
  const duration=page.locator('[data-video-montage-preference="duration"]');
  await duration.waitFor({state:'visible'});
  await duration.selectOption('20');
  assert.equal(await duration.inputValue(),'20');
  await page.locator('[data-video-montage-tab="concept"]').click();
  await settingsTab.click();
  const audioTab=page.locator('[data-video-montage-open-audio]');
  await audioTab.click();
  await page.locator('[data-video-montage-audio]').waitFor({state:'visible'});
  await page.locator('[data-video-montage-audio]').waitFor({state:'visible'});
  const generate = page.locator('[data-video-quick-generate]');
  await generate.click({ timeout: 30000 });
  // The compact Audio attach control is the real, visible user action.
  // Some pre-approved music is already attached; in that case export
  // continues without an unnecessary second click or duplicate track.
  const attach=page.locator('[data-video-audio-compact-attach]');
  await attach.waitFor({state:'visible',timeout:15000});
  if(await attach.isEnabled()){
    await attach.click();
    await generate.click();
  }
  // The actual verified film moves to Ready; guests cannot use direct Save.
  // Reuse the first-party encoded Blob and prove the login gate instead.
  let captured;
  try{
    captured=await readRealGuestVideo(page,{timeout: 150000});
  }catch(error){
    // Preserve fail-closed, bounded browser diagnostics after the migration
    // from obsolete guest Files download to the real Ready-native Blob.
    // Never log personal text, media, URLs, auth tokens, or uploaded files.
    const state=await page.evaluate(()=>{
      const result=document.querySelector('[data-video-result]');
      const ready=document.querySelector('[data-video-ready]');
      const original=document.querySelector('[data-mandala-video-preview]');
      const clips=[...document.querySelectorAll('[data-free-film-source]')];
      return {
        resultMode:result?.getAttribute('data-video-result-mode')??null,
        hasReady:Boolean(ready),readyView:ready?.getAttribute('data-ready-view')??null,
        renderedVideo:original instanceof HTMLVideoElement?{
          readyState:original.readyState,width:original.videoWidth,
          height:original.videoHeight,errorCode:original.error?.code??null,
          blobUrl:Boolean(original.currentSrc?.startsWith('blob:')),
        }:null,
        sourceCount:clips.length,
        sourcesDecoded:clips.filter(v=>v.readyState>=2&&v.videoWidth>0&&!v.error).length,
        legacyDownloadVisible:Boolean(document.querySelector('[data-mandala-video-download]')?.getClientRects().length),
      };
    }).catch(()=>({diagnosticUnavailable:true}));
    console.error('HH_ORIGINAL_MOTION_EXPORT_DIAGNOSTICS '+JSON.stringify({
      engine,state,safeWarnings:safeWarnings.slice(-5),
      reason:String(error?.message||error).slice(0,140),
    }));
    throw error;
  }
  movie=path.join(dir,'export.'+captured.extension);
  await writeFile(movie,captured.bytes);
  assert.ok((await stat(movie)).size > 100000);
  assert.deepEqual(errors, []);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', movie], { encoding: 'utf8' }));
  const video = probe.streams.find(s => s.codec_type === 'video');
  assert.ok(video && video.width === 720 && video.height === 1280);
  assert.ok(probe.streams.some(s => s.codec_type === 'audio'));
  assert.ok(Number(probe.format.duration) >= 18 && Number(probe.format.duration) <= 23);
  const frame = (file, time) => execFileSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', 'scale=36:64:force_original_aspect_ratio=increase,crop=36:64', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 100000 });
  const corr = (a, b) => {
    assert.equal(a.length, 36 * 64 * 3); assert.equal(b.length, a.length);
    let sa = 0, sb = 0, aa = 0, bb = 0, ab = 0;
    for (let i = 0; i < a.length; i++) { sa += a[i]; sb += b[i]; aa += a[i] ** 2; bb += b[i] ** 2; ab += a[i] * b[i]; }
    return (ab - sa * sb / a.length) / Math.sqrt((aa - sa ** 2 / a.length) * (bb - sb ** 2 / a.length));
  };
  const references = ids.map(id => [0.5, 1, 2, 2.5, 3, 4].map(t => frame(path.join('public/videos/holistic-house/original-motion-v1', `${id}.mp4`), t)));
  const matches = ids.map((id, i) => {
    const rendered = frame(movie, 2.5 + 5 * i);
    const scores = references.map(frames => Math.max(...frames.map(ref => corr(rendered, ref))));
    assert.ok(scores[i] > 0.6, `${id} missing from exported scene: ${scores}`);
    assert.ok(scores[i] - Math.max(...scores.filter((_, j) => j !== i)) > 0.02, `${id} does not match its intended scene: ${scores}`);
    return scores[i];
  });
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', movie, '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1000000 });
  let power = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) power += (pcm.readInt16LE(i) / 32768) ** 2;
  assert.ok(Math.sqrt(power / (pcm.length / 2)) > 0.003, 'exported audio is silent');
  console.log(JSON.stringify({ engine, duration: Number(probe.format.duration), bytes: (await stat(movie)).size, sceneCorrelations: matches }));
} finally {
  await browser.close();
  await rm(dir, { recursive: true, force: true });
}
