// Read-only mobile acceptance: no CRM submissions, messages or purchases.
// Runs solely against this PR's local production build on loopback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { assertPublicJourneyRuntime, installPublicJourneyFence } from "./helpers/public-journey-verifier.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic topic mobile tests are loopback-only");
assertPublicJourneyRuntime(origin);
await mkdir("artifacts/holistic-topic-mobile", { recursive: true });
const evidence = [];

// One response per explicit opening, never a public-directory read or successful
// practitioner payload. Other API traffic remains fatal while this scope is active.
async function installInlineOrderDirectoryDenial(context, origin, locale, deadlineMs = 10000) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
  assert.ok(["en", "ru", "es"].includes(locale));
  assert.ok(Number.isSafeInteger(deadlineMs) && deadlineMs > 0 && deadlineMs <= 10000);
  const deadlineAt = Date.now() + deadlineMs;
  const bounded = (operation, phase) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Inline directory fixture timed out: " + phase)),
      Math.max(1, deadlineAt - Date.now()));
    Promise.resolve().then(operation).then(value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); });
  });
  const expectedUrl = origin + "/api/public/remote-energy-support-masters?locale=" + locale;
  let armed = false, fulfilled = 0, closed = false, servedRequest = null;
  const violations = [], pending = new Set();
  let handlerFailure;
  const handle = async route => {
    const request = route.request();
    if (closed) {
      violations.push("late-inline-directory-callback");
      // A queued invocation after removal must hit the original fence, not disappear.
      return bounded(() => route.fallback(), "late callback fallback");
    }
    let pathname = "";
    try { pathname = new URL(request.url()).pathname; } catch { /* Unknown URLs go to the unchanged fence. */ }
    if (!pathname.startsWith("/api/")) return bounded(() => route.fallback(), "fence fallback");
    let completeHeaders;
    try { completeHeaders = await bounded(() => request.allHeaders(), "header evidence"); } catch { /* Missing evidence fails closed. */ }
    const names = completeHeaders && typeof completeHeaders === "object" && !Array.isArray(completeHeaders)
      ? Object.keys(completeHeaders).map(name => name.toLowerCase()) : null;
    const valid = !closed && armed && fulfilled === 0 && request.url() === expectedUrl &&
      request.method() === "GET" && request.resourceType() === "fetch" && request.isNavigationRequest() === false &&
      !request.postData() && names !== null &&
      !names.some(name => ["authorization", "proxy-authorization", "cookie", "purpose", "sec-purpose", "next-router-prefetch", "rsc"].includes(name));
    if (!valid) {
      violations.push("unexpected-inline-directory-request");
      return bounded(() => route.abort("blockedbyclient"), "request abort");
    }
    armed = false;
    servedRequest = request;
    await bounded(() => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"QA_DIRECTORY_UNAVAILABLE"}' }), "synthetic denial");
    fulfilled++;
  };
  const handler = route => {
    const work = handle(route);
    pending.add(work);
    work.then(() => pending.delete(work), error => { pending.delete(work); handlerFailure ??= error; });
    return work;
  };
  await bounded(() => context.route("**/*", handler), "handler installation");
  return {
    arm() { assert.equal(closed, false); assert.equal(armed, false); assert.equal(fulfilled, 0); assert.deepEqual(violations, []); armed = true; },
    matchesResponse(response) { return servedRequest !== null && response.request() === servedRequest && response.status() === 503; },
    assertCompleted() { assert.equal(armed, false); assert.equal(fulfilled, 1); assert.deepEqual(violations, []); },
    async close() {
      closed = true; armed = false;
      let removalFailure;
      // Remove only this handler first: new traffic returns to the original fence.
      try { await bounded(() => context.unroute("**/*", handler), "handler removal"); } catch (error) { removalFailure = error; }
      while (pending.size) await Promise.allSettled([...pending]);
      if (handlerFailure) throw handlerFailure;
      assert.deepEqual(violations, [], "No late or unexpected directory requests during cleanup");
      if (removalFailure) throw removalFailure;
    },
  };
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
          serviceWorkers: "block",
        });
        const fence = await installPublicJourneyFence(page.context(), origin, [], {anonymousTalismans:true,browserLocalBlobImages:engine === webkit});
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " HTTP status");
          const root = page.locator("[data-holistic-topic-filter]");
          await root.waitFor({ state: "visible", timeout: 30000 });
          const catalog = page.locator('[data-taoist-talisman-catalog]');
          await catalog.waitFor({ state: "visible" });
          assert.equal(await catalog.locator('[data-tao-talisman]').count(), 3, label + " three public catalog examples");
          const archive = catalog.locator('button[aria-controls="tao-talisman-private-gallery"]');
          assert.equal(await archive.count(), 1, label + " one explicit private archive toggle");
          assert.equal(await archive.getAttribute("aria-expanded"), "false");
          assert.equal(await catalog.locator('[data-support-talismans]').count(), 0,
            label + " private gallery is not mounted before explicit opening");
          assert.equal(fence.summary().anonymousTalismanReads, 0);
          const archiveTarget = await archive.boundingBox();
          assert.ok(archiveTarget && archiveTarget.height >= 44 && archiveTarget.width >= 44,
            label + " private archive touch target");
          await archive.click();
          assert.equal(await archive.getAttribute("aria-expanded"), "true");
          const gallery = catalog.locator('#tao-talisman-private-gallery [data-support-talismans]');
          await gallery.locator('a[href="/' + locale + '/app"]').waitFor({state:"visible"});
          assert.equal(await gallery.locator('img, form, [data-talisman-upload]').count(), 0,
            label + " no private gallery contents or upload operations in guest QA");
          assert.equal(fence.summary().anonymousTalismanReads, 1);
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
            const collection = page.locator('#talismans[data-holistic-talismans]');
            assert.equal(await collection.count(), 1, label + " personal collection remains independently available");
            assert.equal(await collection.locator('[data-support-talismans]').count(), 1,
              label + " never inspect private items or operate uploads here");
            for (const [card, offer, kind] of [[talisman, "talisman", "talisman"], [expert, "expert", "energy"]]) {
              const trigger = card.locator('[data-holistic-order-trigger="' + offer + '"]');
              assert.equal(await trigger.count(), 1, label + " one explicit inline request trigger");
              assert.equal(await card.locator("a").count(), 0, label + " no retired offer navigation");
              const target = await trigger.boundingBox();
              assert.ok(target && target.height >= 44 && target.width >= 44, label + " request touch target");
              for (let repeat = 0; repeat < 2; repeat++) {
                assert.equal(await trigger.getAttribute("aria-expanded"), "false");
                assert.equal(await trigger.getAttribute("aria-controls"), "holistic-inline-order");
                const directory = await installInlineOrderDirectoryDenial(page.context(), origin, locale);
                let openingFailure;
                try {
                  directory.arm();
                  const deniedResponse = page.waitForResponse(response => directory.matchesResponse(response), { timeout: 10000 });
                  // A failure never creates an unhandled pending wait or waives an unrelated 503.
                  deniedResponse.catch(() => {});
                  await trigger.click();
                  await deniedResponse;
                  const order = root.locator('[data-holistic-inline-order="' + kind + '"]');
                  await order.waitFor({ state: "visible" });
                  assert.equal(await root.locator('[data-holistic-inline-order]').count(), 1);
                  await order.locator('[role="alert"]').waitFor({ state: "visible" });
                  directory.assertCompleted();
                  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
                  assert.equal(await order.locator('form, input, textarea, select').count(), 0,
                    label + " denied directory cannot expose a submittable practitioner form");
                  await order.locator("button").first().click();
                  await order.waitFor({ state: "detached" });
                  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
                  assert.equal(await panel.getAttribute("data-holistic-topic-selected"), topic);
                  assert.equal(page.url(), origin + "/" + locale + "/holistic-support");
                  directory.assertCompleted();
                  fence.assertNoSideEffects(label);
                } catch (error) {
                  openingFailure = error;
                  throw error;
                } finally {
                  try { await directory.close(); fence.assertNoSideEffects(label); } catch (error) {
                    if (!openingFailure) throw error;
                    // The primary failure still terminates this journey; never replace it.
                    console.error("Inline directory cleanup also failed after the primary opening failure");
                  }
                }
              }
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
          await root.screenshot({ path: "artifacts/holistic-topic-mobile/" +
            engine.name() + "-" + locale + "-" + width + ".png" });
          assert.deepEqual(errors, [], label + " no runtime errors");
          fence.assertNoSideEffects(label);
          evidence.push({ browser: engine.name(), locale, width, topics: 3, offerings: 3, inlineOpenings: 12, directory: "synthetic-unavailable", overflow: false });
        } finally {
          await writeFile("artifacts/holistic-topic-mobile/requests-" + engine.name() + "-" + locale + "-" + width + ".json",
            JSON.stringify(fence.summary(), null, 2));
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
