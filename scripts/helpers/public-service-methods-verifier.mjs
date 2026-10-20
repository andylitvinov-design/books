// Inspect default disclosure state only. Never press Play or load an embed.
export async function assertPublicServiceMethods(page, expect, locale) {
  const methods = page.locator('details#method-videos[data-services-methods]');
  await expect(methods).toHaveCount(1);
  await expect(methods).toHaveAttribute('open', '');
  const slots = locale === 'es'
    ? ['[data-service-video="hypnotherapy"]', '[data-service-video="constellations"]']
    : ['[data-video-slot="method-hypnotherapy"]', '[data-video-slot="method-constellations"]'];
  for (const slot of slots) {
    const preview = methods.locator(slot);
    await expect(preview).toHaveCount(1);
    await expect(preview.locator('.site-video-play')).toBeVisible();
    await expect(preview.locator('img.site-video-poster')).toHaveCount(1);
    await expect(preview.locator('img.site-video-poster')).toBeVisible();
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
