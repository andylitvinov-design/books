// Read-only mobile acceptance against the exact PR build or canonical alias.
// Chromium/WebKit emulate touch; this is not physical iPhone Safari verification.
// Never submit private questionnaires, create CRM leads, send messages or buy anything.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = (process.env.HH_LIVE_ORIGIN || "https://holistichouse.vercel.app").replace(/\/$/, "");
const output = "artifacts/free-review-live-mobile";
mkdirSync(output, { recursive: true });
const results = [];
const cases = [[320, 568], [375, 667], [390, 844], [430, 932]];
const ids = ["situation-written-free", "wu-xing-free", "personal-session-30-eur50"];
for (const [engine, driver] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await driver.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const [width, height] of cases) {
        const name = engine + "-" + locale + "-" + width + "x" + height;
        const record = { engine, locale, width, height };
        const context = await browser.newContext({
          viewport: { width, height }, deviceScaleFactor: 2,
          isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", e => errors.push(e.message.slice(0, 250)));
        try {
          const response = await page.goto(origin + "/" + locale + "/services/free-situation-review",
            { waitUntil: "domcontentloaded", timeout: 65000 });
          assert.equal(response?.status(), 200, "localized page HTTP 200");
          const main = page.locator('[data-free-entry-landing="situation"]');
          const hero = main.locator('section[aria-labelledby="free-entry-title"]');
          const video = main.locator("[data-featured-constellations-video]");
          const mainCta = hero.locator('a[href="#request-free-review"]');
          await video.waitFor({ state: "visible", timeout: 25000 });
          await mainCta.waitFor({ state: "visible" });
          assert.ok((await hero.locator("h1").innerText()).trim().length > 15);
          assert.match(await hero.innerText(), /Andrey|Андреем|Андрей/i, "Andrey named in hero");
          assert.equal(await video.locator("iframe").count(), 0, "hero video does not autoplay");
          const original = video.locator('a[href*="youtube.com/watch"]');
          assert.equal(await original.getAttribute("href"), "https://www.youtube.com/watch?v=sfVFOQNr2qk");
          const outcome = main.locator("#what-you-get");
          const process = main.locator("#how-it-works");
          const options = main.locator("#free-diagnosis-options");
          const topInvite = main.locator('#request-free-review #free-diagnosis-top');
          const bottomInvite = main.locator('#free-diagnosis-bottom');
          await topInvite.waitFor({ state: "visible" });
          assert.equal(await topInvite.count(), 1, "top direct messenger CTA");
          assert.equal(await bottomInvite.count(), 1, "bottom direct messenger CTA");
          assert.equal(await main.locator("[data-free-diagnostic-start]").count(), 0, "no retired Step 1 form");
          assert.equal(await main.locator('[data-free-diagnosis-layout="compact"]').count(), 1,
            "only this landing selects compact format cards");
          const geometry = await page.evaluate(() => {
            const r = element => {
              if (!element) return null;
              const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
              return { left, right, top, bottom, width, height };
            };
            const main = document.querySelector('[data-free-entry-landing="situation"]');
            const hero = main.querySelector('section[aria-labelledby="free-entry-title"]');
            const video = main.querySelector('[data-featured-constellations-video]');
            const frame = video.querySelector(".site-video-frame");
            const cta = hero.querySelector('a[href="#request-free-review"]');
            const nav = document.querySelector(".mobile-bottom-navigation");
            const process = main.querySelector("#how-it-works");
            const outcome = main.querySelector("#what-you-get");
            const options = main.querySelector("#free-diagnosis-options");
            return {
              overflow: document.documentElement.scrollWidth - innerWidth,
              viewport: { width: innerWidth, height: innerHeight },
              hero: r(hero), video: r(video), frame: r(frame), cta: r(cta),
              nav: r(nav), outcome: r(outcome), process: r(process), options: r(options),
              documentOrder: [hero, outcome, process, options].map(element =>
                element.compareDocumentPosition(options)),
            };
          });
          record.geometry = geometry;
          assert.ok(geometry.overflow <= 2, "no horizontal scroll: " + geometry.overflow);
          assert.ok(geometry.frame && Math.abs(geometry.frame.width / geometry.frame.height - 16 / 9) < 0.06,
            "landscape intro poster aspect ratio 16:9");
          assert.ok(geometry.video.bottom < geometry.cta.top, "watch first, CTA follows");
          assert.ok(geometry.cta.height >= 44, "CTA has 44px touch target");
          assert.ok(geometry.outcome.top > geometry.hero.top, "benefits after video hero");
          assert.ok(geometry.process.top > geometry.outcome.top, "process after benefits");
          assert.ok(geometry.options.top > geometry.process.top, "three choices below benefits and process");
          await page.screenshot({ path: output + "/" + name + "-first-screen.png",
            animations: "disabled", timeout: 20000 });
          const cards = main.locator("[data-diagnosis-offer]");
          assert.equal(await cards.count(), 3, "three real formats only");
          for (const id of ids) {
            const card = cards.filter({ has: page.locator('[data-diagnosis-order="' + id + '"]') });
            assert.equal(await card.count(), 1, "real offer " + id);
            const button = card.locator("button[data-diagnosis-order]");
            assert.ok((await button.boundingBox())?.height >= 44, "offer request button tap target");
            assert.ok(await card.locator("img").count() > 0, "genuine source photo");
          }
          const cardBoxes = await cards.evaluateAll(items => items.map(element => {
            const r = element.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          }));
          assert.ok(cardBoxes.every(r => r.left >= -2 && r.right <= width + 2), "offers fit phone width");
          assert.ok(cardBoxes.every((r, i) => i === 0 || r.top >= cardBoxes[i - 1].bottom - 2),
            "offers stack vertically");
          const firstDetails = cards.first().locator("details");
          assert.equal(await firstDetails.count(), 1, "long description optional");
          assert.equal(await firstDetails.evaluate(element => element.open), false, "short card by default");
          await firstDetails.locator("summary").click();
          assert.equal(await firstDetails.evaluate(element => element.open), true, "explanation expands on demand");
          const reviews = main.locator("[data-review-stories]");
          assert.equal(await reviews.count(), 1, "existing authentic video reviews preserved");
          assert.equal(await reviews.evaluate(element => element.open), false, "light page until requested");
          await reviews.locator(":scope > summary").click();
          const reviewFeed = reviews.locator('[data-personal-testimonials="all"] [data-vertical-review-list]');
          await reviewFeed.waitFor({ state: "visible" });
          const reviewGeometry = await reviewFeed.evaluate(element => {
            const cards = [...element.querySelectorAll("[data-testimonial-video-id]")];
            return {
              direction: getComputedStyle(element).flexDirection,
              overflowX: getComputedStyle(element).overflowX,
              ids: cards.map(item => item.getAttribute("data-testimonial-video-id")),
              boxes: cards.map(item => {
                const r = item.getBoundingClientRect();
                return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
              }),
              iframes: element.querySelectorAll("iframe").length,
            };
          });
          assert.equal(reviewGeometry.ids.length, 12, "all twelve authentic testimonials remain");
          assert.equal(new Set(reviewGeometry.ids).size, 12, "no duplicated testimonials");
          assert.equal(reviewGeometry.ids[0], locale === "ru" ? "m9RfDgK76PU" : "Dk0LBmOivQo",
            "primary locale audio first");
          assert.equal(reviewGeometry.direction, "column", "vertical mobile reviews");
          assert.ok(reviewGeometry.boxes.every((r,i) => i === 0 || r.top >= reviewGeometry.boxes[i-1].bottom - 2),
            "testimonials vertically aligned");
          assert.ok(reviewGeometry.boxes.every(r => r.left >= -2 && r.right <= width + 2),
            "testimonials within viewport");
          assert.equal(reviewGeometry.iframes, 0, "testimonials do not autoplay");
          record.testimonials = reviewGeometry.ids.length;
          if (width === 390) await page.screenshot({
            path: output + "/" + name + "-reviews.png", animations: "disabled", timeout: 20000 });
          const play = video.locator("button.site-video-play");
          await play.waitFor({ state: "visible" });
          await play.click({ timeout: 15000 });
          const iframe = video.locator('iframe[data-video-playback="youtube"]');
          await iframe.waitFor({ state: "attached", timeout: 20000 });
          assert.match(await iframe.getAttribute("src"), /^https:\/\/www\.youtube-nocookie\.com\/embed\/sfVFOQNr2qk\?/,
            "approved YouTube source only");
          await mainCta.click({ timeout: 15000 });
          assert.equal(new URL(page.url()).hash, "#request-free-review", "hero goes to start form");
          await topInvite.waitFor({ state: "visible" });
          assert.equal(await main.locator("[data-reiki-phone-enquiry]").count(), 0, "a CTA click is not a lead");
          await topInvite.click({ timeout: 15000 });
          const dialog = main.locator('[data-diagnosis-order-form][data-open="true"]');
          await dialog.waitFor({ state: "visible" });
          assert.equal(await dialog.getAttribute("role"), "dialog", "free request opens one consented chooser");
          const messenger = dialog.locator("[data-reiki-phone-enquiry]");
          await messenger.waitFor({ state: "visible" });
          assert.equal((await dialog.locator("#diagnosis-request-heading").innerText()).trim(),
            (await cards.first().locator("h3").innerText()).trim(), "top CTA selects free review");
          assert.equal(await messenger.locator('input[type="tel"]').count(), 1, "one phone input");
          assert.equal(await messenger.locator('input[type="checkbox"]').isChecked(), false, "no implied consent");
          assert.equal(await messenger.locator('[data-contact-channel-submit="whatsapp"]').count(), 1, "WhatsApp action");
          assert.equal(await messenger.locator('[data-contact-channel-submit="telegram"]').count(), 1, "Telegram action");
          assert.equal(await messenger.locator('[role="status"]').count(), 0, "not a committed lead");
          await page.keyboard.press("Escape");
          await messenger.waitFor({ state: "detached" });
          await cards.nth(2).locator('button[data-diagnosis-order="personal-session-30-eur50"]').click();
          await messenger.waitFor({ state: "visible" });
          assert.equal((await dialog.locator("#diagnosis-request-heading").innerText()).trim(),
            (await cards.nth(2).locator("h3").innerText()).trim(), "€50 paid option selected");
          assert.equal(await messenger.locator('input[type="checkbox"]').isChecked(), false, "consent not preselected");
          assert.equal(await messenger.locator('[role="status"]').count(), 0, "not a booking or payment");
          await dialog.locator("button[aria-label]").first().click();
          await messenger.waitFor({ state: "detached" });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 2,
            "expanded content still fits viewport");
          record.status = "PASS";
          console.log("PASS " + name + " screen " + Math.round(geometry.hero.height) + "px");
        } catch (error) {
          record.status = "FAIL";
          record.error = String(error.stack || error.message).slice(0, 3000);
          console.error("FAIL " + name + " " + record.error);
          await page.screenshot({ path: output + "/" + name + "-failed.png",
            fullPage: true, animations: "disabled", timeout: 15000 }).catch(() => {});
        } finally {
          record.pageErrors = errors;
          results.push(record);
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }
}
writeFileSync(output + "/results.json", JSON.stringify({
  origin, checkedAt: new Date().toISOString(), results,
}, null, 2));
const failures = results.filter(record => record.status !== "PASS");
console.log("TOTAL " + results.length + " PASS " + (results.length - failures.length) +
  " FAIL " + failures.length);
assert.equal(failures.length, 0, "Inspect screenshots and failed assertions in the workflow artifact");
