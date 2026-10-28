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

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + ":" + locale + ":" + width;
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          isMobile: true, hasTouch: true, reducedMotion: "reduce",
          // Playwright page.route cannot intercept requests handled by a service worker.
          // Block SWs so fixture-only directory GETs never fall through to local API (503).
          serviceWorkers: "block",
        });
        const errors = [];
        const unexpectedWrites = [];
        // The route handler, not a passive request event, proves a write was
        // intercepted before transport. Keep only synthetic method/path metadata.
        const blockedWrites = [];
        const fixtureCalls = [];
        // Record only synthetic directory transport metadata for failure diagnosis.
        // No client data, query text, credentials, or response bodies are logged.
        const directoryPath = "/api/public/remote-energy-support-masters";
        const directoryNetwork = [];
        page.on("requestfailed", request => {
          const requestUrl = new URL(request.url());
          if (requestUrl.pathname === directoryPath)
            directoryNetwork.push({ event: "failed", kind: requestUrl.searchParams.get("kind"),
              reason: request.failure()?.errorText || "unknown" });
        });
        page.on("response", response => {
          const responseUrl = new URL(response.url());
          if (responseUrl.pathname === directoryPath)
            directoryNetwork.push({ event: "response", kind: responseUrl.searchParams.get("kind"),
              status: response.status() });
        });
        page.on("request", request => {
          const requestUrl = new URL(request.url());
          if (requestUrl.pathname === directoryPath)
            directoryNetwork.push({ event: "request", kind: requestUrl.searchParams.get("kind"),
              method: request.method() });
        });
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", request => {
          const url = new URL(request.url());
          // Do not store external hostnames, paths, query strings or request
          // bodies: only whether an attempted write crossed the local origin.
          if (!["GET", "HEAD"].includes(request.method()))
            unexpectedWrites.push(request.method() + " " +
              (url.origin === origin ? url.pathname : "[external-origin]"));
        });
        // Fail closed *before transport* for both first-party and third-party
        // writes. The older same-origin-only guard could not prevent a direct
        // POST to an external collection endpoint before consent.
        await page.route(url => ["http:", "https:"].includes(url.protocol), async route => {
          if (!["GET", "HEAD"].includes(route.request().method())) {
            const url = new URL(route.request().url());
            blockedWrites.push(route.request().method() + " " +
              (url.origin === origin ? url.pathname : "[external-origin]"));
            await route.abort("blockedbyclient");
            return;
          }
          await route.fallback();
        });
        // Synthetic public catalog only: proves UI without using personal accounts,
        // posting enquiries, charging, or assuming real provider availability.
        // This narrower route takes priority; it must never fulfill a write.
        await page.route(url => url.origin === origin && url.pathname === directoryPath, async route => {
          if (route.request().method() !== "GET") {
            await route.abort("blockedbyclient");
            return;
          }
          const requestUrl = new URL(route.request().url());
          const isConsultation = requestUrl.searchParams.get("kind") === "consultation";
          fixtureCalls.push({ kind: isConsultation ? "consultation" : "masters",
            locale: requestUrl.searchParams.get("locale") });
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
          // Verify interception in a synthetic same-origin HTML document before
          // loading the application. The application's CSP may reject a fetch
          // without issuing a request, which cannot prove Playwright route safety.
          if (locale === "en" && width === 320) {
            const probeDocumentPath = "/__hh-read-only-qa-document";
            await page.route(origin + probeDocumentPath, route => route.fulfill({
              status: 200, contentType: "text/html",
              body: "<!doctype html><html><body>Read-only QA network guard</body></html>",
            }));
            const documentResponse = await page.goto(origin + probeDocumentPath,
              { waitUntil: "domcontentloaded", timeout: 15000 });
            assert.equal(documentResponse?.status(), 200, label + " synthetic probe document");
          }
          // Negative controls for both first-party and cross-origin writes.
          // The .invalid hostname is reserved and must never be contacted:
          // the Playwright route aborts the POST before any network transport.
          // Exercise once per engine, without user data or production tokens.
          if (locale === "en" && width === 320) {
            for (const probe of [
              { url: "/__hh-read-only-qa-probe", record: "POST /__hh-read-only-qa-probe" },
              { url: "https://hh-read-only-probe.invalid/__hh-read-only-qa-probe",
                record: "POST [external-origin]" },
            ]) {
              const outcome = await page.evaluate(async url => {
                try {
                  const result = await fetch(url, { method: "POST", body: "synthetic-only" });
                  return "HTTP " + result.status;
                } catch {
                  return "blocked";
                }
              }, probe.url);
              assert.equal(outcome, "blocked", label + " blocks synthetic POST before transport");
              assert.equal(blockedWrites.filter(value => value === probe.record).length, 1,
                label + " intercepts exactly one intentional POST before transport");
              // Remove only this known synthetic probe from both ledgers;
              // any unsolicited write still fails the final assertion.
              blockedWrites.splice(blockedWrites.indexOf(probe.record), 1);
              const observedIndex = unexpectedWrites.indexOf(probe.record);
              if (observedIndex !== -1) unexpectedWrites.splice(observedIndex, 1);
            }
          }
          const response = await page.goto(origin + "/" + locale + "/holistic-support",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " HTTP status");
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
            // Exercise both real disclosure actions without posting a request.
            for (const [kind, action] of [
              ["talisman", talisman.locator('[data-holistic-order-trigger="talisman"]')],
              ["energy", expert.locator('[data-holistic-order-trigger="expert"]')],
            ]) {
              const bounds = await action.boundingBox();
              assert.ok(bounds && bounds.height >= 44 && bounds.width >= 44,
                label + " " + kind + " mobile action >= 44px");
              await action.click();
              assert.equal(await action.getAttribute("aria-expanded"), "true",
                label + " " + kind + " opens");
              const inline = panel.locator('[data-holistic-inline-order="' + kind + '"]');
              await inline.waitFor({ state: "visible", timeout: 15000 });
              assert.equal(await inline.locator("#holistic-inline-order-title").count(), 1,
                label + " " + kind + " accessible order title");
              await inline.locator('button[aria-label]').first().click();
              await inline.waitFor({ state: "hidden", timeout: 15000 });
              assert.equal(await action.getAttribute("aria-expanded"), "false",
                label + " " + kind + " closes");
            }
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

          // A click starts an async directory request. Waiting only for the first
          // article races React clearing stale results between fetches (CI #40568273832).
          // Require the exact synthetic offers before asserting; never mask a missing offer.
          const verifyConsultations = async (expected, scenario) => {
            const sorted = [...expected].sort();
            try {
              // WebKit can throttle requestAnimationFrame polling for an offscreen
              // disclosure; timed polling still requires the exact result set.
              await page.waitForFunction(titles => {
                const results = document.querySelector("#holistic-inline-order #holistic-inline-results");
                if (!results || results.hidden) return false;
                const actual = [...results.querySelectorAll("article h5")]
                  .map(node => (node.textContent || "").trim()).sort();
                return actual.length === titles.length &&
                  actual.every((title, index) => title === titles[index]);
              }, sorted, { polling: 250, timeout: 20000 });
            } catch (error) {
              // Fixture-only diagnostics; never log actual practitioner/client data.
              const state = await finder.locator("#holistic-inline-results").evaluate(node => ({
                hidden: node.hidden,
                titles: [...node.querySelectorAll("article h5")].map(el => (el.textContent || "").trim()),
                status: (node.querySelector('[role="status"],[role="alert"]')?.textContent || "").slice(0, 180),
                kind: document.querySelector("#holistic-inline-order")?.getAttribute("data-holistic-inline-order"),
                selectedTopic: document.querySelector("#holistic-inline-order [data-support-theme][aria-pressed=true]")?.getAttribute("data-support-theme"),
                selectedBudget: document.querySelector("#holistic-inline-order [data-support-budget][aria-pressed=true]")?.getAttribute("data-support-budget"),
              })).catch(() => ({ unavailable: true }));
              throw new Error(label + " " + scenario + " fixture mismatch: " +
                JSON.stringify({ expected: sorted, state, routedFixtures: fixtureCalls, directoryNetwork, pageErrors: errors }), { cause: error });
            }
            const actual = (await finder.locator("#holistic-inline-results article h5").allInnerTexts())
              .map(title => title.trim()).sort();
            assert.deepEqual(actual, sorted, label + " " + scenario);
          };
          await finder.locator('[data-support-choice="consultation"]').click();
          await finder.locator('[data-support-budget="20"]').click();
          await finder.locator("[data-support-search]").click();
          await verifyConsultations(["Synthetic €20 consultation"], "EUR 20 excludes CAD 15 and EUR 100");
          await finder.locator('[data-support-budget="100"]').click();
          await finder.locator("[data-support-search]").click();
          await verifyConsultations(["Synthetic €20 consultation", "Synthetic €100 consultation"],
            "EUR 100 includes both EUR offers, not CAD");
          await finder.locator('[data-support-theme="relationships"]').click();
          await finder.locator('[data-support-budget="free"]').click();
          await finder.locator("[data-support-search]").click();
          await verifyConsultations(["Synthetic free introduction"], "free relationship consultation");

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
          assert.deepEqual(unexpectedWrites, [], label + " no unsolicited CRM, booking or payment writes");
          assert.deepEqual(blockedWrites, [], label + " no unsolicited write intercepted before transport");
          // CI #40620636035 proved all 18 UI flows after blocking service workers.
          // Guard against a future silent fall-through to the real (unconfigured)
          // directory endpoint: synthetic browser QA must only see fixture HTTP 200.
          assert.ok(fixtureCalls.some(call => call.kind === "consultation" && call.locale === locale),
            label + " must use locale-specific synthetic consultation transport");
          assert.ok(directoryNetwork.some(event => event.event === "response" && event.status === 200),
            label + " must receive an intercepted directory response");
          assert.deepEqual(directoryNetwork.filter(event =>
            event.event === "failed" || (event.event === "response" && event.status !== 200)), [],
            label + " no failed or real directory responses in fixture-only QA");
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
