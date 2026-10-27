// Read-only mobile acceptance: no CRM submissions, messages or purchases.
// Runs solely against this PR's local production build on loopback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { assertPublicJourneyRuntime, installPublicJourneyFence } from "./helpers/public-journey-verifier.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic topic mobile tests are loopback-only");
assertPublicJourneyRuntime(origin);
await mkdir("artifacts/holistic-topic-mobile", { recursive: true });
const evidence = [];

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + ":" + locale + ":" + width;
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          isMobile: true, hasTouch: true, reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        const fence = await installPublicJourneyFence(page.context(), origin, [], {anonymousTalismans:true,browserLocalBlobImages:engine === webkit});
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " HTTP status");
          const root = page.locator("[data-holistic-topic-filter]");
          await root.waitFor({ state: "visible", timeout: 30000 });
          const gallery = page.locator('[data-support-talismans]');
          await gallery.locator('a[href="/' + locale + '/app"]').waitFor({state:"visible"});
          assert.equal(await gallery.locator('img, form, [data-talisman-upload]').count(), 0,
            label + " no private gallery contents or upload operations in guest QA");
          assert.equal(fence.summary().anonymousTalismanReads, 1);
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
            assert.equal(await talisman.locator("a").getAttribute("href"),
              "#talismans", label + " PR2022 uses the existing personal collection, not the historical archive");
            const collection = page.locator('#talismans[data-holistic-talismans]');
            assert.equal(await collection.count(), 1, label + " one real in-page collection destination");
            assert.equal(await collection.locator('[data-support-talismans]').count(), 1,
              label + " collection mount exists; never inspect private items or operate uploads here");
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
          fence.assertNoSideEffects(label);
          evidence.push({ browser: engine.name(), locale, width, topics: 3, offerings: 3, overflow: false });
        } finally {
          await writeFile("artifacts/holistic-topic-mobile/requests-" + engine.name() + "-" + locale + "-" + width + ".json",
            JSON.stringify(fence.summary(), null, 2));
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile("artifacts/holistic-topic-mobile/results.json", JSON.stringify(evidence, null, 2) + "\n");
console.log("Verified topic-filter interactions:", evidence.length);
