import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, open } from 'node:fs/promises';
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
async function installNativeTimelineDiagnostics(context) {
  await context.addInitScript(() => {
    const records = [];
    const diagnosticErrors = [];
    const diagnosticError = error => {
      if (diagnosticErrors.length < 20) diagnosticErrors.push({ at: performance.now(), message: String(error?.message ?? error) });
    };
    window.__tantraNativeDiagnosticErrors = diagnosticErrors;
    const ids = new WeakMap();
    let nextId = 0;
    window.__tantraNativeTimeline = records;
    const relevant = el => el instanceof HTMLVideoElement && (ids.has(el) || el.closest('#tantra-russian-video-testimonials'));
    const snapshot = el => {
      if (!ids.has(el)) ids.set(el, ++nextId);
      return {
        node: ids.get(el), time: el.currentTime, duration: el.duration,
        paused: el.paused, seeking: el.seeking, ready: el.readyState,
        network: el.networkState, ended: el.ended, connected: el.isConnected,
        source: el.currentSrc, open: el.closest('details')?.open ?? null,
        frames: el.getVideoPlaybackQuality().totalVideoFrames,
        presentedFrame: el.__tantraPresentedFrame ?? null,
      };
    };
    const record = (type, el, extra = {}) => {
      try {
        if (!relevant(el)) return;
        records.push({ type, at: performance.now(), ...snapshot(el), ...extra });
        if (records.length > 1500) records.shift();
      } catch (error) { diagnosticError(error); }
    };
    const trackFrames = el => {
      if (el.__tantraFrameTracking || !el.requestVideoFrameCallback) return;
      el.__tantraFrameTracking = true;
      let count = 0;
      const observe = (now, metadata) => {
        try {
          el.__tantraPresentedFrame = { at: now, mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames };
          if (++count % 5 === 1) record('presented-frame', el);
          if (el.isConnected) el.requestVideoFrameCallback(observe);
          else el.__tantraFrameTracking = false;
        } catch (error) { el.__tantraFrameTracking = false; diagnosticError(error); }
      };
      el.requestVideoFrameCallback(observe);
    };
    for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'emptied', 'durationchange', 'seeking', 'seeked', 'play', 'playing', 'pause', 'waiting', 'stalled', 'suspend', 'canplay', 'canplaythrough', 'ended', 'error']) {
      document.addEventListener(type, event => {
        if (!relevant(event.target)) return;
        record(type, event.target);
        trackFrames(event.target);
      }, true);
    }
    // Forward the original APIs unchanged and only retain verifier/app call sites.
    const currentTime = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    if (currentTime?.get && currentTime?.set && currentTime.configurable) {
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        ...currentTime,
        set(value) {
          record('js-set-currentTime', this, { requestedTime: value, stack: new Error().stack });
          return currentTime.set.call(this, value);
        },
      });
    }
    for (const name of ['load', 'play', 'pause']) {
      const original = HTMLMediaElement.prototype[name];
      HTMLMediaElement.prototype[name] = function (...args) {
        record('js-' + name, this, { stack: new Error().stack });
        return Reflect.apply(original, this, args);
      };
    }
    const observer = new MutationObserver(changes => {
      for (const change of changes) {
        if (change.type === 'attributes') {
          const target = change.target;
          const videos = target instanceof HTMLVideoElement ? [target] : target.matches('#tantra-russian-video-testimonials') ? [...target.querySelectorAll('video')] : target.closest('video') ? [target.closest('video')] : [];
          for (const video of videos) record('attribute-' + change.attributeName, video, { changedTag: target.tagName, oldValue: change.oldValue, newValue: target.getAttribute(change.attributeName) });
        } else {
          const owner = change.target instanceof HTMLVideoElement ? change.target : change.target.closest?.('video');
          const sources = nodes => [...nodes].filter(node => node instanceof Element && node.matches('source')).map(node => ({ src: node.getAttribute('src'), type: node.getAttribute('type') }));
          const addedSources = sources(change.addedNodes), removedSources = sources(change.removedNodes);
          if (owner && (addedSources.length || removedSources.length)) record('source-children', owner, { addedSources, removedSources });
          for (const [kind, nodes] of [['removed', change.removedNodes], ['added', change.addedNodes]]) {
            for (const node of nodes) {
              if (!(node instanceof Element)) continue;
              for (const video of node instanceof HTMLVideoElement ? [node] : node.querySelectorAll('video')) {
                record('node-' + kind, video);
                if (kind === 'added' && relevant(video)) trackFrames(video);
              }
            }
          }
        }
      }
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'open'], attributeOldValue: true });
  });
}
async function collectNativeTimeline(context) {
  return Promise.all(context.pages().map(page => page.evaluate(() => ({ events: window.__tantraNativeTimeline ?? [], diagnosticErrors: window.__tantraNativeDiagnosticErrors ?? [] })).catch(error => ({ unavailable: error.message }))));
}

