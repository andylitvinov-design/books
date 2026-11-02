// Live React hydration and touch acceptance for existing Coaching Lounge.
// Isolated local server only; never starts paid sessions or submits private answers.
// A catalog-less CI environment can verify navigation; it cannot certify live Supabase.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { runMobileBrowserCases } from "./ci-mobile-browser-batch.mjs";

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
async function verify(browserType, browser, locale, width) {
  const context = await browser.newContext({
    viewport: { width, height: 844 }, deviceScaleFactor: 1,
    hasTouch: true, isMobile: true, reducedMotion: "reduce",
  });
  const page = await context.newPage();
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
    // A 200 from /images is NOT an iPhone image-rendering test. Verify actual
    // browser-decoded pixels plus a visible CSS fallback on both ancient cards.
    const culturalCards = root.locator('[data-coaching-tradition="egyptian"],[data-coaching-tradition="greek"]');
    assert.equal(await culturalCards.count(),2,label+": both authored photos offered");
    for (const slug of ["egyptian","greek"]) {
      const card = root.locator('[data-coaching-tradition="'+slug+'"]');
      await card.scrollIntoViewIfNeeded();
      const visual=card.locator("a[class*='loungePhoto']");
      const picture=visual.locator("img");
      await picture.waitFor({state:"visible"});
      await picture.evaluate(image=>image.decode());
      const photo=await visual.evaluate(node=>{
        const image=node.querySelector("img"),style=getComputedStyle(node),rect=node.getBoundingClientRect();
        return {loaded:image.complete&&image.naturalWidth>0,
          eager:image.loading==='eager',width:rect.width,height:rect.height,
          url:image.currentSrc,background:style.backgroundImage}
      });
      assert.ok(photo.loaded, label+": "+slug+" image.complete&&image.naturalWidth>0");
      assert.ok(photo.eager,label+": "+slug+" must not defer offscreen load");
      assert.ok(photo.width>=85&&photo.height>=110,label+": "+slug+" has a painted rectangle "+JSON.stringify(photo));
      assert.ok(photo.url.endsWith("/coaching-ancient/"+slug+"-cover.jpg"),label+": "+slug+" original");
      assert.ok(photo.background.includes("/coaching-ancient/"+slug+"-cover.jpg"),label+": "+slug+" CSS fallback");
      if (width===390)await card.screenshot({
        path:output+"/ancient-"+slug+"-"+browserType.name()+"-"+locale+".png",
      });
    }
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
    // The current Coaching Lounge has three visible, photo-led choices.
    // A previous test looked for the removed CoachingLiveSessionCapture, so it
    // could not verify the real session request or the €50/€100 selector.
    const offers = root.locator("[data-coaching-three-paths] [data-coaching-offer]");
    assert.deepEqual(await offers.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-coaching-offer"))),
      ["free", "session", "deep"], label + ": exactly three genuine entry choices");
    assert.match(await offers.nth(0).innerText(), /FREE|БЕСПЛАТНО|GRATIS/,
      label + ": free diagnosis is explicitly written and free");
    assert.match(await offers.nth(1).innerText(), /€50/,
      label + ": 30-minute session has an honest quoted price");
    assert.match(await offers.nth(1).innerText(), /€100/,
      label + ": 60-minute session has an honest quoted price");
    const deep = root.locator('[data-coaching-select="deep"]');
    assert.equal(await deep.getAttribute("href"), "/" + locale + "/services/imagery-therapy#request-session",
      label + ": depth work has a real dedicated service route");
    const paid = root.locator("[data-coaching-session-capture]");
    const humanChoice = advanced.locator("button").filter({ hasText: /With Andrey|С Андреем|Con Andrey/i }).first();
    await humanChoice.tap();
    assert.equal(await humanChoice.getAttribute("aria-pressed"), "true", label + ": human selection");
    await paid.waitFor({ state: "visible" });
    // The lower "Request" CTA MUST select the paid form, not open the default
    // free written diagnostic. Never submit a contact or hit the CRM in CI.
    await paid.locator("[data-coaching-human-to-intake]").tap();
    const capture = root.locator("[data-coaching-session-request] [data-service-lead-capture]");
    await capture.waitFor({ state: "visible" });
    const sessionLength = capture.locator("select").first();
    assert.equal(await sessionLength.locator("option").count(), 2,
      label + ": two reviewed and displayed lengths");
    assert.match(await sessionLength.locator("option").nth(0).innerText(), /€50/,
      label + ": 30-minute session is €50");
    assert.match(await sessionLength.locator("option").nth(1).innerText(), /€100/,
      label + ": 60-minute session is €100");
    await sessionLength.selectOption({index: 1});
    assert.match(await sessionLength.inputValue(), /€100/,
      label + ": 60-minute request can be selected");
    assert.equal(await capture.locator('input[type="checkbox"]').first().isChecked(), false,
      label + ": contact consent is never pre-checked");
    assert.equal(await root.locator("[data-free-diagnostic-start]").count(), 0,
      label + ": paid request never falls back to the free form");
    assert.equal(await root.locator("[data-coaching-practitioner-checklist]").isVisible(), true,
      label + ": visible trust/training and availability checks");
    await root.locator('[data-coaching-select="free"]').tap();
    await root.locator("[data-free-diagnostic-start]").waitFor({state:"visible"});
    assert.equal(await root.locator("[data-coaching-session-request]").count(), 0,
      label + ": choosing free genuinely switches the capture back");
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
    evidence.push({ browser: browserType.name(), locale, width, result: "pass",
      catalogPresent: initialCatalogCount > 0, activatedFreeRunner: availableCards > 0 });
    console.log("OK " + label + " catalog=" + initialCatalogCount);
  } finally {
    await context.close();
  }
}
await runMobileBrowserCases([
  { browserType: webkit, cases: ["en", "ru", "es"].flatMap(locale => [320, 390, 430].map(width => [locale, width])) },
  { browserType: chromium, cases: ["en", "ru", "es"].map(locale => [locale, 390]) },
], verify);
await writeFile(output + "/acceptance.json", JSON.stringify(evidence, null, 2));
console.log("Coaching mobile browser acceptance passed: " + evidence.length + " combinations");
