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
    await hub.locator("[data-ideas-preview]").waitFor({ state: "visible" });
    assert.equal(await hub.locator("[data-ideas-result]").count(), 0, label + ": example not a false result");
    const initialPreviewLabel = await hub.locator("[data-ideas-preview] [class*=tag]").first().innerText();
    assert.ok(initialPreviewLabel.length > 4, label + ": clearly labelled editorial preview");
    const modeButtons = hub.locator("button[aria-pressed]");
    assert.equal(await modeButtons.count(), 3, label + ": exactly three choices");
    const rects = await Promise.all([0, 1, 2].map(async index => modeButtons.nth(index).boundingBox()));
    assert.ok(rects.every(rect => rect && rect.height >= 44 && rect.width >= 70), label + ": finger-sized choices");
    assert.ok(closeEnough(rects[0].y, rects[1].y) && closeEnough(rects[1].y, rects[2].y),
      label + ": all choices in one horizontal row");
    assert.ok(await modeButtons.first().evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 12),
      label + ": option text is readable");
    const bounds = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(bounds.content <= bounds.viewport + 1, label + ": horizontal overflow");

    if (browserType === webkit && locale === "en" && width === 390) {
      await page.screenshot({ path: output + "/ideas-first-screen-webkit-390.png", fullPage: false });
      const preview = await hub.locator("[data-ideas-preview]").boundingBox();
      assert.ok(preview && preview.y < 844 - 80, label + ": answer begins above bottom navigation");
    }

    const textarea = hub.locator("#ideas-question");
    assert.ok(await textarea.evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 16),
      label + ": iPhone input does not zoom");
    // The submit action is always Dao-first, even if a visitor previously tapped another mode.
    await modeButtons.nth(1).tap();
    await textarea.fill(phrases[locale]);
    await hub.locator('button[type="submit"]').tap();
    const daoResult = hub.locator('[data-ideas-result="dao"]');
    await daoResult.waitFor({ state: "visible" });
    assert.equal(await daoResult.locator('[data-ideas-dao-summary]').count(), 1,
      label + ": one compact Daoist paragraph");
    assert.ok((await daoResult.locator('[data-ideas-dao-summary]').innerText()).length > 30,
      label + ": useful brief reading");
    assert.equal(await daoResult.locator('[role="img"]').count(), 0,
      label + ": glyph and full reading hidden before expanding");
    const compactSize = await daoResult.boundingBox();
    assert.ok(compactSize && compactSize.height < 215, label + ": answer fits the first screen");
    const expand = daoResult.locator('button[aria-expanded]');
    assert.equal(await expand.getAttribute("aria-expanded"), "false", label + ": collapsed by default");
    if (browserType === webkit && locale === "en" && width === 390) {
      await page.screenshot({ path: output + "/ideas-dao-compact-webkit-390.png", fullPage: false });
    }
    await expand.tap();
    await daoResult.locator('[data-ideas-dao-expanded="true"]').waitFor({ state: "visible" });
    assert.equal(await expand.getAttribute("aria-expanded"), "true", label + ": accessible expanded state");
    assert.equal(await daoResult.locator('[role="img"]').count(), 1, label + ": genuine I Ching glyph");
    const detailUrl = await daoResult.locator('a[href*="/dao/hexagrams/"]').getAttribute("href");
    assert.match(detailUrl || "", new RegExp("^/" + locale + "/dao/hexagrams/(?:[1-9]|[1-5][0-9]|6[0-4])$"));
    if (browserType === webkit && locale === "en" && width === 390) {
      await daoResult.locator('[data-ideas-dao-reading] [lang="ru"] p').first()
        .waitFor({ state: "visible", timeout: 30000 });
    }
    await expand.tap();
    assert.equal(await expand.getAttribute("aria-expanded"), "false", label + ": can collapse again");
    assert.equal(await daoResult.locator('[role="img"]').count(), 0, label + ": collapsed content removed");

    await modeButtons.nth(1).tap();
    await hub.locator('[data-ideas-result="aphorisms"]').waitFor({ state: "visible" });
    assert.equal(await hub.locator('[data-ideas-result="aphorisms"] ol li').count(), 3,
      label + ": exactly 3 aphorisms");
    assert.equal(await modeButtons.nth(1).getAttribute("aria-pressed"), "true");

    await modeButtons.nth(2).tap();
    await hub.locator('[data-ideas-result="personal"]').waitFor({ state: "visible" });
    const services = hub.locator('[data-ideas-guidance-list] li a');
    assert.equal(await services.count(), 3, label + ": three real free service suggestions");
    const links = await services.evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    assert.ok(links.some(href => href?.includes("/services/free-situation-review#request-free-review")), label);
    assert.ok(links.some(href => href?.includes("/client/tests")), label);
    assert.ok(links.some(href => href?.includes("/services/dao-health-profile#request-free-wu-xing")), label);
    if (browserType === webkit && locale === "en" && width === 390) {
      await page.screenshot({ path: output + "/ideas-free-guidance-webkit-390.png", fullPage: false });
    }
    // This clicks a real public service link. Never submit a lead on behalf of a visitor.
    if (width === 390) {
      const first = await services.first().getAttribute("href");
      assert.ok(first?.startsWith("/"), label + ": same-site link");
      await services.first().tap();
      await page.waitForURL(url => url.pathname === first.split("#")[0], { timeout: 30000 });
    }
    assert.deepEqual(errors, [], label + ": unhandled client errors");
    evidence.push({ browser: browserType.name(), locale, width, result: "pass", linkedToExistingFreeService: width === 390 });
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
