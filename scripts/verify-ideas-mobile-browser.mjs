// Isolated mobile browser acceptance for the public Ideas page.
// Never sends a private question to a server or submits real CRM leads.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Ideas browser acceptance must run against an isolated local server only");
}
const output = "artifacts/ideas-mobile";
await mkdir(output, { recursive: true });
const phrases = {
  en: "How can I feel more confident at work?",
  ru: "Как найти уверенность в работе?",
  es: "¿Cómo sentirme más seguro en el trabajo?",
};
const widths = [320, 375, 390, 430];
const evidence = [];
const closeEnough = (a, b) => Math.abs(a - b) <= 2;
// All elements are measured in one JS task, in document coordinates. Measuring
// separate Playwright bounding boxes lets iOS scrollIntoView/hydration shift
// the viewport *between awaits* and falsely report reversed card order.
async function measureOrderedLayout(scope, middleSelector, afterSelector) {
  return scope.evaluate((root, names) => {
    const measure = el => {
      if (!el) return null;
      const bounds = el.getBoundingClientRect();
      return { top: bounds.top + window.scrollY, left: bounds.left, width: bounds.width, height: bounds.height };
    };
    return {
      rows: [...root.querySelectorAll("[data-ideas-aphorisms] ol li")].slice(0, 3).map(measure),
      middle: measure(root.querySelector(names.middle)),
      after: measure(root.querySelector(names.after)),
    };
  }, { middle: middleSelector, after: afterSelector });
}

