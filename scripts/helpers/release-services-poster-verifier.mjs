import assert from 'node:assert/strict';
import { decodeReadyPoster } from '../public-poster-readiness.mjs';

const english = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc'];
const russian = ['m9RfDgK76PU', 'MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E', '5oj0BIbLT4w'];
const serviceVideoIds = { en: english, es: english, ru: russian };
const remotePosterIds = new Set(['m9RfDgK76PU', '5oj0BIbLT4w']);
const identity = el => ({ src: el.getAttribute('src'), srcset: el.getAttribute('srcset') });

// Audit every original poster, including lazy descendants of Services' native
// disclosure. Opening that disclosure is a user-visible precondition, not a
// reason to skip hidden images, change their sources, or weaken strict decode.
export async function verifyReleasePosters(page, { path, locale }, expect) {
  let disclosure, summary, openedHere = false;
  const posters = page.locator('.site-video-poster');
  const images = await posters.elementHandles();
  try {
    const sources = await Promise.all(images.map(image => image.evaluate(identity)));
    if (/^\/(en|ru|es)\/services$/.test(path)) {
      assert.equal(path, '/' + locale + '/services', 'Services locale must match its audited route');
      const section = page.locator('[data-personal-testimonials="services"]');
      await expect(section).toHaveCount(1);
      await expect(section).toHaveAttribute('lang', locale);
      const cards = section.locator('[data-testimonial-video-id]');
      await expect(cards).toHaveCount(serviceVideoIds[locale].length);
      assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testimonial-video-id'))), serviceVideoIds[locale], 'Preserve the complete ordered Services testimonial set');
      disclosure = section.locator('details[data-more-services-testimonials]');
      await expect(disclosure).toHaveCount(1);
      assert.deepEqual(await disclosure.locator('[data-testimonial-video-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testimonial-video-id'))), serviceVideoIds[locale].slice(4), 'Only the exact additional testimonials belong to this disclosure');
      for (const id of serviceVideoIds[locale]) {
        const image = section.locator('[data-testimonial-video-id="' + id + '"] .site-video-poster');
        await expect(image).toHaveCount(1);
        await expect(image).toHaveAttribute('src', remotePosterIds.has(id)
          ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'
          : '/images/holistic-house/testimonial-posters/' + id + '.webp');
      }
      summary = disclosure.locator(':scope > summary');
      await expect(summary).toHaveCount(1);
      await expect(summary).toBeVisible();
      if (await disclosure.getAttribute('open') === null) {
        openedHere = true;
        await summary.click();
      }
      await expect(disclosure).toHaveAttribute('open', '');
    }
    await expect(posters).toHaveCount(images.length);
    for (const [index, image] of images.entries()) {
      await expect(posters).toHaveCount(images.length);
      assert.deepEqual(await image.evaluate(identity), sources[index], 'Opening the disclosure must not replace an original poster source');
      await decodeReadyPoster(image, expect);
    }
    await expect(posters).toHaveCount(images.length);
  } finally {
    // decodeReadyPoster disposes visited handles. Also release any not reached
    // after a failed precondition or decode, without suppressing that failure.
    await Promise.all(images.map(image => image.dispose().catch(() => {})));
    if (openedHere && await disclosure.getAttribute('open') !== null) {
      await summary.click();
      await expect(disclosure).not.toHaveAttribute('open', '');
    }
  }
}
