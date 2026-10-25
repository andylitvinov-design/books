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
// One personal express review, with two focus categories in a single form.
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
          const method = main.locator("#how-i-review");
          const enquiry = main.locator("[data-personal-express-enquiry]");
          await method.waitFor({ state: "visible" });
          await enquiry.waitFor({ state: "visible" });
          assert.equal(await main.locator("[data-diagnosis-offer]").count(), 0,
            "three retired offer cards must not be on this landing");
          assert.equal(await main.locator("[data-free-diagnosis-options]").count(), 0,
            "no choose-three-options section");
          assert.equal(await main.locator("[data-personal-express-enquiry]").count(), 1,
            "only one personal express request form");
          assert.equal(await main.locator("[data-free-diagnostic-start]").count(), 0,
            "no retired Step 1 form");
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
            const method = main.querySelector("#how-i-review");
            const enquiry = main.querySelector("[data-personal-express-enquiry]");
            return {
              overflow: document.documentElement.scrollWidth - innerWidth,
              viewport: { width: innerWidth, height: innerHeight },
              hero: r(hero), video: r(video), frame: r(frame), cta: r(cta),
              nav: r(nav), outcome: r(outcome), method: r(method), process: r(process), enquiry: r(enquiry),
            };
          });
          record.geometry = geometry;
          assert.ok(geometry.overflow <= 2, "no horizontal scroll: " + geometry.overflow);
          assert.ok(geometry.frame && Math.abs(geometry.frame.width / geometry.frame.height - 16 / 9) < 0.06,
            "landscape intro poster aspect ratio 16:9");
          assert.ok(geometry.video.bottom < geometry.cta.top, "watch first, CTA follows");
          assert.ok(geometry.cta.height >= 44, "CTA has 44px touch target");
          assert.ok(geometry.outcome.top > geometry.hero.top, "benefits after video hero");
          assert.ok(geometry.method.top > geometry.outcome.top, "one method screen after benefits");
          assert.ok(geometry.process.top > geometry.method.top, "steps after method");
          assert.ok(geometry.enquiry.top > geometry.process.top, "one form at the bottom");
          await page.screenshot({ path: output + "/" + name + "-first-screen.png",
            animations: "disabled", timeout: 20000 });
          const radios = enquiry.locator('input[name="express-review-focus"]');
          assert.equal(await radios.count(), 2, "exactly two request focuses");
          assert.equal(await radios.filter({ checked: true }).count(), 1, "a single selected focus");
          assert.equal(await enquiry.locator('[data-reiki-phone-enquiry]').count(), 1,
            "only one CRM-first contact capture");
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
          await enquiry.waitFor({ state: "visible" });
          assert.equal(await enquiry.locator('input[type="tel"]').count(), 1, "one phone field");
          assert.equal(await enquiry.locator('input[type="checkbox"]').isChecked(), false,
            "opening the form is not contact consent");
          assert.equal(await enquiry.locator('[data-contact-channel-submit="whatsapp"]').count(), 1);
          assert.equal(await enquiry.locator('[data-contact-channel-submit="telegram"]').count(), 1);
          assert.equal(await enquiry.locator('[role="status"]').count(), 0,
            "no actual lead saved by navigating");
          await enquiry.locator('input[value="energy"]').check();
          assert.equal(await enquiry.locator('[data-express-focus="energy"]').getAttribute('data-selected'), "true");
          assert.equal(await enquiry.locator('input[type="checkbox"]').isChecked(), false,
            "changing the focus cannot silently opt the user in");
          await enquiry.locator('input[value="situation"]').check();
          assert.equal(await enquiry.locator('[data-express-focus="situation"]').getAttribute('data-selected'), "true");
          assert.equal(await enquiry.locator('[role="status"]').count(), 0,
            "changing focus is not a lead or booking");
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
