/**
 * Public/guest mandala E2E: real Chromium and WebKit at iPhone widths.
 * No login, account writes, provider render, billing or uploaded personal data.
 * Uses a synthetic 1px file and checks real local encoded video, privacy and links;
 * YouTube iframe mounting is checked, not audible sound or physical iPhone.
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "@playwright/test";

const BASE = (process.env.HH_TEST_PUBLIC_ORIGIN || "http://127.0.0.1:3100").replace(/\/$/, "");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X3fEiQAAAABJRU5ErkJggg==",
  "base64",
);

const viewports = [
  { locale: "ru", width: 320 },
  { locale: "ru", width: 390 },
  { locale: "ru", width: 430 },
  { locale: "en", width: 390 },
  { locale: "es", width: 390 },
];

const bufferFromStream = async stream => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

let passes = 0;
for (const [engine, browserType] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await browserType.launch({ headless: true });
  try {
    for (const { locale, width } of viewports) {
      const context = await browser.newContext({
        viewport: { width, height: 820 },
        isMobile: true,
        hasTouch: true,
        acceptDownloads: true,
        reducedMotion: "reduce",
      });
      try {
        const page = await context.newPage();
        const uploaded = [];
        const errors = [];
        page.on("pageerror", err => errors.push(err.message));
        page.on("request", request => {
          if (request.method() === "POST" && /(?:upload|photos|storage\/v1|\/media\/)/i.test(request.url())) {
            uploaded.push(request.url());
          }
        });
        const url = BASE + "/" + locale + "/holistic-support/mandala";
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
        assert.equal(response?.status(), 200, engine + " " + url + " must return HTTP 200");
        const imagePolicy = (response?.headers()["content-security-policy"] || "")
          .split(";").find(item => item.trim().startsWith("img-src")) || "";
        assert.match(imagePolicy, /\bblob:/, engine + " mandala CSP must allow local Blob images");
        const mediaPolicy = (response?.headers()["content-security-policy"] || "")
          .split(";").find(item => item.trim().startsWith("media-src")) || "";
        assert.match(mediaPolicy, /\bblob:/, engine + " must permit the local generated video preview");
        await page.locator("[data-mandala-meditation]").waitFor({ state: "visible", timeout: 30000 });
        const preset = page.locator('[data-mandala-preset="star"]');
        await preset.click();
        assert.equal(await page.locator("[data-selected-mandala]").getAttribute("data-selected-mandala"), "star");
        assert.equal(await preset.getAttribute("aria-pressed"), "true");

        await page.locator("#mandala-intention").fill("Calm & confidence");
        await page.locator("#mandala-photo").setInputFiles({
          name: "local-private-test.png",
          mimeType: "image/png",
          buffer: PNG,
        });
        await page.locator('img[src^="blob:"]').first().waitFor({ state: "attached", timeout: 10000 });
        await page.waitForFunction(() => {
          const photo = document.querySelector('img[src^="blob:"]');
          return photo && photo.complete && photo.naturalWidth > 0;
        }, undefined, { timeout: 15000 });
        assert.deepEqual(uploaded, [], engine + " synthetic photo must not be uploaded");

        const downloadLink = page.locator('a[download="holistic-house-mandala.png"]');
        await downloadLink.waitFor({ state: "visible", timeout: 30000 });
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 20000 }),
          downloadLink.click(),
        ]);
        assert.equal(download.suggestedFilename(), "holistic-house-mandala.png");
        const png = await bufferFromStream(await download.createReadStream());
        assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        assert.ok(png.length > 2000, engine + " PNG must include composed illustration and photo");

        const moneySelector = page.locator("[data-mandala-money-effects]");
        await moneySelector.waitFor({ state: "visible", timeout: 15000 });
        assert.equal(await moneySelector.locator("[data-mandala-money-option]").count(), 4);
        const firstMoney = moneySelector.locator('[data-mandala-money-option="golden-rain"]');
        await firstMoney.click();
        assert.equal(await firstMoney.getAttribute("aria-pressed"), "true");
        const moneyPreview = page.locator("[data-mandala-money-preview]");
        await moneyPreview.click();
        assert.equal(await moneyPreview.getAttribute("aria-pressed"), "true");
        await moneyPreview.click();
        assert.equal(await moneyPreview.getAttribute("aria-pressed"), "false");
        if (engine === "chromium" && locale === "ru" && width === 390) {
          await moneySelector.locator('button[aria-expanded]').click();
          assert.equal(await moneySelector.locator("[data-mandala-money-option]").count(), 12);
          const infinity = moneySelector.locator('[data-mandala-money-option="infinite-flow"]');
          await infinity.click();
          assert.equal(await infinity.getAttribute("aria-pressed"), "true");
        }

        // The visitor chooses concrete video parameters, not a decorative
        // animation-only UI. Photo consent blocks both record and share.
        const studio = page.locator("[data-mandala-free-video]");
        await studio.waitFor({ state: "visible", timeout: 15000 });
        await page.locator('[data-mandala-video-purpose="prosperity"]').click();
        await page.locator('[data-mandala-video-effect="magnet"]').click();
        await page.locator('[data-mandala-video-pace="normal"]').click();
        await page.locator('[data-mandala-video-strength="bright"]').click();
        await page.locator('[data-mandala-video-caption-mode="custom"]').click();
        await page.locator("#mandala-video-caption").fill("Safe personal intention");
        await page.locator('[data-mandala-video-aspect="landscape"]').click();
        await page.locator('[data-mandala-video-duration="10"]').click();
        assert.equal(await page.locator('[data-mandala-video-aspect="landscape"]').getAttribute("aria-pressed"),
          "true", engine + " 16:9 option must remain selected");
        try {
          await page.waitForFunction(() => {
            const canvas = document.querySelector("[data-mandala-free-video] canvas");
            return canvas?.width === 960 && canvas?.height === 540;
          }, undefined, { timeout: 12000 });
        } catch {
          const diagnostic = await page.evaluate(() => {
            const canvas = document.querySelector("[data-mandala-free-video] canvas");
            return {
              canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
              aspect: document.querySelector('[data-mandala-video-aspect="landscape"]')?.getAttribute("aria-pressed"),
              photo: Boolean(document.querySelector('#mandala-photo')),
              editor: Boolean(document.querySelector('[data-mandala-free-video]')),
            };
          });
          throw new Error(engine + " " + locale + " " + width + "px canvas resolution did not settle: " + JSON.stringify(diagnostic));
        }
        const canvasSize = await page.locator("[data-mandala-free-video] canvas").evaluate(canvas =>
          ({ width: canvas.width, height: canvas.height }));
        assert.deepEqual(canvasSize, { width: 960, height: 540 }, "landscape must use actual 16:9 pixels");
        const create = page.locator("[data-mandala-video-generate]");
        assert.equal(await create.isEnabled(), false, "photo requires explicit permission");
        await page.locator("[data-mandala-video-consent]").check();
        assert.equal(await create.isEnabled(), true);

        const motion = page.locator("[data-mandala-video-motion-preview]");
        await motion.click();
        assert.equal(await motion.getAttribute("aria-pressed"), "true");
        await motion.click();
        assert.equal(await motion.getAttribute("aria-pressed"), "false");

        // Real encoded video, not just static illustration. On Linux WebKit
        // the codec pack might be unavailable: require an honest fallback.
        const canRecord = await page.evaluate(() =>
          typeof MediaRecorder !== "undefined" &&
          typeof MediaRecorder.isTypeSupported === "function" &&
          typeof HTMLCanvasElement.prototype.captureStream === "function" &&
          ["video/mp4;codecs=avc1.42E01E", "video/mp4",
            "video/webm;codecs=vp8", "video/webm"].some(mime => MediaRecorder.isTypeSupported(mime)));
        if (locale === "ru" && width === 390) {
          await create.click();
          if (canRecord) {
            const videoLink = page.locator("[data-mandala-video-download]");
            await videoLink.waitFor({ state: "visible", timeout: 30000 });
            const filename = await videoLink.getAttribute("download");
            assert.match(filename || "", /^holistic-house-personal-mandala\.(webm|mp4)$/);
            const playback = page.locator("[data-mandala-video-preview]");
            await playback.waitFor({ state: "attached", timeout: 10000 });
            await page.waitForFunction(() => {
              const video = document.querySelector("[data-mandala-video-preview]");
              return video && video.readyState >= 1 && video.videoWidth > 0;
            }, undefined, { timeout: 15000 });
            const decoded = await playback.evaluate(video => ({ width: video.videoWidth, height: video.videoHeight }));
            assert.deepEqual(decoded, { width: 960, height: 540 }, engine + " encoded 16:9 content");
            const [videoDownload] = await Promise.all([
              page.waitForEvent("download", { timeout: 20000 }),
              videoLink.click(),
            ]);
            assert.equal(videoDownload.suggestedFilename(), filename);
            const videoBytes = await bufferFromStream(await videoDownload.createReadStream());
            assert.ok(videoBytes.length > 10000, "real encoded video has nonempty payload");
            if (filename?.endsWith(".webm")) assert.deepEqual(videoBytes.subarray(0, 4), Buffer.from([26, 69, 223, 163]));
            else assert.equal(videoBytes.subarray(4, 8).toString("utf8"), "ftyp");
            assert.deepEqual(uploaded, [], "no client photo or video POST on record");
          } else {
            assert.equal(await page.locator("[data-mandala-video-download]").count(), 0);
            await page.getByRole("status").filter({ hasText: /не умеет|cannot|permite/ }).first().waitFor({ state: "visible" });
          }
        }

        const focus = page.locator("button[aria-pressed][class*='focusButton']");
        await focus.click();
        assert.equal(await page.locator("[data-mandala-focus]").getAttribute("data-mandala-focus"), "true");
        const poster = page.locator(".academy-video-poster");
        assert.equal(await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').count(), 0);
        await poster.click();
        await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').waitFor({ state: "attached", timeout: 15000 });
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("[data-mandala-focus]").getAttribute("data-mandala-focus"), "false");

        const overflow = await page.evaluate(() => ({
          view: window.innerWidth,
          page: document.documentElement.scrollWidth,
        }));
        assert.ok(overflow.page <= overflow.view + 2, engine + " " + width + "px horizontal overflow: " + JSON.stringify(overflow));
        assert.deepEqual(errors, [], engine + " " + locale + " console page errors");
        console.log("PASS", engine, locale, width + "px", "HTTP 200 / synthetic photo / PNG / video iframe / focus");
        passes++;
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
assert.equal(passes, 10);
console.log("Mandala browser E2E:", passes, "of", passes, "checks passed");