async function verify(browserType, locale, width) {
  const browser = await browserType.launch();
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const label = browserType.name() + ":" + locale + ":" + width;
  try {
    const response = await page.goto(origin + "/" + locale + "/books", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    assert.equal(response?.status(), 200, label + ": route");
    const hub = page.locator("[data-ideas-discovery]");
    await hub.waitFor({ state: "visible", timeout: 30000 });
    const switchboard = hub.locator("[data-tests-coaching-hub]");
    await switchboard.waitFor({ state: "visible" });
    const cards = switchboard.locator("[data-tests-coaching-path]");
    assert.equal(await cards.count(), 4, label + ": exactly four clear opening journeys");
    const heading = switchboard.locator("#tests-coaching-title");
    assert.ok((await heading.innerText()).length > 8, label + ": localized hub heading");
    const photo = await switchboard.locator("header").first()
      .evaluate(node => getComputedStyle(node, "::before").backgroundImage);
    assert.ok(photo.includes("ideas-pine-sharp.avif"), label + ": first-party scenic hero");
    const cardRects = await Promise.all([0, 1, 2, 3].map(i => cards.nth(i).boundingBox()));
    assert.ok(cardRects.every(box => box && box.height >= 130 && box.width > 110),
      label + ": four thumb-sized readable cards");
    assert.ok(closeEnough(cardRects[0].y, cardRects[1].y) && closeEnough(cardRects[2].y, cardRects[3].y) &&
      cardRects[2].y > cardRects[0].y, label + ": two-by-two mobile cards");
    assert.equal(await switchboard.locator("#tests-coaching-detail").isVisible(), false,
      label + ": selected panel starts closed");
    const supportDiscovery = await switchboard.locator('[data-tests-coaching-path="support"]').boundingBox();
    assert.ok(supportDiscovery && supportDiscovery.y < 844,
      label + ": all four choices remain available above the first fold");
    const profilePath = switchboard.locator('[data-tests-coaching-path="profile"]');
    await profilePath.tap();
    assert.equal(await profilePath.getAttribute("aria-expanded"), "true");
    assert.equal(await switchboard.locator('[data-personality-profiles-entry] a[href="/' + locale + '/personality-profiles"]').count(), 1,
      label + ": canonical profile builder, no duplicate tests or storage");
    const backPath = switchboard.locator("[data-tests-coaching-back]");
    assert.equal(await switchboard.locator("nav[hidden] [data-tests-coaching-path]:visible").count(), 0,
      label + ": hide the four paths after choosing one");
    await backPath.tap();
    assert.equal(await cards.filter({ visible: true }).count(), 4,
      label + ": four routes return after using Back");
    const coachingPath = switchboard.locator('[data-tests-coaching-path="coaching"]');
    assert.equal(await coachingPath.getAttribute("href"), "/" + locale + "/coaching",
      label + ": coaching card is a direct link to the topic-first chooser");
    assert.notEqual(await coachingPath.getAttribute("data-tests-coaching-direct"), null,
      label + ": coaching entry must not open a second interstitial slide");
    assert.equal(await switchboard.locator("[data-tests-coaching-sessions]").count(), 0,
      label + ": redundant format-selection slide is removed");
    const supportPath = switchboard.locator('[data-tests-coaching-path="support"]');
    await supportPath.tap();
    const support = switchboard.locator("[data-tests-coaching-support]");
    await support.waitFor({ state: "visible" });
    assert.equal(await support.getByRole("region").count(), 0, label + ": no unsolicited exercise");
    await support.getByRole("button").first().tap();
    await support.getByRole("region").waitFor({ state: "visible" });
    await support.getByRole("region").getByRole("button").first().tap();
    assert.equal(await support.getByRole("status").count(), 1,
      label + ": consent, practice and completion work");
    await backPath.tap();
    const templePath = switchboard.locator('[data-tests-coaching-path="temple"]');
    await templePath.tap();
    assert.equal(await templePath.getAttribute("aria-expanded"), "true");
    const hero = hub.locator("[data-ideas-hero]");
    const inputBounds = await hero.locator("#ideas-question").boundingBox();
    assert.ok(inputBounds && inputBounds.width > width * .4,
      label + ": optional question only inside Temple Insights");
    const primary = await hub.locator('[data-ideas-tao]').boundingBox();
    assert.ok(primary && primary.height >= 44, label + ": Dao CTA is finger sized");
    const testAction = hub.locator("[data-ideas-free-test]");
    assert.equal(await testAction.getAttribute("aria-expanded"), "false");
    await hub.locator("#ideas-question").fill(
      locale === "ru" ? "Меня тревожит стресс" : locale === "es" ? "Tengo ansiedad" : "I feel anxious and stressed");
    // Instrument the actual touch path: no synthetic clicks, no hidden retry.
    // A lost iPhone tap must remain a failure with actionable event evidence.
    await testAction.evaluate(el => {
      window.__ideasTouchDiag = { events: [] };
      const sample = (event, source) => window.__ideasTouchDiag.events.push({
        event: event.type, source, target: event.target?.tagName,
        time: Math.round(performance.now()),
      });
      for (const kind of ["touchstart", "touchend", "pointerdown", "pointerup", "click"])
        el.addEventListener(kind, event => sample(event, "button"), { capture: true });
      document.addEventListener("click", event => sample(event, "document"), { capture: true });
    });
    await page.waitForTimeout(120);
    await testAction.tap();
    const filtered = hub.locator('[data-ideas-filtered-tests]:visible');
    try {
      await filtered.waitFor({ state: "visible", timeout: 12000 });
    } catch (cause) {
      const current = page.url();
      const input = await hub.locator("#ideas-question").inputValue().catch(() => "(unavailable)");
      const expanded = await testAction.getAttribute("aria-expanded").catch(() => "(unavailable)");
      const diagnostics = await testAction.evaluate(el => {
        const box = el.getBoundingClientRect();
        const point = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { events: window.__ideasTouchDiag?.events || [], active: document.activeElement?.tagName,
          viewport: [innerWidth, innerHeight], scrollY, html: el.outerHTML.slice(0, 450),
          hit: point?.outerHTML.slice(0, 220) };
      }).catch(error => ({ error: String(error) }));
      await page.screenshot({ path: output + "/ideas-free-test-tap-failure-" + label.replace(/:/g, "-") + ".png", fullPage: false }).catch(() => {});
      throw new Error(label + ": free test chooser did not open; url=" + current +
        "; inputLength=" + input.length + "; ariaExpanded=" + expanded +
        "; diagnostics=" + JSON.stringify(diagnostics), { cause });
    }
    assert.equal(await testAction.getAttribute("aria-expanded"), "true");
    assert.equal(await filtered.locator("[data-ideas-test-start]").count(), 3, label + ": real filtered tests");
    assert.equal(await filtered.locator("[data-ideas-test-start]").first().getAttribute("href"),
      "/" + (locale === "es" ? "en" : locale) + "/client?startTests=gad-7",
      label + ": stress selects existing anxiety check");
    assert.ok(!(await filtered.locator("[data-ideas-more-tests]").getAttribute("href")).includes("ansiedad"),
      label + ": never leak the private phrase through the address");
    await testAction.tap();
    assert.equal(await testAction.getAttribute("aria-expanded"), "false");
    assert.equal(await hub.locator('[data-ideas-filtered-tests]:visible').count(), 0);
    await hub.locator("[data-ideas-preview]").waitFor({ state: "visible" });
    await hub.locator("[data-ideas-preview-ready]").waitFor({ state: "visible" });
    const previewAphorisms = hub.locator("[data-ideas-preview] [data-ideas-aphorisms] ol li");
    assert.equal(await previewAphorisms.count(), 3, label + ": three source-labelled example aphorisms");
    const previewSources = await hub.locator("[data-ideas-preview] [class*=aphorismSource]").allTextContents();
    assert.equal(previewSources.length, 3, label + ": every sample aphorism has a source label");
    assert.ok(previewSources.every(value => value.trim()), label + ": never blank source label");
    if (locale === "en" && width === 390) {
      const before = await previewAphorisms.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-ideas-aphorism-id")));
      assert.equal(new Set(before).size, 3, label + ": unique on first open");
      await page.reload({ waitUntil: "domcontentloaded" });
      await hub.locator('[data-tests-coaching-path="temple"]').tap();
      await hub.locator("[data-ideas-preview-ready]").waitFor({ state: "visible" });
      const after = await previewAphorisms.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-ideas-aphorism-id")));
      assert.equal(new Set(after).size, 3, label + ": unique after reload");
      assert.ok(after.every(id => !before.includes(id)), label + ": all three change on page reopen");
    }
    const previewLayout = await measureOrderedLayout(hub.locator("[data-ideas-preview]"),
      "[data-ideas-dao-card]", "[data-ideas-dao-promos]");
    const previewRects = previewLayout.rows;
    assert.equal(previewRects.length, 3, label + ": exactly three preview quote rows");
    assert.ok(previewRects.every(rect => rect && rect.width > 0), label + ": three rows have layout");
    if (!(previewRects[0].top < previewRects[1].top && previewRects[1].top < previewRects[2].top &&
      previewLayout.middle?.top > previewRects[2].top && previewLayout.after?.top > previewLayout.middle.top)) {
      await page.screenshot({ path: output + "/aphorism-preview-order-" + label.replace(/:/g, "-") + ".png", fullPage: false });
      throw new Error(label + ": preview must show three rows, Dao, offers; layout=" + JSON.stringify(previewLayout));
    }
    const previewAvailableWidth = await hub.locator('[data-ideas-preview] [data-ideas-aphorisms]').evaluate(el => el.getBoundingClientRect().width);
    if (!previewRects.every(rect => rect.width >= previewAvailableWidth * .88)) {
      await page.screenshot({ path: output + "/aphorism-narrow-" + label.replace(/:/g, "-") + ".png", fullPage: false });
      throw new Error(label + ": each quote gets full line width; measured=" +
        JSON.stringify(previewRects.map(rect => ({ width: rect.width, x: rect.left }))) + ", viewport=" + width);
    }
    assert.equal(await hub.locator("[data-ideas-preview] details").first().evaluate(node => node.open), true,
      label + ": full visual example is initially expanded");

    assert.equal(await hub.locator("[data-ideas-result]").count(), 0, label + ": example not a false result");
    const initialPreviewLabel = await hub.locator("[data-ideas-preview] [class*=daoEyebrow]").first().innerText();
    assert.ok(initialPreviewLabel.length > 4, label + ": clearly labelled editorial preview");
    assert.equal(await switchboard.locator('[data-tests-coaching-path="temple"]').getAttribute("aria-expanded"), "true",
      label + ": visitor explicitly chose symbolic reflection");
    assert.equal(await switchboard.locator('[data-personality-profiles-entry]').count(), 0,
      label + ": no duplicated profile form under Temple");
    const bounds = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(bounds.content <= bounds.viewport + 1, label + ": horizontal overflow");

    if (browserType === webkit && locale === "en" && width === 390) {
      await page.screenshot({ path: output + "/ideas-first-screen-webkit-390.png", fullPage: false });
      assert.equal(await switchboard.locator("nav[hidden]").count(), 1,
        label + ": selected Temple panel replaces the cards instead of repeating choices");
    }

    const textarea = hub.locator("#ideas-question");
    if (locale === "en" && width === 390 && browserType === webkit) {
      await hub.locator('input[type="file"]').setInputFiles({
        name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("An idea about courage"),
      });
      await page.waitForFunction(() => document.querySelector("#ideas-question")?.value?.includes("courage"));
    }
    assert.ok(await textarea.evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 16),
      label + ": iPhone input does not zoom");
    // Temple choice is an explicit in-place panel, never a jump to a duplicate page.
    assert.equal(await templePath.getAttribute("aria-expanded"), "true",
      label + ": Temple Insights in-place panel remains open");
    // Free Taoist guidance still produces a fresh symbolic response to the typed question.
    await textarea.fill(phrases[locale]);
    await hub.locator('[data-ideas-tao]').tap();
    const daoResult = hub.locator('[data-ideas-result="dao"]');
    await daoResult.waitFor({ state: "visible" });
    assert.equal(await daoResult.locator('[data-ideas-dao-summary]').count(), 1,
      label + ": one compact Daoist paragraph");
    assert.ok((await daoResult.locator('[data-ideas-dao-summary]').innerText()).length > 30,
      label + ": useful brief reading");
    assert.equal(await daoResult.locator('[role="img"]').count(), 0,
      label + ": glyph and full reading hidden before expanding");
    const compactSize = await daoResult.locator("[data-ideas-dao]").boundingBox();
    assert.ok(compactSize && compactSize.height < 320, label + ": compact Dao paragraph and expand control");
    const responseLayout = await measureOrderedLayout(daoResult,
      "[data-ideas-dao]", "[data-ideas-dao-promos]");
    const responseRects = responseLayout.rows;
    if (!(responseRects.length === 3 && responseRects.every(rect => rect && rect.width > 0) &&
      responseRects[0].top < responseRects[1].top && responseRects[1].top < responseRects[2].top &&
      responseLayout.middle?.top > responseRects[2].top && responseLayout.after?.top > responseLayout.middle.top)) {
      await page.screenshot({ path: output + "/aphorism-real-order-" + label.replace(/:/g, "-") + ".png", fullPage: false });
      throw new Error(label + ": real answer order is three full-width rows, Dao and two offers; layout=" +
        JSON.stringify(responseLayout));
    }
    const responseAvailableWidth = await daoResult.locator('[data-ideas-aphorisms]').evaluate(el => el.getBoundingClientRect().width);
    if (!responseRects.every(rect => rect.width >= responseAvailableWidth * .88)) {
      await page.screenshot({ path: output + "/aphorism-real-narrow-" + label.replace(/:/g, "-") + ".png", fullPage: false });
      throw new Error(label + ": real quote rows are readable; measured=" +
        JSON.stringify(responseRects.map(rect => ({ width: rect?.width, x: rect?.left }))) + ", viewport=" + width);
    }
    const readingOrder = daoResult.locator('[data-ideas-order-button="reading"]');
    const giftOrder = daoResult.locator('[data-ideas-order-button="gift"]');
    await readingOrder.tap();
    assert.equal(await readingOrder.getAttribute("aria-expanded"), "true", label + ": order opens inline");
    assert.equal(await daoResult.locator('[data-inline-offer-form]:visible').count(), 1, label + ": one inline request directly below chosen card");
    assert.equal(await daoResult.locator('[data-inline-offer-form]:visible input[type="checkbox"]').count(), 1, label + ": reply consent");
    await giftOrder.tap();
    assert.equal(await readingOrder.getAttribute("aria-expanded"), "false", label + ": choosing other card closes the first");
    assert.equal(await giftOrder.getAttribute("aria-expanded"), "true", label + ": gift opens without navigation");
    assert.equal(await daoResult.locator('[data-inline-offer-form]:visible').count(), 1, label + ": never duplicate requests");
    await giftOrder.tap();
    assert.equal(await daoResult.locator('[data-inline-offer-form]:visible').count(), 0, label + ": click again collapses");
    const expandedBounds = await page.evaluate(() => ({
      viewport: window.innerWidth, content: document.documentElement.scrollWidth,
    }));
    assert.ok(expandedBounds.content <= expandedBounds.viewport + 1, label + ": no horizontal overflow with offers");
    const expand = daoResult.locator('button[aria-expanded][aria-controls="ideas-dao-details"]');
    assert.equal(await expand.getAttribute("aria-expanded"), "false", label + ": collapsed by default");
    if (browserType === webkit && locale === "en" && width === 390) {
      await page.screenshot({ path: output + "/ideas-dao-compact-webkit-390.png", fullPage: false });
    }
    await expand.tap();
    await daoResult.locator('[data-ideas-dao-expanded="true"]').waitFor({ state: "visible" });
    assert.equal(await daoResult.locator('[data-ideas-dao-meaning] [class*=daoPoints] > [class*=daoPoint]').count(), 3,
      label + ": meaning, key message and practical step all visible");
    assert.equal(await daoResult.locator('[data-ideas-aphorisms] ol li').count(), 3,
      label + ": Dao response has three topical sourced aphorisms");

    assert.equal(await expand.getAttribute("aria-expanded"), "true", label + ": accessible expanded state");
    assert.equal(await daoResult.locator('[role="img"]').count(), 1, label + ": genuine I Ching glyph");
    assert.equal(await daoResult.locator('[data-ideas-dao-expanded="true"] a').count(), 0,
      label + ": no duplicate Read interpretation link");
    assert.equal(await daoResult.locator('[data-ideas-dao-expanded="true"] button').count(), 1,
      label + ": only reset remains; no Draw another button");
    if (browserType === webkit && locale === "en" && width === 390) {
      await daoResult.locator('[data-ideas-dao-reading] [lang="en"] p').first()
        .waitFor({ state: "visible", timeout: 30000 });
    }
    await expand.tap();
    assert.equal(await expand.getAttribute("aria-expanded"), "false", label + ": can collapse again");
    assert.equal(await daoResult.locator('[role="img"]').count(), 0, label + ": collapsed content removed");

    if (width === 390) {
      await backPath.tap();
      const directCoaching = hub.locator('[data-tests-coaching-direct]');
      const destination = await directCoaching.getAttribute("href");
      await directCoaching.tap();
      await page.waitForURL(url => url.pathname === destination, { timeout: 30000 });
      const topicChooser = page.locator("[data-coaching-topic-first]");
      await topicChooser.waitFor({ state: "visible", timeout: 30000 });
      const businessTopic = topicChooser.locator('[data-coaching-topic-group="business"]');
      await businessTopic.tap();
      assert.equal(await businessTopic.getAttribute("aria-pressed"), "true",
        label + ": guest can choose coaching topic without an extra format slide");
    }
    assert.deepEqual(errors, [], label + ": unhandled client errors");
    evidence.push({ browser: browserType.name(), locale, width, result: "pass", linkedToGuestCoachingOptions: width === 390 });
  } finally {
    await page.close();
    await browser.close();
  }
}

for (const locale of ["en", "ru", "es"]) {
  for (const width of widths) await verify(webkit, locale, width);
}
for (const locale of ["en", "ru", "es"]) await verify(chromium, locale, 390);
await writeFile(output + "/mobile-acceptance.json", JSON.stringify(evidence, null, 2));
console.log("Ideas mobile browser acceptance passed: " + evidence.length + " combinations", evidence);
