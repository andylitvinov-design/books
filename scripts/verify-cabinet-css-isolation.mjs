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
        const stress = page.getByRole("button", { name: "Stress", exact: true });
        await stress.waitFor();
        await page.waitForTimeout(3000); // Allow the production client to hydrate.
        assert.equal(await stress.getAttribute("aria-pressed"), "false");
        await stress.click();
        await page.waitForFunction(() => [...document.querySelectorAll("button")]
          .some(button => button.textContent?.trim() === "Stress" && button.getAttribute("aria-pressed") === "true"));
      }
      console.log(path + ": OK");
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
