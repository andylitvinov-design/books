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
    const entry = root.locator("[data-coaching-three-paths]");
    await entry.waitFor({ state: "visible" });
    assert.equal(await entry.locator("[data-coaching-offer]").count(), 3,
      label + ": all 3 human offer cards remain");
    const miniPanel = entry.locator("[data-coaching-intake]");
    assert.equal(await miniPanel.isVisible(), false, label + ": no long form by default");
    await entry.locator('[data-coaching-select="session"]').tap();
    await miniPanel.waitFor({ state: "visible" });
    assert.equal(await miniPanel.getAttribute("data-open"), "true",
      label + ": paid registration expands below offers");
    const formatChoice = miniPanel.locator('[data-coaching-session-format="60 min · €100"]');
    await formatChoice.tap();
    assert.equal(await formatChoice.getAttribute("aria-checked"), "true",
      label + ": 60 min €100 remains selectable");
    const paidMini = miniPanel.locator("[data-coaching-paid-phone]");
    await paidMini.waitFor({ state: "visible" });
    assert.equal(await paidMini.locator('input[type="tel"]').count(), 1,
      label + ": one paid phone field");
    assert.equal(await paidMini.locator('[data-compact-channel]').count(), 2,
      label + ": only WhatsApp/Telegram contact CTAs");
    assert.equal(await paidMini.locator('input[type="checkbox"]').isChecked(), false,
      label + ": one-off contact permission is opt-in");

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
    // Restart at the entry after any optional self-runner navigation. An
    // independent guest journey must not rely on stale React components.
    await page.goto(origin + "/" + locale + "/coaching", { waitUntil: "domcontentloaded" });
    await entry.waitFor({ state: "visible" });
    await entry.locator('[data-coaching-select="free"]').tap();
    const freeMini = entry.locator("[data-coaching-phone-start]");
    await freeMini.waitFor({ state: "visible" });
    assert.equal(await freeMini.locator('input[type="tel"]').count(), 1,
      label + ": free registration asks only for phone");
    assert.equal(await freeMini.locator('[data-compact-channel]').count(), 0,
      label + ": free request never shows messengers");
    await freeMini.locator('input[type="tel"]').fill("+14165550123");
    await freeMini.locator('[data-free-coaching-start]').tap();
    await page.waitForURL(origin + "/" + locale + "/coaching/intake?guided=1");
    const guided = page.locator("[data-coaching-guided]");
    await guided.waitFor({ state: "visible" });
    const first = guided.locator('[data-guided-coaching-question="request"]');
    assert.equal(await first.count(), 1, label + ": first question is a full slide");
    assert.equal(await guided.locator('[data-guided-coaching-send]').count(), 0,
      label + ": initial phone was NOT sent to CRM");
    await first.fill("Synthetic QA: choosing my next step.");
    await guided.locator('[data-guided-next]').tap();
    assert.equal(await guided.locator('[data-guided-coaching-question]').count(), 0,
      label + ": second slide invites the coaching questionnaire");
    await guided.locator('[data-guided-next]').tap();
    assert.equal(await guided.locator('[data-guided-coaching-question="occupation"]').count(), 1,
      label + ": next screen shows one authored question");
    const guidedDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(guidedDimensions.scrollWidth <= guidedDimensions.viewport + 2,
      label + ": guided screens have no accidental horizontal scroll");
    assert.deepEqual(errors, [], label + ": no uncaught browser errors on free guided flow");
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
