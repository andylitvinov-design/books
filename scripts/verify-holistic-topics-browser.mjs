// Read-only mobile acceptance: no CRM submissions, messages or purchases.
// Runs solely against this PR's local production build on loopback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic topic mobile tests are loopback-only");
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
        });
        const errors = [];
        const unexpectedWrites = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", request => {
          if (request.method() !== "GET" && request.method() !== "HEAD" &&
            new URL(request.url()).pathname.startsWith("/api/")) {
            unexpectedWrites.push(request.method() + " " + new URL(request.url()).pathname);
          }
        });
        try {
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
            // These are real inline order actions now, not navigation links.
            // Changing the test must not restore the retired external-order route.
            const talismanAction = talisman.locator('[data-holistic-order-trigger="talisman"]');
            const expertAction = expert.locator('[data-holistic-order-trigger="expert"]');
            assert.equal(await talisman.locator("a").count(), 0, label + " talisman stays inline");
            assert.equal(await expert.locator("a").count(), 0, label + " energy support stays inline");
            for (const [kind, action] of [["talisman", talismanAction], ["energy", expertAction]]) {
              assert.equal(await action.count(), 1, label + " " + kind + " action");
              assert.equal(await action.getAttribute("aria-controls"), "holistic-inline-order");
              const actionBounds = await action.boundingBox();
              assert.ok(actionBounds && actionBounds.height >= 44 && actionBounds.width >= 44,
                label + " " + kind + " mobile target >=44px");
              await action.click();
              assert.equal(await action.getAttribute("aria-expanded"), "true",
                label + " " + kind + " expanded");
              const inline = panel.locator('[data-holistic-inline-order="' + kind + '"]');
              await inline.waitFor({ state: "visible", timeout: 15000 });
              assert.equal(await inline.locator("#holistic-inline-order-title").count(), 1,
                label + " accessible inline order title");
              // First button is the explicit close action in the inline panel.
              await inline.locator("button").first().click();
              await inline.waitFor({ state: "hidden", timeout: 15000 });
              assert.equal(await action.getAttribute("aria-expanded"), "false",
                label + " " + kind + " closed");
            }
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
          assert.deepEqual(unexpectedWrites, [], label + " inline selection never submits CRM, booking or payment");
          evidence.push({ browser: engine.name(), locale, width, topics: 3, offerings: 3, overflow: false });
        } finally {
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
