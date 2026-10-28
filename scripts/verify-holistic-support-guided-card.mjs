// Real browser interaction and geometry for the approved five-card mobile guide.
// Loopback, published public sources, synthetic directory; no provider writes or playback.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { qaSupportDirectoryResponse } from "./fixtures/holistic-support-directory.mjs";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3119";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Localhost only");
const output = "artifacts/holistic-guided-recommendations";
await mkdir(output, { recursive: true });

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["ru", "en", "es"]) for (const width of [320, 390, 430]) {
      const name = engine.name() + "/" + locale + "/" + width;
      const page = await browser.newPage({ viewport: {width, height: 844},
        deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce",
        serviceWorkers: "block" });
      const exceptions = [], writes = [];
      page.on("pageerror", error => exceptions.push(error.message));
      page.on("request", request => {
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && request.url().includes("/api/")) {
          writes.push(request.method() + " " + request.url());
        }
      });
      await page.route("**/youtube-nocookie.com/**", route => route.abort());
      await page.route(/\/api\/public\/remote-energy-support-masters(?:\?.*)?$/, async route => {
        const kind = new URL(route.request().url()).searchParams.get("kind");
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify(qaSupportDirectoryResponse(locale, kind)) });
      });
      try {
        const response = await page.goto(origin + "/" + locale + "/holistic-support/mobile",
          { waitUntil: "domcontentloaded", timeout: 75000 });
        assert.equal(response?.status(), 200, name + " page");
        const root = page.locator("[data-holistic-mobile-alternative]");
        await root.waitFor({ state: "visible", timeout: 35000 });
        await page.waitForFunction(() => {
          const el = document.querySelector('[data-support-scale="energy"] input');
          return Boolean(el && Object.keys(el).some(key => key.startsWith("__reactProps$")));
        }, null, { timeout: 30000 });

        assert.equal(await root.locator("[data-support-mobile-bottom-nav]").count(), 1, name + " original dock");
        assert.equal(await root.locator("[data-support-scale]").count(), 5, name + " five linked ratings");
        assert.equal(await root.locator('[data-support-scale="meaning"] input[type="range"]').count(), 1,
          name + " separate Meaning rating stays visible");
        assert.equal(await root.locator("[data-support-tool]").count(), 7, name + " original tools");
        const guide = root.locator("[data-support-goal-results]");
        assert.equal(await guide.count(), 1, name + " exactly one recommendations card");
        assert.equal(await guide.locator("[data-support-journey-step]").count(), 5, name + " five actual steps");
        for (const action of ["question","tests","video","support","progress"])
          assert.equal(await guide.locator('[data-support-journey-action="' + action + '"]').count(),
            1, name + " direct action: " + action);
        const testLink = guide.locator('[data-support-journey-action="tests"]');
        assert.equal(await testLink.getAttribute("href"), "/" + locale + "/client/tests?journey=energy",
          name + " real allowlisted test journey");
        const metrics = await page.evaluate(() => {
          const selectors = ["[data-support-goal-results]", "[data-support-player]",
            "[data-support-journey-action]", "[data-support-mobile-bottom-nav]"];
          const clientWidth = document.documentElement.clientWidth;
          return { clientWidth, scrollWidth: document.documentElement.scrollWidth,
            rects: selectors.map(selector => [...document.querySelectorAll(selector)].map(el => {
              const r = el.getBoundingClientRect();
              return { selector, left: r.left, right: r.right, width: r.width, height: r.height, y: r.top };
            })).flat() };
        });
        // Regression: a fifth rating must not make the original left header a tall,
        // skinny column or push its CTA beyond the matched three-column band.
        const header = await page.evaluate(() => {
          const rect = selector => {
            const el = document.querySelector(selector);
            const r = el?.getBoundingClientRect();
            return r && {left:r.left, right:r.right, top:r.top, bottom:r.bottom,
              width:r.width, height:r.height};
          };
          const labelFits = [...document.querySelectorAll(
            '[data-support-scale] [class*="scaleLabel"]'
          )].every(el => el.scrollWidth <= el.clientWidth + 2);
          return { left:rect('[aria-labelledby="mobile-assessment-title"]'),
            profile:rect('[data-support-photo]'), right:rect('#support-tools'),
            cta:rect('[data-support-goal-filter-trigger]'), labelFits };
        });
        assert.ok(header.left && header.right && header.cta && header.profile,
          name + " all original header panels remain");
        assert.ok(header.left.width >= width * .34,
          name + " left check-in remains wide enough: " + JSON.stringify(header));
        const maxRatio = width <= 350 ? 2.26 : width <= 390 ? 2.02 : 1.86;
        assert.ok(header.left.height / header.left.width <= maxRatio,
          name + " left card remains compact, not a narrow tower: " + JSON.stringify(header));
        assert.ok(header.labelFits,
          name + " all five labels fit without cropping");
        assert.ok(header.cta.bottom <= header.left.bottom + 2,
          name + " goal-filter button stays inside left card");
        assert.ok(header.left.right <= header.profile.left + 4 &&
          header.profile.right <= header.right.left + 4,
          name + " original three-column order remains");
        console.log("Header geometry " + name + ": " +
          Math.round(header.left.width) + "×" + Math.round(header.left.height) +
          " (ratio " + (header.left.height / header.left.width).toFixed(2) + ")");
        assert.ok(metrics.scrollWidth <= metrics.clientWidth + 3,
          name + " no horizontal overflow: " + JSON.stringify(metrics));
        assert.ok(metrics.rects.every(rect => rect.left >= -3 && rect.right <= width + 3),
          name + " all five buttons inside viewport: " + JSON.stringify(metrics));
        assert.ok(metrics.rects.filter(rect => rect.selector === "[data-support-journey-action]").every(
          rect => rect.height >= 42), name + " readable touch targets");
        assert.ok(metrics.rects.find(rect => rect.selector === "[data-support-goal-results]").y <
          metrics.rects.find(rect => rect.selector === "[data-support-player]").y,
          name + " guide sits above the existing scenic video");
        if (width === 390 && locale === "ru") {
          await page.screenshot({ path: output + "/" + engine.name() + "-ru-390.png", fullPage: true });
        }

        // User-led actions: video selects an actual published source but never auto-plays.
        const vid = guide.locator('[data-support-journey-action="video"]');
        const youtubeId = await vid.getAttribute("data-support-journey-video");
        if (youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
          await vid.click();
          await page.waitForFunction(id => document.querySelector('[data-support-player]') &&
            document.querySelector('[data-support-video="' + id + '"]'), youtubeId, {timeout:8000});
          assert.equal(await root.locator("[data-support-player] iframe").count(), 0,
            name + " playback needs another explicit click");
        }

        await guide.locator('[data-support-journey-action="support"]').click();
        await root.locator("[data-support-healing-panel]").waitFor({state:"visible",timeout:15000});
        await page.waitForFunction(() => {
          const rect = document.getElementById("support-healing-panel")?.getBoundingClientRect();
          return !!rect && rect.top >= -30 && rect.top < window.innerHeight - 45;
        }, null, {timeout:10000});
        await guide.locator('[data-support-journey-action="progress"]').click();
        assert.equal(new URL(page.url()).hash, "#support-progress", name + " progress anchor");
        await guide.locator('[data-support-journey-action="question"]').click();
        await root.locator("[data-support-goal-filter]").waitFor({state:"visible",timeout:10000});
        assert.equal(await root.locator("[data-support-goal-results]").count(), 0,
          name + " no duplicate guide under the editor");
        assert.deepEqual(writes, [], name + " no real mutations");
        assert.deepEqual(exceptions, [], name + " no JS exceptions");
        console.log("PASS guided recommendations " + name);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
