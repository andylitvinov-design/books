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

// A search re-fetches the public catalogue. Waiting only for the first article
// can succeed on the previous budget, immediately before React clears it.
// Wait for the exact synthetic result identities, including EUR/CAD exclusion.
async function waitForConsultationFixtures(page, locale, ids, label) {
  const expected = ids.map(id => "/" + locale + "/services/fixture/" + id).sort();
  await page.waitForFunction(wanted => {
    const results = document.querySelector("#holistic-inline-results");
    if (!results || results.hidden) return false;
    const links = [...results.querySelectorAll("article a[href]")]
      .map(link => link.getAttribute("href")).sort();
    return links.length === wanted.length &&
      links.every((href, index) => href === wanted[index]);
  }, expected, { timeout: 15000 });
  const actual = await page.locator("#holistic-inline-results article a[href]")
    .evaluateAll(links => links.map(link => link.getAttribute("href")).sort());
  assert.deepEqual(actual, expected, label + " only the requested published EUR fixture; CAD and stale results excluded");
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
          serviceWorkers: "block", // Isolate the synthetic practitioner fixture from SW.
        });
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        // Synthetic public catalog only: proves UI without using personal accounts,
        // posting enquiries, charging, or assuming real provider availability.
        await page.route("**/api/public/remote-energy-support-masters?**", async route => {
          const requestUrl = new URL(route.request().url());
          const isConsultation = requestUrl.searchParams.get("kind") === "consultation";
          const consultations = [
            { serviceId: "test-eur20", title: "Synthetic €20 consultation", practitionerName: "Fixture",
              description: "Published session test record", areaKey: "business_money",
              price: 20, currency: "EUR", pricingMode: "fixed", href: "/" + locale + "/services/fixture/eur20" },
            { serviceId: "test-eur100", title: "Synthetic €100 consultation", practitionerName: "Fixture",
              description: "Published session test record", areaKey: "business_money",
              price: 100, currency: "EUR", pricingMode: "fixed", href: "/" + locale + "/services/fixture/eur100" },
            { serviceId: "test-cad15", title: "Synthetic CAD consultation", practitionerName: "Fixture",
              description: "Published session test record", areaKey: "business_money",
              price: 15, currency: "CAD", pricingMode: "fixed", href: "/" + locale + "/services/fixture/cad15" },
            { serviceId: "test-free", title: "Synthetic free introduction", practitionerName: "Fixture",
              description: "Published introduction test record", areaKey: "relationships",
              price: 0, currency: "EUR", pricingMode: "free", href: "/" + locale + "/services/fixture/free" },
          ];
          const masters = [{
            slug: "fixture-master", name: "Fixture Master", title: "Synthetic published profile",
            photo: "", serviceId: "fixture-energy", methods: ["Usui Reiki"], languages: ["en","ru","es"],
            bio: "", description: "Fixture only", currency: "EUR",
            priceOptions: [{ duration: 30, price: 50 }, { duration: 60, price: 100 }],
            reviewCount: 0, reviewAverage: 0,
          }];
          await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(isConsultation ? { consultations } : { masters }) });
        });
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " HTTP status");
          await page.waitForFunction(() => {
            const button = document.querySelector('[data-holistic-topic="business"]');
            return !!button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
          }, null, {timeout:15000});
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
            assert.equal(await talisman.locator('[data-holistic-order-trigger="talisman"]').count(), 1,
              label + " opens inline talisman enquiry");
            assert.equal(await expert.locator('[data-holistic-order-trigger="expert"]').count(), 1,
              label + " opens inline energy support");
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
          // Owner 27 Oct: show the entire primary picker in one typical
          // mobile viewport, including all themes, service types, budgets and CTA.
          await root.locator('[data-holistic-topic="business"]').click();
          await root.locator('[data-holistic-order-trigger="expert"]').click();
          const finder = page.locator("#holistic-inline-order");
          await finder.waitFor({ state: "visible" });
          assert.equal(await finder.locator("[data-support-theme]").count(), 3, label + " 3 request themes");
          assert.equal(await finder.locator("[data-support-choice]").count(), 3, label + " 3 service types");
          assert.equal(await finder.locator("[data-support-budget]").count(), 4, label + " 4 price filters");
          const firstScreen = await finder.boundingBox();
          assert.ok(firstScreen && firstScreen.x >= -2 && firstScreen.x + firstScreen.width <= width + 2,
            label + " request inside viewport " + JSON.stringify(firstScreen));
          assert.ok(firstScreen.width >= width - 24, label + " full-width request");
          assert.ok(firstScreen.height < 540, label + " one mobile-screen request height");

          await finder.locator('[data-support-choice="consultation"]').click();
          await finder.locator('[data-support-budget="20"]').click();
          await finder.locator("[data-support-search]").click();
          await waitForConsultationFixtures(page, locale, ["eur20"], label + " EUR 20");
          assert.equal(await finder.locator('#holistic-inline-results article').count(), 1,
            label + " EUR 20 excludes CAD 15 and EUR 100");
          await finder.locator('[data-support-budget="100"]').click();
          await finder.locator("[data-support-search]").click();
          await waitForConsultationFixtures(page, locale, ["eur20", "eur100"], label + " EUR 100");
          assert.equal(await finder.locator('#holistic-inline-results article').count(), 2,
            label + " EUR 100 includes 2 EUR offers, not CAD");
          await finder.locator('[data-support-theme="relationships"]').click();
          await finder.locator('[data-support-budget="free"]').click();
          await finder.locator("[data-support-search]").click();
          await waitForConsultationFixtures(page, locale, ["free"], label + " free");
          assert.equal(await finder.locator('#holistic-inline-results article').count(), 1,
            label + " free relationship consultation");

          await finder.locator('[data-support-choice="talisman"]').click();
          await finder.locator('[data-support-budget="20"]').click();
          await finder.locator("[data-support-search]").click();
          await finder.locator('#remote-results [role="status"]').first().waitFor();
          assert.equal(await finder.locator("[data-remote-support-specialist]").count(), 0,
            label + " never quote an unpublished talisman price");

          const finalGeometry = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            page: document.documentElement.scrollWidth,
          }));
          assert.ok(finalGeometry.page <= finalGeometry.viewport + 2,
            label + " no overflow with open picker " + JSON.stringify(finalGeometry));

          await root.screenshot({ path: "artifacts/holistic-topic-mobile/" +
            engine.name() + "-" + locale + "-" + width + ".png" });
          assert.deepEqual(errors, [], label + " no runtime errors");
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
