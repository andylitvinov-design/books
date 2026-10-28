// Loopback-only responsive browser acceptance for the alternative Support recommender.
// Synthetic slider entries; no authentication, charges, CRM submissions or provider playback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Personal Support browser verification is loopback-only");
const output = "artifacts/holistic-support-recommendations";
await mkdir(output, { recursive: true });
const evidence = [];

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + ":" + locale + ":" + width;
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          hasTouch: true, isMobile: true, reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        // Only inspect the iframe src, never contact third-party YouTube playback.
        await page.route("**/youtube-nocookie.com/**", route => route.abort());
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + ": public route");
          const root = page.locator("[data-holistic-mobile-alternative]");
          await root.waitFor({ state: "visible", timeout: 30000 });
          assert.equal(await root.locator('[data-support-scale] input[type="range"]').count(), 4,
            label + ": four accessible self-ratings");
          assert.equal(await root.locator('[data-support-detailed-analysis]').getAttribute("href"),
            "/" + locale + "/personality-profiles", label + ": canonical profile, no duplicate test flow");
          await page.waitForFunction(() => {
            const input = document.querySelector('[data-support-focus="all"]');
            return Boolean(input && Object.keys(input).some(key => key.startsWith("__reactProps$")));
          }, null, {timeout:30000});
          const focus = root.locator('input[type="radio"][name="support-focus"]');
          assert.equal(await focus.count(), 5, label + ": four inline domains and All");
          assert.equal(await root.locator('[data-support-focus="all"]').isChecked(), true, label + ": All initially");
          await root.locator('[data-support-focus="relationships"]').check();
          assert.equal(await root.locator('input[name="support-focus"]:checked').count(), 1, label + ": exclusive focus");
          const slider = root.locator('[data-support-scale="relationships"] input[type="range"]');
          await slider.focus();
          await slider.press("Home");
          await slider.press("ArrowRight");
          assert.equal(await slider.inputValue(), "2", label + ": real keyboard slider input");
          await root.locator("[data-support-recommendations]").click();
          const recommendations = root.locator("[data-support-personal-recommendations]");
          await recommendations.waitFor({ state: "visible" });
          assert.ok((await recommendations.innerText()).includes("2/10"),
            label + ": reflects exact submitted self-rating");
          const videoCard = recommendations.locator("[data-support-recommended-video]");
          assert.equal(await videoCard.count(), 1, label + ": one verified selected recording");
          const videoId = await videoCard.getAttribute("data-support-recommended-video");
          assert.match(videoId, /^[A-Za-z0-9_-]{11}$/, label + ": source YouTube ID");
          const symbolCard = recommendations.locator("[data-support-recommended-talisman]");
          assert.equal(await symbolCard.getAttribute("data-support-recommended-talisman"), "fu-harmony",
            label + ": relationships maps to published harmony talisman");
          await videoCard.locator("button").click();
          assert.equal(await root.locator('[data-support-player] iframe').count(), 0,
            label + ": no unintended autoplay before explicit Play");
          await symbolCard.locator("button").click();
          const viewer = root.locator("[data-support-talisman-viewer]");
          await viewer.waitFor({ state: "visible" });
          assert.equal(await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-harmony", label + ": recommended symbol opens in the same scenic viewer");
          assert.equal(await viewer.locator("[data-support-talisman-thumb]").count(), 3,
            label + ": three existing illustrated designs; no fabricated stock");
          assert.equal(await root.locator('[data-support-player] iframe').count(), 0,
            label + ": changing to talisman mode stops the video");
          const first = await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman");
          await viewer.locator("[data-support-talisman-next]").click();
          assert.notEqual(await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            first, label + ": carousel next control really changes the design");
          await viewer.locator('[data-support-talisman-thumb="fu-harmony"]').click();
          assert.equal(await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-harmony", label + ": tapping an illustration returns to the selected symbol");
          // Dispatch native touch events against React's hydrated viewer; this
          // exercises the real swipe handlers rather than only checking arrows.
          await viewer.locator("[data-support-talisman]").evaluate(element => {
            const first = new Touch({ identifier: 1, target: element, clientX: 270, clientY: 240 });
            const last = new Touch({ identifier: 1, target: element, clientX: 120, clientY: 240 });
            element.dispatchEvent(new TouchEvent("touchstart", {
              bubbles: true, touches: [first], targetTouches: [first], changedTouches: [first],
            }));
            element.dispatchEvent(new TouchEvent("touchend", {
              bubbles: true, touches: [], targetTouches: [], changedTouches: [last],
            }));
          });
          assert.notEqual(await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-harmony", label + ": real touch-start/end swipe changes the design");
          await viewer.locator('[data-support-talisman-filter="goal"] select').selectOption("money");
          assert.equal(await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-prosperity", label + ": changing goal ranks an existing design, not a new SKU");
          await viewer.locator("[data-support-talisman-request]").click();
          const inlineOrder = page.locator('dialog[aria-labelledby="support-talisman-order-title"]');
          await inlineOrder.waitFor({ state: "visible" });
          assert.equal(await inlineOrder.locator('[data-taoist-talisman-cart][data-inline="true"]').count(), 1,
            label + ": the existing verified quote form opens in a same-page modal");
          assert.equal(await inlineOrder.locator('[data-cart-talisman="fu-prosperity"]').count(), 1,
            label + ": selected design is in quote basket");
          assert.equal(await inlineOrder.locator("[data-talisman-quote-saved]").count(), 0,
            label + ": opening the basket is not a submitted CRM lead or payment");
          await inlineOrder.locator('button[aria-label]').first().click();
          await inlineOrder.waitFor({ state: "hidden" });
          const catalogToggle = viewer.locator('button[aria-controls="support-talisman-full-catalog"]');
          await catalogToggle.click();
          const catalog = root.locator("[data-taoist-talisman-catalog]");
          await catalog.waitFor({ state: "visible" });
          assert.equal(await catalog.locator("[data-tao-talisman]").first().getAttribute("data-tao-talisman"),
            "fu-harmony", label + ": expanding the existing catalog keeps recommendation priority");
          await catalogToggle.click();
          await catalog.waitFor({ state: "hidden" });
          // The new broad focus still uses one native radio group and the same
          // private recommendation snapshot; changing focus never submits a quote.
          await root.locator('[data-support-focus="all"]').check();
          await recommendations.waitFor({ state: "hidden" });
          await root.locator('[data-support-focus="all"]').focus();
          await root.locator('[data-support-focus="all"]').press("ArrowRight");
          assert.equal(await root.locator('[data-support-focus="energy"]').isChecked(), true,
            label + ": native radio keyboard selects one domain");
          await root.locator('[data-support-focus="all"]').check();
          assert.equal(await root.locator('input[name="support-focus"]:checked').count(), 1,
            label + ": exactly one after keyboard and All");
          await root.locator('[data-support-recommendations]').click();
          await recommendations.waitFor({ state: "visible" });
          assert.equal(await recommendations.locator('[data-support-recommended-talisman]').getAttribute('data-support-recommended-talisman'),
            "fu-harmony", label + ": All prioritizes lower relationship rating");
          await recommendations.locator('[data-support-recommended-talisman] button').click();
          await viewer.waitFor({ state: "visible" });
          assert.equal(await viewer.locator('[data-support-talisman-filter="goal"] select').inputValue(),
            "all", label + ": viewer does not silently force a specific focus");
          assert.equal(await viewer.locator('[data-support-talisman]').getAttribute('data-support-talisman'),
            "fu-harmony", label + ": broad ranking reaches existing viewer");
          assert.equal(await page.locator('dialog[open][aria-labelledby="support-talisman-order-title"]').count(), 0,
            label + ": changing broad focus does not open a quote");
          await slider.focus();
          await slider.press("ArrowRight");
          await recommendations.waitFor({ state: "hidden" });
          const geometry = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
          }));
          assert.ok(geometry.scrollWidth <= geometry.width + 2,
            label + ": no horizontal overflow " + JSON.stringify(geometry));
          assert.deepEqual(errors, [], label + ": no runtime page errors");
          if (width === 390) {
            await page.screenshot({ path: output + "/" + engine.name() + "-" + locale + "-390.png" });
          }
          evidence.push({ engine: engine.name(), locale, width, videoId,
            talismanId: "fu-harmony", carousel: true, inlineQuote: true, profile: "/" + locale + "/personality-profiles",
            overflow: false, errors: 0 });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(output + "/summary.json", JSON.stringify({ cases: evidence }, null, 2));
console.log("Personalized Support browser checks passed: " + evidence.length + " cases");
