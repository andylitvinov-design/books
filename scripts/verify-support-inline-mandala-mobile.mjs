// Read-only, synthetic browser E2E for the new in-place mandala check-in.
// Never authenticates, uploads to providers, starts payments or exports a user photo.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3118";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Inline mandala verification must use an isolated local server");
const output = "artifacts/holistic-inline-mandala";
await mkdir(output, { recursive: true });
const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL2WQAAAABJRU5ErkJggg==",
  "base64",
);
const evidence = [];

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + "/" + locale + "/" + width;
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          isMobile: true, hasTouch: true, reducedMotion: "no-preference",
        });
        const errors = [];
        const unexpectedWrites = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", req => {
          if (!["GET", "HEAD"].includes(req.method())) unexpectedWrites.push(req.method() + " " + req.url());
        });
        await page.route("**/youtube-nocookie.com/**", route => route.abort());
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " public page");
          const root = page.locator("[data-holistic-mobile-alternative]");
          const trigger = root.locator("[data-support-generate-mandala]");
          await trigger.waitFor({ state: "visible", timeout: 30000 });
          await page.waitForFunction(() => {
            const el = document.querySelector("[data-support-generate-mandala]");
            return !!el && Object.keys(el).some(key => key.startsWith("__reactProps$"));
          }, null, { timeout: 30000 });
          assert.equal(await trigger.getAttribute("aria-expanded"), "false", label + " initially closed");
          assert.equal(await root.locator("[data-support-mandala-progress]").count(), 0,
            label + " lazy module not mounted before click");
          const quickEnergy = root.locator('[data-support-scale="energy"] input[type="range"]');
          await quickEnergy.focus();
          await quickEnergy.press("Home");
          for (let i = 0; i < 3; i++) await quickEnergy.press("ArrowRight");
          assert.equal(await quickEnergy.inputValue(), "4", label + " source quick check-in");
          await trigger.click();
          const mandala = root.locator("[data-support-mandala-progress]");
          await mandala.waitFor({ state: "visible", timeout: 12000 });
          assert.equal(await trigger.getAttribute("aria-expanded"), "true", label + " expanded");
          assert.equal(await mandala.locator("[data-mandala-baseline] input[type=range]").count(), 4,
            label + " four baseline areas");
          assert.equal(await mandala.locator("[data-mandala-retest] input[type=range]").count(), 4,
            label + " four follow-up areas");
          assert.equal(await mandala.locator('[data-mandala-before="energy"] input').inputValue(), "4",
            label + " baseline snapshots actual quick score");
          assert.equal(await mandala.locator('[data-mandala-after="energy"] input').isDisabled(), true,
            label + " no unfixed baseline comparison");
          assert.equal(await mandala.locator("[data-mandala-visual] img[src*='legacy-stone-mosaic']").count(), 1,
            label + " reused original mandala asset");
          await mandala.locator("[data-mandala-confirm-baseline]").click();
          assert.equal(await mandala.locator('[data-mandala-after="energy"] input').isEnabled(), true,
            label + " follow-up enabled");
          const afterEnergy = mandala.locator('[data-mandala-after="energy"] input');
          await afterEnergy.focus();
          await afterEnergy.press("Home");
          for (let i = 0; i < 6; i++) await afterEnergy.press("ArrowRight");
          assert.equal(await afterEnergy.inputValue(), "7", label + " after energy 7");
          const afterMoney = mandala.locator('[data-mandala-after="money"] input');
          await afterMoney.focus();
          await afterMoney.press("Home");
          for (let i = 0; i < 2; i++) await afterMoney.press("ArrowRight");
          assert.equal(await afterMoney.inputValue(), "3", label + " after money 3");
          await mandala.locator("[data-mandala-compare]").click();
          const comparison = mandala.locator("[data-mandala-comparison]");
          await comparison.waitFor({ state: "visible" });
          assert.equal(await comparison.locator("li").count(), 4, label + " four independent changes");
          assert.match(await comparison.locator("li").first().innerText(), /4\s*→\s*7\s*\+3/,
            label + " real before/after energy delta");
          assert.ok((await comparison.innerText()).includes("-2"), label + " decreases are reported");
          const visual = mandala.locator("[data-mandala-visual] .not-a-class");
          void visual; // Use public data contract instead of brittle CSS class names.
          const stage = mandala.locator("[data-mandala-effect]");
          assert.equal(await stage.getAttribute("data-mandala-effect"), "off", label + " no automatic effect");
          await mandala.locator("[data-mandala-effect-toggle]").click();
          assert.equal(await stage.getAttribute("data-mandala-effect"), "fire", label + " explicit fire play");
          await mandala.locator('[data-mandala-effect-choice="money"]').click();
          assert.equal(await stage.getAttribute("data-mandala-effect"), "money", label + " switch to falling-money background");
          await mandala.locator("[data-mandala-effect-toggle]").click();
          assert.equal(await stage.getAttribute("data-mandala-effect"), "off", label + " stop effect");
          if (width === 390) {
            await root.locator('[data-support-photo] input[type="file"]')
              .setInputFiles({ name: "synthetic-photo.png", mimeType: "image/png", buffer: photo });
            await mandala.locator("[data-mandala-local-photo]").waitFor({ state: "attached" });
            await page.screenshot({ path: output + "/" + engine.name() + "-" + locale + "-390.png" });
          }
          await trigger.click();
          assert.equal(await trigger.getAttribute("aria-expanded"), "false", label + " collapsed");
          assert.equal(await mandala.isVisible(), false, label + " private panel hidden");
          await trigger.click();
          assert.equal(await mandala.locator("[data-mandala-comparison]").count(), 1,
            label + " comparison preserved when reopening in the same video view");
          const geometry = await page.evaluate(() => ({
            client: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(geometry.scroll <= geometry.client + 2,
            label + " no horizontal overflow: " + JSON.stringify(geometry));
          assert.deepEqual(unexpectedWrites, [], label + " zero network writes");
          assert.deepEqual(errors, [], label + " no runtime errors");
          evidence.push({ label, fourAreas: true, beforeAfter: true, motionOnDemand: true, photoLocal: width === 390 });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(output + "/results.json", JSON.stringify({ cases: evidence }, null, 2));
console.log("Inline mandala verified in " + evidence.length + " Chromium/WebKit mobile cases");
