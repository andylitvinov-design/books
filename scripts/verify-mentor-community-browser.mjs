// CI-only hydrated Chromium/WebKit acceptance for the actual Next route and
// real public article repository over an isolated PostgreSQL test database.
// The browser never submits an enquiry, publishes on production or pays.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const playwright = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const engineName = process.env.HH_TEST_BROWSER || "chromium";
if (!["chromium", "webkit"].includes(engineName)) throw new Error("Unknown QA browser");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)
  || process.env.HH_APP_TEST_RUNTIME !== "isolated"
  || process.env.CI !== "true"
  || process.env.VERCEL) throw new Error("Refuse real accounts, external sites or production data");

const phase = process.env.HH_COMMUNITY_PHASE || "populated";
if (!["empty", "populated"].includes(phase)) throw new Error("Unknown QA phase");
const output = "artifacts/mentor-community";
await mkdir(output, { recursive: true });
const manifest = phase === "populated"
  ? JSON.parse(await readFile(output + "/fixture-manifest.json", "utf8"))
  : null;
if (manifest && (manifest.synthetic !== true || manifest.articleCount !== 6))
  throw new Error("Refusing non-synthetic fixture");

const titles = {
  en: ["Choosing a mentor thoughtfully", "A small daily reflection practice"],
  ru: ["Как выбрать наставника", "Практика ежедневной рефлексии"],
  es: ["Cómo elegir un mentor", "Una práctica de reflexión diaria"],
};
const queryForSecond = { en: "reflection", ru: "рефлексии", es: "reflexión" };
const topicForFirst = { en: "Goals", ru: "Цели", es: "Metas" };
const widths = phase === "empty" ? [390] :
  engineName === "webkit" ? [390] : [320, 375, 390, 430];
const browser = await playwright[engineName].launch();
const results = [];

async function noHorizontalOverflow(page, label) {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(viewport.scroll <= viewport.width + 1,
    label + ": horizontal page overflow " + JSON.stringify(viewport));
}

async function assertTouchSize(locator, name) {
  const box = await locator.boundingBox();
  assert.ok(box && box.height >= 44, name + ": needs at least 44px touch height");
}

