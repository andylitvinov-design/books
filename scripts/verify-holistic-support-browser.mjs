// Holistic Support first-screen browser acceptance. Runs ONLY against the isolated local Next.js server.
// Never sends leads, plays provider videos, or submits private information.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { runMobileBrowserCases } from "./ci-mobile-browser-batch.mjs";

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

async function check(browserType, browser, locale, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const label = [browserType.name(), locale, width, height].join("-");
  const clientErrors = [];
  const leakedQuestion = [];
  page.on("pageerror", e => clientErrors.push(e.message));
  page.on("request", request => {
    if (request.url().includes(encodeURIComponent(questions[locale]))) leakedQuestion.push(request.url());
  });
  try {
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

    await diagnostic.tap();
    await page.waitForURL(url => url.pathname === "/" + locale + "/services/free-consultation",
      { timeout: 30000 });
    await page.locator("#free-diagnosis-options").waitFor({ state: "visible", timeout: 15000 });
    assert.deepEqual(clientErrors, [], label + ": no uncaught browser exceptions");
    evidence.push({ browser: browserType.name(), locale, width, height, status: "passed" });
  } catch (err) {
    await page.screenshot({ path: folder + "/" + label + ".png", fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await context.close();
  }
}

await runMobileBrowserCases([
  { browserType: webkit, cases: [
    ...["en", "ru", "es"].map(locale => [locale, 390, 844]),
    ["ru", 320, 568], ["en", 430, 844],
  ] },
  { browserType: chromium, cases: ["en", "ru", "es"].map(locale => [locale, 390, 844]) },
], check);
await writeFile(folder + "/acceptance.json", JSON.stringify(evidence, null, 2));
console.log("Holistic Support three-choice mobile acceptance passed:", evidence.length, "browser/locale/width combinations");
