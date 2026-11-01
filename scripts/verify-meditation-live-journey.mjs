/** Production read-only browser journey for the existing Holistic Support picker.
 * NO accounts, CRM submissions, audio extraction, payments or external posting.
 * Invoke with BROWSER=chromium|webkit node scripts/verify-meditation-live-journey.mjs
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const target = "https://holistichouse.vercel.app";
const type = process.env.BROWSER === "webkit" ? "webkit" : "chromium";
const engine = type === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true, args: type === "chromium" ? ["--no-sandbox"] : [] });
const locales = [
  { locale: "en", language: "en", goal: "money", sourceId: "fWfG5gXHK5Y" },
  { locale: "ru", language: "ru", goal: "energy", sourceId: "lOkX_8TM-FA" },
  { locale: "es", language: "es", goal: "energy", sourceId: "EpMXNJiFOt4" },
];
const widths = [320, 375, 390, 430];
const failures = [];
let pass = 0;

for (const scenario of locales) {
  for (const width of widths) {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      const response = await page.goto(
        target + "/" + scenario.locale + "/holistic-support#meditation-practices",
        { waitUntil: "domcontentloaded", timeout: 35_000 },
      );
      assert.equal(response?.status(), 200, "public locale route must load");
      const toggle = page.locator("[data-meditation-finder-toggle]");
      await toggle.waitFor({ timeout: 18_000 });
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      const finder = page.locator("[data-meditation-personal-finder]");
      assert.equal(await finder.count(), 1);
      assert.equal(await finder.locator("[data-meditation-goal]").count(), 5);

      await finder.locator("[data-meditation-goal=" + scenario.goal + "]").click();
      await finder.locator("[data-meditation-audio-language]").selectOption(scenario.language);
      await finder.locator('button[type="submit"]').click();
      const results = page.locator("[data-meditation-results]");
      await results.waitFor({ timeout: 15_000 });
      const count = await results.locator("[data-meditation-recommendation]").count();
      assert.ok(count > 0, "no published recommendations");
      assert.ok(
        await results.locator("[data-meditation-recommendation='" + scenario.sourceId + "']").count() > 0,
        "expected source-backed recording not suggested",
      );
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 2, "horizontal viewport overflow " + overflow + "px");
      assert.equal(errors.length, 0, "unhandled browser exception: " + errors[0]);

      // An external recommendation must open the creator's real YouTube page
      // and cannot embed the unverified recording in the site iframe.
      if (scenario.locale !== "ru") {
        await results.locator(
          "[data-meditation-recommendation='" + scenario.sourceId + "']",
        ).click();
        const a = results.locator("a[href^='https://www.youtube.com/watch?v=']").first();
        assert.equal(await a.getAttribute("target"), "_blank");
        assert.match(await a.getAttribute("rel") || "", /noopener/);
        assert.ok((await a.getAttribute("href") || "").includes(scenario.sourceId));
        assert.equal(await results.locator("iframe").count(), 0);
      }

      // Existing author originals must still be click-to-play, lazy and
      // privacy-enhanced. This validates frame insertion, NOT audible playback.
      if (scenario.locale === "ru" && width === 390) {
        await results.locator(
          "[data-meditation-recommendation='" + scenario.sourceId + "']",
        ).click();
        const poster = results.locator(".academy-video-poster");
        await poster.waitFor({ timeout: 10_000 });
        assert.equal(await results.locator("iframe").count(), 0);
        await poster.click();
        const iframe = results.locator("iframe");
        await iframe.waitFor({ timeout: 10_000 });
        assert.match(await iframe.getAttribute("src") || "", /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
        assert.match(await iframe.getAttribute("referrerpolicy") || "", /strict-origin/);
      }

      pass++;
      console.log("PASS", type, scenario.locale, width, "recommendations=" + count);
    } catch (error) {
      failures.push({ type, locale: scenario.locale, width, error: String(error).slice(0, 500) });
      console.error("FAIL", type, scenario.locale, width, String(error).slice(0, 350));
      // Persist failure evidence as an ephemeral GitHub CI artifact only.
      await page.screenshot({ path: "/tmp/meditation-" + type + "-" + scenario.locale + "-" + width + ".png" }).catch(() => {});
    } finally {
      await page.close();
    }
  }
}
await browser.close();
console.log("MEDITATION_BROWSER_QA", JSON.stringify({ browser: type, passed: pass, total: widths.length * locales.length, failures }));
if (failures.length) process.exitCode = 1;