try {
  for (const locale of ["en", "ru", "es"]) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true, hasTouch: true, deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(25000);
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      const label = engineName + "/" + locale + "/" + width + "/" + phase;
      try {
        const response = await page.goto(origin + "/" + locale + "/masters",
          { waitUntil: "domcontentloaded", timeout: 60000 });
        assert.equal(response?.status(), 200, label + ": /masters HTTP 200");
        const community = page.locator("[data-mentor-community]");
        await community.waitFor({ state: "visible", timeout: 30000 });
        // A server-rendered tab is visible before its React event handler is ready.
        // Wait for the real client hydration gate before the first touch action.
        await page.locator('[data-mentor-community][data-community-hydrated="true"]')
          .waitFor({ state: "visible", timeout: 30000 });
        const mentorTab = page.locator("#mentor-community-tab-mentors");
        const articleTab = page.locator("#mentor-community-tab-articles");
        const mentorPanel = page.locator("#mentor-community-panel-mentors");
        const articlePanel = page.locator("#mentor-community-panel-articles");
        assert.equal(await page.getByRole("tab").count(), 2);
        assert.equal(await page.getByRole("tabpanel").count(), 1,
          label + ": only one tab panel should be exposed to accessibility");
        await assertTouchSize(mentorTab, label + " mentor tab");
        await assertTouchSize(articleTab, label + " article tab");
        await noHorizontalOverflow(page, label + " initial");

        if (phase === "empty") {
          assert.equal(await mentorTab.getAttribute("aria-selected"), "true",
            label + ": a zero-publication directory defaults to real mentors");
          await articleTab.tap();
          await articlePanel.locator('[data-community-empty="articles"]').waitFor();
          assert.equal(await articlePanel.locator("article").count(), 0);
          const invite = articlePanel.locator('[data-community-empty="articles"]');
          await assertTouchSize(invite.getByRole("button"), label + " empty CTA");
          const write = invite.locator('a[href*="materialTab=articles"]');
          assert.equal(await write.count(), 1, "Author shortcut opens existing editor");
          await assertTouchSize(write, label + " author action");
          if (locale === "en") await community.screenshot({
            path: output + "/empty-" + engineName + "-" + width + ".png",
            animations: "disabled",
          });
          await invite.getByRole("button").tap();
          assert.equal(await mentorTab.getAttribute("aria-selected"), "true");
          await mentorPanel.waitFor({ state: "visible" });
          await noHorizontalOverflow(page, label + " empty CTA");
        } else {
          assert.equal(await articleTab.getAttribute("aria-selected"), "true",
            label + ": only approved articles may activate initial feed");
          await articlePanel.waitFor({ state: "visible" });
          const cards = articlePanel.locator("article");
          assert.equal(await cards.count(), 2, label + ": exactly two approved locale articles");
          for (const title of titles[locale]) {
            assert.equal(await cards.getByRole("link", { name: title }).count() >= 1, true,
              label + ": expected published title " + title);
          }
          assert.equal(await articlePanel.getByText("PRIVATE_QA_NOT_PUBLIC").count(), 0,
            label + ": do not expose private draft title");
          assert.equal(await articlePanel.getByText("PRIVATE_PENDING_REVISION").count(), 0,
            label + ": reviewed snapshot must not include new draft revisions");
          await articlePanel.getByRole("button", { name: topicForFirst[locale], exact: true }).tap();
          assert.equal(await cards.count(), 1, label + ": topic filter");
          await articlePanel.getByRole("button", {
            name: locale === "ru" ? "Все темы" : locale === "es" ? "Todos" : "All topics", exact: true,
          }).tap();
          assert.equal(await cards.count(), 2, label + ": reset topics");
          const search = articlePanel.locator('input[type="search"]');
          await search.fill(queryForSecond[locale]);
          assert.equal(await cards.count(), 1, label + ": search after hydration");
          await search.fill("");
          assert.equal(await cards.count(), 2);
          await articleTab.focus();
          await page.keyboard.press("Home");
          assert.equal(await mentorTab.getAttribute("aria-selected"), "true",
            label + ": keyboard Home focuses mentors");
          await page.keyboard.press("End");
          assert.equal(await articleTab.getAttribute("aria-selected"), "true",
            label + ": keyboard End focuses articles");
          await page.keyboard.press("ArrowLeft");
          assert.equal(await mentorTab.getAttribute("aria-selected"), "true",
            label + ": keyboard arrows toggle tabs");
          await articleTab.tap();
          await assertTouchSize(cards.first().getByRole("link", { name: /Read article|Читать статью|Leer artículo/ }),
            label + " read action");
          await noHorizontalOverflow(page, label + " filtered");

          if (width === 390) {
            await community.screenshot({
              path: output + "/feed-" + engineName + "-" + locale + "-390.png",
              animations: "disabled",
            });
            const readLink = cards.first().getByRole("link", {
              name: /Read article|Читать статью|Leer artículo/,
            });
            await readLink.tap();
            await page.waitForURL(new RegExp("/" + locale + "/articles/[^/]+$"), { timeout: 30000 });
            assert.equal(await page.locator("h1").first().isVisible(), true);
            assert.equal(await page.locator("article").getByText("PRIVATE_PENDING_REVISION").count(), 0);
            // The existing article detail has a related service but CSS modules
            // may rename class; use the stable href instead.
            assert.ok(await page.locator('article a[href^="/' + locale + '/services/"]').count() >= 1,
              label + ": approved article links to author's actual published service");
            const authorLink = page.locator('article a[href^="/' + locale + '/masters/"]').first();
            await authorLink.tap();
            await page.waitForURL(new RegExp("/" + locale + "/masters/[^/]+$"), { timeout: 30000 });
            assert.equal(await page.locator("h1#practitioner-name").innerText(), "Synthetic Mentor");
            await page.locator("#practitioner-services").waitFor({ state: "visible" });
            assert.ok(await page.locator("#practitioner-services a[href*='/services/']").count() > 0);
            await noHorizontalOverflow(page, label + " profile");
            const privateResponse = await page.request.get(
              origin + "/" + locale + "/articles/" + manifest.hiddenSlug);
            assert.equal(privateResponse.status(), 404,
              label + ": unreleased draft must be HTTP 404");
          }
        }
        assert.deepEqual(errors, [], label + ": unexpected page exceptions");
        results.push({ engine: engineName, locale, width, phase, passed: true });
        console.log("MENTOR_COMMUNITY_BROWSER_PASS " + label);
      } catch (error) {
        await page.screenshot({
          path: output + "/failure-" + engineName + "-" + locale + "-" + width + ".png",
          fullPage: false,
        }).catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log("MENTOR_COMMUNITY_BROWSER_ALL_PASS " + JSON.stringify({ engine: engineName, phase, checks: results.length }));
