// Run against an isolated local Next server, not production.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Cabinet CSS verification accepts only an isolated local server");
}

const browser = await chromium.launch(process.env.HH_CHROMIUM_PATH
  ? { executablePath: process.env.HH_CHROMIUM_PATH }
  : {});
try {
  for (const [path, isCabinet] of [
    ["/", false], ["/ru", false], ["/es", false],
    ["/en/client", true], ["/ru/client", true],
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.route("**/api/**", route => route.abort());
      const response = await page.goto(origin + path, { waitUntil: "networkidle", timeout: 60000 });
      assert.equal(response?.status(), 200, path);
      const state = await page.evaluate(() => ({
        cabinet: Boolean(document.querySelector(".cabinet-landing-shell")),
        cabinetStyles: [...document.styleSheets].some(sheet => {
          try {
            return [...sheet.cssRules].some(rule => rule.cssText.includes(".cabinet-landing-shell .hh-mood-checkin"));
          } catch {
            return false;
          }
        }),
      }));
      assert.equal(state.cabinet, isCabinet, path + ": Cabinet content");
      assert.equal(state.cabinetStyles, isCabinet, path + ": Cabinet stylesheet");
      if (path === "/en/client") {
        const topic = page.locator('[data-prelogin-test-picker] section[aria-labelledby="hh-simple-topic-title"] [role="group"] button[aria-pressed]').first();
        await topic.waitFor({ state: "visible" });
        await page.waitForFunction(() => history.pushState.toString().includes("__NA"));
        const initial = await topic.getAttribute("aria-pressed");
        assert.ok(initial === "true" || initial === "false");
        await topic.click();
        await page.waitForFunction(expected => document.querySelector('[data-prelogin-test-picker] section[aria-labelledby="hh-simple-topic-title"] [role="group"] button[aria-pressed]')?.getAttribute("aria-pressed") === expected, initial === "true" ? "false" : "true");
        await topic.click();
        await page.waitForFunction(expected => document.querySelector('[data-prelogin-test-picker] section[aria-labelledby="hh-simple-topic-title"] [role="group"] button[aria-pressed]')?.getAttribute("aria-pressed") === expected, initial);
      }
      console.log(path + ": OK");
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
