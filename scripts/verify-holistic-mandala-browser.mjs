/**
 * Public/guest mandala E2E: real Chromium and WebKit at iPhone widths.
 * No login, account writes, provider render, billing or uploaded personal data.
 * Uses a synthetic 1px photo and verifies the encoded locally generated sound.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

// A real, local PCM recording for native audio player + MediaRecorder E2E.
function syntheticAudioWav(seconds=3) {
  const rate=16000, samples=rate*seconds;
  const bytes=Buffer.alloc(44+samples*2);
  bytes.write("RIFF",0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write("WAVE",8);
  bytes.write("fmt ",12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);
  bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);
  bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);
  bytes.write("data",36);bytes.writeUInt32LE(samples*2,40);
  for(let i=0;i<samples;i++)bytes.writeInt16LE(
    Math.round(Math.sin(Math.PI*2*330*i/rate)*10500),44+2*i);
  return bytes;
}
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
        // Support-home visual parity is functional, not only decorative.
        const supportTop=page.locator("[data-video-support-layout]");
        await supportTop.waitFor({state:"visible",timeout:12000});
        assert.equal(await supportTop.locator('input[type="range"]').count(),4);
        const hero=page.locator("[data-video-mandala-hero]");
        await hero.waitFor({state:"visible",timeout:12000});
        assert.equal(await hero.locator('nav a, nav button').count(),4);
        assert.equal(await hero.getAttribute("data-hero-promo"),"true",
          "illustrative theme scene is visible until actual preview starts");
        assert.equal(await page.locator("[data-video-theme-toggle]").getAttribute("aria-expanded"),"false");
        assert.equal(await page.locator("#video-hero-themes").isVisible(),false);
        assert.equal(await page.locator("[data-video-hero-create]").count(),1);
        assert.equal(await page.locator("[data-video-reset-settings]").count(),1);
        await page.locator("[data-video-recommend-focus]").click();
        await page.waitForFunction(() =>
          document.querySelector('[data-video-theme="energy"]')?.getAttribute("aria-pressed")==="true",
          undefined,{timeout:9000});

        // New Talisman-style controls drive the same local renderer and settings.
        const catalog=page.locator("[data-video-catalog]");
        await catalog.waitFor({state:"visible"});
        assert.equal(await catalog.locator("[data-video-category]").count(),5);
        assert.equal(await page.locator("[data-video-catalog-filters] select").count(),3);
        await page.locator('[data-video-category="health"]').click();
        assert.equal(await page.locator('[data-video-category="health"]').getAttribute("aria-pressed"),"true");
        assert.equal(await hero.getAttribute("data-video-theme-active"),"health");
        assert.equal(await page.locator("[data-video-style]").inputValue(),"gentle-shield");
        await page.locator("[data-video-motion]").selectOption("dynamic");
        await page.locator("[data-video-length]").selectOption("30");
        assert.equal(await page.locator('[data-video-duration="30"]').getAttribute("aria-pressed"),"true");
        await page.locator('[data-video-category="energy"]').click();
        await page.locator("[data-video-style]").selectOption("green-vortex");
        assert.equal(await page.locator('[data-video-template="green-vortex"]').getAttribute("aria-pressed"),"true");
        const categoryControls=page.locator("[data-video-theme]");
        assert.equal(await categoryControls.count(),4,"exactly four actual themes");
        for(const id of ["money","energy","relationships","goals"]){
          await page.locator("[data-video-theme-toggle]").click();
          assert.equal(await page.locator("[data-video-theme-toggle]").getAttribute("aria-expanded"),"true");
          const select=page.locator('[data-video-theme="'+id+'"]');
          await select.click();
          await page.waitForFunction(key=>
            document.querySelector('[data-video-theme="'+key+'"]')?.getAttribute("aria-pressed")==="true",
            id,{timeout:10000});
          assert.equal(await page.locator("[data-video-template]").count(),4,id+" template quartet");
          assert.equal(await page.locator("[data-video-theme-toggle]").getAttribute("aria-expanded"),"false");
        }
        await page.locator("[data-video-theme-toggle]").click();
        await page.locator('[data-video-theme="money"]').click();
        await page.locator("[data-mandala-advanced] > summary").click();
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
        assert.equal(await moneyPreview.getAttribute("aria-pressed"), "true", "selecting a clip must play real motion");
        const selectedClip = firstMoney.locator('[data-mandala-scene-preview="golden-rain"]');
        await selectedClip.waitFor({ state: "visible", timeout: 20000 });
        await page.waitForFunction(() =>
          document.querySelector('[data-mandala-scene-preview="golden-rain"]')?.getAttribute("data-scene-playing") === "true",
          undefined, { timeout: 12000 });
        // The chosen template must be an ACTUAL first-party MP4 stream, not
        // a canvas or CSS loop imitating footage.
        const realSrc = await selectedClip.getAttribute("data-real-mp4");
        assert.match(realSrc || "", /^\/videos\/holistic-house\/money-films-v1\/golden-rain\.mp4$/);
        assert.equal(await selectedClip.evaluate(el => el.tagName), "VIDEO");
        await page.waitForFunction(() => {
          const video = document.querySelector('[data-mandala-scene-preview="golden-rain"]');
          return video && video.readyState >= 2 && video.videoWidth >= 500 && video.currentTime >= .15;
        }, undefined, {timeout: 30000});
        const firstTime = await selectedClip.evaluate(video => video.currentTime);
        await page.waitForTimeout(760);
        const secondTime = await selectedClip.evaluate(video => video.currentTime);
        assert.ok(secondTime > firstTime + .17, "actual H.264 video must advance in time");
        const master = page.locator('[data-mandala-master-mp4]');
        await master.waitFor({state:"attached",timeout:20000});
        assert.match(await master.getAttribute("src") || "", /money-films-v1\/golden-rain\.mp4$/);
        const cinema = page.locator("[data-mandala-cinematic-canvas]");
        await cinema.waitFor({ state: "attached" });
        const frameHash = () => cinema.evaluate(canvas => {
          const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
          let hash = 7;
          for (let i=0;i<data.length;i+=199) hash = (hash * 31 + data[i]) >>> 0;
          return hash;
        });
        const frameBefore = await frameHash();
        await page.waitForTimeout(650);
        const frameAfter = await frameHash();
        assert.notEqual(frameBefore, frameAfter, "money-frame-motion: must be animated footage, not a static poster");
        await moneyPreview.click();
        assert.equal(await moneyPreview.getAttribute("aria-pressed"), "false");
        assert.equal(await selectedClip.getAttribute("data-scene-playing"), "false");
        assert.equal(await page.locator("[data-mandala-quality] button").count(), 2);
        if (engine === "chromium" && locale === "ru" && width === 390) {
          await moneySelector.locator('button[aria-expanded]').click();
          assert.equal(await moneySelector.locator("[data-mandala-money-option]").count(), 12);
          const infinity = moneySelector.locator('[data-mandala-money-option="infinite-flow"]');
          await infinity.click();
          assert.equal(await infinity.getAttribute("aria-pressed"), "true");
        }

        // Actual free video render (one synthetic client photo). All other
        // locale/width permutations check the UI without a costly 10s render.
        const studio = page.locator("[data-mandala-free-video]");
        await studio.waitFor({ state: "visible", timeout: 15000 });
        const create = page.locator("[data-mandala-video-generate]");
        // Public iPhone control E2E: local affirmations change the live preview
        // and are included by the same canvas renderer in final recordings.
        const affirmationsPanel = page.locator("[data-video-affirmations]");
        await affirmationsPanel.waitFor({state:"visible",timeout:12000});
        assert.equal(await affirmationsPanel.locator("[data-video-affirmation-preset]").count(),5);
        assert.equal(await page.locator("[data-video-affirmations-enable]").isChecked(),false);
        await page.locator("[data-video-affirmations-enable]").check();
        await page.locator('[data-video-affirmation-preset="3"]').click();
        assert.equal(await page.locator('[data-video-affirmation-preset="3"]').getAttribute("aria-pressed"),"true");
        await page.locator('[data-video-affirmation-density="high"]').click();
        assert.equal(await page.locator('[data-video-affirmation-density="high"]').getAttribute("aria-pressed"),"true");
        await page.locator("[data-video-affirmation-frequency]").fill("3");
        await page.locator('[data-video-affirmation-visibility="small"] input').check();
        await page.locator('[data-video-affirmation-visibility="frame"] input').check();
        assert.equal(await page.locator('[data-video-affirmation-visibility="frame"] input').isChecked(),true);
        await page.locator('[data-video-affirmation-visibility="frame"] input').uncheck();
        await page.locator("[data-video-custom-affirmations]").fill("I choose a small, kind step");
        assert.match(await page.locator("[data-video-affirmations-preview]").innerText(),/5.*phrases|5.*фраз|5.*frases/i);
        assert.equal(await create.isEnabled(), false,"real photo requires permission");
        await page.locator("[data-video-photo-consent]").check();
        // Selecting a different genuine MP4 starts a new async decode.
        // Wait for the actual master canplay event rather than testing a stale state.
        await page.waitForFunction(() => {
          const button=document.querySelector("[data-mandala-video-generate]");
          const master=document.querySelector("[data-mandala-master-mp4]");
          return Boolean(button && !button.disabled && master && master.readyState >= 2);
        },undefined,{timeout:25000});
        assert.equal(await create.isEnabled(), true);
        if (engine === "chromium" && locale === "ru" && width === 390) {
          await page.locator('[data-video-aspect="landscape"]').click();
          await page.waitForFunction(()=>
            document.querySelector('[data-video-aspect="landscape"]')?.getAttribute("aria-pressed")==="true",
            undefined,{timeout:10000});
          await page.locator('[data-video-duration="10"]').click();
          await page.locator('[data-video-music="harmony"]').click();
          const nativePlayer=page.locator("[data-video-audio-player]");
          await nativePlayer.waitFor({state:"attached",timeout:10000});
          await page.waitForFunction(()=>document.querySelector("[data-video-audio-player]")?.readyState>=2,
            undefined,{timeout:10000});
          await page.locator("[data-video-music-preview]").click();
          await page.waitForFunction(()=>document.querySelector("[data-video-audio-player]")?.currentTime>.25,
            undefined,{timeout:10000});
          await page.locator("[data-video-music-preview]").click();
          await create.click();
          const videoLink = page.locator("[data-mandala-video-download]");
          await videoLink.waitFor({ state: "visible", timeout: 25000 });
          const filename = await videoLink.getAttribute("download");
          assert.match(filename || "", /^holistic-house-personal-mandala\.(webm|mp4)$/);
          const encoded=page.locator("[data-mandala-video-preview]");
          await encoded.waitFor({state:"attached",timeout:10000});
          await page.waitForFunction(()=>{
            const v=document.querySelector("[data-mandala-video-preview]");
            return v&&v.videoWidth>0&&v.videoHeight>0;
          },undefined,{timeout:20000});
          assert.deepEqual(await encoded.evaluate(v=>({width:v.videoWidth,height:v.videoHeight})),
            {width:1280,height:720},"real downloaded 16:9 video resolution");
          const [videoDownload] = await Promise.all([
            page.waitForEvent("download", { timeout: 20000 }),
            videoLink.click(),
          ]);
          assert.equal(videoDownload.suggestedFilename(), filename);
          const videoBytes = await bufferFromStream(await videoDownload.createReadStream());
          assert.ok(videoBytes.length > 10000, "generated video has a real encoded payload");
          if (filename?.endsWith(".webm")) assert.deepEqual(videoBytes.subarray(0, 4), Buffer.from([26, 69, 223, 163]));
          else assert.equal(videoBytes.subarray(4, 8).toString("utf8"), "ftyp");
          // A selected ambient track must survive the actual MediaRecorder
          // and contain audible PCM energy, not just a silent MP4/WebM header.
          const info = spawnSync("ffprobe", [
            "-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "json", "-",
          ], { input: videoBytes, encoding: "utf8" });
          assert.equal(info.status, 0, "ffprobe reads the real downloadable video: "+(info.error?.message || info.stderr));
          const streams = JSON.parse(info.stdout).streams || [];
          assert.ok(streams.some(stream => stream.codec_type === "video"), "recording has a video track");
          assert.ok(streams.some(stream => stream.codec_type === "audio"), "recording has a real audio track");

          const decoded = spawnSync("ffmpeg", [
            "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-map", "0:a:0",
            "-t", "2", "-ar", "8000", "-ac", "1", "-f", "s16le", "pipe:1",
          ], { input: videoBytes, maxBuffer: 1024 * 1024 });
          assert.equal(decoded.status, 0, "recorded audio decodes to PCM: "+decoded.stderr);
          const samples = Math.floor(decoded.stdout.length / 2);
          assert.ok(samples > 4000, "at least half a second of encoded audio");
          let energy = 0;
          for (let sample = 0; sample < samples; sample++) {
            const value = decoded.stdout.readInt16LE(sample * 2) / 32768;
            energy += value * value;
          }
          assert.ok(Math.sqrt(energy / samples) > 0.003, "recorded audio is audible, not silence");
          assert.deepEqual(uploaded, [], "video render must not POST a client photo");
        }

        // A second real browser recording tests the reusable atmospheric
        // clip that users can place underneath another video. No client
        // photo is submitted to a provider or required by this render mode.
        if (engine === "chromium" && locale === "en" && width === 390) {
          const backgroundMode = page.locator("[data-mandala-output-mode] button").nth(1);
          await backgroundMode.click();
          assert.equal(await backgroundMode.getAttribute("aria-pressed"), "true");
          await page.locator("[data-video-audio-upload]").setInputFiles({
            name:"my-local-sound.wav",mimeType:"audio/wav",buffer:syntheticAudioWav(),
          });
          await page.locator("[data-video-audio-selected]").waitFor({state:"visible",timeout:10000});
          assert.equal(await page.locator("[data-mandala-video-generate]").isEnabled(),false,
            "user-supplied audio needs explicit permission for export");
          const player=page.locator("[data-video-audio-player]");
          await player.waitFor({state:"attached",timeout:10000});
          await page.waitForFunction(()=>document.querySelector("[data-video-audio-player]")?.readyState>=2,
            undefined,{timeout:10000});
          await page.locator("[data-video-music-preview]").click();
          await page.waitForFunction(()=>document.querySelector("[data-video-audio-player]")?.currentTime>.25,
            undefined,{timeout:10000});
          await page.locator("[data-video-music-preview]").click();
          await page.locator("[data-video-audio-rights]").check();
          assert.equal(await page.locator("[data-mandala-video-generate]").isEnabled(),true);
          await page.locator("[data-mandala-video-generate]").click();
          const backgroundLink = page.locator("[data-mandala-video-download]");
          await backgroundLink.waitFor({ state: "visible", timeout: 45000 });
          const filename = await backgroundLink.getAttribute("download");
          assert.match(filename || "", /^holistic-house-money-background\.(webm|mp4)$/);
          const [backgroundDownload] = await Promise.all([
            page.waitForEvent("download", { timeout: 20000 }),
            backgroundLink.click(),
          ]);
          const backgroundBytes = await bufferFromStream(await backgroundDownload.createReadStream());
          assert.ok(backgroundBytes.length > 10000, "moving background is real video bytes");
          const fileProbe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type",
            "-of","json","-"],{input:backgroundBytes,encoding:"utf8"});
          assert.equal(fileProbe.status,0,"user audio export is a decodable media container: "+(fileProbe.error?.message || fileProbe.stderr));
          assert.ok(JSON.parse(fileProbe.stdout).streams.some(x=>x.codec_type==="audio"),
            "uploaded WAV must survive as real recorded audio track");
          const pcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0","-map","0:a:0",
            "-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
            {input:backgroundBytes,maxBuffer:1024*1024});
          assert.equal(pcm.status,0,"uploaded audio export decodes: "+pcm.stderr);
          let sum=0;
          for(let i=0;i+1<pcm.stdout.length;i+=2){const sample=pcm.stdout.readInt16LE(i)/32768;sum+=sample*sample;}
          assert.ok(pcm.stdout.length>4000 && Math.sqrt(sum/(pcm.stdout.length/2))>.02,
            "real uploaded audio is audible in finished video");
          assert.deepEqual(uploaded, [], "background video must not upload any client content");
        }

        const focus = page.locator("button[aria-pressed][class*='focusButton']");
        await focus.click();
        try {
          await page.waitForFunction(() =>
            document.querySelector("[data-mandala-focus]")?.getAttribute("data-mandala-focus") === "true",
            undefined, {timeout:12000});
        } catch {
          const diagnostic=await page.evaluate(()=>{
            const button=document.querySelector("button[class*='focusButton']");
            const wrapper=document.querySelector("[data-mandala-focus]");
            const advanced=document.querySelector("[data-mandala-advanced]");
            return {buttonPressed:button?.getAttribute("aria-pressed"),focus:wrapper?.getAttribute("data-mandala-focus"),
              advancedOpen:advanced?.hasAttribute("open"),buttonVisible:Boolean(button?.getBoundingClientRect().width)};
          });
          throw new Error(engine+" "+locale+" "+width+"px focus transition failed: "+JSON.stringify(diagnostic));
        }
        assert.equal(await page.locator("[data-mandala-focus]").getAttribute("data-mandala-focus"), "true");
        const poster = page.locator(".academy-video-poster");
        assert.equal(await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').count(), 0);
        await poster.click();
        await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').waitFor({ state: "attached", timeout: 15000 });
        await page.keyboard.press("Escape");
        await page.waitForFunction(() =>
          document.querySelector("[data-mandala-focus]")?.getAttribute("data-mandala-focus")==="false",
          undefined,{timeout:12000});
        assert.equal(await page.locator("[data-mandala-focus]").getAttribute("data-mandala-focus"), "false");

        const overflow = await page.evaluate(() => {
          const viewport = window.innerWidth;
          return {
            view: viewport,
            page: document.documentElement.scrollWidth,
            // Geometry if a native input or control regresses again.
            culprits: [...document.querySelectorAll("body *")]
              .filter(el => el instanceof HTMLElement && el.getBoundingClientRect().right > viewport + 2)
              .slice(0, 8).map(el => ({tag:el.tagName,
                className:typeof el.className==="string"?el.className.slice(0,90):"",
                right:Math.round(el.getBoundingClientRect().right)})),
          };
        });
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
