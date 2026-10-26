// Real Chromium/WebKit mobile acceptance for the current Holistic Support first screen.
// Isolated loopback server only; never sends real CRM enquiries or payment.
// The three-choice hero mounts Dao only after selection. The private Dao question
// is not silently carried to the separate energy form; that form resets on reload.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { privateRequestLeak, privateBrowserPersistence } from "./helpers/holistic-browser-privacy.mjs";
import { createHolisticBrowserIsolation } from "./helpers/holistic-browser-isolation.mjs";
import { createHolisticTransportDiagnostics } from "./helpers/holistic-transport-diagnostics.mjs";
import { remoteFinderGeometry, assertRemoteFinderGeometry } from "./helpers/remote-finder-geometry.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic Support mobile verification is loopback-only");
const output = "artifacts/holistic-support-mobile";
await mkdir(output, {recursive: true});
const copy = {
  en: { practitioner: "I'm a Master — Offer My Services", title: "Holistic Support", tab: "Holistic Support", accessible: "Holistic Support",
    reset: "New question", question: "How can I find clarity this week?", intention: "I want calm before an important decision." },
  ru: { practitioner: "Я мастер — предложить свои услуги", title: "Холистическая поддержка", tab: "Поддержка", accessible: "Холистическая поддержка",
    reset: "Новый вопрос", question: "Как прояснить мой выбор на этой неделе?", intention: "Хочу больше спокойствия перед важным решением." },
  es: { practitioner: "Soy profesional — ofrecer mis servicios", title: "Apoyo holístico", tab: "Apoyo holístico", accessible: "Apoyo holístico",
    reset: "Otra pregunta", question: "¿Cómo aclarar mi situación esta semana?", intention: "Quiero calma antes de una decisión importante." },
};
const evidence = [];

