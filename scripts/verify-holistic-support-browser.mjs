// Holistic Support first-screen browser acceptance. Runs ONLY against the isolated local Next.js server.
// Never sends leads, plays provider videos, or submits private information.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { createHolisticBrowserIsolation } from "./helpers/holistic-browser-isolation.mjs";
import { privateRequestLeak, privateBrowserPersistence } from "./helpers/holistic-browser-privacy.mjs";
import { holisticFirstScreenDiagnostics } from "./helpers/holistic-first-screen-diagnostics.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Holistic Support QA must run against a local server only");
}
const folder = "artifacts/holistic-support";
await mkdir(folder, { recursive: true });
const questions = {
  en: "How can I focus on one small goal?",
  ru: "Как сосредоточиться на одной небольшой цели?",
  es: "¿Cómo puedo concentrarme en una pequeña meta?",
};
const evidence = [];

async function check(browserType, locale, width, height) {
  const browser = await browserType.launch();
  let isolation, page, primaryFailure;
  const label = [browserType.name(), locale, width, height].join("-");
  const clientErrors = [];
  const leakedQuestion = [];
  try {
    isolation = await createHolisticBrowserIsolation(browser, {origin, locale, viewport:{width, height}});
    page = isolation.page;
    page.on("pageerror", e => clientErrors.push(e.message));
    page.on("request", request => {
      if (privateRequestLeak(request, [questions[locale]])) leakedQuestion.push("PRIVATE_TEXT_REQUEST");
    });
    const response = await page.goto(origin + "/" + locale + "/holistic-support", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    assert.equal(response?.status(), 200, label + ": holistic support route");
    const first = page.locator("[data-holistic-three-choices]");
    await first.waitFor({ state: "visible", timeout: 30000 });
    const choices = first.locator("[data-holistic-choose]");
    assert.equal(await choices.count(), 3, label + ": only three first-screen choices");
    assert.deepEqual(await choices.evaluateAll(nodes => nodes.map(n => n.getAttribute("data-holistic-choose"))),
      ["meditations", "energy", "dao"], label + ": correct choices and sequence");
    assert.equal(await page.locator("[data-holistic-dao-screen]").count(), 0,
      label + ": Dao question is not visible before selection");
    const meditations = choices.nth(0);
    const energy = choices.nth(1);
    const dao = choices.nth(2);
    assert.equal(await meditations.getAttribute("href"), "#meditation-practices");
    assert.equal(await energy.getAttribute("href"), "/" + locale + "/services/remote-energy-support");
    assert.equal(await dao.getAttribute("aria-expanded"), "false");
    for (const choice of [meditations, energy, dao]) {
      assert.equal(await choice.locator("img").count(), 1, label + ": existing curated image");
      const bounds = await choice.boundingBox();
      assert.ok(bounds && bounds.width > 200 && bounds.height >= 80,
        label + ": readable full-width action card");
    }
    const firstScreenGeometry = await holisticFirstScreenDiagnostics(page);
    await writeFile(folder + "/first-screen-" + label + ".json", JSON.stringify(firstScreenGeometry, null, 2));
    const last = await dao.boundingBox();
    assert.ok(last && last.y + last.height < height - 40,
      label + ": last option must appear on the first mobile screen");
    const before = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth, viewport: window.innerWidth,
    }));
    assert.ok(before.content <= before.viewport + 1, label + ": no horizontal overflow on first screen");

    await dao.tap();
    assert.equal(await dao.getAttribute("aria-expanded"), "true");
    const panel = page.locator("[data-holistic-dao-screen]");
    await panel.waitFor({ state: "visible", timeout: 15000 });
    const input = panel.locator("#ideas-question");
    await input.waitFor({ state: "visible" });
    assert.equal(await panel.locator("[data-ideas-preview]").count(), 0,
      label + ": no fake prefilled personal reading");
    const diagnostic = panel.locator("[data-ideas-free-diagnostic]");
    await diagnostic.waitFor({ state: "visible" });
    assert.equal(await diagnostic.getAttribute("href"),
      "/" + locale + "/services/free-consultation#free-diagnosis-options",
      label + ": direct free diagnosis page and real anchor");
    await input.fill(questions[locale]);
    await panel.locator("[data-ideas-tao]").tap();
    const answer = panel.locator('[data-ideas-result="dao"]');
    await answer.waitFor({ state: "visible", timeout: 15000 });
    assert.ok((await answer.locator("[data-ideas-dao-summary]").innerText()).length > 25,
      label + ": generated symbolic text is visible");
    assert.equal(await answer.locator("[data-ideas-dao-promos]").count(), 0,
      label + ": no duplicate forms in Tao view");
    assert.deepEqual(leakedQuestion, [], label + ": question must not leak in requests");
    const after = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth, viewport: window.innerWidth,
    }));
    assert.ok(after.content <= after.viewport + 1,
      label + ": Dao result does not cause horizontal overflow");

    assert.equal(await privateBrowserPersistence(page, [questions[locale]]), false,
      label + ": visible Dao result has no persisted private question");
    await diagnostic.tap();
    await page.waitForURL(url => url.pathname === "/" + locale + "/services/free-consultation",
      { timeout: 30000 });
    await page.locator("#free-diagnosis-options").waitFor({ state: "visible", timeout: 15000 });
    assert.equal(await privateBrowserPersistence(page, [questions[locale]]), false,
      label + ": Dao question never enters URL, storage or cookies");
    assert.deepEqual(clientErrors, [], label + ": no uncaught browser exceptions");
    assert.deepEqual(leakedQuestion, [], label + ": no private question in any request URL or body");
    await isolation.assertClean();
    assert.ok(isolation.summary().anonymousTalismansReads > 0,
      label + ": gallery used the fixed synthetic anonymous401, never a customer-data API read");
    evidence.push({ browser: browserType.name(), locale, width, height, status: "passed" });
  } catch (err) {
    primaryFailure = err;
    if (page) await page.screenshot({ path: folder + "/" + label + ".png", fullPage: true }).catch(() => {});
    throw err;
  } finally {
    const failures = [];
    if (isolation) try { await isolation.close(); } catch { failures.push("ISOLATION_CLOSE_FAILED"); }
    try { await browser.close(); } catch { failures.push("BROWSER_CLOSE_FAILED"); }
    if (primaryFailure) {
      if (failures.length) console.error("Additional QA guard failures:", JSON.stringify(failures));
    } else assert.deepEqual(failures, [], "No unexpected request, popup, socket or unclosed context");
  }
}

for (const locale of ["en", "ru", "es"]) await check(webkit, locale, 390, 844);
await check(webkit, "ru", 320, 568);
await check(webkit, "en", 430, 844);
for (const locale of ["en", "ru", "es"]) await check(chromium, locale, 390, 844);
assert.equal(evidence.length, 8, "All eight canonical three-choice journeys completed");
await writeFile(folder + "/acceptance.json", JSON.stringify(evidence, null, 2));
console.log("Holistic Support three-choice mobile acceptance passed:", evidence.length, "browser/locale/width combinations");
