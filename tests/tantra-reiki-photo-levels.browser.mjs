// Browser acceptance for the public nine-level Tantra Reiki landing.
// Only static, public, unauthenticated pages are visited; no CRM or payment actions.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3089";
const locales = ["en", "ru", "es"];
const widths = [320, 390, 430];

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of locales) {
      for (const width of widths) {
        const page = await browser.newPage({
          viewport: { width, height: width === 320 ? 568 : width === 390 ? 740 : 800 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        });
        try {
          const url = base + "/" + locale + "/academy/reiki/tantra-reiki";
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          assert.equal(response?.status(), 200, engineName + " " + locale + ": page must respond 200");

          // Three owner-approved first-screen actions must be distinct, full-width
          // and keyboard accessible; no lead is submitted in this public QA.
          const hero = page.locator(".tantra-course-hero__actions");
          const free = hero.locator(":scope > a.tantra-course-hero__cta");
          const healing = hero.locator(":scope > details.tantra-course-hero__healing-request");
          const initiation = hero.locator(":scope > a.tantra-course-hero__initiation-cta");
          const whereHero = engineName + "/" + locale + "/" + width + " hero";
          assert.equal(await hero.locator(":scope > *").count(), 3, whereHero + ": exactly three different actions");
          assert.equal(await free.getAttribute("href"), "/en/academy/principles-of-energywork/learn", whereHero + ": free learner");
          assert.equal(await initiation.getAttribute("href"), "#tantra-master-course", whereHero + ": personal initiation scrolls to the same-page form");
          assert.equal(await healing.getAttribute("open"), null, whereHero + ": phone capture initially closed");
          const rowGeometry = await hero.locator(":scope > *").evaluateAll((items) => items.map((item) => {
            const r = item.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom };
          }));
          for (const [index, row] of rowGeometry.entries()) {
            assert.ok(row.width > width * .75, whereHero + ": CTA " + index + " spans mobile content");
            assert.ok(row.left >= -2 && row.right <= width + 2, whereHero + ": CTA " + index + " is not clipped");
            if (index) assert.ok(row.top >= rowGeometry[index - 1].bottom - 2, whereHero + ": CTAs stack vertically");
          }
          assert.ok((await free.textContent() || "").length >= 30, whereHero + ": free programme gift description visible");
          await healing.locator(":scope > summary").click();
          assert.equal(await healing.getAttribute("open"), "", whereHero + ": healing summary opens on tap");
          assert.equal(await healing.locator("[data-contact-channel-chooser]").count(), 1, whereHero + ": one existing consented CRM capture");
          assert.ok(await healing.locator('input[type="checkbox"]').isVisible(), whereHero + ": explicit reply-only consent");
          await healing.locator(":scope > summary").click();
          assert.equal(await healing.getAttribute("open"), null, whereHero + ": healing summary closes");
          if (width === 390) {
            await healing.locator(":scope > summary").focus();
            await page.keyboard.press("Enter");
            assert.equal(await healing.getAttribute("open"), "", whereHero + ": keyboard opens healing request");
            await page.keyboard.press("Enter");
          }
          // Do not present an extra resources dropdown on the first screen.
          // The personal CTA must jump to the one existing bottom capture and
          // preselect the personal option, without submitting an enquiry.
          assert.equal(await page.locator(".tantra-course-hero__more").count(), 0, whereHero + ": extras menu removed");
          assert.equal(await page.locator("#tantra-master-course").count(), 1, whereHero + ": single lower anchor");
          await initiation.click();
          // Wait for layout/scroll to settle, not merely the synchronous URL hash
          // and the next React update. A same-page link is only useful once the
          // customer can actually see the lower enquiry section.
          try {
            await page.waitForFunction(() => {
              const selected = document.querySelector('#tantra-next-steps button[data-selected="true"]');
              const rect = document.querySelector('#tantra-next-steps')?.getBoundingClientRect();
              return window.location.hash === "#tantra-master-course" &&
                /Personal|Личная|personal/i.test(selected?.textContent || "") &&
                rect && rect.top < innerHeight && rect.bottom > 0;
            }, null, { timeout: 12000 });
          } catch (error) {
            console.error(whereHero + " scroll diagnostics", await page.evaluate(() => ({
              hash: window.location.hash,
              scrollY: window.scrollY,
              scrollHeight: document.documentElement.scrollHeight,
              viewportHeight: innerHeight,
              anchor: document.querySelector('#tantra-master-course')?.getBoundingClientRect().toJSON(),
              form: document.querySelector('#tantra-next-steps')?.getBoundingClientRect().toJSON(),
              selected: document.querySelector('#tantra-next-steps button[data-selected="true"]')?.textContent,
            })));
            throw error;
          }
          assert.equal(new URL(page.url()).pathname, "/" + locale + "/academy/reiki/tantra-reiki", whereHero + ": stays on this page");
          const bottomCapture = page.locator('#tantra-next-steps[data-reiki-choice-capture="tantra"]');
          assert.equal(await bottomCapture.count(), 1, whereHero + ": existing form reused");
          assert.equal(await bottomCapture.locator("[data-contact-channel-chooser]").count(), 1, whereHero + ": personal contact form visible");
          assert.ok(await bottomCapture.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            return rect.top < innerHeight && rect.bottom > 0;
          }), whereHero + ": anchor scrolls the lower form into view");
          const cards = page.locator("details.tantra-journey__collapsed");
          assert.equal(await cards.count(), 8, engineName + " " + locale + ": eight later levels");
          const dimensions = await cards.evaluateAll((items) =>
            items.map((node) => {
              const r = node.getBoundingClientRect();
              const summary = node.querySelector(":scope > summary");
              const photo = summary?.querySelector(".tantra-journey__collapsed-photo img");
              const img = photo?.getBoundingClientRect();
              const title = summary?.querySelector(".tantra-journey__collapsed-title strong");
              const style = title ? getComputedStyle(title) : null;
              return {
                x: r.x, right: r.right, width: r.width, top: r.top, bottom: r.bottom,
                summaryWidth: summary?.getBoundingClientRect().width || 0,
                photoLeft: img?.left || 0, photoWidth: img?.width || 0,
                titleLeft: title?.getBoundingClientRect().left || 0,
                titleText: title?.textContent?.trim() || "",
                titleDisplay: style?.display || "",
                open: node.open,
              };
            })
          );
          for (const [index, card] of dimensions.entries()) {
            const where = engineName + "/" + locale + "/" + width + " level " + (index + 2);
            assert.ok(card.width > width * 0.8, where + ": card must span available content width");
            assert.ok(card.x >= -2 && card.right <= width + 2, where + ": card must not clip viewport");
            assert.ok(card.photoWidth >= 70, where + ": real photo must be visible");
            assert.ok(card.photoLeft < card.titleLeft, where + ": photo stays left of heading");
            assert.ok(card.titleText.length > 2, where + ": heading must be visible");
            assert.equal(card.open, false, where + ": later levels start collapsed");
          }
          for (let i = 1; i < dimensions.length; i++) {
            assert.ok(dimensions[i].top >= dimensions[i - 1].bottom - 2, engineName + "/" + locale + "/" + width + ": single full-width column");
          }
          const first = cards.first();
          await first.locator(":scope > summary").click();
          assert.equal(await first.getAttribute("open"), "", "tap opens native disclosure");
          assert.ok(await first.locator(".tantra-journey__collapsed-learning").isVisible(), "stage explanation and practice visible");
          assert.ok((await first.locator(".tantra-journey__collapsed-learning p").count()) >= 2, "what you learn + practical assignment");
          assert.ok(await first.locator(".tantra-journey__source > summary").isVisible(), "full author source preserved");
          await first.locator(":scope > summary").click();
          assert.equal(await first.getAttribute("open"), null, "tap closes disclosure");
          // Test that the same semantic native summary is keyboard operable.
          if (width === 390) {
            await first.locator(":scope > summary").focus();
            await page.keyboard.press("Enter");
            assert.equal(await first.getAttribute("open"), "", "Enter opens disclosure");
          }
          const guide = page.locator("#tantra-teacher");
          assert.equal(await guide.count(), 1, "single Meet Andy block");
          const compact = await guide.evaluate((section) => {
            const r = section.getBoundingClientRect();
            const image = section.querySelector(".tantra-teacher__photo img")?.getBoundingClientRect();
            return {
              height: r.height, width: r.width, left: r.left, right: r.right,
              imageHeight: image?.height || 0,
              archiveCount: section.querySelectorAll("details").length,
              archiveOpen: section.querySelector("details")?.open,
            };
          });
          const viewportHeight = width === 320 ? 568 : width === 390 ? 740 : 800;
          const whereGuide = engineName + "/" + locale + "/" + width + " guide";
          assert.ok(compact.height <= viewportHeight - 32, whereGuide + ": full collapsed teacher block fits one phone viewport (height " + compact.height + " vs " + viewportHeight + ")");
          assert.ok(compact.imageHeight >= 130 && compact.imageHeight <= 170, whereGuide + ": photo is visible without consuming most of the screen");
          assert.ok(compact.left >= -2 && compact.right <= width + 2, whereGuide + ": block fits phone width");
          assert.equal(compact.archiveCount, 1, whereGuide + ": one compact archive row, no duplicate disclosure");
          assert.equal(compact.archiveOpen, false, whereGuide + ": long historical materials start closed");
          assert.equal(await guide.locator(".tantra-teacher__copy > a").getAttribute("href"), "/" + locale + "/about");
          await guide.locator(".tantra-teacher__history > summary").click();
          assert.ok(await guide.locator("#tantra-original-academy-history h3").isVisible(), whereGuide + ": Academy source retained");
          assert.ok(await guide.locator("#tantra-original-author-biography h3").isVisible(), whereGuide + ": biography source retained");
          assert.equal(await guide.locator(".tantra-teacher__history-body > a").count(), 1, whereGuide + ": source link remains inside archive");
          await guide.locator(".tantra-teacher__history > summary").click();
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          assert.ok(overflow <= 2, engineName + "/" + locale + "/" + width + ": no document horizontal overflow (" + overflow + "px)");
          console.log("PASS", engineName, locale, width, "photo-left cards, full-width, disclosure and no overflow");
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
