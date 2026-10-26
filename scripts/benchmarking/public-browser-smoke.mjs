// BENCH-01: anonymous, read-only public browser smoke in an isolated CI browser.
// NO authentication, form submission, private client data, payment, or off-site requests.
// A Chromium/WebKit emulation is not a physical iPhone Safari test or Remaster runtime check.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

const ORIGIN = "https://holistichouse.vercel.app";
const OUT = "artifacts/benchmark-public-browser";
const VIEWPORTS = [[320, 568], [375, 667], [390, 844], [430, 932]];
const LOCALES = ["en", "ru", "es"];
const MAX_OFFSCREEN_PX = 3;
const { chromium, webkit } = await import(process.env.HH_BENCH_BROWSER_PKG || "playwright");

mkdirSync(OUT, { recursive: true });
const records = [];

for (const [engine, driver] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await driver.launch({ headless: true });
  try {
    for (const locale of LOCALES) {
      for (const [width, height] of VIEWPORTS) {
        const record = { engine, locale, width, height, status: "NOT_RUN" };
        const context = await browser.newContext({
          viewport: { width, height },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          locale: { en: "en-CA", ru: "ru-RU", es: "es-ES" }[locale],
          storageState: { cookies: [], origins: [] },
          serviceWorkers: "block",
          reducedMotion: "reduce",
          permissions: [],
        });
        let blockedRequests = 0;
        // Fail-closed network scope: GET/HEAD to the exact first-party origin only.
        // Abort ALL writes, external analytics, embeds, third-party fonts and tracking.
        await context.route("**/*", route => {
          const request = route.request();
          let sameOrigin = false;
          try { sameOrigin = new URL(request.url()).origin === ORIGIN; } catch {}
          if (!sameOrigin || !["GET", "HEAD"].includes(request.method())) {
            blockedRequests += 1;
            return route.abort("blockedbyclient");
          }
          return route.continue();
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", error => pageErrors.push(error.message.slice(0, 250)));
        try {
          const landingResponse = await page.goto(ORIGIN + "/" + locale + "/tests", {
            waitUntil: "domcontentloaded", timeout: 60000,
          });
          assert.equal(landingResponse?.status(), 200, "free test landing must return 200");
          const landing = page.locator('[data-free-entry-landing="tests"]');
          await landing.waitFor({ state: "visible", timeout: 20000 });
          const title = await landing.locator("h1").first().innerText();
          assert.ok(title.trim().length >= 12, "localized landing must explain its value");
          const cta = landing.locator("[data-benchmark-free-test-open]");
          assert.equal(await cta.count(), 1, "one clear guest-first test CTA");
          const href = await cta.getAttribute("href");
          assert.equal(href, "/" + locale + "/client/tests", "no sensitive URL arguments");
          assert.equal(await landing.locator("[data-benchmark-free-test-next-step]").count(), 1);
          const button = await cta.boundingBox();
          assert.ok(button && button.height >= 44, "touch CTA >=44px");
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          assert.ok(overflow <= MAX_OFFSCREEN_PX, "no horizontal scroll, excess=" + overflow);
          // Only an already-vetted same-origin GET link is clicked. No test answered.
          await cta.click({ timeout: 15000 });
          await page.waitForURL(ORIGIN + href, { timeout: 30000 });
          await page.waitForLoadState("domcontentloaded");
          assert.equal(new URL(page.url()).pathname, href, "guest route must not redirect to login");
          const main = page.locator("main");
          await main.first().waitFor({ state: "visible", timeout: 20000 });
          assert.ok((await main.first().innerText()).trim().length >= 25, "non-empty public test explorer");
          assert.deepEqual(pageErrors, [], "no uncaught JavaScript errors on guest journey");
          record.status = "PASS";
          record.initialLandingStatus = landingResponse.status();
          record.destination = href;
          record.blockedRequests = blockedRequests;
          console.log("PASS " + engine + " " + locale + " " + width + "x" + height);
        } catch (error) {
          record.status = "FAIL";
          record.error = String(error?.message || error).slice(0, 550);
          record.blockedRequests = blockedRequests;
          record.pageErrors = pageErrors.slice(0, 3);
          console.error("FAIL " + engine + " " + locale + " " + width + "x" + height + ": " + record.error);
        } finally {
          records.push(record);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(OUT + "/results.json", JSON.stringify({
  checkedAt: new Date().toISOString(),
  source: "read-only-public-GET",
  target: ORIGIN,
  browserType: "emulated-mobile-Chromium-WebKit",
  macLocalSandboxLaunch: "NOT_TESTED",
  remasterIntegration: "NOT_TESTED",
  results: records,
}, null, 2));
const failing = records.filter(row => row.status !== "PASS");
console.log("BENCH-01 public browser smoke: " + (records.length - failing.length)
  + "/" + records.length + " PASS");
assert.equal(failing.length, 0, "browser public smoke failures; inspect the CI report");
