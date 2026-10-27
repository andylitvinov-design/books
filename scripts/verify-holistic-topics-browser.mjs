// Read-only Chromium/WebKit verification of the separate Holistic Support journeys.
// Synthetic published offers only; never submit a CRM enquiry or perform a payment.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic topic verification is loopback-only");
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
        page.on("pageerror", error => errors.push(error.message));
        const requests = [];
        await page.route("**/api/public/remote-energy-support-masters?**", async route => {
          requests.push(new URL(route.request().url()).searchParams.get("kind") || "energy");
          const isConsultation = new URL(route.request().url()).searchParams.get("kind") === "consultation";
          const consultations = [
            { serviceId:"test-eur20", title:"Synthetic €20 consultation", practitionerName:"Fixture",
              description:"Published test record", areaKey:"business_money", price:20, currency:"EUR",
              pricingMode:"fixed", href:"/"+locale+"/services/fixture/eur20" },
            { serviceId:"test-eur100", title:"Synthetic €100 consultation", practitionerName:"Fixture",
              description:"Published test record", areaKey:"business_money", price:100, currency:"EUR",
              pricingMode:"fixed", href:"/"+locale+"/services/fixture/eur100" },
            { serviceId:"test-cad15", title:"Synthetic CAD consultation", practitionerName:"Fixture",
              description:"Published test record", areaKey:"business_money", price:15, currency:"CAD",
              pricingMode:"fixed", href:"/"+locale+"/services/fixture/cad15" },
            { serviceId:"test-free", title:"Synthetic free offer", practitionerName:"Fixture",
              description:"Published test record", areaKey:"relationships", price:0, currency:"EUR",
              pricingMode:"free", href:"/"+locale+"/services/fixture/free" },
          ];
          const masters = [{
            slug:"fixture-master", name:"Fixture Master", title:"Synthetic published practitioner",
            photo:"/images/holistic-house/andy-about.png",
            serviceId:"fixture-energy", methods:["Usui Reiki"], languages:["en","ru","es"],
            bio:"", description:"Fixture support session", currency:"EUR",
            priceOptions:[{ duration:30, price:50 },{ duration:60, price:100 }],
            reviewCount:0, reviewAverage:0,
          }];
          await route.fulfill({ status:200, contentType:"application/json",
            body:JSON.stringify(isConsultation ? { consultations } : { masters }) });
        });
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support",
            { waitUntil:"domcontentloaded", timeout:60000 });
          assert.equal(response?.status(), 200, label + " hub HTTP 200");
          const root = page.locator("[data-holistic-topic-filter]");
          await root.waitFor({ state:"visible", timeout:30000 });
          assert.equal(await root.locator('[role="tab"]').count(), 3, label + " three themes");
          for (const topic of ["business","love","health"]) {
            const tab = root.locator('[data-holistic-topic="' + topic + '"]');
            await tab.click();
            assert.equal(await tab.getAttribute("aria-selected"), "true", label + " active theme");
            const box = await tab.boundingBox();
            assert.ok(box && box.width >= 44 && box.height >= 44, label + " theme touch target");
            assert.equal(await root.locator('[data-holistic-topic-card]').count(), 3);
            assert.equal(await root.locator('[data-holistic-topic-card="meditation"] a').last().getAttribute("href"),
              "#meditation-practices");
            assert.equal(await root.locator('[data-holistic-order-trigger="talisman"]').getAttribute("href"),
              "/" + locale + "/talismans");
            assert.equal(await root.locator('[data-holistic-order-trigger="expert"]').getAttribute("href"),
              "/" + locale + "/support-options?topic=" + topic);
          }
          await root.locator('[data-holistic-topic="business"]').click();
          await root.locator('[data-holistic-order-trigger="expert"]').click();
          await page.waitForURL(url => url.pathname === "/" + locale + "/support-options");
          const finder = page.locator("[data-support-options-standalone-page] #holistic-inline-order");
          await finder.waitFor({ state:"visible", timeout:30000 });
          assert.equal(await finder.locator("[data-support-theme]").count(), 3);
          assert.equal(await finder.locator("[data-support-choice]").count(), 3);
          assert.equal(await finder.locator("[data-support-budget]").count(), 4);
          await finder.locator("[data-remote-support-specialist]").first().waitFor({ state:"visible", timeout:30000 });
          assert.ok(requests.includes("energy"), label + " masters loaded without Search click");
          assert.equal(await finder.locator("[data-support-search]").count(), 0, label + " no redundant Find button on auto-loaded page");
          assert.equal(await finder.locator('[data-remote-support-specialist]').count(), 1);

          await finder.locator('[data-support-choice="consultation"]').click();
          await finder.locator('[data-support-budget="20"]').click();
          await page.waitForFunction(() => document.querySelectorAll("#holistic-inline-results article").length === 1);
          assert.equal(await finder.locator("#holistic-inline-results article").count(), 1,
            label + " €20 excludes CAD and €100 without Search click");
          await finder.locator('[data-support-budget="100"]').click();
          await page.waitForFunction(() => document.querySelectorAll("#holistic-inline-results article").length === 2);
          assert.equal(await finder.locator("#holistic-inline-results article").count(), 2);
          await finder.locator('[data-support-choice="talisman"]').click();
          await page.waitForURL(url => url.pathname === "/" + locale + "/talismans");
          const catalog = page.locator("[data-talisman-standalone-page]");
          await catalog.waitFor({ state:"visible", timeout:30000 });
          assert.equal(await catalog.locator("[data-tao-talisman]").count(), 3, label + " three Fu designs");
          assert.equal(await catalog.locator("[data-tao-selected-item]").count(), 1,
            label + " first Fu automatically selected");
          assert.equal(await catalog.locator("[data-tao-selected-item] img").count(), 1,
            label + " product photograph precedes master");
          assert.ok((await catalog.locator("[data-tao-selected-item] h3").innerText()).length > 5);
          await catalog.locator("[data-remote-support-specialist]").first().waitFor({ state:"visible", timeout:30000 });
          assert.equal(await catalog.locator("[data-remote-support-specialist]").count(), 1,
            label + " practitioner shown automatically");
          assert.match(await catalog.locator("[data-remote-support-specialist]").innerText(), /Fixture Master/);
          const productBox = await catalog.locator("[data-tao-selected-item]").boundingBox();
          const masterBox = await catalog.locator("[data-remote-support-specialist]").first().boundingBox();
          assert.ok(productBox && masterBox && productBox.y + productBox.height <= masterBox.y + 3,
            label + " talisman and description appear before master portrait");
          assert.equal(await catalog.locator('[data-lead-saved]').count(), 0, label + " no synthetic lead");
          const geometry = await page.evaluate(() => ({
            viewport:document.documentElement.clientWidth,
            document:document.documentElement.scrollWidth,
          }));
          assert.ok(geometry.document <= geometry.viewport + 2, label + " no horizontal overflow " + JSON.stringify(geometry));
          const image = catalog.locator('[data-tao-talisman="fu-harmony"]');
          await image.locator("[data-tao-talisman-order]").click();
          assert.equal(await catalog.locator('[data-tao-selected-item]').getAttribute('data-tao-selected-item'),
            "fu-harmony", label + " selected design updates without another page");
          assert.deepEqual(errors, [], label + " no JS runtime errors");
          await catalog.screenshot({ path:"artifacts/holistic-topic-mobile/" + engine.name() +
            "-" + locale + "-" + width + ".png" });
          evidence.push({browser:engine.name(), locale, width, topics:3, talismans:3,
            autoResults:true, horizontalOverflow:false});
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile("artifacts/holistic-topic-mobile/results.json", JSON.stringify(evidence,null,2) + "\n");
console.log("Verified standalone support and talisman mobile journeys:", evidence.length);
