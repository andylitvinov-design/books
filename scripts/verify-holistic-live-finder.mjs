/**
 * Read-only synthetic browser acceptance against the ACTUAL deployed public site.
 * Never logs in, sends enquiries, reserves sessions or triggers payments.
 * Every practitioner API response is intercepted and replaced with fixture data.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const ORIGIN = "https://holistichouse.vercel.app";
const outputDir = "artifacts/holistic-live-finder";
await mkdir(outputDir, { recursive: true });
const evidence = [];

function fixtures(locale) {
  return {
    consultations: [
      { serviceId: "qa-20", title: "Synthetic €20 consultation", practitionerName: "QA Fixture",
        description: "Synthetic published offer", areaKey: "business_money", price: 20,
        currency: "EUR", pricingMode: "fixed", href: "/" + locale + "/services/qa/20" },
      { serviceId: "qa-100", title: "Synthetic €100 consultation", practitionerName: "QA Fixture",
        description: "Synthetic published offer", areaKey: "business_money", price: 100,
        currency: "EUR", pricingMode: "fixed", href: "/" + locale + "/services/qa/100" },
      { serviceId: "qa-cad", title: "Synthetic CAD 15 offer", practitionerName: "QA Fixture",
        description: "Synthetic published offer", areaKey: "business_money", price: 15,
        currency: "CAD", pricingMode: "fixed", href: "/" + locale + "/services/qa/cad" },
      { serviceId: "qa-free", title: "Synthetic free introduction", practitionerName: "QA Fixture",
        description: "Synthetic published offer", areaKey: "relationships", price: 0,
        currency: "EUR", pricingMode: "free", href: "/" + locale + "/services/qa/free" },
    ],
    masters: [{
      slug: "qa-fixture", name: "QA Fixture", title: "Synthetic verified profile", photo: "",
      serviceId: "qa-energy", methods: ["Usui Reiki"], languages: ["en", "ru", "es"],
      bio: "", description: "Synthetic session, never book", currency: "EUR",
      priceOptions: [{duration: 30, price: 50}, {duration: 60, price: 100}],
      reviewCount: 0, reviewAverage: 0,
    }],
  };
}

async function waitForCount(page, selector, count, label) {
  try {
    await page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length === count,
      { selector, count }, { timeout: 18000 },
    );
  } catch (error) {
    const displayed = await page.locator("#holistic-inline-order").innerText().catch(() => "no finder");
    throw new Error(label + ": expected " + count + " of " + selector +
      "; displayed=" + displayed.slice(0, 650) + "; cause=" + String(error));
  }
}

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
        const apiHits = [];
        const pageErrors = [];
        const requestErrors = [];
        page.on("pageerror", error => pageErrors.push(error.message));
        page.on("requestfailed", request => {
          if (request.url().includes("remote-energy-support-masters"))
            requestErrors.push(request.failure()?.errorText || request.url());
        });
        // Match both query orders, locales and URL encoding in WebKit and Chromium.
        await page.route(/\/api\/public\/remote-energy-support-masters(?:\?|$)/, async route => {
          const url = new URL(route.request().url());
          const kind = url.searchParams.get("kind") === "consultation" ? "consultation" : "energy";
          apiHits.push(kind);
          const data = fixtures(locale);
          await route.fulfill({
            status: 200, contentType: "application/json",
            headers: { "cache-control": "no-store" },
            body: JSON.stringify(kind === "consultation"
              ? { consultations: data.consultations } : { masters: data.masters }),
          });
        });
        try {
          const response = await page.goto(ORIGIN + "/" + locale + "/holistic-support",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " actual production public route");
          const root = page.locator("[data-holistic-topic-filter]");
          await root.waitFor({ state: "visible", timeout: 25000 });
          await root.locator('[data-holistic-topic="business"]').click();
          await root.locator('[data-holistic-order-trigger="expert"]').click();
          const finder = page.locator("#holistic-inline-order");
          await finder.waitFor({ state: "visible", timeout: 20000 });
          for (const [selector, size] of [
            ["[data-support-theme]", 3], ["[data-support-choice]", 3], ["[data-support-budget]", 4],
          ]) assert.equal(await finder.locator(selector).count(), size, label + ": " + selector);
          const box = await finder.boundingBox();
          assert.ok(box && box.width >= width - 24 && box.x >= -2 &&
            box.x + box.width <= width + 2 && box.height < 540,
            label + ": full-width single-screen picker " + JSON.stringify(box));

          await finder.locator('[data-support-choice="consultation"]').click();
          assert.equal(await finder.locator('[data-support-choice="consultation"]').getAttribute("aria-pressed"), "true");
          await finder.locator('[data-support-budget="20"]').click();
          await finder.locator("[data-support-search]").click();
          await waitForCount(page, "#holistic-inline-results article", 1, label + " €20 filter");
          assert.ok(apiHits.includes("consultation"),
            label + ": synthetic consultation lookup must be intercepted");

          await finder.locator('[data-support-budget="100"]').click();
          await finder.locator("[data-support-search]").click();
          await waitForCount(page, "#holistic-inline-results article", 2, label + " €100 filter");

          await finder.locator('[data-support-theme="relationships"]').click();
          await finder.locator('[data-support-budget="free"]').click();
          await finder.locator("[data-support-search]").click();
          await waitForCount(page, "#holistic-inline-results article", 1, label + " free relationship");

          await finder.locator('[data-support-choice="talisman"]').click();
          await finder.locator('[data-support-budget="20"]').click();
          await finder.locator("[data-support-search]").click();
          await finder.locator("#remote-results [role='status']").waitFor({ state: "visible", timeout: 18000 });
          assert.equal(await finder.locator("[data-remote-support-specialist]").count(), 0,
            label + ": unpriced talisman must not have a fake €20 offer");
          assert.ok(apiHits.includes("energy"), label + ": energy directory lookup intercepted");

          const bounds = await page.evaluate(() => ({
            document: document.documentElement.scrollWidth,
            viewport: document.documentElement.clientWidth,
          }));
          assert.ok(bounds.document <= bounds.viewport + 2,
            label + ": page must not overflow " + JSON.stringify(bounds));
          assert.deepEqual(pageErrors, [], label + ": no JavaScript exceptions");
          assert.deepEqual(requestErrors, [], label + ": no failed practitioner lookups");
          await finder.screenshot({ path: outputDir + "/" + engine.name() + "-" + locale + "-" + width + ".png" });
          evidence.push({ engine: engine.name(), locale, width, mockHits: apiHits, noOverflow: true });
          console.log("PASS holistic live finder", label, apiHits.join(","));
        } catch (error) {
          const finder = page.locator("#holistic-inline-order");
          const visibleText = await finder.innerText().catch(() => "<unavailable>");
          await page.screenshot({ path: outputDir + "/FAIL-" + engine.name() + "-" + locale + "-" + width + ".png" }).catch(() => {});
          throw new Error(label + " failed; apiHits=" + JSON.stringify(apiHits) +
            "; requestErrors=" + JSON.stringify(requestErrors) +
            "; pageErrors=" + JSON.stringify(pageErrors) +
            "; finder=" + visibleText.slice(0, 900) + "; " + String(error));
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
assert.equal(evidence.length, 18, "exactly 2 engines × 3 locales × 3 widths");
await writeFile(outputDir + "/results.json", JSON.stringify(evidence, null, 2) + "\n");
console.log("Verified published Holistic Support: 18/18 read-only synthetic browser journeys");
