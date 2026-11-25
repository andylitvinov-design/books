// No provider writes. Browser geometry and interactions only: the YouTube
// player remains a real iframe, but remote media is blocked in isolated CI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error("Meditation browser checks may run only against loopback");
const folder = "artifacts/meditation-immersive-mobile";
await mkdir(folder, { recursive: true });
const results = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const width of [320, 390, 430]) {
        const label = engine.name() + ":" + locale + ":" + width;
        const page = await browser.newPage({
          viewport: { width, height: width === 320 ? 568 : 844 },
          isMobile: true, hasTouch: true, reducedMotion: "reduce",
        });
        const errors = [];
        page.on("pageerror", err => errors.push(err.message));
        await page.route("**/youtube-nocookie.com/**", route => route.abort("blockedbyclient"));
        try {
          const response = await page.goto(origin + "/" + locale + "/meditations", {
            waitUntil: "domcontentloaded", timeout: 60000,
          });
          assert.equal(response?.status(), 200, label + " app HTTP status");
          const app = page.locator("[data-meditation-fullscreen-app]");
          await app.waitFor({ state: "visible", timeout: 30000 });
          const geometry = await app.evaluate(node => {
            const rect = node.getBoundingClientRect();
            const css = getComputedStyle(node);
            return {
              x: rect.x, y: rect.y, width: rect.width, height: rect.height,
              overflow: css.overflow, position: css.position,
              viewport: document.documentElement.clientWidth,
            };
          });
          assert.ok(Math.abs(geometry.width - width) <= 2, label + " full screen width");
          assert.equal(geometry.position, "fixed", label + " fixed app");
          assert.equal(geometry.overflow, "hidden", label + " no vertical page scrolling inside app");
          assert.equal(await app.locator("[data-meditation-goal]").count(), 4, label + " four directions");
          const stage = app.locator("[data-meditation-player-stage]");
          const video = stage.locator("iframe");
          await video.waitFor({ state: "visible" });
          assert.match(await video.getAttribute("src"), /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?controls=1&playsinline=1&rel=0&fs=1$/,
            label + " direct native YouTube seeking player");
          const firstBox = await stage.boundingBox();
          assert.ok(firstBox && firstBox.x >= -1 && firstBox.x + firstBox.width <= width + 1,
            label + " video fills available width without clipping");
          assert.ok(Math.abs(firstBox.width / firstBox.height - 16 / 9) < 0.03,
            label + " stable 16:9 aspect ratio");
          assert.equal(await app.locator("[data-meditation-tradition]").inputValue(), "all");
          await app.locator("[data-meditation-tradition]").selectOption("egyptian");
          assert.equal(await app.locator("[data-meditation-course]").inputValue(), "osiris",
            label + " Egyptian tradition picks existing Osiris course");
          assert.equal(await app.locator("[data-meditation-recording] option").count(), 7,
            label + " seven genuine Egyptian Osiris recordings");
          await app.locator("[data-meditation-course]").selectOption("osiris");
          const firstVideo = await stage.getAttribute("data-video-id");
          const egyptBox = await stage.boundingBox();
          await app.getByRole("button", { name: locale === "ru" ? "Далее" : locale === "es" ? "Siguiente" : "Next" }).click();
          const nextVideo = await stage.getAttribute("data-video-id");
          assert.notEqual(nextVideo, firstVideo, label + " next changes YouTube source");
          const nextBox = await stage.boundingBox();
          assert.ok(egyptBox && nextBox && Math.abs(egyptBox.width - nextBox.width) <= 2 &&
            Math.abs(egyptBox.height - nextBox.height) <= 2,
            label + " player has identical geometry before/after track change");

          await app.locator("[data-meditation-tradition]").selectOption("maya");
          assert.match(await app.locator("a[href*='mysteries/maya-aztec/feathered-serpent']").first().getAttribute("href"),
            /maya-aztec\/feathered-serpent$/, label + " Maya uses real Academy route, no fake YouTube ID");
          assert.equal(await stage.locator("iframe").count(), 0, label + " never fabricates a Maya recording");
          await app.getByRole("button", { name: locale === "ru" ? "Медитации" : locale === "es" ? "Meditaciones" : "Meditations" }).click();
          assert.equal(await app.locator("[data-meditation-tradition]").inputValue(), "all");
          assert.ok(await stage.locator("iframe").count() === 1,
            label + " switching back to meditations restores verified video");
          assert.deepEqual(errors, [], label + " no React runtime exception");
          await app.screenshot({ path: folder + "/" + engine.name() + "-" + locale + "-" + width + ".png" });
          results.push({ browser: engine.name(), locale, width, player: "16:9", courses: 7, pageScroll: false });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(folder + "/results.json", JSON.stringify(results, null, 2) + "\n");
console.log("Full-screen meditation mobile interactions verified:", results.length);
