import assert from 'node:assert/strict';
import { builtInSiteVideoRecords } from '../../lib/site-videos/defaults.js';
import { siteVideoWatchUrl, toPublishedSiteVideo, videoKey } from '../../lib/site-videos/model.js';

// Independent source fixture for the secret-free loopback job, never inferred
// from whatever happens to render. Stored/live registry state is not known here.
export function isolatedServiceVideoFixture({ origin, environment }) {
  assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/, 'Video fixture requires isolated loopback');
  assert.equal(environment.CI, 'true', 'Video fixture requires the isolated CI job');
  assert.equal(environment.HH_PUBLIC_QA_ENQUIRY_FIXTURE, '1', 'Explicit isolated UI fixture required');
  for (const name of ['PRESCRIPTIONS_KV_REST_API_URL', 'PRESCRIPTIONS_KV_REST_API_TOKEN']) {
    assert.ok(!environment[name], 'Video fixture requires storage-off; configured storage is not a builtin fixture');
  }
  return Object.fromEntries(builtInSiteVideoRecords().flatMap(record => {
    const video = toPublishedSiteVideo(record);
    return video ? [[record.key, video]] : [];
  }));
}

// Inspect default disclosure state only. Never press Play or load an embed.
// expectedVideos must come from the explicit independent registry fixture.
export async function assertPublicServiceMethods(page, expect, locale, expectedVideos) {
  assert.ok(expectedVideos && typeof expectedVideos === 'object', 'Explicit published video registry fixture required');
  assert.ok(['en', 'ru', 'es'].includes(locale), 'Unsupported Services locale');
  const methods = page.locator('details#method-videos[data-services-methods]');
  await expect(methods).toHaveCount(1);
  await expect(methods).toHaveAttribute('open', '');
  async function poster(preview) {
    await expect(preview).toHaveCount(1);
    await expect(preview.locator('.site-video-play')).toBeVisible();
    await expect(preview.locator('img.site-video-poster')).toHaveCount(1);
    await expect(preview.locator('img.site-video-poster')).toBeVisible();
  }
  async function managed(preview, video) {
    await poster(preview);
    await expect(preview).toHaveAttribute('data-video-locale', locale);
    await expect(preview).toHaveAttribute('aria-label', video.title);
    await expect(preview.locator('a.site-video-watch-link[href="' + siteVideoWatchUrl(video) + '"]')).toHaveCount(1);
  }
  if (locale === 'es') {
    for (const topic of ['hypnotherapy', 'constellations']) {
      const preview = methods.locator('[data-service-video="' + topic + '"]');
      await poster(preview);
      await expect(preview).toHaveAttribute('data-video-kind', 'method');
      await expect(preview).toHaveAttribute('lang', 'es');
      const video = expectedVideos[videoKey('method-' + topic, 'en')];
      assert.ok(video, 'ES keeps the approved English method source: ' + topic);
      await expect(preview.locator('a.site-video-watch-link[href="' + siteVideoWatchUrl(video) + '"]')).toHaveCount(1);
    }
  } else {
    const introVideo = expectedVideos[videoKey('services-intro', locale)];
    assert.ok(introVideo, locale + ' acceptance requires a published Services introduction');
    const intro = page.locator('#meet-andrey[data-services-meet]');
    await expect(intro).toHaveCount(1);
    await managed(intro.locator('[data-video-slot="services-intro"]'), introVideo);
    await expect(page.locator('[data-video-slot="services-intro"]')).toHaveCount(1);
    await expect(intro.locator('iframe')).toHaveCount(0);
    // The approved RU general overview is already shown once in the intro.
    // Never require invented method-specific RU videos or duplicate that overview.
    await expect(methods.locator('[data-service-video]')).toHaveCount(0);
    for (const slot of ['method-hypnotherapy', 'method-constellations']) {
      const video = expectedVideos[videoKey(slot, locale)];
      const preview = methods.locator('[data-video-slot="' + slot + '"]');
      if (locale === 'en') assert.ok(video, 'EN method publication must remain available: ' + slot);
      if (video) await managed(preview, video);
      else await expect(preview).toHaveCount(0);
    }
    // Match the identity-bearing original source link, not a loose video count.
    await expect(methods.locator('a.site-video-watch-link[href="' + siteVideoWatchUrl(introVideo) + '"]')).toHaveCount(0);
  }
  // This is the archive disclosure, not the outer posters or player transcripts.
  const archive = methods.locator(':scope > div > details');
  await expect(archive).toHaveCount(locale === 'es' ? 0 : 1);
  if (locale !== 'es') await expect(archive).not.toHaveAttribute('open', '');
  await expect(methods.locator('iframe')).toHaveCount(0);
  // Testimonial extras are a separate disclosure; showing method posters must
  // not accidentally expose extra testimonials or eager third-party players.
  const testimonials = page.locator('[data-personal-testimonials="services"]');
  const more = testimonials.locator('details[data-more-services-testimonials]');
  await expect(more).toHaveCount(1);
  await expect(more).not.toHaveAttribute('open', '');
  await expect(testimonials.locator('iframe')).toHaveCount(0);
}
