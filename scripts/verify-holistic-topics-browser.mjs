// Read-only mobile acceptance: no CRM submissions, messages or purchases.
// Runs solely against this PR's local production build on loopback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { createHolisticBrowserIsolation } from "./helpers/holistic-browser-isolation.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic topic mobile tests are loopback-only");
await mkdir("artifacts/holistic-topic-mobile", { recursive: true });
const evidence = [];
const runtimeErrors = [];
const cleanupFailures = [];
let failure;

try {
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  let engineFailure;
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + ":" + locale + ":" + width;
        let isolation, page, primaryFailure;
        const errors = [];
        try {
          isolation = await createHolisticBrowserIsolation(browser, {origin, locale, viewport:{width, height:844}});
          page = isolation.page;
          page.on("pageerror", () => {
            errors.push("PAGE_ERROR");
            runtimeErrors.push({ label, code: "PAGE_ERROR" });
          });
          const response = await page.goto(origin + "/" + locale + "/holistic-support",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " HTTP status");
          const root = page.locator("[data-holistic-topic-filter]");
          await root.waitFor({ state: "visible", timeout: 30000 });
          assert.equal(await root.locator('[role="tab"]').count(), 3, label + " exactly three topic filters");
          let previousMeditationTitle = "";
          for (const topic of ["business", "love", "health"]) {
            const button = root.locator('[data-holistic-topic="' + topic + '"]');
            await button.click();
            assert.equal(await button.getAttribute("aria-selected"), "true", label + " selected " + topic);
            const bbox = await button.boundingBox();
            assert.ok(bbox && bbox.height >= 44 && bbox.width >= 44,
              label + " finger-sized filter " + topic);
            const panel = root.locator('[role="tabpanel"]');
            assert.equal(await panel.getAttribute("data-holistic-topic-selected"), topic,
              label + " visible content switches to " + topic);
            assert.equal(await panel.locator("[data-holistic-topic-card]").count(), 3,
              label + " 3 matching offerings");
            const meditation = panel.locator('[data-holistic-topic-card="meditation"]');
            const talisman = panel.locator('[data-holistic-topic-card="talisman"]');
            const expert = panel.locator('[data-holistic-topic-card="expert"]');
            assert.equal(await meditation.locator("a").getAttribute("href"), "#meditation-practices");
            assert.equal(await talisman.locator("a").getAttribute("href"), "#talismans",
              label + " same-page symbolic collection target");
            const collection = page.locator('#talismans[data-holistic-talismans]');
            assert.equal(await collection.count(), 1, label + " unique same-page collection destination");
            const gallery = collection.locator('[data-support-talismans]');
            assert.equal(await gallery.count(), 1, label + " one current symbolic collection");
            const gate = gallery.locator('a[href="/' + locale + '/app"]');
            await gate.waitFor({state:"visible"});
            assert.equal(await gate.count(), 1, label + " localized anonymous sign-in gate, never followed");
            assert.equal(await gallery.locator('[data-talisman-upload], input[type="file"]').count(), 0,
              label + " anonymous collection exposes no upload form");
            assert.equal(await gallery.locator('a[target="_blank"]').count(), 0,
              label + " no private collection image links in anonymous state");
            assert.equal(await expert.locator("a").getAttribute("href"),
              "/" + locale + "/services/remote-energy-support");
            const currentTitle = (await meditation.locator("h3").innerText()).trim();
            assert.ok(currentTitle.length > 8 && currentTitle !== previousMeditationTitle,
              label + " topic-specific meditation card");
            previousMeditationTitle = currentTitle;
            const geometry = await page.evaluate(() => ({
              viewport: document.documentElement.clientWidth,
              document: document.documentElement.scrollWidth,
            }));
            assert.ok(geometry.document <= geometry.viewport + 2,
              label + " no horizontal overflow " + JSON.stringify(geometry));
          }
          await root.screenshot({ path: "artifacts/holistic-topic-mobile/" +
            engine.name() + "-" + locale + "-" + width + ".png" });
          assert.deepEqual(errors, [], label + " no runtime errors");
          await isolation.assertClean();
          assert.ok(isolation.summary().anonymousTalismansReads > 0,
            label + " collection uses fixed synthetic anonymous401, never a customer-data API read");
        } catch (error) {
          primaryFailure = error;
          if (page) await page.screenshot({path:"artifacts/holistic-topic-mobile/failure-" +
            engine.name() + "-" + locale + "-" + width + ".png", fullPage:true}).catch(() => {});
          throw error;
        } finally {
          const failures = [];
          if (isolation) try { await isolation.close(); } catch { failures.push("ISOLATION_CLOSE_FAILED"); }
          if (primaryFailure) {
            if (failures.length) console.error("Additional QA guard failures:", JSON.stringify(failures));
          } else {
            assert.deepEqual(failures, [], label + " no unexpected request, popup, socket or unclosed context");
            assert.deepEqual(errors, [], label + " no runtime errors through context teardown");
          }
        }
        evidence.push({ browser: engine.name(), locale, width, topics: 3, offerings: 3, overflow: false });
      }
    }
  } catch (error) {
    engineFailure = error;
    throw error;
  } finally {
    try { await browser.close(); } catch {
      cleanupFailures.push("BROWSER_CLOSE_FAILED");
      if (!engineFailure) throw new Error("BROWSER_CLOSE_FAILED");
    }
  }
}
assert.equal(evidence.length, 18, "All eighteen topic-filter browser journeys completed");
} catch (error) {
  failure = error;
} finally {
  // Browser teardown can emit queued page errors after every context is closed.
  try {
    assert.deepEqual(runtimeErrors, [], "No topic runtime errors through browser teardown");
    assert.deepEqual(cleanupFailures, [], "No topic browser cleanup failures");
  } catch (error) { failure ||= error; }
  // Attempt both artifacts even after a primary UI, cleanup, or write failure.
  for (const [name, value] of [
    ["results.json", evidence],
    ["runtime-diagnostics.json", { runtimeErrors, cleanupFailures, completedJourneys: evidence.length }],
  ]) {
    try {
      await writeFile("artifacts/holistic-topic-mobile/" + name, JSON.stringify(value, null, 2) + "\n");
    } catch (error) { failure ||= error; }
  }
}
if (failure) throw failure;
console.log("Verified topic-filter interactions:", evidence.length);
