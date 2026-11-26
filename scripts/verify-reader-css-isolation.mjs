// Run against an isolated local Next server: HH_PUBLIC_QA_ORIGIN=http://127.0.0.1:3100 node scripts/verify-reader-css-isolation.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Reader CSS verification accepts only an isolated local server");
}

const browser = await chromium.launch(process.env.HH_CHROMIUM_PATH
  ? { executablePath: process.env.HH_CHROMIUM_PATH }
  : {});
try {
  for (const [path, isReader] of [
    ["/", false], ["/ru", false], ["/es", false],
    ["/en/books/alchemy-homeopathy-foundations", true],
    ["/ru/books/alchemy-homeopathy-foundations", true],
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      const response = await page.goto(origin + path, { waitUntil: "networkidle" });
      assert.equal(response?.status(), 200, path);
      const state = await page.evaluate(() => ({
        reader: Boolean(document.querySelector(".reader-shell")),
        readerStyles: [...document.styleSheets].some(sheet => {
          try {
            return [...sheet.cssRules].some(rule => rule.cssText.includes(".reader-shell .reader-layout > *"));
          } catch {
            return false;
          }
        }),
      }));
      assert.equal(state.reader, isReader, path + ": reader content");
      assert.equal(state.readerStyles, isReader, path + ": reader stylesheet");
      if (isReader) {
        const layout = page.locator(".reader-layout");
        assert.equal(await layout.count(), 1, path + ": reader layout");
        assert.ok(await layout.evaluate(element => element.getBoundingClientRect().width > 0));
      }
      console.log(path + ": OK");
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
