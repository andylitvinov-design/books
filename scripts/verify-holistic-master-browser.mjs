// Real Chromium/WebKit mobile acceptance for the current Holistic Support first screen.
// Isolated loopback server only; never sends real CRM enquiries or payment.
// The symbolic question is locally interpreted, then a distinct private goal is
// handed to the existing energy request page in one browser tab.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic Support mobile verification is loopback-only");
const output = "artifacts/holistic-support-mobile";
await mkdir(output, {recursive: true});
const copy = {
  en: { title: "Holistic Support", tab: "Holistic Support", accessible: "Holistic Support",
    question: "How can I find clarity this week?", intention: "I want calm before an important decision." },
  ru: { title: "Холистическая поддержка", tab: "Поддержка", accessible: "Холистическая поддержка",
    question: "Как прояснить мой выбор на этой неделе?", intention: "Хочу больше спокойствия перед важным решением." },
  es: { title: "Apoyo holístico", tab: "Apoyo holístico", accessible: "Apoyo holístico",
    question: "¿Cómo aclarar mi situación esta semana?", intention: "Quiero calma antes de una decisión importante." },
};
const evidence = [];

async function verify(engine, locale, width) {
  const browser = await engine.launch({headless: true});
  const label = engine.name() + ":" + locale + ":" + width;
  const page = await browser.newPage({
    viewport: {width, height: 844}, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const response = await page.goto(origin + "/" + locale + "/holistic-support", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    assert.equal(response?.status(), 200, label + ": first screen returned HTTP 200");
    const root = page.locator("[data-holistic-first-screen]");
    await root.waitFor({state: "visible", timeout: 30000});
    const engineCard = root.locator('[data-ideas-discovery][data-holistic-entry="true"]');
    assert.equal(await engineCard.count(), 1, label + ": single active insight engine");
    assert.equal(await page.locator("[data-holistic-first-screen] #ideas-title").innerText(),
      copy[locale].title, label + ": localized heading");
    const scenic = engineCard.locator('[class*="templeScenic"]').first();
    assert.ok((await scenic.evaluate(node => getComputedStyle(node, "::before").backgroundImage))
      .includes("ideas-pine-sharp.avif"), label + ": approved pine photograph");

    const tab = page.locator('.mobile-bottom-navigation [data-nav-item="temple"]');
    await tab.waitFor({state: "visible"});
    assert.equal((await tab.innerText()).trim(), copy[locale].tab);
    assert.equal(await tab.getAttribute("aria-label"), copy[locale].accessible);
    assert.equal(await tab.getAttribute("aria-current"), "page");


    // New owner mobile requirement: a compact source-backed gallery opens the
    // full-screen app, never a shrinking legacy course playlist.
    const gallery = page.locator("[data-holistic-meditation-gallery]");
    await gallery.waitFor({ state: "visible" });
    assert.equal(await gallery.count(), 1, label + ": one compact meditation gallery");
    const galleryLink = gallery.locator("[data-open-meditation-app]");
    assert.equal(await galleryLink.count(), 1, label + ": a single app entry from the video poster");
    assert.match(await galleryLink.getAttribute("href"), /^\/(en|ru|es)\/meditations\?video=[A-Za-z0-9_-]{11}$/,
      label + ": source-backed route instead of shrinking poster");
    assert.equal(await gallery.locator("[data-academy-course-playlist]").count(), 0,
      label + ": obsolete Lesson/Previous/Next course wrapper is absent");
    assert.equal(await page.locator('[data-holistic-audio-player] audio[controls] source[type="audio/wav"]').getAttribute("src"),
      "/audio/holistic-house-soft-melody-gentle-waves-96s.wav",
      label + ": original instrumental remains available after video gallery");

    const insight = engineCard.locator("[data-ideas-tao]");
    const energy = engineCard.locator("[data-ideas-energy-support]");
    const choices = [insight, energy];
    assert.equal(await engineCard.locator("[data-ideas-hero-actions] > button, [data-ideas-hero-actions] > a").count(),
      2, label + ": exactly two primary actions");
    assert.equal(await energy.getAttribute("href"),
      "/" + locale + "/services/remote-energy-support", label + ": existing energy route");
    const heading = await root.boundingBox();
    assert.ok(heading && heading.x >= -1 && heading.x + heading.width <= width + 1,
      label + ": scenic first screen fits the mobile viewport");
    for (const [index, control] of choices.entries()) {
      const box = await control.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44 &&
        box.x >= -1 && box.x + box.width <= width + 1,
        label + ": primary action " + index + " has visible touch target");
    }
    assert.equal(await root.locator("[data-ideas-preview]").count(), 1,
      label + ": example is visibly distinct from the personal result");

    const question = engineCard.locator("#ideas-question");
    await question.fill(copy[locale].question);
    await insight.tap();
    const result = root.locator('[data-ideas-result="dao"]');
    await result.waitFor({state:"visible", timeout: 20000});
    assert.ok((await result.locator("[data-ideas-dao-summary]").innerText()).trim().length > 15,
      label + ": genuine symbolic response");
    assert.equal(await question.inputValue(), copy[locale].question,
      label + ": original words kept only in editable field");

    await question.fill(copy[locale].intention);
    assert.equal(await root.locator("[data-ideas-result]").count(), 0,
      label + ": no stale response after changing the goal");
    await energy.tap();
    await page.waitForURL(url => url.pathname === "/" + locale + "/services/remote-energy-support", {
      timeout: 30000,
    });
    assert.ok(!page.url().includes(encodeURIComponent(copy[locale].intention)),
      label + ": personal goal not embedded in URL");
    const nextScreen = page.locator("[data-remote-support-intent-first]");
    await nextScreen.waitFor({state:"visible", timeout:30000});
    const handoff = nextScreen.locator("#remote-intention");
    await handoff.waitFor({state:"visible"});
    assert.equal(await handoff.inputValue(), copy[locale].intention,
      label + ": private same-tab goal preserved for the user's review");
    assert.equal(await nextScreen.locator("[data-lead-saved]").count(), 0,
      label + ": navigating to a request form never creates a CRM lead");

    const focusChoices = nextScreen.locator("[data-remote-focus-chip]");
    const findOptions = nextScreen.locator("[data-remote-find-options]");
    const offers = nextScreen.locator("#remote-results");
    assert.equal(await focusChoices.count(), 5, label + ": only five usable focus sectors");
    assert.equal(await offers.isVisible(), false, label + ": practitioner options wait for Find options");
    assert.equal(await findOptions.isVisible(), true, label + ": find CTA is visible");
    const firstChipBox = await focusChoices.first().boundingBox();
    const noteBox = await handoff.boundingBox();
    assert.ok(firstChipBox && noteBox && firstChipBox.y < noteBox.y,
      label + ": focus chips precede optional wishes");
    const findBox = await findOptions.boundingBox();
    const bottomNav = await page.locator(".mobile-bottom-navigation").first().boundingBox();
    assert.ok(findBox && bottomNav && findBox.y + findBox.height <= bottomNav.y + 2,
      label + ": complete finder CTA is above fixed mobile navigation at " + width + "px");
    await focusChoices.first().tap();
    assert.equal(await focusChoices.first().getAttribute("aria-pressed"), "true",
      label + ": sector selection is interactive");
    await findOptions.tap();
    await offers.waitFor({state: "visible", timeout: 10000});
    assert.equal(await findOptions.getAttribute("aria-expanded"), "true",
      label + ": Find options reveals the practitioner stage");
    assert.ok(await offers.locator("[data-remote-support-specialist]").count() > 0 ||
      await offers.locator('[role="status"]').count() > 0,
      label + ": only published practitioners or an honest empty state appear");
    await page.reload({waitUntil:"domcontentloaded"});
    await nextScreen.waitFor({state:"visible"});
    assert.equal(await handoff.inputValue(), "",
      label + ": one-use free-text goal not restored from cookie or storage");

    const geometry = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(geometry.document <= geometry.viewport + 2,
      label + ": destination does not overflow " + JSON.stringify(geometry));
    assert.deepEqual(errors, [], label + ": no client-side errors");
    if (width === 390) {
      await page.goto(origin + "/" + locale + "/holistic-support", {waitUntil:"domcontentloaded"});
      await root.waitFor({state:"visible"});
      await page.screenshot({path:output + "/holistic-" + engine.name() + "-" + locale + "-390.png",fullPage:false});
    }
    evidence.push({engine:engine.name(),locale,width,result:"pass"});
    console.log("PASS " + label + ": symbolic insight, private energy handoff and one-use privacy");
  } finally {
    await page.close();
    await browser.close();
  }
}
for (const locale of ["en","ru","es"])
  for (const width of [320,390,430]) await verify(webkit,locale,width);
for (const locale of ["en","ru","es"]) await verify(chromium,locale,390);
await writeFile(output + "/acceptance.json",JSON.stringify(evidence,null,2));
console.log("Holistic Support mobile acceptance: " + evidence.length + " browser journeys");
