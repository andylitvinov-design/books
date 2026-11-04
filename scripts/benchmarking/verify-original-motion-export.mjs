import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Local, anonymous acceptance: exercise the actual UI and inspect its downloaded movie.
const origin = 'http://127.0.0.1:3100';
const engine = process.env.HH_ORIGINAL_MOTION_ENGINE || 'chromium';
assert.ok(['chromium', 'webkit'].includes(engine));
const { [engine]: browserType } = await import(pathToFileURL(process.env.HH_LIVE_VIDEO_PLAYWRIGHT).href);
const ids = [1, 2, 3, 4].map(i => `motion-goals-money-goal-achievement-v${i}`);
const dir = await mkdtemp(path.join(os.tmpdir(), 'hh-original-motion-'));
const movie = path.join(dir, 'export.mp4');
const browser = await browserType.launch({ headless: engine !== 'webkit' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true, serviceWorkers: 'block' });
await context.route('**/*', route => {
  const request = route.request();
  return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method()) ? route.continue() : route.abort();
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${origin}/ru/holistic-support/mandala`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-video-studio-hydrated="true"]').waitFor({ timeout: 60000 });
  await page.locator('[data-auto-video-all-scenes]').click();
  await page.locator('[data-free-film-compilation-catalog]').waitFor({ state: 'visible' });
  const preset = page.locator('[data-free-film-preset="motion-film-goal-achievement"]');
  const allFilms=page.locator('[data-free-film-more]');
  // A temporarily hidden preset does not imply the catalog is collapsed.
  // Never toggle an already-expanded catalog closed.
  if(await allFilms.getAttribute('aria-expanded')!=='true')await allFilms.click();
  try { await preset.click({timeout:30000}); }
  catch(error) {
    const state={expanded:await allFilms.getAttribute('aria-expanded'),
      presetCount:await preset.count(),catalogCount:await page.locator('[data-free-film-preset]').count(),errors};
    throw new Error('ORIGINAL_MOTION_PRESET_UNAVAILABLE: '+JSON.stringify(state),{cause:error});
  }
  assert.equal(await preset.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await page.locator('[data-free-film-source]').evaluateAll(nodes => nodes.map(node => node.dataset.freeFilmSource)), ids);
  await page.locator('[data-video-quick-control="editor"]').click();
  const settings = page.locator('[data-video-montage-settings]');
  await settings.waitFor({ state: 'visible' });
  if (await settings.getAttribute('open') === null) await settings.locator(':scope > summary').click();
  await settings.locator('[data-video-basic-tab="music"]').click();
  const duration = settings.locator('[data-video-music-editor] [data-video-audio-length="20"]');
  await duration.click();
  assert.equal(await duration.getAttribute('aria-pressed'), 'true');
  const generate = page.locator('[data-video-quick-generate]');
  await generate.click({ timeout: 30000 });
  const attach = page.locator('[data-video-audio-attach]');
  await attach.waitFor({ state: 'visible', timeout: 15000 });
  await attach.click();
  await generate.click();
  const save = page.locator('[data-mandala-video-download]');
  await save.waitFor({ state: 'visible', timeout: 150000 });
  const download = page.waitForEvent('download', { timeout: 30000 });
  await save.click();
  await (await download).saveAs(movie);
  assert.ok((await stat(movie)).size > 100000);
  assert.deepEqual(errors, []);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', movie], { encoding: 'utf8' }));
  const video = probe.streams.find(s => s.codec_type === 'video');
  assert.ok(video && video.width === 1280 && video.height === 720);
  assert.ok(probe.streams.some(s => s.codec_type === 'audio'));
  assert.ok(Number(probe.format.duration) >= 18 && Number(probe.format.duration) <= 23);
  const frame = (file, time) => execFileSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', 'scale=64:36:force_original_aspect_ratio=increase,crop=64:36', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 100000 });
  const corr = (a, b) => {
    assert.equal(a.length, 64 * 36 * 3); assert.equal(b.length, a.length);
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