async function verify(engine, locale, width) {
  const browser = await engine.launch({headless: true});
  const label = engine.name() + ":" + locale + ":" + width;
  let isolation, page;
  let primaryFailure;
  const errors = [], privateLeaks = [];
  const diagnostics = createHolisticTransportDiagnostics();
  try {
    isolation = await createHolisticBrowserIsolation(browser, {origin, locale, viewport:{width, height:844}, observeTransport:diagnostics.observeTransport});
    page = isolation.page;
    page.on("pageerror", error => { errors.push(error.message); diagnostics.pageError(error); });
    page.on("request", request => {
      if (privateRequestLeak(request, [copy[locale].question, copy[locale].intention])) privateLeaks.push("PRIVATE_TEXT_REQUEST");
    });
    const response = await page.goto(origin + "/" + locale + "/holistic-support", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    assert.equal(response?.status(), 200, label + ": first screen returned HTTP 200");
    const root = page.locator("[data-holistic-first-screen]");
    await root.waitFor({state: "visible", timeout: 30000});
    assert.equal(await root.count(), 1, label + ": single current three-choice hero");
    assert.equal(await root.getAttribute("id"), null, label + ": current hero is not the retired temple anchor");
    assert.equal(await root.locator("#holistic-journey-title").innerText(), copy[locale].title,
      label + ": localized first-screen heading");
    assert.equal(await root.getAttribute("aria-labelledby"), "holistic-journey-title");
    const choices = root.locator("[data-holistic-choose]");
    assert.deepEqual(await choices.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-holistic-choose"))),
      ["meditations", "energy", "dao"], label + ": exactly three ordered first-screen choices");
    const meditation = choices.nth(0), energy = choices.nth(1), dao = choices.nth(2);
    assert.equal(await meditation.getAttribute("href"), "#meditation-practices");
    assert.equal(await energy.getAttribute("href"), "/" + locale + "/services/remote-energy-support");
    assert.equal(await dao.getAttribute("type"), "button");
    assert.equal(await dao.getAttribute("aria-controls"), "dao-guidance");
    assert.equal(await dao.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("[data-holistic-dao-screen]").count(), 0,
      label + ": Dao never pre-mounts before explicit selection");
    for (const control of [meditation, energy, dao]) {
      assert.equal(await control.locator("img").count(), 1, label + ": photo-backed choice");
      const box = await control.boundingBox();
      assert.ok(box && box.width > 200 && box.height >= 80 && box.x >= -1 && box.x + box.width <= width + 1,
        label + ": readable full-width first-screen card");
    }
    const last = await dao.boundingBox();
    assert.ok(last && last.y + last.height < 844 - 40, label + ": all three choices are above the mobile fold");

    assert.deepEqual(await page.locator('.mobile-bottom-navigation [data-nav-item]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-nav-item'))),
      ['home', 'analysis', 'courses', 'profile', 'alchemy', 'pro', 'temple'], label + ": exact seven global bottom entries");
    const tab = page.locator('.mobile-bottom-navigation [data-nav-item="temple"]');
    await tab.waitFor({state: "visible"});
    assert.equal((await tab.innerText()).trim(), copy[locale].tab);
    assert.equal(await tab.getAttribute("aria-label"), copy[locale].accessible);
    assert.equal(await tab.getAttribute("aria-current"), "page");


    // Meditation acceptance: two equal viewport cards, no seven-row mobile list.
    const videoStage = page.locator('[data-holistic-meditation-screen="video"]');
    const audioStage = page.locator('[data-holistic-meditation-screen="audio"]');
    assert.equal(await videoStage.count(), 1, label + ": one video stage");
    assert.equal(await audioStage.count(), 1, label + ": one audio stage");
    const geometryForMeditations = await page.evaluate(() => {
      const video = document.querySelector('[data-holistic-meditation-screen="video"]');
      const audio = document.querySelector('[data-holistic-meditation-screen="audio"]');
      const v = video.getBoundingClientRect(), a = audio.getBoundingClientRect();
      return { videoHeight:v.height, audioHeight:a.height, width:document.documentElement.scrollWidth, expected:innerHeight-142 };
    });
    assert.ok(Math.abs(geometryForMeditations.videoHeight - geometryForMeditations.expected) <= 2,
      label + ": video card occupies mobile safe viewport " + JSON.stringify(geometryForMeditations));
    assert.ok(Math.abs(geometryForMeditations.videoHeight - geometryForMeditations.audioHeight) <= 2,
      label + ": audio / video equal-height cards");
    assert.ok(geometryForMeditations.width <= width + 2,
      label + ": meditation cards do not overflow page width");
    assert.equal(await videoStage.locator('iframe').count(), 0, label + ": no YouTube iframe before Play");
    assert.equal(await videoStage.locator('a[href="#meditation-audio"]').count(), 1,
      label + ": keyboard-usable next-stage anchor");
    assert.equal(await audioStage.locator('audio[controls] source[type="audio/wav"]').getAttribute('src'),
      '/audio/holistic-house-soft-melody-gentle-waves-96s.wav',
      label + ": original instrumental WAV wired without autoplay");
    const selectedVideo = videoStage.locator('[data-academy-course-playlist]');
    assert.equal(await selectedVideo.getAttribute('data-video-lesson-count'),locale==="ru"?"7":"1",
      label + ": source-backed locale-only recording count");
    assert.equal(await audioStage.locator("audio").getAttribute("autoplay"), null,
      label + ": original audio never auto-plays");
    assert.equal(await audioStage.locator("audio").getAttribute("preload"), "none");
    if (locale === "ru") {
      const beforeTitle = await videoStage.locator('[aria-live="polite"]').innerText();
      const beforeId = await videoStage.locator('button[aria-pressed="true"]').getAttribute('data-academy-video-id');
      await videoStage.locator('[data-academy-course-playlist] nav button').last().click();
      assert.match(await videoStage.locator('[aria-live="polite"]').innerText(), /.+/,
        label + ": next video swaps actual selected recording");
      assert.notEqual(await videoStage.locator('[aria-live="polite"]').innerText(), beforeTitle,
        label + ": next recording changes the visible title");
      assert.notEqual(await videoStage.locator('button[aria-pressed="true"]').getAttribute('data-academy-video-id'), beforeId,
        label + ": next recording changes the actual source id");
      assert.equal(await videoStage.locator('iframe').count(), 0, label + ": next does not start a provider video");
      assert.equal(await videoStage.locator('button[aria-pressed="true"]').count(), 1,
        label + ": one active video choice");
    }
    if (width === 320) {
      await page.setViewportSize({width, height:568});
      const shortHeight = await videoStage.evaluate(node => node.getBoundingClientRect().height);
      assert.ok(Math.abs(shortHeight - (568-142)) <= 2,
        label + ": 320x568 viewport card has safe height");
      const shortAudio = await audioStage.evaluate(node => node.getBoundingClientRect().height);
      assert.ok(Math.abs(shortAudio - shortHeight) <= 2, label + ": short mobile audio/video remain equal height");
      await page.setViewportSize({width, height:844});
    }

    const heading = await root.boundingBox();
    assert.ok(heading && heading.x >= -1 && heading.x + heading.width <= width + 1,
      label + ": first screen fits the mobile viewport");
    const tabBox = await tab.boundingBox();
    assert.ok(tabBox && tabBox.x >= -1 && tabBox.x + tabBox.width <= width + 1, label + ": selected bottom tab fits viewport");
    for (const [index, control] of [meditation, energy, dao].entries()) {
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= -1 && box.x + box.width <= width + 1,
        label + ": hero action " + index + " has 44px touch target");
      await control.click({trial:true});
    }
    diagnostics.phase('dao');
    await dao.tap();
    assert.equal(await dao.getAttribute("aria-expanded"), "true");
    const panel = page.locator('#dao-guidance[data-holistic-dao-screen]');
    await panel.waitFor({state:"visible"});
    assert.equal(await root.locator("[data-ideas-discovery]").count(), 0,
      label + ": Dao mounts in a sibling destination, not inside the hero");
    const engineCard = panel.locator("[data-ideas-discovery]");
    assert.equal(await engineCard.count(), 1, label + ": one selected Dao engine");
    assert.equal(await panel.locator("[data-ideas-preview]").count(), 0,
      label + ": no prefilled personal reading");
    const insight = panel.locator("[data-ideas-tao]");
    assert.equal(await insight.getAttribute("type"), "submit");
    assert.equal(await insight.getAttribute("form"), "ideas-question-form");
    assert.equal(await panel.locator("[data-ideas-energy-support]").count(), 0,
      label + ": separate energy choice is not restored inside Dao");
    assert.equal(await panel.locator("[data-ideas-free-diagnostic]").getAttribute("href"),
      "/" + locale + "/services/free-consultation#free-diagnosis-options");
    const scenic = engineCard.locator('[class*="templeScenic"]').first();
    assert.ok((await scenic.evaluate(node => getComputedStyle(node, "::before").backgroundImage))
      .includes("ideas-pine-sharp.avif"), label + ": Dao preserves the approved pine photograph");

    const question = engineCard.locator("#ideas-question");
    await question.fill(copy[locale].question);
    const originalUrl = page.url();
    await insight.tap();
    const result = panel.locator('[data-ideas-result="dao"]');
    await result.waitFor({state:"visible", timeout: 20000});
    assert.ok((await result.locator("[data-ideas-dao-summary]").innerText()).trim().length > 15,
      label + ": genuine symbolic response");
    assert.equal(page.url(), originalUrl, label + ": symbolic response stays on current page");
    assert.equal(await privateBrowserPersistence(page, [copy[locale].question, copy[locale].intention]), false,
      label + ": visible Dao result has no persisted private text");
    assert.equal(await question.inputValue(), copy[locale].question,
      label + ": original words kept only in editable field");

    assert.equal(await result.getAttribute("lang"), locale, label + ": localized symbolic response");
    assert.equal(await result.locator("[data-ideas-dao-promos]").count(), 0, label + ": no duplicate Dao forms");
    if (width === 390) await page.screenshot({path:output + "/dao-" + engine.name() + "-" + locale + ".png", fullPage:false});
    await question.fill(copy[locale].intention);
    assert.equal(await panel.locator("[data-ideas-result]").count(), 0,
      label + ": no stale response after changing the goal");
    await insight.tap();
    await result.waitFor({state:"visible"});
    await result.locator('button[aria-controls="ideas-dao-details"]').tap();
    await result.getByRole("button", {name:copy[locale].reset + " ×", exact:true}).tap();
    assert.equal(await question.inputValue(), "", label + ": explicit localized reset clears the editable question");
    assert.equal(await panel.locator("[data-ideas-result]").count(), 0, label + ": reset removes the symbolic result");
    await question.fill(copy[locale].intention);
    diagnostics.phase('energy-navigation');
    await energy.tap();
    await page.waitForURL(url => url.pathname === "/" + locale + "/services/remote-energy-support", {
      timeout: 30000,
    });
    assert.equal(new URL(page.url()).search, "", label + ": personal goal not embedded in URL");
    const nextScreen = page.locator("[data-remote-support-intent-first]");
    await nextScreen.waitFor({state:"visible", timeout:30000});
    const handoff = nextScreen.locator("#remote-intention");
    await handoff.waitFor({state:"visible"});
    assert.equal(await handoff.inputValue(), "",
      label + ": current three-choice journey does not silently copy a Dao question to energy support");
    const focusChoices = nextScreen.locator("[data-remote-focus-chip]");
    const findOptions = nextScreen.locator("[data-remote-find-options]");
    const offers = nextScreen.locator("#remote-results");
    // Prove clearance before the existing fill: mobile navigation intentionally
    // hides while editing. Never manufacture blur to obtain a convenient box.
    const initialFinder = await remoteFinderGeometry(page);
    assertRemoteFinderGeometry(initialFinder, {phase:"initial", label});
    await handoff.fill(copy[locale].intention);
    assert.equal(await handoff.inputValue(), copy[locale].intention,
      label + ": separate private goal remains editable for the user's review");
    assert.equal(await nextScreen.locator("[data-lead-saved]").count(), 0,
      label + ": navigating to a request form never creates a CRM lead");
    assert.equal(await focusChoices.count(), 5, label + ": only five usable focus sectors");
    assert.equal(await offers.isVisible(), false, label + ": practitioner options wait for Find options");
    assert.equal(await findOptions.isVisible(), true, label + ": find CTA is visible");
    const firstChipBox = await focusChoices.first().boundingBox();
    const noteBox = await handoff.boundingBox();
    assert.ok(firstChipBox && noteBox && firstChipBox.y < noteBox.y,
      label + ": focus chips precede optional wishes");
    const editingFinder = await remoteFinderGeometry(page);
    assertRemoteFinderGeometry(editingFinder, {phase:"editing", label, baseline:initialFinder});
    await focusChoices.first().tap();
    assert.equal(await focusChoices.first().getAttribute("aria-pressed"), "true",
      label + ": sector selection is interactive");
    const restoredFinder = await remoteFinderGeometry(page);
    assertRemoteFinderGeometry(restoredFinder, {phase:"restored", label});
    await writeFile(output + "/finder-geometry-" + engine.name() + "-" + locale + "-" + width + ".json",
      JSON.stringify({initialFinder, editingFinder, restoredFinder}, null, 2));
    await findOptions.tap();
    await offers.waitFor({state: "visible", timeout: 10000});
    assert.equal(await findOptions.getAttribute("aria-expanded"), "true",
      label + ": Find options reveals the practitioner stage");
    assert.ok(await offers.locator("[data-remote-support-specialist]").count() > 0 ||
      await offers.locator('[role="status"]').count() > 0,
      label + ": only published practitioners or an honest empty state appear");
    assert.equal(await privateBrowserPersistence(page, [copy[locale].question, copy[locale].intention]), false,
      label + ": private question and intention never enter storage or cookies");
    assert.deepEqual(privateLeaks, [], label + ": neither private text appears in request URLs or bodies");
    diagnostics.phase('energy-reload');
    await page.reload({waitUntil:"domcontentloaded"});
    await nextScreen.waitFor({state:"visible"});
    assert.equal(await handoff.inputValue(), "",
      label + ": private free-text goal not restored from cookie or storage");

    const geometry = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(geometry.document <= geometry.viewport + 2,
      label + ": destination does not overflow " + JSON.stringify(geometry));
    // Return to the actual first screen for quick-anchor and practitioner journeys.
    diagnostics.phase('holistic-return');
    await page.goto(origin + "/" + locale + "/holistic-support", {waitUntil:"domcontentloaded"});
    await root.waitFor({state:"visible"});
    if (width === 390) {
      await page.screenshot({path:output + "/holistic-" + engine.name() + "-" + locale + "-390.png",fullPage:false});
    }
    const talisman = page.locator("[data-holistic-talismans-cta]");
    assert.equal(await talisman.getAttribute("href"), "#talismans");
    diagnostics.phase('quick-anchors');
    for (const [control, target, marker] of [
      [meditation, "meditation-practices", "data-holistic-meditations"],
      [talisman, "talismans", "data-holistic-talismans"],
    ]) {
      await control.tap();
      await page.waitForURL(url => url.pathname === "/" + locale + "/holistic-support" && url.hash === "#" + target, {timeout:20000});
      const destination = page.locator("#" + target + "[" + marker + "]");
      assert.equal(await destination.count(), 1, label + ": unique quick-action destination " + target);
      await destination.waitFor({state:"visible"});
      // Do not play media, request a talisman, sign in, submit or pay.
    }
    await page.locator('[data-support-talismans] a[href="/' + locale + '/app"]').waitFor({state:"visible"});
    assert.equal(await page.locator("[data-talisman-upload]").count(), 0,
      label + ": synthetic anonymous gallery never exposes an upload form");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      label + ": Holistic page has no horizontal overflow after native quick actions");
    const card = page.locator('[data-holistic-offer="practitioner"]');
    await card.waitFor({state:"visible"});
    assert.equal((await card.locator("h3").innerText()).trim(), copy[locale].practitioner);
    const practitioner = card.locator("[data-holistic-practitioner-cta]");
    assert.equal(await practitioner.getAttribute("href"), "/" + locale + "/pro#profi-practice");
    for (const control of [card, practitioner]) {
      const box = await control.boundingBox();
      assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, label + ": practitioner card/action fits viewport");
    }
    diagnostics.phase('pro-navigation');
    await practitioner.tap();
    await page.waitForURL(url => url.pathname === "/" + locale + "/pro" && url.hash === "#profi-practice", {timeout:30000});
    await page.locator("#profi-practice").waitFor({state:"visible"});
    diagnostics.phase('assertions');
    assert.deepEqual(errors, [], label + ": no client-side errors across every journey");
    assert.deepEqual(privateLeaks, [], label + ": no private requests across every journey");
    await isolation.assertClean();
    assert.ok(isolation.summary().anonymousTalismansReads > 0,
      label + ": gallery used the fixed synthetic anonymous401, never a customer-data API read");
  } catch (error) {
    primaryFailure = error;
    if (page) await page.screenshot({path:output + "/failure-" + engine.name() + "-" + locale + "-" + width + ".png", fullPage:true}).catch(() => {});
    throw error;
  } finally {
    diagnostics.phase('teardown');
    const guardFailures = [];
    if (isolation) try { await isolation.close(); } catch { guardFailures.push("ISOLATION_CLOSE_FAILED"); }
    try { await browser.close(); } catch { guardFailures.push("BROWSER_CLOSE_FAILED"); }
    if (primaryFailure) {
      if (guardFailures.length) console.error("Additional QA guard failures:", JSON.stringify(guardFailures));
      await writeFile(output + "/transport-failure-" + engine.name() + "-" + locale + "-" + width + ".json",
        JSON.stringify(diagnostics.snapshot(), null, 2)).catch(() => {});
    } else assert.deepEqual(guardFailures, [], "No unexpected request, popup, socket or unclosed context");
  }
  evidence.push({engine:engine.name(),locale,width,result:"pass"});
  console.log("PASS " + label + ": three choices, localized Dao/reset, separate private goal/reload, quick anchors and practitioner route");
}
for (const locale of ["en","ru","es"])
  for (const width of [320,390,430]) await verify(webkit,locale,width);
for (const locale of ["en","ru","es"]) await verify(chromium,locale,390);
assert.equal(evidence.length, 12, "All twelve canonical locale/viewport journeys completed");
await writeFile(output + "/acceptance.json",JSON.stringify(evidence,null,2));
console.log("Holistic Support mobile acceptance: " + evidence.length + " browser journeys");
