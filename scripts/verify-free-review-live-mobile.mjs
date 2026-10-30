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

// Safari can dispatch a label's forwarded radio change one frame after
// Playwright's label click completes. Verify the actual native radio AND its
// React-selected card after ONE tap, rather than retrying a missed click.
async function tapFocusAndVerify(page, enquiry, focus) {
  const card = enquiry.locator('[data-express-focus="' + focus + '"]');
  await card.scrollIntoViewIfNeeded();
  // Wait for the actual card to stop moving and remain the hit target after
  // the hero anchor's smooth scroll. Still perform exactly one ordinary tap.
  const handle = await card.elementHandle();
  await page.waitForFunction((element) => {
    if (!element?.isConnected) return false;
    const r = element.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const target = document.elementFromPoint(x, y);
    const previous = window.__hhFocusTapGeometry;
    const stable = previous?.element === element && Math.abs(previous.x - x) < 0.5 && Math.abs(previous.y - y) < 0.5;
    window.__hhFocusTapGeometry = { element, x, y, frames: stable ? previous.frames + 1 : 0 };
    return x > 0 && x < innerWidth && y > 0 && y < innerHeight &&
      Boolean(target && (target === element || element.contains(target))) && window.__hhFocusTapGeometry.frames >= 6;
  }, handle, { timeout: 10000 });
  await card.click();
  await page.waitForFunction((target) => {
    const root = document.querySelector('[data-personal-express-enquiry]');
    const radio = root?.querySelector('input[name="express-review-focus"][value="' + target + '"]');
    const card = root?.querySelector('[data-express-focus="' + target + '"]');
    return radio instanceof HTMLInputElement && radio.checked
      && card?.getAttribute("data-selected") === "true";
  }, focus, { timeout: 3000 });
}
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
          const video = main.locator("[data-free-review-intro-video]");
          const mainCta = hero.locator('a[href="#request-free-review"]');
          await video.waitFor({ state: "visible", timeout: 25000 });
          await mainCta.waitFor({ state: "visible" });
          assert.ok((await hero.locator("h1").innerText()).trim().length > 15);
          assert.match(await hero.innerText(), /Andrey|Андреем|Андрей/i, "Andrey named in hero");
          assert.equal(await video.locator("iframe").count(), 0, "hero video does not autoplay");
          assert.equal(await video.getAttribute("data-intro-audio-language"), locale,
            "approved video introduction uses exact page audio language");
          const selected = video.locator("button.site-video-play");
          assert.equal(await selected.count(), 1, "separate video is poster-first");
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
            const video = main.querySelector('[data-free-review-intro-video]');
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
          assert.ok(geometry.video.top >= geometry.hero.bottom - 1, "personal video below hero, not inside it");
          assert.ok(geometry.cta.height >= 44, "CTA has 44px touch target");
          assert.ok(geometry.outcome.top > geometry.video.top, "benefits after dedicated video");
          assert.ok(geometry.method.top > geometry.outcome.top, "one method screen after benefits");
          assert.ok(geometry.process.top > geometry.method.top, "steps after method");
          assert.ok(geometry.enquiry.top > geometry.process.top, "one form at the bottom");
          await page.screenshot({ path: output + "/" + name + "-first-screen.png",
            animations: "disabled", timeout: 20000 });
          const reveal = enquiry.locator("[data-express-reveal]");
          const disclosure = enquiry.locator("[data-express-inline-disclosure]");
          assert.equal(await reveal.count(), 1, "one inline reveal button");
          assert.equal(await reveal.getAttribute("aria-expanded"), "false", "collapsed by default");
          assert.equal(await disclosure.isVisible(), false, "form starts folded into landing");
          assert.equal(await main.locator('[role="dialog"], [aria-modal="true"]').count(), 0,
            "no modal or overlay at initial render");
          const radios = enquiry.locator('input[name="express-review-focus"]');
          assert.equal(await radios.count(), 2, "exactly two request focuses");
          assert.equal(await enquiry.locator('input[name="express-review-focus"]:checked').count(), 1, "a single selected focus");
          assert.equal(await enquiry.locator('[data-reiki-phone-enquiry]').count(), 1,
            "only one CRM-first contact capture");
          const featured = main.locator("[data-featured-free-review-testimonials]");
          await featured.waitFor({ state: "visible" });
          const featuredGeometry = await featured.evaluate(section => {
            const cards = [...section.querySelectorAll("[data-testimonial-video-id]")];
            const bounds = cards.map(card => {
              const r = card.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
            });
            return {
              ids: cards.map(card => card.getAttribute("data-testimonial-video-id")),
              bounds,
              loadedIframes: section.querySelectorAll("iframe").length,
              displayed: cards.every(card => getComputedStyle(card).display !== "none"),
            };
          });
          assert.equal(featuredGeometry.ids.length, 3, "three authentic videos visible without opening archive");
          assert.equal(new Set(featuredGeometry.ids).size, 3, "no repeated featured video");
          assert.equal(featuredGeometry.ids[0], locale === "ru" ? "muOnIHllI7E" : "Dk0LBmOivQo",
            "RU diagnosis story prioritized; EN/ES use original EN testimonials");
          assert.equal(featuredGeometry.displayed, true, "three videos are not hidden");
          assert.equal(featuredGeometry.loadedIframes, 0, "no testimonial autoplay");
          assert.ok(featuredGeometry.bounds.every(r => r.left >= -2 && r.right <= width + 2),
            "each featured poster fits the viewport");
          if (width === 390) await page.screenshot({
            path: output + "/" + name + "-featured-videos.png", animations: "disabled", timeout: 20000 });
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
          const iframe = video.locator('iframe[data-video-playback]');
          await iframe.waitFor({ state: "attached", timeout: 20000 });
          const embedSrc = await iframe.getAttribute("src");
          const expectedEmbed = locale === "ru"
            ? /^https:\/\/www\.youtube-nocookie\.com\/embed\/Cz6SxXJNZbw\?/
            : locale === "en"
              ? /^https:\/\/www\.youtube-nocookie\.com\/embed\/s30Y42IwPcg\?/
              : /^https:\/\/app\.heygen\.com\/embeds\/2c251709aba74fd96ae8be43257a080b$/;
          assert.match(embedSrc, expectedEmbed,
            "existing source language matches locale; no invented diagnosis video");
          await mainCta.click({ timeout: 15000 });
          assert.equal(new URL(page.url()).hash, "#request-free-review", "hero goes to start form");
          await enquiry.waitFor({ state: "visible" });
          await disclosure.waitFor({ state: "visible" });
          assert.equal(await reveal.getAttribute("aria-expanded"), "true", "hero CTA unfolds same-page form");
          assert.equal(await disclosure.getAttribute("role"), "region");
          assert.equal(await disclosure.evaluate(element => getComputedStyle(element).position), "static",
            "unfolded form stays in normal document flow");
          // Read both rectangles in one browser task: while navigating to #request-free-review,
          // WebKit can still be smooth-scrolling. Two awaited locator.boundingBox()
          // calls may sample different scroll offsets and falsely report an overlap.
          const inFlowBounds = await enquiry.evaluate(root => {
            const trigger = root.querySelector("[data-express-reveal]");
            const region = root.querySelector("[data-express-inline-disclosure]");
            if (!(trigger instanceof HTMLElement) || !(region instanceof HTMLElement)) return null;
            const button = trigger.getBoundingClientRect();
            const panel = region.getBoundingClientRect();
            const style = getComputedStyle(region);
            return {
              revealBottom: button.bottom,
              panelTop: panel.top,
              gap: panel.top - button.bottom,
              position: style.position,
              transform: style.transform,
            };
          });
          assert.ok(inFlowBounds && inFlowBounds.position === "static"
            && inFlowBounds.transform === "none" && inFlowBounds.gap >= -2,
            "form pushes the landing down directly beneath its reveal button: "
              + JSON.stringify(inFlowBounds));
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden",
            "capture must not block page scrolling");
          assert.equal(await main.locator('[role="dialog"], [aria-modal="true"]').count(), 0,
            "no modal after clicking the hero CTA");
          assert.equal(await enquiry.locator('input[type="tel"]').count(), 1, "one phone field");
          assert.equal(await enquiry.locator('input[type="checkbox"]').isChecked(), false,
            "opening the form is not contact consent");
          // The protected v2 wizard and the legacy compact capture are distinct
          // safe variants. Neither navigation nor form opening creates a lead.
          const wizardV2 = await enquiry.locator('[data-free-express-lead]').count() === 1;
          if (wizardV2) {
            const lead = enquiry.locator('[data-free-express-lead]');
            assert.equal(await lead.locator('textarea').count(), 1, "one short question");
            assert.equal(await lead.locator('input[type="checkbox"]').isChecked(), false,
              "explicit consent remains unchecked");
            assert.equal(await enquiry.locator('[data-free-express-receipt]').count(), 0,
              "no CRM receipt from opening the form");
            const fit = await enquiry.evaluate(root => {
              const card = root.getBoundingClientRect();
              const submit = root.querySelector('[data-free-express-lead] button[type="submit"]')?.getBoundingClientRect();
              const fixedTab = [...document.querySelectorAll('nav')]
                .filter(nav => getComputedStyle(nav).position === 'fixed')
                .map(nav => nav.getBoundingClientRect())
                .find(rect => rect.top > 0 && rect.top < innerHeight);
              return { cardHeight: card.height, cardTop: card.top, submitBottom: submit?.bottom,
                tabTop: fixedTab?.top ?? innerHeight,
                overflow: document.documentElement.scrollWidth - innerWidth };
            });
            record.compactLeadFit = fit;
            assert.ok(fit.cardHeight <= height - 90,
              "first-contact section is not one mobile screen: " + JSON.stringify(fit));
            assert.ok(fit.submitBottom <= fit.tabTop - 8,
              "submit button must sit above fixed bottom tabs: " + JSON.stringify(fit));
            assert.ok(fit.overflow <= 2, "mobile capture has no horizontal overflow");
            assert.equal(await page.locator('[data-first-party-consent]').isVisible(), false,
              "optional visitor analytics prompt cannot cover an open contact form");
            if (width === 390) await page.screenshot({
              path: output + "/" + name + "-compact-v2.png",
              animations: "disabled", timeout: 20000 });
          } else {
            assert.equal(await enquiry.locator('[data-contact-channel-submit="whatsapp"]').count(), 1);
            assert.equal(await enquiry.locator('[data-contact-channel-submit="telegram"]').count(), 1);
            // Telegram's readiness fallback is also role="status" and is NOT a lead.
            // Inspect only this consented capture's receipt/confirmation statuses.
            assert.equal(await enquiry.locator('[data-reiki-phone-enquiry] [role="status"]').count(), 0,
              "no actual lead saved by navigating");
          }
          // Touch users select the full 94px+ labelled card, not the tiny native
          // radio dot. WebKit may still be smoothly scrolling from the hero
          // anchor and a direct input.check() can hit a moving 19px target.
          // Verify the REAL large-card interaction, including native checked
          // state, selected styling and unchanged one-off contact consent.
          // Exercise the two formerly intermittent Spanish WebKit widths
          // three times. No click retries: each real tap must change the radio.
          const cycles = engine === "webkit" && locale === "es"
            && (width === 320 || width === 430) ? 3 : 1;
          for (let cycle = 0; cycle < cycles; cycle++) {
            await tapFocusAndVerify(page, enquiry, "energy");
            assert.equal(await enquiry.locator('input[type="checkbox"]').isChecked(), false,
              "changing the focus cannot silently opt the user in");
            await tapFocusAndVerify(page, enquiry, "situation");
          }
          const receiptStatus = wizardV2
            ? '[data-free-express-receipt]'
            : '[data-reiki-phone-enquiry] [role="status"]';
          assert.equal(await enquiry.locator(receiptStatus).count(), 0,
            "changing focus is not a lead or booking");
          await enquiry.locator('input[type="tel"]').focus();
          await page.keyboard.press("Escape");
          assert.equal(await reveal.getAttribute("aria-expanded"), "false", "Escape folds the form");
          assert.equal(await disclosure.isVisible(), false);
          await reveal.click();
          assert.equal(await reveal.getAttribute("aria-expanded"), "true", "local CTA unfolds again");
          assert.equal(await disclosure.isVisible(), true);
          await reveal.click();
          // Wait for React to commit the one real tap; do not retry the action.
          await page.waitForFunction(() => document.querySelector('[data-express-reveal]')?.getAttribute('aria-expanded') === 'false', null, {timeout: 10000});
          assert.equal(await disclosure.isVisible(), false, "second tap closes in place");
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
