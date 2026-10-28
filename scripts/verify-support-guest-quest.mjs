// Synthetic local QA only: never use actual Google accounts, health data or payment.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3117";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Loopback only");
const browser = await chromium.launch({ headless: true });
const output = "artifacts/holistic-support-quest";
await mkdir(output, { recursive: true });
let checked = 0;
try {
  for (const locale of ["en", "ru", "es"]) {
    for (const width of [320, 390, 430]) {
      const label = locale + "/" + width;
      const context = await browser.newContext({
        viewport: { width, height: 820 }, isMobile: true, hasTouch: true,
        deviceScaleFactor: 1, reducedMotion: "reduce", serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/app/auth/status", route =>
        route.fulfill({ status: 401, contentType: "application/json", body: '{"code":"SIGN_IN_REQUIRED"}' }));
      await page.route("**/www.youtube-nocookie.com/**", route => route.abort());
      try {
        const response = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
          { waitUntil: "domcontentloaded", timeout: 90000 });
        assert.equal(response?.status(), 200, label + " route");
        await page.waitForFunction(() => {
          const root = document.querySelector("[data-support-quest]");
          const input = document.querySelector('[data-support-scale="energy"] input');
          return root && input && Object.keys(input).some(k => k.startsWith("__reactProps$"));
        }, null, { timeout: 40000 });

        const root = page.locator("[data-holistic-mobile-alternative]");
        const quest = root.locator("[data-support-quest]");
        assert.equal(await quest.locator("[data-support-quest-step]").count(), 7, label + " seven actions");
        assert.equal(await quest.locator("[data-support-quest-completed]").innerText(), "0/7", label + " initial progress");
        assert.equal(await quest.locator("[data-support-quest-budget]").count(), 1, label + " budget");
        const score = root.locator('[data-support-scale="energy"] input');
        await score.focus();
        await score.press("ArrowRight");
        assert.equal(await quest.locator('[data-support-quest-step="checkin"]').getAttribute("data-status"),
          "done", label + " real self-rating interaction");

        await root.locator('[data-support-meditation-category="energy"]').click();
        assert.equal(await quest.locator('[data-support-quest-step="category"]').getAttribute("data-status"),
          "done", label + " actual category selection");

        await root.locator("[data-support-recommendations]").click();
        assert.equal(await quest.locator('[data-support-quest-step="recommendation"]').getAttribute("data-status"),
          "done", label + " recommendation opened");

        // A catalogue link must not count as a test result.
        assert.notEqual(await quest.locator('[data-support-quest-step="test"]').getAttribute("data-status"),
          "done", label + " mere test browsing never confirms result");
        await quest.locator('[data-support-quest-step="test"]').click();
        assert.equal(await quest.locator('[data-support-quest-detail] a').getAttribute("href"),
          "/" + locale + "/client/tests", label + " actual free test destination");
        await quest.locator("[data-support-test-self-report]").click();
        assert.equal(await quest.locator('[data-support-quest-step="test"]').getAttribute("data-status"),
          "done", label + " explicit manual self-report");

        const storage = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("hh-support-free-journey-v1") || "{}"));
        assert.deepEqual(Object.keys(storage).sort(), ["completed", "starts"], label + " anonymous only");
        assert.equal(JSON.stringify(storage).includes("energy"), false, label + " no personal data");

        const pageWidth = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(pageWidth.scroll <= pageWidth.viewport + 3,
          label + " no horizontal overflow " + JSON.stringify(pageWidth));

        // The visitor budget is client-local and never falsely called a secure paywall.
        await page.evaluate(() => localStorage.setItem("hh-support-free-journey-v1",
          JSON.stringify({ starts: 10, completed: {} })));
        await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
        await page.locator('[data-support-quest-budget][data-empty="true"]').waitFor({ timeout: 35000 });
        assert.equal(await page.locator("[data-support-play]").isDisabled(), true,
          label + " player soft guest limit");
        assert.equal(await page.locator('[data-support-guest-limit-cta]').getAttribute("href"),
          "#support-progress", label + " visible path to free entry");
        assert.equal(await page.locator('[data-support-quest] a[href$="/app/portrait"]').count(),
          1, label + " free Google cabinet link");

        // Only a verified server response (synthetic in this test) unlocks the limit.
        await page.unroute("**/api/app/auth/status");
        await page.route("**/api/app/auth/status", route =>
          route.fulfill({ status: 200, contentType: "application/json", body: '{"signedIn":true}' }));
        await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
        await page.locator("[data-support-play]:not([disabled])").waitFor({ timeout: 35000 });
        assert.equal(await page.locator('[data-support-quest-budget][data-empty="true"]').count(),
          0, label + " signed-in unlocked");
        await page.locator("[data-support-play]").click();
        assert.equal(await page.locator('[data-support-quest-step="firstVideo"]').getAttribute("data-status"),
          "done", label + " starts only on Play");
        assert.equal(await page.locator('[data-support-quest-step="secondVideo"]').getAttribute("data-status"),
          "done", label + " prior aggregate starts count");
        assert.equal(errors.length, 0, label + " page errors: " + errors.join("; "));
        if (locale === "ru" && width === 390) {
          await page.locator("#support-progress").screenshot({
            path: output + "/progress-ru-390.png", animations: "disabled",
          });
        }
        checked += 1;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log("Support quest mobile synthetic QA: " + checked + " locales/widths passed");
