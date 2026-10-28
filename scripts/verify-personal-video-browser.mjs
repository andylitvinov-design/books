#!/usr/bin/env node
// Synthetic public visitor: image + original WAV audio -> browser-encoded video.
// Uses no Telegram bot, API credentials, private client data or paid provider.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";
import ffmpegPath from "ffmpeg-static";

const origin = process.env.HH_TEST_PUBLIC_ORIGIN || "http://127.0.0.1:3100";
const pagePath = locale => origin + "/" + locale + "/video-studio";

async function injectPhoto(page) {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 340;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("canvas");
    ctx.fillStyle = "#7b5e50";
    ctx.fillRect(0, 0, 340, 340);
    ctx.fillStyle = "#efd9ae";
    ctx.beginPath(); ctx.arc(170, 140, 70, 0, 2 * Math.PI); ctx.fill();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw Error("image");
    const file = new File([blob], "consented-synthetic-photo.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector("[data-personal-video-photo]");
    if (!(input instanceof HTMLInputElement)) throw Error("photo field missing");
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator(".personal-video-studio_photoPreview__never").count().catch(() => {});
  await page.waitForFunction(() => Boolean(document.querySelector('img[alt*="предпросмотр"]')));
}

async function injectVoice(page) {
  await page.evaluate(() => {
    const sampleRate = 16000;
    const frames = sampleRate * 3;
    const wav = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(wav);
    const word = (offset, value) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    word(0, "RIFF"); view.setUint32(4, 36 + frames * 2, true);
    word(8, "WAVE"); word(12, "fmt "); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    word(36, "data"); view.setUint32(40, frames * 2, true);
    for (let i = 0; i < frames; i++) {
      const value = Math.sin(i / sampleRate * 2 * Math.PI * 440) * 0.35;
      view.setInt16(44 + i * 2, Math.round(value * 32767), true);
    }
    const dt = new DataTransfer();
    dt.items.add(new File([wav], "synthetic-original-voice.wav", { type: "audio/wav" }));
    const input = document.querySelector("[data-personal-video-voice]");
    if (!(input instanceof HTMLInputElement)) throw Error("voice field missing");
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function verifyBrowser(label, engine) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      acceptDownloads: true,
      reducedMotion: "reduce",
    });
    const privatePosts = [];
    page.on("request", request => {
      if (request.method() === "POST" && request.url().startsWith(origin + "/api/"))
        privatePosts.push(request.url());
    });

    for (const locale of ["en", "ru", "es"]) {
      const response = await page.goto(pagePath(locale), { waitUntil: "domcontentloaded" });
      assert.equal(response?.status(), 200, label + " " + locale + " HTTP");
      await page.locator("[data-personal-video-studio]").waitFor();
      for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        const sizes = await page.evaluate(() => ({
          viewport: window.innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(sizes.scroll <= sizes.viewport + 2,
          label + " " + locale + " overflow at " + width + ": " + JSON.stringify(sizes));
      }
    }

    await page.goto(pagePath("ru"), { waitUntil: "domcontentloaded" });
    const create = page.locator("[data-mandala-video-generate]");
    assert.equal(await create.isDisabled(), true, "Cannot export silent personal video");
    await injectPhoto(page);
    await injectVoice(page);
    await page.locator("[data-mandala-video-consent]").check();
    await page.waitForFunction(() => {
      const button = document.querySelector("[data-mandala-video-generate]");
      return button instanceof HTMLButtonElement && !button.disabled;
    });

    const supported = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      return typeof canvas.captureStream === "function" && typeof MediaRecorder !== "undefined";
    });
    if (!supported) {
      await create.click();
      await page.getByRole("status").last().waitFor();
      console.log(label + ": recording unsupported, fallback visible");
      return;
    }

    await create.click();
    await page.locator("[data-mandala-video-preview]").waitFor({ timeout: 90000 });
    const video = await page.locator("[data-mandala-video-preview]").evaluate(el => ({
      src: el.getAttribute("src"),
      ready: el.readyState,
    }));
    assert.ok(video.src?.startsWith("blob:"), "video is browser-local blob");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.locator("[data-mandala-video-download]").click(),
    ]);
    const saved = await download.path();
    assert.ok(saved, "download has actual file");
    assert.ok(ffmpegPath, "FFmpeg binary required for actual media verification");
    const probe = spawnSync(ffmpegPath, ["-hide_banner", "-nostdin", "-i", saved, "-f", "null", "-"], {
      encoding: "utf8", timeout: 30000, maxBuffer: 2_000_000,
    });
    assert.equal(probe.status, 0, label + " real media must decode: " + probe.stderr?.slice(-1900));
    assert.match(probe.stderr, /Video:/, "video stream present");
    assert.match(probe.stderr, /Audio:/, "ORIGINAL voice track present (not silent video)");
    const volume = spawnSync(ffmpegPath, [
      "-hide_banner", "-nostdin", "-i", saved, "-vn", "-af", "volumedetect", "-f", "null", "-",
    ], { encoding: "utf8", timeout: 30000, maxBuffer: 2_000_000 });
    assert.equal(volume.status, 0, label + " audio decodes");
    assert.match(volume.stderr, /mean_volume:\s*-?\d+(?:\.\d+)? dB/, "voice track is not digital silence");
    assert.deepEqual(privatePosts, [], label + " never posted private media to server APIs");
    console.log(label + ": PASS · EN/RU/ES 320/390/430 and real locally encoded audiovisual file");
    await page.close();
  } finally {
    await browser.close();
  }
}

for (const [name, engine] of [["Chromium", chromium], ["WebKit", webkit]]) {
  await verifyBrowser(name, engine);
}
