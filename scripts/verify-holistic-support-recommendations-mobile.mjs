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
          const focused = root.locator('[data-support-focus="relationships"]');
          const allFocus = root.locator('[data-support-focus="all"]');
          assert.equal(await allFocus.isChecked(), true, label + ": All is initial focus");
          await focused.check();
          assert.equal(await focused.isChecked(), true, label + ": scale owns Focus");
          assert.equal(await allFocus.isChecked(), false, label + ": All is deselected");
          assert.equal(await root.locator('input[name="support-focus"]:checked').count(), 1,
            label + ": exactly one selected focus");
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
          const catalog = root.locator("[data-taoist-talisman-catalog]");
          await catalog.waitFor({ state: "visible" });
          assert.equal(await catalog.locator("[data-tao-talisman]").first().getAttribute("data-tao-talisman"),
            "fu-harmony", label + ": existing catalog ranks suggested item first");
          assert.equal(await catalog.locator("[data-tao-talisman-order][aria-pressed='true']").count(), 0,
            label + ": recommendation never automatically adds a paid item");
          await allFocus.check();
          assert.equal(await recommendations.count(), 0, label + ": new focus clears old results");
          assert.equal(await root.locator('input[name="support-focus"]:checked').count(), 1,
            label + ": All is mutually exclusive");
          await root.locator("[data-support-recommendations]").click();
          await recommendations.waitFor({ state: "visible" });
          assert.ok((await recommendations.innerText()).includes({
            en: "All four areas", ru: "Все четыре сферы", es: "Las cuatro áreas",
          }[locale]), label + ": All explains four-area recommendation");
          assert.match(await recommendations.locator("[data-support-recommended-video]")
            .getAttribute("data-support-recommended-video"), /^[A-Za-z0-9_-]{11}$/,
            label + ": All recommends a genuine recording");
          await root.locator('[data-support-focus="money"]').check();
          assert.equal(await recommendations.count(), 0,
            label + ": another scale invalidates the previous snapshot");
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
            talismanId: "fu-harmony", profile: "/" + locale + "/personality-profiles",
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
