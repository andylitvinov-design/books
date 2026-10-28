// Real Chromium/WebKit mobile acceptance for the current Holistic Support first screen.
// Isolated loopback server only; never sends real CRM enquiries or payment.
// DIAGNOSTIC SUCCESSOR, NOT A GREEN FIX: migrate the lazy three-choice layout,
// but retain the unresolved private same-tab goal handoff as a hard failure.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { assertPublicJourneyRuntime, installPublicJourneyFence, assertHolisticContextHandoff }
  from "./helpers/public-journey-verifier.mjs";
import { withHolisticDaoActionDiagnostics } from "./helpers/holistic-dao-action-diagnostics.mjs";

import { verifyCurrentGallery } from "./helpers/holistic-gallery-verifier.mjs";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Holistic Support mobile verification is loopback-only");
assertPublicJourneyRuntime(origin);
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
const daoTitles = {en:"Daoist insight",ru:"Даосская подсказка",es:"Consejo taoísta"};

async function verify(engine, locale, width) {
  const browser = await engine.launch({headless: true});
  const label = engine.name() + ":" + locale + ":" + width;
  const context = await browser.newContext({
    viewport: {width, height: 844}, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
    reducedMotion: "reduce", serviceWorkers: "block",
  });
  const fence = await installPublicJourneyFence(context, origin, [copy[locale].question, copy[locale].intention],
    {anonymousTalismans:true,browserLocalBlobImages:engine === webkit,reviewedRemoteSupportIntroImage:true});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  async function openAnonymousArchive(expectedReads) {
    const catalog = page.locator('[data-taoist-talisman-catalog]');
    await catalog.waitFor({state:"visible"});
    const archive = catalog.locator('button[aria-controls="tao-talisman-private-gallery"]');
    assert.equal(await archive.count(), 1, label + ": one explicit archive toggle");
    assert.equal(await archive.getAttribute("aria-expanded"), "false");
    assert.equal(await catalog.locator('[data-support-talismans]').count(), 0,
      label + ": no private gallery before explicit opening");
    assert.equal(fence.summary().anonymousTalismanReads, expectedReads);
    const target = await archive.boundingBox();
    assert.ok(target && target.height >= 44 && target.width >= 44, label + ": archive touch target");
    await archive.tap();
    assert.equal(await archive.getAttribute("aria-expanded"), "true");
  }
  try {
    const response = await page.goto(origin + "/" + locale + "/holistic-support", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    assert.equal(response?.status(), 200, label + ": first screen returned HTTP 200");
    const root = page.locator("[data-holistic-first-screen]");
    await root.waitFor({state: "visible", timeout: 30000});
    await openAnonymousArchive(0);
    const guestGallery = page.locator('[data-support-talismans]');
    await guestGallery.locator('a[href="/' + locale + '/app"]').waitFor({state:"visible"});
    assert.equal(await guestGallery.locator('img, form, [data-talisman-upload]').count(), 0,
      label + ": synthetic anonymous gallery exposes no private image or upload form");
    assert.equal(fence.summary().anonymousTalismanReads, 1, label + ": exact guest read was fulfilled in memory, never by the API");
    assert.equal(await root.locator("h1#holistic-journey-title").innerText(),
      copy[locale].title, label + ": localized heading");
    const firstChoices = root.locator("[data-holistic-choose]");
    assert.deepEqual(await firstChoices.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-holistic-choose"))),
      ["meditations", "energy", "dao"], label + ": exactly three independent first-screen choices");
    const energy = root.locator('[data-holistic-choose="energy"]');
    const dao = root.locator('[data-holistic-choose="dao"]');
    assert.equal(await root.locator('[data-holistic-choose="meditations"]').getAttribute("href"), "#meditation-practices");
    assert.equal(await energy.getAttribute("href"), "/" + locale + "/services/remote-energy-support");
    assert.equal(await dao.getAttribute("aria-controls"), "dao-guidance");
    assert.equal(await dao.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("[data-holistic-dao-screen]").count(), 0,
      label + ": Dao is lazy, not missing");
    for (let index = 0; index < 3; index++) {
      const bounds = await firstChoices.nth(index).boundingBox();
      assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44 && bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
        label + ": first-screen choice " + index + " keeps the original 44px target");
    }
    await dao.tap();
    assert.equal(await dao.getAttribute("aria-expanded"), "true");
    const panel = page.locator("#dao-guidance[data-holistic-dao-screen]");
    await panel.waitFor({state:"visible"});
    const engineCard = panel.locator('[data-ideas-discovery][data-temple-mode="true"]');
    assert.equal(await engineCard.count(), 1, label + ": single active insight engine after explicit choice");
    assert.equal(await engineCard.locator("h2#ideas-title").innerText(), daoTitles[locale], label + ": localized Dao heading");
    const scenic = engineCard.locator('[class*="templeScenic"]').first();
    assert.ok((await scenic.evaluate(node => getComputedStyle(node, "::before").backgroundImage))
      .includes("ideas-pine-sharp.avif"), label + ": approved pine photograph");

    const tab = page.locator('.mobile-bottom-navigation [data-nav-item="temple"]');
    await tab.waitFor({state: "visible"});
    assert.equal((await tab.innerText()).trim(), copy[locale].tab);
    assert.equal(await tab.getAttribute("aria-label"), copy[locale].accessible);
    assert.equal(await tab.getAttribute("aria-current"), "page");


    // Current gallery UI only: no playback/fullscreen acceptance claim.
    await verifyCurrentGallery(page, locale, width, label);

    const insight = engineCard.locator("[data-ideas-tao]");
    const diagnostic = engineCard.locator("[data-ideas-free-diagnostic]");
    assert.equal(await diagnostic.getAttribute("href"),
      "/" + locale + "/services/free-consultation#free-diagnosis-options", label + ": current free-diagnostic route");
    const choices = [insight, diagnostic];
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
    assert.equal(await engineCard.locator("[data-ideas-preview]").count(), 0,
      label + ": focused Dao screen has no prefilled reading (PR 2026)");
    assert.equal(await engineCard.locator("[data-ideas-result]").count(), 0,
      label + ": no personal response before a question");

    const question = engineCard.locator("#ideas-question");
    await withHolisticDaoActionDiagnostics(page, engineCard, {
      locale, readPageErrorCount: () => errors.length,
    }, async () => {
      await question.fill(copy[locale].question);
      await insight.tap();
      const result = engineCard.locator('[data-ideas-result="dao"]');
      await result.waitFor({state:"visible", timeout: 20000});
      assert.ok((await result.locator("[data-ideas-dao-summary]").innerText()).trim().length > 15,
        label + ": genuine symbolic response");
      assert.equal(await question.inputValue(), copy[locale].question,
        label + ": original words kept only in editable field");
    });

    await question.fill(copy[locale].intention);
    assert.equal(await engineCard.locator("[data-ideas-result]").count(), 0,
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
    // Capture now; assert after the remaining destination checks so this known
    // missing coupling cannot obscure the independently preserved geometry/privacy checks.
    const transferredIntention = await handoff.inputValue();
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
    fence.assertNoSideEffects(label);
    assertHolisticContextHandoff(transferredIntention, copy[locale].intention, label);
    if (width === 390) {
      await page.goto(origin + "/" + locale + "/holistic-support", {waitUntil:"domcontentloaded"});
      await root.waitFor({state:"visible"});
      await openAnonymousArchive(1);
      await guestGallery.locator('a[href="/' + locale + '/app"]').waitFor({state:"visible"});
      await page.screenshot({path:output + "/holistic-" + engine.name() + "-" + locale + "-390.png",fullPage:false});
    }
    fence.assertNoSideEffects(label + ": final screenshot included");
    assert.equal(fence.summary().anonymousTalismanReads, width === 390 ? 2 : 1,
      label + ": only the bounded source-proven gallery mounts received anonymous fixtures");
    evidence.push({engine:engine.name(),locale,width,result:"pass"});
    console.log("PASS " + label + ": symbolic insight, private energy handoff and one-use privacy");
  } finally {
    await writeFile(output + "/requests-" + engine.name() + "-" + locale + "-" + width + ".json",
      JSON.stringify(fence.summary(), null, 2));
    await context.close();
    await browser.close();
  }
}
for (const locale of ["en","ru","es"])
  for (const width of [320,390,430]) await verify(webkit,locale,width);
for (const locale of ["en","ru","es"]) await verify(chromium,locale,390);
await writeFile(output + "/acceptance.json",JSON.stringify(evidence,null,2));
console.log("Holistic Support mobile acceptance: " + evidence.length + " browser journeys");