async function collectWebkitTrace() {
  let file;
  try {
    file = await open('output/tantra-testimonials/webkit-gstreamer.log', 'r');
    const { size } = await file.stat();
    const limit = 2 * 1024 * 1024;
    const readRange = async (start, length) => {
      const buffer = Buffer.alloc(length);
      let used = 0;
      while (used < length) {
        const { bytesRead } = await file.read(buffer, used, length - used, start + used);
        if (!bytesRead) break;
        used += bytesRead;
      }
      return buffer.subarray(0, used).toString('utf8');
    };
    const prefixEndByte = Math.min(size, limit);
    const start = Math.max(prefixEndByte, size - limit);
    const prefix = await readRange(0, prefixEndByte);
    const text = await readRange(start, size - start);
    // Keep relevant backend transitions even when verbose network logs fill the middle.
    // Both scan memory and retained output are bounded; never retain all network logs.
    const selected = [], chunk = Buffer.alloc(64 * 1024);
    let offset = 0, pending = '', matchedLines = 0, clippedLines = 0;
    const retain = line => {
      if (!/seek|state.?change|reset|flush|segment|EOS|end.of.stream|PAUSED|PLAYING|error|warning/i.test(line)) return;
      matchedLines++;
      selected.push(line.slice(0, 4096));
      if (selected.length > 2048) selected.splice(512, 1);
    };
    while (offset < size) {
      const { bytesRead } = await file.read(chunk, 0, Math.min(chunk.length, size - offset), offset);
      if (!bytesRead) break;
      offset += bytesRead;
      const lines = (pending + chunk.subarray(0, bytesRead).toString('utf8')).split('\n');
      pending = lines.pop();
      for (const line of lines) retain(line);
      if (pending.length > 8192) { pending = pending.slice(0, 8192); clippedLines++; }
    }
    if (pending) retain(pending);
    return { bytes: size, prefixEndByte, prefix, tailStartByte: start, truncated: start > prefixEndByte, text,
      transitions: { lines: selected, matchedLines, omittedLines: Math.max(0, matchedLines - selected.length), clippedLines, scannedBytes: offset } };

  } catch (error) {
    return { unavailable: error.message };
  } finally { try { await file?.close(); } catch { /* Diagnostics must not replace a verification failure. */ } }
}

