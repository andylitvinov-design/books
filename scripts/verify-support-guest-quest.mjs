// Synthetic local QA only: never use actual Google accounts, health data or payment.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const browserName = ["chromium", "webkit"].includes(process.env.HH_QUEST_BROWSER) ? process.env.HH_QUEST_BROWSER : "chromium";
const browserType = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright")[browserName];
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3117";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Loopback only");
const browser = await browserType.launch({ headless: true });
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
      await page.route("**/api/app/support-journey/test-status", route =>
        route.fulfill({ status: 200, contentType: "application/json", body: '{"completed":false}' }));
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

        const root = page.locator("body");
        const quest = root.locator("[data-support-quest]");
        assert.equal(await quest.locator("[data-support-quest-step]").count(), 7, label + " seven actions");
        assert.equal(await quest.locator("[data-support-quest-completed]").innerText(), "0/7", label + " initial progress");
        assert.equal(await quest.locator("[data-support-quest-budget]").count(), 1, label + " budget");
        const top = root.locator("[data-support-today-pick]");
        assert.equal(await top.locator("[data-support-pick]").count(), 4, label + " four top hints");
        assert.deepEqual(await top.locator("[data-support-pick]").evaluateAll(nodes =>
          nodes.map(node => node.getAttribute("data-support-pick"))),
          ["test", "ideas", "video", "course"], label + " stable hint order");
        assert.equal(await top.locator('[data-support-pick="test"]').getAttribute("data-done"),
          "false", label + " no fabricated pre-test badge");
        const score = root.locator('[data-support-scale="energy"] input');
        await score.focus();
        await score.press("ArrowRight");
        // On mobile WebKit a keyboard press can resolve before React commits the
        // client-local quest badge. Wait for real DOM evidence, never award it in QA.
        await quest.locator('[data-support-quest-step="checkin"][data-status="done"]')
          .waitFor({ state: "attached", timeout: 7000 });
        assert.equal(await quest.locator('[data-support-quest-step="checkin"]').getAttribute("data-status"),
          "done", label + " real self-rating interaction");

        await root.locator('[data-support-meditation-category="energy"]').click();
        await quest.locator('[data-support-quest-step="category"][data-status="done"]')
          .waitFor({ state: "attached", timeout: 7000 });
        assert.equal(await quest.locator('[data-support-quest-step="category"]').getAttribute("data-status"),
          "done", label + " actual category selection");

        await root.locator("[data-support-recommendations]").click();
        await quest.locator('[data-support-quest-step="recommendation"][data-status="done"]')
          .waitFor({ state: "attached", timeout: 7000 });
        assert.equal(await quest.locator('[data-support-quest-step="recommendation"]').getAttribute("data-status"),
          "done", label + " recommendation opened");

        // A catalogue link must not count as a test result.
        assert.notEqual(await quest.locator('[data-support-quest-step="test"]').getAttribute("data-status"),
          "done", label + " mere test browsing never confirms result");
        await quest.locator('[data-support-quest-step="test"]').click();
        const suggestedHref = await quest.locator('[data-support-quest-detail] a').getAttribute("href");
        assert.equal(suggestedHref,
          "/" + locale + "/client/tests?focus=body,resources", label + " ranked by changed energy scale");
        assert.equal(await top.locator('[data-support-pick="test"]').getAttribute("href"),
          suggestedHref, label + " same authentic Test Explorer link");
        assert.equal(await top.locator('[data-support-pick="test"]').getAttribute("data-done"),
          "false", label + " opening a link is not test completion");
        // Existing guest/account verification is mocked here, not a fabricated manual badge.
        await page.unroute("**/api/app/support-journey/test-status");
        await page.route("**/api/app/support-journey/test-status", route =>
          route.fulfill({ status: 200, contentType: "application/json", body: '{"completed":true}' }));
        await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
        await page.locator('[data-support-pick="test"][data-done="true"]').waitFor({ timeout: 35000 });

        const storage = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("hh-support-free-journey-v1") || "{}"));
        assert.deepEqual(Object.keys(storage).sort(), ["completed", "starts", "videoQuestionAnswered"],
          label + " anonymous flags and no video-question answer");
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
        // Reset only the synthetic activity marker to prove that Play, not tile
        // selection, creates the two meditation badges for a signed-in viewer.
        // WebKit can finish an earlier page's async verified-test status while
        // a synthetic localStorage reset triggers navigation. Seed the next
        // document BEFORE React hydration; this tests fresh account/activity
        // state, not an unsupported live mutation of mounted React storage.
        await page.addInitScript(() => {
          // Playwright installs init scripts in ALL frames, including
          // sandboxed YouTube players that forbid localStorage access.
          // Only reset the first-party top-level document before hydration.
          if (window.self !== window.top) return;
          try {
            localStorage.setItem("hh-support-free-journey-v1",
              JSON.stringify({ starts: 0, completed: {} }));
          } catch { /* Browser-private storage unavailable: keep in-memory defaults. */ }
        });
        await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
        await page.locator("[data-support-play]:not([disabled])").waitFor({ timeout: 35000 });
        await page.waitForFunction(() => {
          const saved=JSON.parse(localStorage.getItem("hh-support-free-journey-v1")||"{}");
          const step=document.querySelector('[data-support-quest-step="firstVideo"]');
          return saved.starts===0 && step?.getAttribute("data-status")!=="done";
        }, null, { timeout: 15000 });
        assert.notEqual(await page.locator('[data-support-quest-step="firstVideo"]').getAttribute("data-status"),
          "done", label + " no fake video completion");
        await page.locator("[data-support-play]").click();
        assert.equal(await page.locator('[data-support-quest-step="firstVideo"]').getAttribute("data-status"),
          "done", label + " first actual Play click");
        assert.equal(await page.locator('[data-support-pick="video"]').getAttribute("data-done"), "false",
          label + " video hint awaits a reflection answer, not a Play click");
        await page.locator("[data-support-video-question-answer]").click();
        assert.equal(await page.locator('[data-support-pick="video"]').getAttribute("data-done"), "true",
          label + " actual voluntary video question answered");
        assert.notEqual(await page.locator('[data-support-quest-step="secondVideo"]').getAttribute("data-status"),
          "done", label + " one launch is not two");
        await page.locator('[data-support-video]').nth(1).click();
        await page.locator("[data-support-play]").click();
        assert.equal(await page.locator('[data-support-quest-step="secondVideo"]').getAttribute("data-status"),
          "done", label + " second actual Play click");
        // The public route reuses its existing ranked Test Explorer and offers login
        // above the form without requiring a subscription or real Google OAuth.
        const testPage = await context.newPage();
        await testPage.route("**/api/app/auth/status", route =>
          route.fulfill({ status: 401, contentType: "application/json", body: '{"code":"SIGN_IN_REQUIRED"}' }));
        const testResponse = await testPage.goto(origin + suggestedHref, {
          waitUntil: "domcontentloaded", timeout: 90000,
        });
        assert.equal(testResponse?.status(), 200, label + " personalized Test Explorer opens");
        try {
        await testPage.locator("[data-test-explorer-google-banner]").waitFor({ timeout: 35000 });
        } catch {
          // HTTP 200 can still render an unexpected Next page or migration bridge.
          // Preserve the concrete route/DOM evidence for the original failed WebKit run.
          const current = await testPage.evaluate(() => ({
            path: location.pathname, search: location.search,
            heading: document.querySelector("h1")?.textContent ?? "",
            text: (document.querySelector("main")?.textContent ?? document.body.textContent ?? "").slice(0,420),
          }));
          throw new Error(label + " public Test Explorer was not rendered: " + JSON.stringify(current));
        }
        await testPage.locator("[data-test-explorer-google-signin]:not([disabled])").waitFor({ timeout: 35000 });
        assert.equal(errors.length, 0, label + " page errors: " + errors.join("; "));
        await testPage.close();
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
console.log("Support quest " + browserName + " synthetic QA: " + checked + " locales/widths passed");
