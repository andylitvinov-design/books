// Loopback-only mobile browser acceptance: the lowest score selects original
// meditation thumbnails ABOVE the scenic player. Synthetic ratings only.
// NO client records, external YouTube playback, payment or CRM submission.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { qaSupportDirectoryResponse } from "./fixtures/holistic-support-directory.mjs";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Personal Support acceptance is loopback-only");
const output = "artifacts/holistic-support-recommendations";
await mkdir(output, { recursive: true });
const evidence = [];

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + ":" + locale + ":" + width;
        const page = await browser.newPage({
          viewport: { width, height: 844 }, deviceScaleFactor: 1,
          hasTouch: true, isMobile: true, reducedMotion: "reduce",
          // Public synthetic fixtures must not be intercepted by an installed service worker.
          serviceWorkers: "block",
        });
        const errors = [];
        const interceptedDirectories = [];
        const directoryHttpStatuses = [];
        const blockedApiWrites = [];
        page.on("pageerror", err => errors.push(err.message));
        page.on("response", response => {
          if (new URL(response.url()).pathname === "/api/public/remote-energy-support-masters")
            directoryHttpStatuses.push(response.status());
        });
        // Never let synthetic gallery or unopened order dialogs send CRM/payment
        // mutations. Record only method/path (no bodies or personal data).
        // The narrower public-directory fixture below is registered last, so
        // it retains priority over this fail-closed guard for GET requests.
        await page.route("**/api/**", async route => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.origin === origin && !["GET", "HEAD"].includes(request.method())) {
            blockedApiWrites.push({ method: request.method(), path: url.pathname });
            await route.abort("blockedbyclient");
            return;
          }
          await route.fallback();
        });
        await page.route("**/youtube-nocookie.com/**", route => route.abort());
        await page.route("**/api/public/remote-energy-support-masters?**", async route => {
          // The last-registered directory fixture has priority over the broad
          // /api/** guard. Never return a synthetic success for a non-GET write.
          if (route.request().method() !== "GET") {
            blockedApiWrites.push({
              method: route.request().method(),
              path: new URL(route.request().url()).pathname,
            });
            await route.abort("blockedbyclient");
            return;
          }
          const kind = new URL(route.request().url()).searchParams.get("kind");
          interceptedDirectories.push(kind === "consultation" ? "consultation" : "masters");
          await route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify(qaSupportDirectoryResponse(locale, kind)) });
        });
        try {
          const response = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
            { waitUntil: "domcontentloaded", timeout: 60000 });
          assert.equal(response?.status(), 200, label + " existing mobile route");
          const root = page.locator("[data-holistic-mobile-alternative]");
          await root.waitFor({ state: "visible", timeout: 30000 });
          await page.waitForFunction(() => {
            const input = document.querySelector('[data-support-scale="relationships"] input[type="range"]');
            return Boolean(input && Object.keys(input).some(key => key.startsWith("__reactProps$")));
          }, null, {timeout:30000});

          const assessment = root.locator('[aria-labelledby="mobile-assessment-title"]');
          const photo = root.locator("[data-support-photo]");
          const gallery = root.locator("[data-support-meditation-gallery]");
          const hero = root.locator("[data-support-player]");
          const launch = root.locator('section:has([data-support-photo]) [data-support-recommendations]');
          assert.equal(await launch.count(), 1, label + " one recommendation action alongside photo");
          assert.equal(await assessment.locator("[data-support-goal-filter-trigger]").count(), 1,
            label + " separate goal filter remains below the self-score scales");
          assert.equal(await root.locator("[data-support-recommendations]").count(), 1,
            label + " no duplicate focus picker");
          assert.equal(await root.locator('[data-support-scale] input[type="range"]').count(), 4,
            label + " four editable self-scores");
          assert.equal(await root.locator("[data-support-active-focus]").count(), 1,
            label + " one non-editable focus summary; no duplicate focus picker");
          assert.equal(await root.locator('[data-support-detailed-analysis]').count(), 0,
            label + " old left Tests CTA replaced");
          assert.equal(await gallery.locator("[data-support-video]").count(), 4,
            label + " four verified thumbnail cards");
          assert.equal(await root.locator("[data-support-meditation-basis]").count(), 0,
            label + " no recommendation until visitor clicks");
          const before = await gallery.locator("[data-support-video]").allTextContents();
          const geometry = await page.evaluate(() => {
            const rect = selector => {
              const el = document.querySelector(selector);
              const r = el?.getBoundingClientRect();
              return r ? { top:r.top, bottom:r.bottom, left:r.left, right:r.right } : null;
            };
            return { width: document.documentElement.clientWidth,
              scroll: document.documentElement.scrollWidth,
              gallery:rect("[data-support-meditation-gallery]"),
              hero:rect("[data-support-player]"),
            };
          });
          assert.ok(geometry.gallery && geometry.hero &&
            geometry.hero.top < geometry.gallery.top &&
            geometry.hero.bottom <= geometry.gallery.top + 2,
            label + " original scenic video must be ABOVE miniature thumbnails");
          assert.ok(geometry.scroll <= geometry.width + 2, label + " no width overflow");

          const relationships = assessment.locator('[data-support-scale="relationships"] input[type="range"]');
          await relationships.focus();
          await relationships.press("Home");
          await relationships.press("ArrowRight");
          assert.equal(await relationships.inputValue(), "2", label + " keyboard 2/10");
          await launch.click();
          const basis = gallery.locator("[data-support-meditation-basis]");
          await basis.waitFor({ state:"visible", timeout:10000 });
          assert.ok((await basis.innerText()).includes("2/10"),
            label + " real selected minimum in gallery");
          assert.ok((await basis.innerText()).includes({
            en:"Relationships",ru:"Отношения",es:"Relaciones",
          }[locale]), label + " matched lowest topic in user language");
          assert.equal(await hero.locator("iframe").count(), 0, label + " no playback on ranking");
          assert.equal(await gallery.locator("[data-support-video]").count(), 4, label + " still four real videos");
          const after = await gallery.locator("[data-support-video]").allTextContents();
          assert.equal(after.length, before.length, label + " ranking did not add recordings");
          const relationshipFirstId = await gallery.locator("[data-support-video]").first().getAttribute("data-support-video");
          assert.notDeepEqual(after, before, label + " first ranking visibly reorders the rail");

          const selectedThumb = gallery.locator("[data-support-video]").last();
          const id = await selectedThumb.getAttribute("data-support-video");
          assert.match(id, /^[A-Za-z0-9_-]{11}$/, label + " verified selected video ID");
          await selectedThumb.click();
          assert.equal(await selectedThumb.getAttribute("aria-pressed"), "true",
            label + " thumbnail changes the scenic player selection");
          assert.equal(await hero.locator("iframe").count(), 0, label + " no autoplay on thumbnail");
          assert.equal(await root.locator("[data-support-video-source] a[href^='https://www.youtube.com/watch']").count(),
            1, label + " one verified source URL below the hero");

          // Editing scores invalidates the previous snapshot. A second explicit
          // click takes a new minimum and refreshes the same four thumbnails.
          const money = assessment.locator('[data-support-scale="money"] input[type="range"]');
          await money.focus();
          await money.press("Home");
          assert.equal(await money.inputValue(), "1", label + " lower money to 1");
          assert.equal(await basis.count(), 0, label + " stale ranking is removed");
          await launch.click();
          await basis.waitFor({ state:"visible" });
          const text = await basis.innerText();
          assert.ok(text.includes("1/10") && text.includes({
            en:"Money",ru:"Деньги",es:"Dinero",
          }[locale]), label + " new minimum replaces previous topic");
          const firstId = await gallery.locator("[data-support-video]").first().getAttribute("data-support-video");
          assert.match(firstId, /^[A-Za-z0-9_-]{11}$/, label + " verified original video ID");
          assert.notEqual(firstId, relationshipFirstId,
            label + " a new minimum really changes the first recommended thumbnail");

          // The independent talisman flow still opens an existing SKU and local
          // quotation dialog; a click is NOT a lead, charge or delivery.
          await root.locator('[data-support-tool="talisman"]').click();
          const viewer = root.locator("[data-support-talisman-viewer]");
          await viewer.waitFor({ state: "visible" });
          assert.equal(await viewer.locator("[data-support-talisman-thumb]").count(), 3,
            label + " three approved symbolic illustrations");
          assert.equal(await viewer.locator("[data-support-talisman]").getAttribute("data-support-talisman"),
            "fu-prosperity", label + " money is the lowest score");
          await viewer.locator("[data-support-talisman-next]").click();
          await viewer.locator('[data-support-talisman-thumb="fu-prosperity"]').click();
          await viewer.locator("[data-support-talisman-request]").click();
          const modal = page.locator('dialog[aria-labelledby="support-talisman-order-title"]');
          await modal.waitFor({ state:"visible" });
          assert.equal(await modal.locator('[data-taoist-talisman-cart][data-inline="true"]').count(), 1,
            label + " existing protected quote UI, no new backend");
          assert.equal(await modal.locator('[data-cart-talisman="fu-prosperity"]').count(), 1,
            label + " correct public design in quote");
          assert.equal(await modal.locator("[data-talisman-quote-saved]").count(), 0,
            label + " no fabricated CRM receipt");
          await modal.locator('button[aria-label]').first().click();
          await modal.waitFor({ state:"hidden" });

          await root.locator('[data-support-tool="masters"]').click();
          const masterViewer = root.locator('[data-support-master-viewer][data-support-directory-kind="masters"]');
          await masterViewer.locator('[data-support-master-hero]').waitFor({state:"visible",timeout:10000});
          assert.ok(interceptedDirectories.includes("masters"),
            label + " master gallery must use intercepted synthetic directory, not live API");
          assert.equal(await masterViewer.locator('[data-support-master-thumb]').count(),2,
            label + " published fixture masters selectable under large profile");
          await masterViewer.locator('[data-support-master-thumb="qa-energy-two"]').click();
          assert.equal(await masterViewer.locator('[data-support-master-hero]').getAttribute("data-support-master-hero"),
            "qa-energy-two",label+" second master updates hero");
          await masterViewer.locator('[data-support-master-request]').click();
          const masterDialog=page.locator('dialog[aria-labelledby="support-master-order-title"]');
          await masterDialog.waitFor({state:"visible",timeout:10000});
          assert.equal(await masterDialog.locator('[data-remote-support-specialist="qa-energy-two"]').count(),1,
            label+" selected published master reaches the existing booking workflow");
          await masterDialog.locator('button[aria-label]').first().click();
          await masterDialog.waitFor({state:"hidden",timeout:8000});
          await root.locator('[data-support-tool="consultation"]').click();
          const consultViewer=root.locator('[data-support-master-viewer][data-support-directory-kind="consultation"]');
          await consultViewer.locator('[data-support-master-hero]').waitFor({state:"visible",timeout:10000});
          assert.ok(interceptedDirectories.includes("consultation"),
            label + " consultation gallery must use intercepted synthetic directory, not live API");
          assert.equal(await consultViewer.locator('[data-support-master-thumb]').count(),2,
            label+" two published service offerings available in miniature gallery");
          assert.equal(await consultViewer.locator('[data-support-offer-request]').count(),1,
            label+" a real service-link request replaces duplicate generic finder");
          await consultViewer.locator('[data-support-offer-price-filter] select').selectOption("free");
          assert.equal(await consultViewer.locator('[data-support-master-thumb]').count(),1,
            label+" price filter hides non-free consultation offers");
          await root.locator('[data-support-tool="healing"]').click();
          await root.locator('[data-support-healing-panel] [data-support-master-hero]')
            .waitFor({state:"visible",timeout:10000});
          assert.equal(await root.locator('[data-support-healing-panel] [data-support-master-thumb]').count(),2,
            label+" energy mode keeps the master gallery");
          if (width === 390) {
            await root.locator('[data-support-photo] input[type="file"]').setInputFiles({
              name:"synthetic.png", mimeType:"image/png",
              buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL2WQAAAABJRU5ErkJggg==","base64"),
            });
            await photo.locator('img[class*="photoPreview"]').waitFor({ state:"visible" });
            await page.screenshot({ path: output + "/" + engine.name() + "-" + locale + "-390.png" });
          }
          assert.ok(directoryHttpStatuses.length >= 2 && directoryHttpStatuses.every(status => status === 200),
            label + " all public directory responses are synthetic HTTP 200: " + JSON.stringify(directoryHttpStatuses));
          assert.deepEqual(blockedApiWrites, [],
            label + " no CRM/payment/API writes before a consented enquiry: " +
              JSON.stringify(blockedApiWrites));
          assert.deepEqual(errors, [], label + " no JS exceptions");
          evidence.push({ locale, width, engine:engine.name(), firstId, fourVideos:true,
            highestNeed:"money=1", railAboveHero:true, noAutoplay:true, quoteNotSubmitted:true });
        } finally { await page.close(); }
      }
    }
  } finally { await browser.close(); }
}
await writeFile(output+"/summary.json",JSON.stringify({cases:evidence},null,2));
console.log("Support lowest-rating / gallery / talisman browser checks: " + evidence.length + " passed");
