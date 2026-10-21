// Production-build-only first-screen CTA QA. No user forms, payments or private data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || 'playwright');
const origin = process.env.HH_PUBLIC_QA_ORIGIN || 'http://127.0.0.1:3100';
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error('Homepage acceptance only runs against an isolated local production server');
}
const output = 'artifacts/home-first-screen';
await mkdir(output, { recursive: true });

const result = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const [locale, route, paidCopy] of [
      ['en', '/', 'Request a consultation · from €50'],
      ['ru', '/ru', 'Запросить консультацию · от €50'],
      ['es', '/es', 'Solicitar una consulta · desde €50'],
    ]) {
      for (const width of [320, 390, 430]) {
        const page = await browser.newPage({
          viewport: { width, height: 844 },
          deviceScaleFactor: 1,
          isMobile: true,
          hasTouch: true,
          reducedMotion: 'reduce',
        });
        const label = engine.name() + ':' + locale + ':' + width;
        try {
          const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
          assert.equal(response?.status(), 200, label + ': public home must load');
          const strip = page.locator('[data-home-quick-booking="true"]');
          const paid = strip.locator('[data-home-quick-cta="paid"]');
          const free = strip.locator('[data-home-quick-cta="free-review"]');
          await paid.waitFor({ state: 'visible', timeout: 30000 });
          await free.waitFor({ state: 'visible', timeout: 30000 });
          const [card, book, review, slider] = await Promise.all([
            strip.boundingBox(), paid.boundingBox(), free.boundingBox(),
            page.locator('[data-home-section-carousel] [role="region"][aria-roledescription="carousel"]').boundingBox(),
          ]);
          assert.ok(card && book && review && slider, label + ': all first-screen pieces have visible boxes');
          assert.ok(card.y >= 0 && card.y + card.height <= 844 - 72,
            label + ': consultation offer fits above the mobile bottom navigation');
          assert.ok(book.y + book.height <= 844 - 72 && review.y + review.height <= 844 - 72,
            label + ': both CTAs visible without scrolling');
          assert.ok(card.y + card.height <= slider.y + 2, label + ': consultation precedes discovery carousel');
          assert.ok(book.height >= 44 && review.height >= 44, label + ': finger-sized tap areas');
          assert.equal((await paid.innerText()).trim().replace(/\s+/g, ' '), paidCopy,
            label + ': exact localized €50 CTA');
          const price = (await strip.innerText()).replace(/\s+/g, ' ');
          assert.ok(price.includes('€50') && price.includes('€100'), label + ': both approved prices are clear');
          const paidHref = await paid.getAttribute('href');
          const freeHref = await free.getAttribute('href');
          assert.equal(paidHref, '/' + locale + '/services#consultation', label + ': existing booking destination');
          assert.equal(freeHref, '/' + locale + '/services/free-situation-review', label + ': free written review');
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 1, label + ': no horizontal overflow');
          const visiblePixels = { cardY: Math.round(card.y), cardHeight: Math.round(card.height),
            paidHeight: Math.round(book.height), freeHeight: Math.round(review.height) };
          result.push({ engine: engine.name(), locale, width, ...visiblePixels });
          if (engine === webkit && width === 390) {
            await page.screenshot({ path: output + '/home-' + locale + '-webkit-390.png', fullPage: false });
          }
          // Navigation is a genuine public route read. Do not submit a form, create
          // a lead, book an appointment or trigger a payment.
          if (width === 390) {
            const paidTarget = await page.request.get(origin + paidHref.split('#')[0], { timeout: 30000 });
            const freeTarget = await page.request.get(origin + freeHref, { timeout: 30000 });
            assert.equal(paidTarget.status(), 200, label + ': paid target HTTP 200');
            assert.equal(freeTarget.status(), 200, label + ': free target HTTP 200');
          }
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(output + '/first-screen-results.json', JSON.stringify(result, null, 2));
console.log('First-screen consultation QA passed in Chromium/WebKit, EN/RU/ES at 320/390/430px:', result.length);
