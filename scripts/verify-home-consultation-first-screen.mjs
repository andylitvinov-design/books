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
          const slider = page.locator('[data-home-section-carousel] [role="region"][aria-roledescription="carousel"]');
          const paid = slider.locator('[data-home-first-screen-cta="paid"]');
          const free = page.locator('[data-home-free-diagnosis-banner] [data-home-diagnosis-order]');
          await paid.waitFor({ state: 'visible', timeout: 30000 });
          await free.waitFor({ state: 'visible', timeout: 30000 });
          const [card, book, review] = await Promise.all([
            slider.boundingBox(), paid.boundingBox(), free.boundingBox(),
          ]);
          assert.ok(card && book && review, label + ': slider, paid CTA and free diagnosis are rendered');
          assert.ok(book.y >= card.y && book.y + book.height <= card.y + card.height,
            label + ': consultation CTA stays inside the first slider');
          assert.ok(book.y >= 0 && book.y + book.height <= 844 - 72,
            label + ': consultation CTA fits above mobile bottom navigation without scrolling');
          assert.ok(book.height >= 44 && review.height >= 44, label + ': finger-sized tap areas');
          assert.equal((await paid.innerText()).trim().replace(/\s+/g, ' '), paidCopy,
            label + ': exact localized €50 CTA');
          const paidHref = await paid.getAttribute('href');
          const freeHref = '/' + locale + '/services/free-situation-review';
          assert.equal(paidHref, '/' + locale + '/services#consultation', label + ': existing booking destination');
          assert.equal(await free.getAttribute('aria-expanded'), 'false',
            label + ': free diagnosis opens the existing consent-gated inline form');
          // The approved first carousel slide keeps the original photo, seven named
          // section links and the priced consultation button on the first fold.
          const sectionNav = page.locator('[data-home-hero-nav="true"]');
          await sectionNav.waitFor({ state: 'visible', timeout: 30000 });
          const sectionLinks = sectionNav.locator('a[data-home-nav-section]');
          assert.equal(await sectionLinks.count(), 7, label + ': seven plain text site sections');
          assert.equal(await sectionNav.locator('svg, img').count(), 0, label + ': no icons in the hero navigation');
          assert.ok((await sectionNav.getAttribute('aria-label'))?.length > 3, label + ': accessible section list');
          const keys = ['home', 'tests', 'services', 'academy', 'business', 'ideas', 'cabinet'];
          const suffixes = ['', '/client/tests', '/services', '/academy', '/explore/business', '/books', '/app'];
          for (let i = 0; i < keys.length; i++) {
            const link = sectionLinks.nth(i);
            assert.equal(await link.getAttribute('data-home-nav-section'), keys[i], label + ': navigation order');
            assert.equal(await link.getAttribute('href'),
              keys[i] === 'cabinet' && locale === 'es' ? '/en/app' : suffixes[i] ? '/' + locale + suffixes[i] : locale === 'en' ? '/' : '/' + locale,
              label + ': real localized route for ' + keys[i]);
            const target = await link.boundingBox();
            assert.ok(target && target.height >= 44, label + ': touch target for ' + keys[i]);
          }
          assert.equal(await sectionLinks.nth(2).getAttribute('aria-current'), 'true', label + ': first services slide selected');
          const [navBox, copyBox] = await Promise.all([
            sectionNav.boundingBox(), page.locator('[data-home-slide]').boundingBox(),
          ]);
          assert.ok(navBox && copyBox, label + ': nav and photo copy are laid out');
          assert.ok(navBox.y >= slider.y - 1 && navBox.y + navBox.height <= copyBox.y + 4,
            label + ': lightweight nav stays above the title without overlapping it');
          assert.ok(navBox.x >= slider.x - 1 && navBox.x + navBox.width <= slider.x + slider.width + 1,
            label + ': nav stays within the existing photo');
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
            // A real touch navigation must reach the requested public section.
            await sectionNav.locator('[data-home-nav-section="tests"]').tap();
            await page.waitForURL(url => url.pathname === '/' + locale + '/client/tests', { timeout: 30000 });
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