// WebKit/GStreamer can decode after a seek while play() remains pending until
// natural end. Observe active media directly; make one request and retain errors.
function requestNativePlayback(el) {
  el.muted = true;
  const request = { state: 'pending', error: null };
  el.__tantraPlaybackRequest = request;
  try {
    el.play().then(() => { request.state = 'fulfilled'; }, error => {
      request.state = 'rejected';
      request.error = { name: error.name, message: error.message };
    });
  } catch (error) {
    request.state = 'rejected';
    request.error = { name: error.name, message: error.message };
  }
}
function nativePlaybackSnapshot(el) {
  const rect = el.getBoundingClientRect();
  return {
    time: el.currentTime, frames: el.getVideoPlaybackQuality().totalVideoFrames,
    paused: el.paused, ready: el.readyState, ended: el.ended, duration: el.duration,
    error: el.error?.code ?? null, connected: el.isConnected, disclosureOpen: el.closest('details')?.open,
    visible: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    playRequest: el.__tantraPlaybackRequest,
    presentedFrame: el.__tantraPresentedFrame ?? null, currentSrc: el.currentSrc, seeking: el.seeking,
  };
}
async function startVisibleNative(disclosure, index, scenario = {}) {
  const video = disclosure.locator('video').nth(index);
  const observation = { participant: index + 1, ...scenario, stage: 'scroll' };
  (result.playbackSetups ??= []).push(observation);
  try {
    await video.scrollIntoViewIfNeeded();
    observation.before = await video.evaluate(nativePlaybackSnapshot);
    observation.stage = 'request-playback';
    await video.evaluate(requestNativePlayback);
    await expect.poll(() => video.evaluate(el => el.paused)).toBe(false);
    const initial = await video.evaluate(el => ({ time: el.currentTime, frames: el.getVideoPlaybackQuality().totalVideoFrames }));
    observation.initial = initial;
    observation.stage = 'observe-decoded-playback';
    await expect.poll(() => video.evaluate(el => el.currentTime), { timeout: 20000 }).toBeGreaterThan(initial.time + 0.1);
    await expect.poll(() => video.evaluate(el => el.getVideoPlaybackQuality().totalVideoFrames), { timeout: 20000 }).toBeGreaterThan(initial.frames);
    const sample = await video.evaluate(nativePlaybackSnapshot);
    observation.sample = sample;
    assert.equal(sample.paused, false);
    assert.equal(sample.visible, true);
    assert.equal(sample.error, null);
    assert.equal(sample.playRequest.error, null, 'Native playback request must not reject before active decoded playback');
    observation.stage = 'active';
    return { participant: index + 1, initial, sample };
  } catch (error) {
    observation.failure = { message: error.message, sample: await video.evaluate(nativePlaybackSnapshot).catch(() => null) };
    throw error;
  }
}
async function focusWithoutScroll(locator) {
  await locator.evaluate(el => el.focus({ preventScroll: true }));
}
async function verifyRepeatedClose(page, cycles = 3, engine) {
  const disclosure = page.locator('#tantra-russian-video-testimonials');
  if (!await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').click();
  const observations = [];
  await expect(disclosure.locator('video')).toHaveCount(2);
  // Exercise each tall native player while visible. Do not require simultaneous
  // offscreen muted autoplay, and never count an already-paused player as active.
  for (const activeIndex of [0, 1]) for (let cycle = 0; cycle < cycles; cycle++) {
    if (await disclosure.locator('button.academy-video-poster').count()) {
      await disclosure.locator('button.academy-video-poster').click();
    }
    await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toBeVisible();
    const active = await startVisibleNative(disclosure, activeIndex, { phase: 'close-setup', cycle: cycle + 1 });
    await focusWithoutScroll(disclosure.locator('summary'));
    // Focusing the offscreen summary must not scroll/pause our active video.
    await expect.poll(() => disclosure.locator('video').nth(activeIndex).evaluate(el => el.paused)).toBe(false);
    const before = await disclosure.locator('video').evaluateAll(videos => videos.map(el => el.currentTime));
    await page.keyboard.press(cycle % 2 === 0 ? 'Enter' : 'Space');
    await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(false);
    for (const index of [0, 1]) await expect(disclosure.locator('video').nth(index)).not.toBeVisible();
    await expect.poll(() => disclosure.locator('video').evaluateAll(videos => videos.every(el => el.paused))).toBe(true);
    await expect(disclosure.locator('iframe')).toHaveCount(0);
    const paused = await disclosure.locator('video').evaluateAll(videos => videos.map(el => el.currentTime));
    paused.forEach((time, index) => assert.ok(time >= before[index], 'Close must preserve native position'));
    await page.waitForTimeout(350);
    const after = await disclosure.locator('video').evaluateAll(videos => videos.map(el => el.currentTime));
    after.forEach((time, index) => assert.ok(Math.abs(time - paused[index]) < 0.05, 'Closed player must stay paused'));
    const reopening = await disclosure.locator('video').evaluateAll(videos => ({
      at: performance.now(), frames: videos.map(el => el.__tantraPresentedFrame?.at ?? -1),
    }));
    await page.keyboard.press(cycle % 2 === 0 ? 'Enter' : 'Space');
    await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(true);
    for (const index of [0, 1]) await expect(disclosure.locator('video').nth(index)).toBeVisible();
    await expect.poll(() => disclosure.locator('video').evaluateAll(videos => videos.every(el => el.paused))).toBe(true);
    await expect(disclosure.locator('iframe')).toHaveCount(0);
    await expect(disclosure.locator('button.academy-video-poster')).toBeVisible();
    // Observe the reopened state through backend reconstruction, before another
    // explicit play. A cached currentTime or immediate paused sample is insufficient.
    if (engine === 'webkit') {
      for (const index of [0, 1]) {
        const video = disclosure.locator('video').nth(index);
        await video.scrollIntoViewIfNeeded();
        await expect.poll(() => video.evaluate((el, { at, time }) => {
          const frame = el.__tantraPresentedFrame;
          return !!(frame && frame.at > at && Math.abs(frame.mediaTime - time) < 0.2);
        }, { at: Math.max(reopening.at, reopening.frames[index]), time: paused[index] }), { timeout: 20000 }).toBe(true);
      }
    }
    await page.waitForTimeout(350);
    const reopened = await disclosure.locator('video').evaluateAll(videos => videos.map(el => ({ paused: el.paused, time: el.currentTime })));
    assert.ok(reopened.every(video => video.paused), 'Reopened videos must remain paused through pipeline restoration');
    reopened.forEach((video, index) => assert.ok(Math.abs(video.time - paused[index]) < 0.05, 'Reopened videos must retain position until explicit play'));
    const unsolicitedPlay = await page.evaluate(at => (window.__tantraNativeTimeline ?? []).filter(event => event.type === 'play' && event.at >= at), reopening.at);
    assert.deepEqual(unsolicitedPlay, [], 'Reopening must not trigger delayed native replay');
    observations.push({ participant: activeIndex + 1, cycle: cycle + 1, active, before, paused, after, reopened, youtubeFixtureOnly: true });
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
    await installNativeTimelineDiagnostics(context);
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
    observed.preHydrationPlayback = [];
    for (const index of [0, 1]) observed.preHydrationPlayback.push(await startVisibleNative(disclosure, index, { phase: 'pre-hydration' }));
    observed.beforeHydration = await disclosure.locator('video').evaluateAll(videos => videos.map(el => ({ time: el.currentTime, paused: el.paused })));
    releaseScripts();
    await page.waitForLoadState('load');
    await expect.poll(() => disclosure.evaluate(el => el.open)).toBe(true);
    // A real app click creating the iframe proves the client component hydrated.
    await disclosure.locator('button.academy-video-poster').click();
    await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toBeVisible();
    observed.cycles = await verifyRepeatedClose(page, 3, engine);
    observed.deferredScripts = deferredScripts;
    assert.deepEqual(errors, []);
    observed.ok = true;
  } catch (error) {
    observed.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    releaseScripts();
    observed.nativeTimeline = await collectNativeTimeline(context);
    await context.close();
  }
}

async function verifyLocaleSwitchWhilePlaying(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const observed = { engine, kind: 'actual-locale-switch-while-playing', ok: false, switches: [], youtubeFixtureOnly: true };
  result.journeys.push(observed);
  try {
    await installNativeTimelineDiagnostics(context);
    await installYoutubeFixture(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/en/academy/reiki/tantra-reiki', { waitUntil: 'load' });
    for (const activeIndex of [0, 1]) for (const locale of ['ru', 'es', 'en']) {
      const disclosure = page.locator('#tantra-russian-video-testimonials');
      if (!await disclosure.evaluate(el => el.open)) await disclosure.locator('summary').click();
      await disclosure.locator('button.academy-video-poster').click();
      await expect(page.frameLocator('#tantra-russian-video-testimonials iframe').locator('#player-fixture')).toBeVisible();
      await page.evaluate(() => { window.__tantraPreviousPlayers = [...document.querySelectorAll('#tantra-russian-video-testimonials video, #tantra-russian-video-testimonials iframe')]; });
      const active = await startVisibleNative(disclosure, activeIndex, { phase: 'locale-navigation', locale });
      const menu = page.locator('.site-language-menu').first();
      if (!await menu.evaluate(el => el.open)) {
        await focusWithoutScroll(menu.locator('summary'));
        await page.keyboard.press('Enter');
      }
      const languageLink = menu.locator(`a[lang="${locale}"]`);
      await expect(languageLink).toHaveAttribute('href', `/${locale}/academy/reiki/tantra-reiki`);
      await focusWithoutScroll(languageLink);
      await expect.poll(() => disclosure.locator('video').nth(activeIndex).evaluate(el => el.paused)).toBe(false);
      await page.keyboard.press('Enter');
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
      observed.switches.push({ participant: activeIndex + 1, active, locale, previousDocumentPlayers: previous, newPlayersPaused: true, iframeAbsent: true });
    }
    assert.deepEqual(errors, []);
    observed.ok = true;
  } catch (error) {
    observed.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally { observed.nativeTimeline = await collectNativeTimeline(context); await context.close(); }
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
    await mkdir('output/tantra-testimonials', { recursive: true });
    const browser = await browserType.launch(engine === 'webkit' ? { env: { ...process.env, GST_DEBUG: 'webkitmediaplayer:6', GST_DEBUG_FILE: `${process.cwd()}/output/tantra-testimonials/webkit-gstreamer.log` } } : {});
    try {
      for (const width of [390, 1365]) {
        for (const locale of ['en', 'ru', 'es']) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          const pageErrors = [];
          const journey = { engine, width, locale, ok: false, nativeDecodedPlayback: [], alenaRendererSynthetic: true, alenaDecodedPlaybackClaimed: false, pageErrors };
          result.journeys.push(journey);
          try {
            await installNativeTimelineDiagnostics(context);
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
            const written = page.locator('#tantra-testimonials [data-tantra-full-learner-reviews]');
            const russian = page.locator('#tantra-russian-video-testimonials');
            await expect(written.locator('[data-tantra-review-id]')).toHaveCount(4);
            await expect(written).toContainText('Litten');
            await expect(written).toContainText('Margaret');
            await expect(written).toContainText(locale === 'ru' ? 'Ольга' : 'Olga');
            await expect(written.locator('[data-tantra-review-id="litten"]')).toContainText(locale === 'ru' ? 'Я ещё буду практиковать' : 'Will still practice with attuned partner');
            await expect(written.locator('[data-tantra-review-id="tantra-level-1"]')).toContainText(locale === 'ru' ? 'Благодарю Андрей!' : 'Thank you, Andrey! As beautiful as always :)');
            assert.equal(await russian.evaluate(el => el.open), locale !== 'en');
            assert.deepEqual(await russian.locator('video source').evaluateAll(items => items.map(el => el.src)), sources);
            assert.deepEqual(await russian.locator('video').evaluateAll(items => items.map(el => el.poster)), posters);
            if (locale === 'en') {
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
            journey.stage = { phase: 'per-participant-close-cleanup' };
            const closeCycles = await verifyRepeatedClose(page, 1, engine);
            journey.closeCleanup = { participantsVerified: [1, 2], closeCycles, nativePaused: true, nativePositionRetained: true, youtubeIframeRemoved: true, reopenRequiresClick: true, youtubeFixtureOnly: true };
            assert.deepEqual(pageErrors, []);
            journey.ok = true;
            journey.stage = { phase: 'complete' };
            console.log(JSON.stringify(journey));
          } catch (error) {
            journey.failure = { message: error.message, stack: error.stack };
            console.log(JSON.stringify(journey));
            throw error;
          } finally { journey.nativeTimeline = await collectNativeTimeline(context); await context.close(); }
        }
      }
      for (const locale of ['en', 'ru', 'es']) await verifyDelayedHydration(browser, engine, locale);
      await verifyLocaleSwitchWhilePlaying(browser, engine);
    } finally { await browser.close(); }
  }
} finally {
  await mkdir('output/tantra-testimonials', { recursive: true });
  result.webkitGstreamerTrace = await collectWebkitTrace();
  await writeFile('output/tantra-testimonials/verification.json', JSON.stringify(result, null, 2));
}

