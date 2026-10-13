import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit, expect } from '@playwright/test';

// Read-only public Tantra checks. No form submission, account data or live-site default.
const origin = process.env.TANTRA_ORIGIN || 'http://127.0.0.1:3123';
const target = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', 'holistichouse.vercel.app'].includes(target.hostname));
assert.ok(!target.username && !target.password && !target.search && !target.hash && target.pathname === '/');
const manifest = JSON.parse(await readFile(new URL('../data/academy/tantra-native-assets.json', import.meta.url), 'utf8'));
const sources = manifest.nativeVideos.map(asset => asset.url);
const posters = manifest.assets.filter(asset => asset.contentType === 'image/png').map(asset => new URL(asset.path, origin).href);
const result = { origin, assets: [], journeys: [] };

const youtubeUrl = 'https://www.youtube-nocookie.com/embed/qM_nFUkYJ1k?autoplay=1';
async function installYoutubeFixture(context) {
  await context.route(youtubeUrl, route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Alena renderer fixture</title><p id="player-fixture">Allowed YouTube renderer</p>',
  }));
}
async function startBothNative(disclosure) {
  for (let index = 0; index < 2; index++) {
    const video = disclosure.locator('video').nth(index);
    await video.evaluate(async el => { el.muted = true; await el.play(); });
    await expect.poll(() => video.evaluate(el => el.paused)).toBe(false);
    await expect.poll(() => video.evaluate(el => el.currentTime)).toBeGreaterThan(0.1);
  }
}
async function verifyRepeatedClose(page, cycles = 3) {
  const disclosure = page.locator('#tantra-russian-video-testimonials');
  if (!await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').click();
  const observations = [];
  for (let cycle = 0; cycle < cycles; cycle++) {
    await startBothNative(disclosure);
    if (await disclosure.locator('button.academy-video-poster').count()) {
      await disclosure.locator('button.academy-video-poster').click();
    }
    await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toBeVisible();
    const before = await disclosure.locator('video').evaluateAll(videos => videos.map(el => el.currentTime));
    await disclosure.locator('summary').focus();
    await page.keyboard.press(cycle % 2 === 0 ? 'Enter' : 'Space');
    await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(false);
    await expect.poll(() => disclosure.locator('video').evaluateAll(videos => videos.every(el => el.paused))).toBe(true);
    await expect(disclosure.locator('iframe')).toHaveCount(0);
    const paused = await disclosure.locator('video').evaluateAll(videos => videos.map(el => el.currentTime));
    paused.forEach((time, index) => assert.ok(time >= before[index], 'Close must preserve native position'));
    await page.waitForTimeout(350);
    const after = await disclosure.locator('video').evaluateAll(videos => videos.map(el => el.currentTime));
    after.forEach((time, index) => assert.ok(Math.abs(time - paused[index]) < 0.05, 'Closed player must stay paused'));
    await page.keyboard.press(cycle % 2 === 0 ? 'Enter' : 'Space');
    await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(true);
    await expect.poll(() => disclosure.locator('video').evaluateAll(videos => videos.every(el => el.paused))).toBe(true);
    await expect(disclosure.locator('iframe')).toHaveCount(0);
    await expect(disclosure.locator('button.academy-video-poster')).toBeVisible();
    observations.push({ cycle: cycle + 1, before, paused, after, youtubeFixtureOnly: true });
  }
  return observations;
}

async function verifyDelayedHydration(browser, engine, locale) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  let releaseScripts;
  const gate = new Promise(resolve => { releaseScripts = resolve; });
  let deferredScripts = 0;
  const observed = { engine, locale, kind: 'delayed-hydration-close', ok: false, youtubeFixtureOnly: true };
  result.journeys.push(observed);
  try {
    await installYoutubeFixture(context);
    await context.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async route => {
      if (new URL(route.request().url()).origin !== target.origin) return route.continue();
      deferredScripts++;
      await gate;
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + `/${locale}/academy/reiki/tantra-reiki`, { waitUntil: 'commit' });
    const disclosure = page.locator('#tantra-russian-video-testimonials');
    await expect(disclosure.locator('summary')).toBeVisible();
    await expect.poll(() => deferredScripts).toBeGreaterThan(0);
    // Native HTML controls operate while same-origin external Next.js bundles are held.
    if (!await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').click();
    await startBothNative(disclosure);
    observed.beforeHydration = await disclosure.locator('video').evaluateAll(videos => videos.map(el => ({ time: el.currentTime, paused: el.paused })));
    releaseScripts();
    await page.waitForLoadState('load');
    await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(true);
    // A real app click creating the iframe proves the client component hydrated.
    await disclosure.locator('button.academy-video-poster').click();
    await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toBeVisible();
    observed.cycles = await verifyRepeatedClose(page);
    observed.deferredScripts = deferredScripts;
    assert.deepEqual(errors, []);
    observed.ok = true;
  } catch (error) {
    observed.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    releaseScripts();
    await context.close();
  }
}

async function verifyLocaleSwitchWhilePlaying(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const observed = { engine, kind: 'actual-locale-switch-while-playing', ok: false, switches: [], youtubeFixtureOnly: true };
  result.journeys.push(observed);
  try {
    await installYoutubeFixture(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/en/academy/reiki/tantra-reiki', { waitUntil: 'load' });
    for (const locale of ['ru', 'es', 'en']) {
      const disclosure = page.locator('#tantra-russian-video-testimonials');
      if (!await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').click();
      await startBothNative(disclosure);
      await disclosure.locator('button.academy-video-poster').click();
      await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toBeVisible();
      await page.evaluate(() => { window.__tantraPreviousPlayers = [...document.querySelectorAll('#tantra-russian-video-testimonials video, #tantra-russian-video-testimonials iframe')]; });
      const menu = page.locator('.site-language-menu').first();
      if (!await menu.evaluate(el => el.open)) await menu.locator('summary').click();
      await menu.locator(`a[lang="${locale}"]`).click();
      await expect(page).toHaveURL(origin + `/${locale}/academy/reiki/tantra-reiki`);
      await expect(page.locator('body')).toHaveAttribute('data-csp-class', 'tantra-media');
      await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(locale !== 'en');
      await expect(disclosure.locator('iframe')).toHaveCount(0);
      await expect.poll(() => disclosure.locator('video').evaluateAll(videos => videos.length === 2 && videos.every(el => el.paused))).toBe(true);
      await expect.poll(() => page.evaluate(() => window.__tantraPreviousPlayers?.every(el => !el.isConnected && (el.tagName !== 'VIDEO' || el.paused)) ?? true)).toBe(true);
      const previous = await page.evaluate(() => window.__tantraPreviousPlayers?.map(el => ({ connected: el.isConnected, tag: el.tagName, paused: el.tagName === 'VIDEO' ? el.paused : null })) ?? null);
      // null means a fresh document; otherwise React must have removed the old subtree.
      if (previous) for (const player of previous) {
        assert.equal(player.connected, false);
        if (player.tag === 'VIDEO') assert.equal(player.paused, true);
      }
      observed.switches.push({ locale, previousDocumentPlayers: previous, newPlayersPaused: true, iframeAbsent: true });
    }
    assert.deepEqual(errors, []);
    observed.ok = true;
  } catch (error) {
    observed.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally { await context.close(); }
}

try {
  // Verify complete first-party poster bytes. Original MP4 provider probes are separate.
  for (const asset of manifest.assets) {
    const url = new URL(asset.path, origin).href;
    const response = await fetch(url, { redirect: 'error' });
    assert.equal(response.status, 200, asset.path);
    assert.equal(response.url, url);
    assert.equal(response.headers.get('content-type')?.split(';')[0], asset.contentType);
    const digest = createHash('sha256');
    let bytes = 0;
    for await (const chunk of response.body) { digest.update(chunk); bytes += chunk.length; }
    assert.equal(bytes, asset.bytes, asset.path);
    assert.equal(digest.digest('hex'), asset.sha256, asset.path);
    result.assets.push({ path: asset.path, bytes, sha256: asset.sha256, verified: true });
  }
  for (const asset of manifest.nativeVideos) {
    const head = await fetch(asset.url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(30000) });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-type')?.split(';')[0], 'video/mp4');
    assert.equal(Number(head.headers.get('content-length')), asset.sourceBytes);
    const partial = await fetch(asset.url, { redirect: 'error', headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(30000) });
    assert.equal(partial.status, 206, 'Canonical native video must support byte ranges');
    assert.equal(partial.headers.get('content-range'), `bytes 0-1023/${asset.sourceBytes}`);
    assert.equal((await partial.arrayBuffer()).byteLength, 1024);
    result.assets.push({ url: asset.url, headStatus: 200, rangeStatus: 206, firstParty: false });
  }
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch();
    try {
      for (const width of [390, 1365]) {
        for (const locale of ['en', 'ru', 'es']) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          const pageErrors = [];
          const journey = { engine, width, locale, ok: false, nativeDecodedPlayback: [], alenaRendererSynthetic: true, alenaDecodedPlaybackClaimed: false, pageErrors };
          result.journeys.push(journey);
          try {
            // Deterministic renderer/CSP test only; do not claim YouTube decoded playback.
            await context.route('https://www.youtube-nocookie.com/embed/qM_nFUkYJ1k?autoplay=1', route => route.fulfill({
              contentType: 'text/html', body: '<!doctype html><title>Alena renderer fixture</title><p id="player-fixture">Allowed YouTube renderer</p>',
            }));
            const page = await context.newPage();
            page.on('pageerror', error => pageErrors.push(error.message));
            const response = await page.goto(origin + `/${locale}/academy/reiki/tantra-reiki`, { waitUntil: 'load' });
            assert.equal(response.status(), 200);
            const csp = response.headers()['content-security-policy'];
            assert.match(csp, /(?:^|;)\s*media-src 'self' https:\/\/psitrends\.com(?:;|$)/);
            const english = page.locator('#tantra-original-english-testimonials');
            const russian = page.locator('#tantra-russian-video-testimonials');
            assert.equal(await english.evaluate(el => el.open), locale === 'en');
            assert.equal(await russian.evaluate(el => el.open), locale !== 'en');
            assert.deepEqual(await russian.locator('video source').evaluateAll(items => items.map(el => el.src)), sources);
            assert.deepEqual(await russian.locator('video').evaluateAll(items => items.map(el => el.poster)), posters);
            if (locale === 'en') {
              await expect(english).toContainText('Litten');
              await expect(english).toContainText('Margaret');
              await expect(russian.locator('summary')).toContainText('Russian audio');
              await expect(russian.locator('video').first()).not.toBeVisible();
              await russian.locator('summary').click();
              await expect(russian.locator('video').first()).toBeVisible();
              await expect(russian.locator('figcaption')).toHaveText([
                'Participant video 1 · Russian audio', 'Participant video 2 · Russian audio',
                'Alena · Tantra Reiki testimonial · Russian audio',
              ]);
            }
            const playback = journey.nativeDecodedPlayback;
            for (let index = 0; index < 2; index++) {
              journey.stage = { video: index + 1, phase: 'initial-playback' };
              const video = russian.locator('video').nth(index);
              await video.scrollIntoViewIfNeeded();
              await video.evaluate(async el => { el.muted = true; await el.play(); });
              await expect.poll(() => video.evaluate(el => ({ time: el.currentTime, width: el.videoWidth, height: el.videoHeight, ready: el.readyState })), { timeout: 20000 }).toMatchObject({ width: index === 0 ? 464 : 720, height: index === 0 ? 848 : 1280 });
              await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 20000 }).toBeGreaterThan(0.25);
              const sample = await video.evaluate(el => ({ time: el.currentTime, width: el.videoWidth, height: el.videoHeight, ready: el.readyState, duration: el.duration, frames: el.getVideoPlaybackQuality().totalVideoFrames, error: el.error?.code ?? null, currentSrc: el.currentSrc }));
              assert.equal(sample.error, null);
              assert.equal(sample.currentSrc, sources[index]);
              assert.ok(sample.ready >= 2 && sample.frames > 0, 'A decoded video frame is required');
              assert.ok(Math.abs(sample.duration - (index === 0 ? 321.2 : 236)) < 0.5);
              const seekTarget = 30;
              const observed = { ...sample, seekTarget };
              playback.push(observed);
              journey.stage = { video: index + 1, phase: 'seek-and-decode' };
              await video.evaluate((el, time) => { el.currentTime = time; }, seekTarget);
              await expect.poll(() => video.evaluate(el => !el.seeking && el.readyState >= 2), { timeout: 20000 }).toBe(true);
              await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 20000 }).toBeGreaterThan(seekTarget + 0.25);
              observed.immediateAfterSeek = await video.evaluate(el => ({ time: el.currentTime, frames: el.getVideoPlaybackQuality().totalVideoFrames, ready: el.readyState, error: el.error?.code ?? null }));
              // Decode statistics can update after the media clock / seeked event.
              // Preserve the strict decoded-frame requirement and wait for observation.
              await expect.poll(() => video.evaluate(el => el.getVideoPlaybackQuality().totalVideoFrames), { timeout: 20000 }).toBeGreaterThan(sample.frames);
              const afterSeek = await video.evaluate(el => ({ time: el.currentTime, frames: el.getVideoPlaybackQuality().totalVideoFrames, ready: el.readyState, error: el.error?.code ?? null }));
              observed.afterSeek = afterSeek;
              assert.equal(afterSeek.error, null);
              assert.ok(afterSeek.frames > sample.frames, 'Decoded playback must continue after seeking');
              await video.evaluate(el => el.pause());

            }
            await russian.locator('button.academy-video-poster').click();
            const alena = russian.locator('iframe');
            await expect(alena).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/qM_nFUkYJ1k?autoplay=1');
            await expect(alena).toHaveAttribute('title', /Alena|Алёна/);
            await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toHaveText('Allowed YouTube renderer');
            // Regression: the application must stop active playback on close.
            // Never manually pause this player before the close assertion.
            const activeVideos = russian.locator('video');
            const beforeClose = [];
            for (let index = 0; index < 2; index++) {
              const activeVideo = activeVideos.nth(index);
              await activeVideo.evaluate(async el => { el.muted = true; await el.play(); });
              await expect.poll(() => activeVideo.evaluate(el => el.paused)).toBe(false);
              beforeClose.push(await activeVideo.evaluate(el => el.currentTime));
            }
            await russian.locator('summary').click();
            const pausedAt = [];
            for (let index = 0; index < 2; index++) {
              const activeVideo = activeVideos.nth(index);
              await expect(activeVideo).not.toBeVisible();
              await expect.poll(() => activeVideo.evaluate(el => el.paused)).toBe(true);
              pausedAt.push(await activeVideo.evaluate(el => el.currentTime));
              assert.ok(pausedAt[index] >= beforeClose[index], "Closing must not reset Participant " + (index + 1));
            }
            await expect(russian.locator('iframe')).toHaveCount(0);
            await page.waitForTimeout(350);
            for (let index = 0; index < 2; index++) {
              assert.ok(Math.abs(await activeVideos.nth(index).evaluate(el => el.currentTime) - pausedAt[index]) < 0.05);
            }
            await russian.locator('summary').focus();
            await page.keyboard.press('Enter');
            for (let index = 0; index < 2; index++) {
              await expect(activeVideos.nth(index)).toBeVisible();
              await expect.poll(() => activeVideos.nth(index).evaluate(el => el.paused)).toBe(true);
            }
            await expect(russian.locator('iframe')).toHaveCount(0);
            await expect(russian.locator('button.academy-video-poster')).toBeVisible();
            await russian.locator('button.academy-video-poster').click();
            await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toHaveText('Allowed YouTube renderer');
            journey.closeCleanup = { participantsVerified: [1, 2], nativePaused: true, nativePositionRetained: true, youtubeIframeRemoved: true, reopenRequiresClick: true, youtubeFixtureOnly: true };
            assert.deepEqual(pageErrors, []);
            journey.ok = true;
            journey.stage = { phase: 'complete' };
            console.log(JSON.stringify(journey));
          } catch (error) {
            journey.failure = { message: error.message, stack: error.stack };
            console.log(JSON.stringify(journey));
            throw error;
          } finally { await context.close(); }
        }
      }
      for (const locale of ['en', 'ru', 'es']) await verifyDelayedHydration(browser, engine, locale);
      await verifyLocaleSwitchWhilePlaying(browser, engine);
    } finally { await browser.close(); }
  }
} finally {
  await mkdir('output/tantra-testimonials', { recursive: true });
  await writeFile('output/tantra-testimonials/verification.json', JSON.stringify(result, null, 2));
}

