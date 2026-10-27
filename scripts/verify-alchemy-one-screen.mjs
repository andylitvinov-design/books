// Isolated public-only geometry QA. No account, playback, submission or provider sends.
// Run against the current PR's loopback Next production server, never against live.
import assert from "node:assert/strict";
import { installAlchemyDisclosureGuard } from "./helpers/alchemy-disclosure-guard.mjs";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const engine = process.env.HH_ALCHEMY_BROWSER === "webkit" ? "webkit" : "chromium";

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Alchemy QA requires an isolated loopback server");

const chapters = ["featured-video", "hero", "situations", "method", "report", "video", "reviews", "formats", "faq", "request"];
const cases = [
  ...["en", "ru", "es"].flatMap(locale => [320, 375, 390, 430].map(width => ({ locale, width, height: 844 }))),
  { locale: "en", width: 320, height: 568 },
  { locale: "ru", width: 320, height: 568 },
  { locale: "es", width: 320, height: 568 },
  { locale: "en", width: 390, height: 667 },
];
const report = [];
const failures = [];
const browser = await (engine === "webkit" ? webkit : chromium).launch();
try {
  for (const {locale,width,height} of cases) {
    const context = await browser.newContext({viewport:{width,height}, serviceWorkers:"block"});
    const page = await context.newPage();
    const disclosureViolations = [];
    let settleDisclosure = async () => {};
    page.on("pageerror", error => disclosureViolations.push("page error: " + String(error)));
    const key = locale + "/" + width + "x" + height;
    try {
      const response = await page.goto(origin + "/" + locale + "/services/alchemy-of-soul", {waitUntil:"networkidle",timeout:45000});
      assert.equal(response?.status(), 200, key + ": route must return HTTP 200");
      const root = page.locator('main[data-core-service-detail="alchemy"]');
      await root.locator('h1').waitFor({state:"visible",timeout:30000});
      const data = await root.evaluate((node) => {
        const viewport = innerWidth;
        const panels = Array.from(node.querySelectorAll("[data-alchemy-panel]"), section => {
          const rect = section.getBoundingClientRect();
          const visual = section.getAttribute("data-alchemy-visual");
          const photo = section.querySelector("img");
          const video = section.querySelector(".site-video-player");
          const overflow = Array.from(section.querySelectorAll("a,button,summary,h1,h2,h3,img,article,.site-video-player"))
            .filter(el => {
              const s = getComputedStyle(el), r = el.getBoundingClientRect();
              return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
            }).filter(el => {
              const r = el.getBoundingClientRect();
              return r.left < -1 || r.right > viewport + 1;
            }).length;
          return {
            name: section.getAttribute("data-alchemy-panel"),
            visual, hasMedia: visual === "photo" ? Boolean(photo) : Boolean(video),
            height: Math.ceil(rect.height), width: Math.ceil(rect.width),
            maxHeight: innerHeight - 80, escapingChildren: overflow
          };
        });
        const reviewSection = node.querySelector('[data-alchemy-panel="reviews"]');
        const feed = reviewSection?.querySelector("[data-alchemy-review-stack]");
        const reviewCards = Array.from(feed?.querySelectorAll("[data-testimonial-video-id]") ?? [], card => {
          const rect = card.getBoundingClientRect();
          const frame = card.querySelector(".site-video-frame")?.getBoundingClientRect();
          return {
            id: card.getAttribute("data-testimonial-video-id"),
            audio: card.getAttribute("data-testimonial-original-audio"),
            top: Math.ceil(rect.top), bottom: Math.ceil(rect.bottom),
            width: Math.round(rect.width), videoWidth: Math.round(frame?.width ?? 0),
          };
        });
        const sectionRect = reviewSection?.getBoundingClientRect();
        const headingRect = reviewSection?.querySelector("header")?.getBoundingClientRect();
        const firstRect = feed?.firstElementChild?.getBoundingClientRect();
        const noteRect = reviewSection?.querySelector("[data-alchemy-review-note]")?.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth, viewportHeight: innerHeight, panels,
          reviews: {
            cards: reviewCards,
            topGap: headingRect && firstRect ? Math.round(firstRect.top - headingRect.bottom) : 999,
            bottomGap: sectionRect && noteRect ? Math.round(sectionRect.bottom - noteRect.bottom) : 999,
          },
        };
      });
      const issues = [];
      if (data.documentWidth > width + 1) issues.push("horizontal document overflow " + data.documentWidth);
      if (data.panels.length !== chapters.length) issues.push("expected ten chapters, got " + data.panels.length);
      for (let i=0;i<data.panels.length;i++) {
        const p=data.panels[i];
        if (p.name !== chapters[i]) issues.push("incorrect chapter order "+i+":"+p.name);
        if (!p.hasMedia) issues.push(p.name+" missing "+p.visual);
        if (p.name !== "reviews" && p.height > p.maxHeight) issues.push(p.name+" "+p.height+"px exceeds "+p.maxHeight+"px");
        if (p.escapingChildren) issues.push(p.name+" has "+p.escapingChildren+" escaping controls/content");
      }
      // The one-screen rule applies to the service chapters, but a feed of twelve
      // real videos must grow vertically without a blank viewport or horizontal cards.
      const cards = data.reviews.cards;
      if (cards.length !== 12) issues.push("expected 12 original-language testimonial videos, got " + cards.length);
      if (new Set(cards.map(c => c.id)).size !== 12) issues.push("duplicate testimonial video IDs");
      if (cards.some(c => !["en", "ru"].includes(c.audio))) issues.push("missing truthful original-audio tags");
      if (cards.some((c, i) => i > 0 && c.top < cards[i - 1].bottom - 1)) issues.push("testimonials overlap instead of stacking");
      if (cards.some(c => c.width - c.videoWidth > 12 || c.videoWidth < width - 65))
        issues.push("testimonial videos must occupy nearly the full mobile width");
      if (data.reviews.topGap > 55 || data.reviews.bottomGap > 55)
        issues.push("testimonial section has empty space (top " + data.reviews.topGap + ", bottom " + data.reviews.bottomGap + ")");
      if (!data.panels.some(p => p.name === "report" && p.hasMedia))
        issues.push("public fictional report sample must include a visible photo");
      if (await root.locator('[data-alchemy-method-sequence] li').count() !== 4)
        issues.push("all four method stages must be visible without expanding details");
      if (await root.locator('[data-alchemy-report-example] .does-not-exist').count() !== 0)
        issues.push("report placeholder unexpectedly found");
      const reportLink = await root.locator('a[href="/' + locale + '/services/alchemy-of-soul/example-report"]').count();
      if (reportLink !== 1) issues.push("example report route link missing");
      // Read-only booking disclosure: no data entry, enquiry, payment or messenger.
      if (width === 390 && height === 844) {
        const hero = root.locator('[data-alchemy-panel="hero"]');
        const booking = hero.locator('[data-contact-channel-chooser][data-session-booking-flow]');
        assert.equal(await booking.count(), 1, "one hero booking");
        assert.equal(await booking.getAttribute("data-booking-sku"), "personal-session-60", "hero booking SKU");
        const trigger = booking.locator('[data-contact-order][data-booking-cta="book"]');
        assert.equal(await trigger.count(), 1, "one Book disclosure");
        await trigger.waitFor({state:"visible"});
        assert.equal(await trigger.getAttribute("aria-expanded"), "false", "initially collapsed");
        settleDisclosure = await installAlchemyDisclosureGuard(context, page, origin, disclosureViolations);
          await trigger.click();
          assert.equal(await trigger.getAttribute("aria-expanded"), "true", "Book opens contact");
          const contact = booking.locator('form[data-booking-step="contact"]');
          assert.equal(await contact.count(), 1, "one contact step");
          await contact.waitFor({state:"visible"});
          const phone = contact.locator('[data-phone-country-input] input[type="tel"]');
          const consent = contact.locator('input[type="checkbox"]');
          const submit = contact.locator('button[type="submit"]');
          for (const [name, control] of [["phone", phone], ["consent", consent], ["submit", submit]]) {
            assert.equal(await control.count(), 1, name + " count");
            await control.waitFor({state:"visible"});
          }
          for (const control of [trigger, phone, submit]) {
            const box = await control.boundingBox();
            assert.ok(box && box.width >= 44 && box.height >= 44, "booking target at least 44px");
          }
          assert.notEqual(await phone.getAttribute("required"), null, "phone required");
          assert.equal(await phone.inputValue(), "", "no phone entered");
          assert.notEqual(await consent.getAttribute("required"), null, "consent required");
          assert.equal(await consent.isChecked(), false, "no implicit consent");
          assert.equal(await submit.isDisabled(), true, "unpaid empty submit disabled");
          assert.equal(await booking.locator('[data-booking-step="pending"],[data-booking-step="confirmed"],[data-booking-cta="pay"],[data-booking-payment-options],[data-booking-messenger],a[data-contact-channel]').count(), 0, "no premature receipt, payment or messenger");
          await trigger.click();
          assert.equal(await trigger.getAttribute("aria-expanded"), "false", "authored close");
          await contact.waitFor({state:"hidden"});
      }
      report.push({locale,width,height,...data,issues});
      if (issues.length) {
        failures.push(key+": "+issues.join("; "));
        console.error("ALCHEMY_GEOMETRY_FAIL "+key+" "+issues.join("; "));
      } else {
        console.log("PASS Alchemy "+engine+" "+key+" ten chapters and twelve full-width vertical reviews pass with no overflowing controls");
      }
      const sampleResponse = await page.goto(origin + "/" + locale + "/services/alchemy-of-soul/example-report", {waitUntil:"domcontentloaded",timeout:45000});
      assert.equal(sampleResponse?.status(),200,key+": sample report");
      assert.equal(await page.locator('[data-alchemy-example-report="fictional"]').count(),1,key+": no private client data");
    } catch (error) {
      failures.push(key+": "+String(error));
      console.error("ALCHEMY_QA_ERROR "+key+" "+String(error));
    } finally {
      try { await context.close(); } finally { await settleDisclosure(); }
      if (disclosureViolations.length) {
        failures.push(key + ": " + disclosureViolations.join("; "));
        console.error("ALCHEMY_DISCLOSURE_FAIL " + key + " " + disclosureViolations.join("; "));
      }
    }
  }
} finally { await browser.close(); }
const destination="artifacts/public-services-production";
await mkdir(destination,{recursive:true});
await writeFile(destination+"/alchemy-one-screen-geometry"+(engine === "webkit" ? "-webkit" : "")+".json", JSON.stringify({engine,cases:report,failures},null,2)+"\n");
assert.deepEqual(failures, [], "Alchemy viewport acceptance: "+failures.join(" | "));

