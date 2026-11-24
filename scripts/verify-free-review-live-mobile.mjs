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
  // The mobile bottom nav is fixed. When expanded content changes height,
  // WebKit may leave the large label behind that toolbar. A user would scroll
  // the card into a visible touch position first: do the same, and ASSERT the
  // real card receives a hit before making exactly ONE native touch tap.
  // Real touch users scroll before selecting: settle the viewport-aware target
  // once, without repeating any tap or changing consent on their behalf.
  await card.evaluate(node => node.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"}));
  await card.scrollIntoViewIfNeeded({timeout:15000});
  const targetHit = await card.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x,y);
    return {
      hittable: !!top && (top === node || node.contains(top)),
      rect: {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right},
      obstruction: top?.closest("nav")?.getAttribute("aria-label") || top?.tagName || null,
    };
  });
  assert.ok(targetHit.hittable, "One-tap focus card remains behind navigation after scroll: " + JSON.stringify(targetHit));
  await card.tap();
  // WebKit can briefly delay React's selected-card paint while the mobile
  // anchor settles. Still require BOTH native radio.checked and the real
  // rendered selected card after a SINGLE user tap (never retry a lost tap).
  try {
    await page.waitForFunction((target) => {
      const root = document.querySelector('[data-personal-express-enquiry]');
      const radio = root?.querySelector('input[name="express-review-focus"][value="' + target + '"]');
      const card = root?.querySelector('[data-express-focus="' + target + '"]');
      return radio instanceof HTMLInputElement && radio.checked
        && card?.getAttribute("data-selected") === "true";
    }, focus, { timeout: 8000 });
  } catch (error) {
    const actual = await enquiry.evaluate((root, target) => ({
      expanded: root.getAttribute("data-expanded"),
      nativeChecked: root.querySelector('input[name="express-review-focus"][value="' + target + '"]')?.checked ?? null,
      selectedCard: root.querySelector('[data-express-focus="' + target + '"]')?.getAttribute("data-selected") ?? null,
      selectedRadio: root.querySelector('input[name="express-review-focus"]:checked')?.value ?? null,
    }), focus);
    throw new Error("Single-tap focus was not committed: " + JSON.stringify({focus, actual, reason:String(error)}));
  }
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
          // The secure messenger handoff is intentionally lazy-mounted only after
          // this optional inline form is opened; the first screen has no form.
          assert.equal(await enquiry.locator('[data-messenger-only-contact]').count(), 0,
            "no unrequested messenger or contact form is mounted on first paint");

          const reviews = main.locator("[data-featured-free-review-testimonials]");
          await reviews.waitFor({ state: "visible" });
          const reviewFeed = reviews.locator('[data-review-list-direction="vertical"]');
          const reviewGeometry = await reviewFeed.evaluate(element => {
            const cards = [...element.querySelectorAll("[data-testimonial-video-id]")];
            const boxes = cards.map(card => {
              const rect = card.getBoundingClientRect();
              return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width:rect.width };
            });
            const captions = cards.map(card => {
              const title = card.querySelector(".site-video-title");
              const link = card.querySelector(".site-video-watch-link");
              return {
                title: title?.textContent?.trim() || "",
                titleColor: title ? getComputedStyle(title).color : "",
                linkVisible: !!link && getComputedStyle(link).display !== "none",
              };
            });
            return {
              ids: cards.map(card => card.getAttribute("data-testimonial-video-id")),
              direction: getComputedStyle(element).flexDirection,
              overflowX: getComputedStyle(element).overflowX,
              boxes, captions,
              allVisible: cards.every(card => getComputedStyle(card).display !== "none"),
              iframes: element.querySelectorAll("iframe").length,
              frames: element.querySelectorAll(".site-video-frame").length,
              documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
            };
          });
          assert.equal(reviewGeometry.ids.length, 12, "all twelve original client videos visible without an extra tap");
          assert.equal(new Set(reviewGeometry.ids).size, 12, "one card per original recording");
          assert.equal(reviewGeometry.ids[0], locale === "ru" ? "muOnIHllI7E" : "Dk0LBmOivQo",
            "Russian express review first in RU; first English original in EN/ES");
          assert.equal(reviewGeometry.direction, "column", "every review vertically stacked, never a swipe carousel");
          assert.equal(reviewGeometry.frames, 12, "each recording has a real click-to-play poster");
          assert.equal(reviewGeometry.iframes, 0, "no video autoplays or loads a third-party player on first paint");
          assert.ok(reviewGeometry.allVisible, "none of the twelve cards hidden behind an archive");
          assert.ok(reviewGeometry.boxes.every((r,i) => r.left >= -2 && r.right <= width + 2
            && (i === 0 || r.top >= reviewGeometry.boxes[i-1].bottom - 2)),
            "all cards fit phone and stack in normal document flow");
          assert.ok(reviewGeometry.captions.every(c => c.title.length > 8
            && c.titleColor === "rgb(20, 61, 58)" && c.linkVisible),
            "readable dark headings on warm white and genuine YouTube fallback links");
          assert.ok(reviewGeometry.documentOverflow <= 2, "no sideways page overflow");
          assert.equal(await main.locator("[data-review-stories]").count(), 0,
            "no hidden duplicate video archive after the twelve visible reviews");
          record.testimonials = reviewGeometry.ids.length;
          if (width === 390) {
            const cards = reviewFeed.locator("[data-testimonial-video-id]");
            await cards.first().screenshot({path: output + "/" + name + "-review-1.png",
              animations:"disabled", timeout:20000});
            await cards.last().screenshot({path: output + "/" + name + "-review-12.png",
              animations:"disabled", timeout:20000});
          }
          // The FAQ is the final block after the enquiry. All six native
          // disclosures are available without JS or a second navigation.
          const faq = main.locator("[data-free-review-faq]");
          await faq.waitFor({ state: "visible" });
          const items = faq.locator("details");
          assert.equal(await items.count(), 6, "all six localized questions appear at the bottom");
          assert.equal(await faq.locator("img").count(), 1, "the FAQ has its own real photo");
          assert.ok((await faq.locator("h2").innerText()).trim().length > 12,
            "localized FAQ heading is visible");
          const firstQuestion = items.first();
          assert.equal(await firstQuestion.evaluate(el => el.open), false,
            "FAQ questions start closed, not an intrusive pop-up");
          const faqTrigger = firstQuestion.locator("summary");
          const triggerBox = await faqTrigger.boundingBox();
          assert.ok(triggerBox && triggerBox.height >= 44 && triggerBox.width <= width,
            "native FAQ row remains a full-width, tappable phone control");
          await faqTrigger.click();
          assert.equal(await firstQuestion.evaluate(el => el.open), true,
            "tap expands one answer in-place");
          assert.ok((await firstQuestion.locator("p").innerText()).trim().length > 25,
            "expanded answer contains meaningful, localized guidance");
          await faqTrigger.click();
          assert.equal(await firstQuestion.evaluate(el => el.open), false,
            "second tap collapses the answer");
          const faqOrder = await main.evaluate(root => {
            const enquiry = root.querySelector("[data-personal-express-enquiry]");
            const faq = root.querySelector("[data-free-review-faq]");
            return !!(enquiry && faq && (enquiry.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING));
          });
          assert.ok(faqOrder, "FAQ belongs at the bottom, after the enquiry");
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 2,
            "FAQ remains inside iPhone width");
          record.faq = 6;

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
          const widget=enquiry.locator('[data-messenger-only-contact]');
          await widget.waitFor({state:"visible",timeout:15000});
          assert.equal(await widget.count(), 1, "exactly one opted-in messenger handoff after opening the form");
          const details=widget.locator('details');
          if(await details.count()&&await details.getAttribute('open')===null)
            await details.locator(':scope > summary').click();
          const wa=widget.locator('a[data-messenger-only-channel="whatsapp"]');
          const tg=widget.locator('a[data-messenger-only-channel="telegram"]');
          await wa.waitFor({state:"visible",timeout:10000});
          await tg.waitFor({state:"visible",timeout:10000});
          const draft=new URL(await wa.getAttribute('href'));
          assert.equal(draft.origin,'https://wa.me',"approved WhatsApp contact");
          assert.ok((draft.searchParams.get('text')||'').length>24,
            "public review identity and request appear in the messaging draft");
          assert.equal(await widget.locator('input[type="tel"],input[type="email"],form').count(),0,
            "email and typed phone cannot be a substitute for verified messenger contact");
          assert.equal(await enquiry.locator('[data-lead-saved], [data-free-express-receipt]').count(),0,
            "opening a link does not prove CRM write, booking or delivery");
          assert.equal(await widget.locator('a[data-messenger-only-channel]').count(),2,
            "exactly two messenger choices");
          const fit=await widget.evaluate(node=>({
            width:node.getBoundingClientRect().width,
            overflow:document.documentElement.scrollWidth-innerWidth,
          }));
          record.compactLeadFit=fit;
          assert.ok(fit.overflow<=2,"messenger options stay within iPhone width");
          if(width===390)await page.screenshot({
            path:output+"/"+name+"-messenger-only.png",animations:"disabled",timeout:20000
          });
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
            assert.equal(await widget.locator('input[type="checkbox"][required]').count(),0,
              "focus change never creates hidden consent or unverified web submission");
            await tapFocusAndVerify(page, enquiry, "situation");
          }
          assert.equal(await enquiry.locator('[data-lead-saved], [data-free-express-receipt]').count(),0,
            "changing the selected focus never fabricates a CRM lead");
          if(await details.count())await details.locator(':scope > summary').focus();
          await page.keyboard.press("Escape");
          assert.equal(await reveal.getAttribute("aria-expanded"), "false", "Escape folds the form");
          assert.equal(new URL(page.url()).hash, "", "closing clears the stale review anchor");
          assert.equal(await disclosure.isVisible(), false);
          await reveal.click();
          // A single real WebKit touch/click can commit React's aria-expanded
          // after Playwright's click has resolved. Do not retry the click or
          // silently accept a lost tap: require the actual React render within
          // a bounded window, or fail this exact viewport.
          await page.waitForFunction(() => {
            const button = document.querySelector("[data-express-reveal]");
            const panel = document.querySelector("[data-express-inline-disclosure]");
            return button?.getAttribute("aria-expanded") === "true" &&
              panel instanceof HTMLElement && !panel.hidden;
          }, null, { timeout: 4000 });
          assert.equal(await reveal.getAttribute("aria-expanded"), "true", "local CTA unfolds again");
          assert.equal(await disclosure.isVisible(), true);
          await reveal.click();
          await page.waitForFunction(() => {
            const button = document.querySelector("[data-express-reveal]");
            const panel = document.querySelector("[data-express-inline-disclosure]");
            return button?.getAttribute("aria-expanded") === "false" &&
              panel instanceof HTMLElement && panel.hidden;
          }, null, { timeout: 4000 });
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
