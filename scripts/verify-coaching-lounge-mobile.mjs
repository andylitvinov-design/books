// Live React hydration and touch acceptance for existing Coaching Lounge.
// Isolated local server only; never starts paid sessions or submits private answers.
// A catalog-less CI environment can verify navigation; it cannot certify live Supabase.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Coaching mobile browser QA is limited to an isolated local server");
const output = "artifacts/coaching-mobile";
await mkdir(output, { recursive: true });
const evidence = [];
const touchTargets = [
  ["money", "decision", "human"],
  ["business", "action", "self"],
  ["growth", "clarity", "all"],
];
async function verify(browserType, locale, width) {
  const browser = await browserType.launch();
  const page = await browser.newPage({
    viewport: { width, height: 844 }, deviceScaleFactor: 1,
    hasTouch: true, isMobile: true, reducedMotion: "reduce",
  });
  const label = [browserType.name(), locale, width].join(":");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const response = await page.goto(origin + "/" + locale + "/coaching", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    assert.equal(response?.status(), 200, label + ": public route");
    const root = page.locator("[data-public-coaching]");
    await root.waitFor({ state: "visible", timeout: 30000 });
    const topics = root.locator("[data-coaching-topic-first]");
    const outcomes = root.locator("[data-coaching-outcome-first]");
    const formats = root.locator("fieldset").filter({
      has: root.locator("button[aria-pressed]").filter({ hasText: /Andrey|Андреем|Andrey/i }),
    });
    await topics.waitFor({ state: "visible" });
    // Outcome preferences are intentionally collapsed on the compact mobile UI.
    // Open their native details control before asserting button visibility.
    const advanced = root.locator("[data-coaching-advanced-preferences]");
    await advanced.locator("summary").tap();
    await outcomes.waitFor({ state: "visible" });
    assert.equal(await outcomes.locator("[data-coaching-outcome]").count(), 5, label + ": five client outcomes");
    assert.equal(await topics.locator("[data-coaching-topic-group]").count(), 7, label + ": all topics");
    const allCards = root.locator("[data-public-coaching-models] [data-coaching-item]");
    const initialCatalogCount = await allCards.count();
    const [topicId, goalId] = touchTargets[width === 320 ? 0 : width === 430 ? 1 : 2];
    const topic = topics.locator('[data-coaching-topic-group="' + topicId + '"]');
    await topic.tap();
    assert.equal(await topic.getAttribute("aria-pressed"), "true", label + ": mobile topic tap");
    const goal = outcomes.locator('[data-coaching-outcome="' + goalId + '"]');
    await goal.tap();
    assert.equal(await goal.getAttribute("aria-pressed"), "true", label + ": mobile goal tap");
    assert.equal(await outcomes.locator('[aria-pressed="true"]').count(), 1, label + ": single selected goal");
    // The selected goal is a nonclinical recommendation, not a strict filter.
    const topicCatalogCount = await allCards.count();
    await goal.tap();
    assert.equal(await goal.getAttribute("aria-pressed"), "false", label + ": selected goal can clear");
    assert.equal(await allCards.count(), topicCatalogCount, label + ": selecting an outcome never hides other methods");
    await goal.tap();
    const note = root.locator(".ignore-nothing");
    assert.equal(await root.locator('[role="status"]').filter({ hasText: /suggestion|рекомендац|sugerencia|opciones/i }).count() > 0
      || await root.locator("[data-public-coaching-models]").count() === 0, true, label + ": transparent matching");
    // Live human offers now share the existing three-choice capture. It lists
    // a free *written* assessment and two paid sessions, not course cards.
    const paid = root.locator("[data-coaching-session-capture]");
    const humanChoice = advanced.locator("button").filter({ hasText: /With Andrey|С Андреем|Con Andrey/i }).first();
    await humanChoice.tap();
    assert.equal(await humanChoice.getAttribute("aria-pressed"), "true", label + ": human selection");
    await paid.waitFor({ state: "visible" });
    const capture = paid.locator("[data-coaching-live-capture]");
    assert.equal(await capture.locator("[data-coaching-booking-option]").count(), 3,
      label + ": free written assessment and both live session offers");
    const short = capture.locator('[data-coaching-booking-option="short"]');
    const full = capture.locator('[data-coaching-booking-option="full"]');
    assert.match(await short.innerText(), /€50/, label + ": 30-minute session costs €50");
    assert.match(await full.innerText(), /€100/, label + ": 60-minute session costs €100");
    await short.tap();
    assert.equal(await short.getAttribute("aria-checked"), "true", label + ": 30-minute price selection");
    await capture.locator('[data-coaching-booking-choice="short"]').tap();
    const mini = capture.locator("[data-coaching-paid-phone]");
    await mini.waitFor({ state: "visible" });
    assert.equal(await mini.locator('input[type="tel"]').count(), 1, label + ": paid phone only");
    assert.equal(await mini.locator('[data-compact-channel]').count(), 2,
      label + ": two opt-in messenger choices and no giant sign-in form");
    assert.equal(await mini.locator('input[type="checkbox"]').isChecked(), false,
      label + ": CRM contact opt-in starts unchecked");
    await full.tap();
    assert.equal(await capture.locator('[data-coaching-request-sheet]').getAttribute("data-open"), "false",
      label + ": changing price collapses old request");

    assert.equal(await full.getAttribute("aria-checked"), "true", label + ": 60-minute price selection");
    assert.equal(await root.locator("[data-coaching-practitioner-checklist]").isVisible(), true,
      label + ": visible trust/training and availability checks");
    const free = root.locator("button").filter({ hasText: /Try it free|Самостоятельно|Por mi cuenta/ }).first();
    await free.tap();
    assert.equal(await free.getAttribute("aria-pressed"), "true", label + ": free mode tap");
    if (!(await advanced.evaluate(node => node.open))) await advanced.locator("summary").tap();
    assert.equal(await advanced.evaluate(node => node.open), true, label + ": visible inline preferences, never a modal");
    assert.equal(await advanced.locator('[data-coaching-filter="duration"] button').count(), 5,
      label + ": five optional time choices");
    await advanced.locator('[data-coaching-filter="duration"] button').nth(1).tap();
    assert.equal(await advanced.locator('[data-coaching-filter="duration"] button').nth(1).getAttribute("aria-pressed"),
      "true", label + ": duration change");
    assert.equal(await root.locator('[data-coaching-outcome="' + goalId + '"]').getAttribute("aria-pressed"),
      "true", label + ": changing optional preferences retains chosen goal");
    // Test the actual free runner when a reviewed catalog is accessible in CI.
    const firstCard = allCards.first();
    const availableCards = await allCards.count();
    if (availableCards > 0) {
      await advanced.locator("summary").tap();
      await firstCard.locator("button").filter({ hasText: /Start free|Начать бесплатно|Empezar gratis/ }).first().tap();
      await root.locator("[data-public-coaching-session]").waitFor({ state: "visible" });
      const beforeNav = await page.url();
      assert.ok(!beforeNav.includes("question="), label + ": never expose private question in URL");
      await root.locator("[data-public-coaching-session] button").filter({ hasText: /All sessions|Все сессии|Todas las sesiones/ }).first().tap();
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.scrollWidth <= dimensions.viewport + 2,
      label + ": no accidental horizontal scrolling " + JSON.stringify(dimensions));
    assert.deepEqual(errors, [], label + ": zero uncaught React errors");
    if (width === 390)
      await page.screenshot({ path: output + "/coaching-" + browserType.name() + "-" + locale + "-390.png", fullPage: false });
    // Exercise free mobile handoff without performing a real CRM submission.
    if (!(await advanced.evaluate(node => node.open))) await advanced.locator("summary").tap();
    await humanChoice.tap();
    const freeCapture = root.locator("[data-coaching-live-capture]");
    await freeCapture.locator('[data-coaching-booking-option="free"]').tap();
    await freeCapture.locator('[data-coaching-booking-choice="free"]').tap();
    const freePhone = freeCapture.locator("[data-coaching-phone-start]");
    await freePhone.waitFor({ state: "visible" });
    assert.equal(await freePhone.locator('input[type="tel"]').count(), 1,
      label + ": free flow asks for phone only");
    assert.equal(await freePhone.locator('[data-compact-channel]').count(), 0,
      label + ": free flow never opens messengers");
    await freePhone.locator('input[type="tel"]').fill("+14165550123");
    await freePhone.locator('[data-free-coaching-start]').tap();
    await page.waitForURL(origin + "/" + locale + "/coaching/intake?guided=1");
    const guided = page.locator("[data-coaching-guided]");
    await guided.waitFor({ state: "visible" });
    assert.equal(await guided.locator('[data-guided-coaching-question="request"]').count(), 1,
      label + ": first slide asks for a short question");
    assert.equal(await guided.locator('[data-guided-coaching-send]').count(), 0,
      label + ": no premature CRM submit");
    await guided.locator('[data-guided-coaching-question="request"]').fill("Synthetic QA: choosing my next step.");
    await guided.locator('[data-guided-next]').tap();
    assert.equal(await guided.locator('[data-guided-coaching-question]').count(), 0,
      label + ": second slide is the authored questionnaire invitation");
    await guided.locator('[data-guided-next]').tap();
    assert.equal(await guided.locator('[data-guided-coaching-question="occupation"]').count(), 1,
      label + ": subsequent slides ask one authored question at a time");
    const guidedDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(guidedDimensions.scrollWidth <= guidedDimensions.viewport + 2,
      label + ": guided viewport does not scroll horizontally");
    assert.deepEqual(errors, [], label + ": zero runtime errors after guided handoff");
    evidence.push({ browser: browserType.name(), locale, width, result: "pass",
      catalogPresent: initialCatalogCount > 0, activatedFreeRunner: availableCards > 0 });
    console.log("OK " + label + " catalog=" + initialCatalogCount);
  } finally {
    await page.close();
    await browser.close();
  }
}
for (const locale of ["en", "ru", "es"])
  for (const width of [320, 390, 430]) await verify(webkit, locale, width);
for (const locale of ["en", "ru", "es"]) await verify(chromium, locale, 390);
await writeFile(output + "/acceptance.json", JSON.stringify(evidence, null, 2));
console.log("Coaching mobile browser acceptance passed: " + evidence.length + " combinations");
