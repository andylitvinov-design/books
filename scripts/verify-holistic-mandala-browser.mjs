/**
 * Public/guest mandala E2E: real Chromium and WebKit at iPhone widths.
 * No login, account writes, provider render, billing or uploaded personal data.
 * Uses a synthetic 1px photo and verifies the encoded locally generated sound.
 */
import assert from "node:assert/strict";

import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, webkit, expect } from "@playwright/test";

const BASE = (process.env.HH_TEST_PUBLIC_ORIGIN || "http://127.0.0.1:3100").replace(/\/$/, "");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X3fEiQAAAABJRU5ErkJggg==",
  "base64",
);

const viewports = [
  { locale: "ru", width: 320 },
  { locale: "ru", width: 354 },
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
// Capture the entire synthetic guest page. Moving video/canvas content no
// longer causes Playwright to wait for locator stability or offscreen clip.
// Independent real media, accessibility and layout assertions remain mandatory.
async function captureSyntheticOverview(page, locator, path) {
  const bounds = await locator.evaluate(element => {
    element.scrollIntoView({block:"start",behavior:"instant"});
    const rect=element.getBoundingClientRect();
    return {width:rect.width,height:rect.height};
  });
  assert.ok(bounds.width>0 && bounds.height>0,'Synthetic Mandala overview must have visible bounds');
  await page.screenshot({path,fullPage:true,animations:"disabled",timeout:30000});
}

const bufferFromStream = async stream => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

let passes = 0;
// Run both real engines concurrently, but cap resource use at one isolated
// context per engine (two total); preserve all six viewports per engine.
const engines = [["webkit", webkit], ["chromium", chromium]];
const runEngine = async ([engine, browserType]) => {
  const browser = await browserType.launch({ headless: true });
  try {
    // Chromium runs its expensive RU390 MP4 export after WebKit's RU390
    // native 13-track audio checks, reducing simultaneous encoding pressure.
    const orderedViewports = engine === "chromium"
      ? [...viewports.filter(v => v.locale !== "ru" || v.width !== 390),
        ...viewports.filter(v => v.locale === "ru" && v.width === 390)]
      : viewports;
    for (const { locale, width } of orderedViewports) {
      const caseStartedAt = performance.now();
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
        // Keep the existing public site shell and native app header untouched.
        // This release changes only the central Video Studio, not site navigation.
        assert.equal(await page.locator("main[data-mandala-meditation-page]").count(),1);
        assert.equal(await page.locator("[data-support-app-header]").count(),1,
          "the original language-aware mobile navigation remains mounted");
        const quick=page.locator("[data-video-quick-builder]");
        await quick.waitFor({state:"visible",timeout:12000});

        // Real first-party video, real choices; the advanced editor is preserved
        // but must be collapsed until the visitor explicitly opens it.
        assert.equal(await quick.locator("[data-video-quick-section]").count(),3);
        assert.equal(await quick.locator("[data-video-quick-theme]").count(),6);
        assert.equal(await page.locator("[data-video-quick-legacy] [data-video-quick-section]").count(),4);
        assert.equal(await quick.locator('[data-video-quick-theme="life"] span').last().innerText(),
          {ru:"Смысл и развитие",en:"Meaning & growth",es:"Sentido y desarrollo"}[locale]);
        assert.equal(await page.locator("[data-video-quick-legacy]").getAttribute("open"),null);
        assert.equal(await quick.locator("[data-video-practice-card]").count(),3,
          "three formats share one real cinematic preview");
        assert.equal(await quick.locator("[data-video-practice-accordion]").count(),1);
        assert.equal(await quick.locator("[data-video-quality-option]").count(),9,
          "each expandable format retains its Basic / Smart / Pro choices");
        assert.equal(await quick.locator('[data-video-practice-pick="video"]').getAttribute("aria-expanded"),"true");
        assert.equal(await quick.locator('[data-video-practice-details="video"]').isVisible(),true);
        assert.equal(await quick.locator('[data-video-practice-details="meditation"]').isVisible(),false);
        assert.equal(await quick.locator('[data-video-practice-details="course"]').isVisible(),false);
        assert.equal(await quick.locator('[data-video-practice-card][data-selected="true"]').count(),1,
          "only one format card is expanded and gold-highlighted");
        assert.equal(await quick.locator("[data-video-quick-generate]").isEnabled(),true,
          "only free on-device video creation can start");
        assert.match(await quick.locator("[data-video-price-summary]").innerText(),
          /Free|Бесплатно|Gratis/,"free selected video has no fabricated credit cost");
        await quick.locator('[data-video-practice-pick="meditation"]').click();
        assert.equal(await quick.locator('[data-video-practice-details="video"]').isVisible(),false,
          "opening meditation folds video back to a small header");
        assert.equal(await quick.locator('[data-video-practice-details="meditation"]').isVisible(),true);
        assert.equal(await quick.locator('[data-video-practice-card][data-selected="true"]').count(),1);
        assert.match(await quick.locator("[data-video-price-summary]").innerText(),/\$4\.90/,
          "the user can inspect the uncharged draft Smart meditation price");
        await quick.locator('[data-video-quality-option="meditation-basic"]').click();
        assert.match(await quick.locator("[data-video-price-summary]").innerText(),/\$2\.90/,
          "the right-hand quote and total react to the quality switch");
        await quick.locator('[data-video-quality-option="meditation-smart"]').click();
        assert.match(await quick.locator('[data-video-practice-price="meditation"]').innerText(),/\$4\.90/);
        assert.equal(await quick.locator("[data-video-quick-generate]").isDisabled(),true,
          "planned meditation pricing must not enable paid checkout");
        await quick.locator('[data-video-practice-pick="course"]').click();
        assert.equal(await quick.locator('[data-video-practice-details="course"]').isVisible(),true);
        assert.equal(await quick.locator('[data-video-practice-details="meditation"]').isVisible(),false);
        assert.equal(await quick.locator('[data-video-practice-card][data-selected="true"]').count(),1);
        assert.equal(await quick.locator("[data-video-quick-generate]").isDisabled(),true,
          "eight sessions cannot be sold before real delivery");
        await quick.locator('[data-video-practice-pick="video"]').click();
        assert.equal(await quick.locator('[data-video-practice-details="course"]').isVisible(),false);
        assert.equal(await quick.locator('[data-video-practice-details="video"]').isVisible(),true);
        assert.equal(await quick.locator("[data-video-quick-generate]").isEnabled(),true);
        const livePreview=quick.locator("[data-video-quick-live-preview]");
        assert.equal(await livePreview.locator("video").count(),1,
          "the preview uses the real local MP4 master, not a fake still");
        const firstMaster=await livePreview.locator("video").getAttribute("src");
        assert.ok(firstMaster?.startsWith("/videos/holistic-house/"),
          "same-origin published first-party film master");
        const tapPlay=livePreview.locator("button");
        await tapPlay.click();
        assert.equal(await tapPlay.getAttribute("aria-pressed"),"true",
          "preview play activates actual native video");
        await tapPlay.click();
        assert.equal(await tapPlay.getAttribute("aria-pressed"),"false");
        assert.equal(await quick.locator("[data-video-quick-scene]").count(),6);
        await quick.locator("[data-video-quick-scene]").nth(1).click();
        assert.notEqual(await livePreview.locator("video").getAttribute("src"),firstMaster,
          "choosing a different scene changes the real preview video");
        await quick.locator('[data-video-quick-theme="money"]').click();
        assert.equal(await quick.locator('[data-video-quick-theme="money"]').getAttribute("aria-pressed"),"true");
        await quick.locator('[data-video-quick-theme="energy"]').click();
        await quick.locator("[data-video-quick-wish]").fill("I want to feel calmer");
        assert.equal(await page.locator("[data-video-wish]").inputValue(),"I want to feel calmer");
        assert.equal(await quick.locator("[data-video-quick-style]").count(),6);
        await quick.locator('[data-video-quick-style="1"]').click();
        assert.equal(await quick.locator('[data-video-quick-theme="energy"]').getAttribute("aria-pressed"),"true");
        // React/Next concurrent rendering can commit the shared state after
        // WebKit click() resolves. Await BOTH source button and real checkbox;
        // retain the exact on/off assertion (never skip on timeout).
        const affirmationsToggle=quick.locator("[data-video-personal-affirmations]");
        const actualAffirmations=page.locator("[data-hypno-overview-enable]");
        // The fixed iPhone dock can intersect WebKit's automatic target
        // scrolling after visual-style reflow. Place the REAL visible button
        // in the safe centre viewport before each user click. Both source and
        // deep checkbox must still update: no synthetic .evaluate(click),
        // disabled fallback or weakened release assertion.
        const placeAffirmationButton=async()=>{
          await affirmationsToggle.evaluate(element=>{
            element.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
          });
          await page.waitForFunction(()=>{
            const el=document.querySelector("[data-video-personal-affirmations]");
            if(!el)return false;
            const r=el.getBoundingClientRect();
            const dock=document.querySelector("[data-mandala-support-bottom-nav]");
            const d=dock?.getBoundingClientRect();
            const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return r.top>=4 && r.bottom<=innerHeight-4 &&
              (!d||r.bottom<=d.top-8) && (hit===el || el.contains(hit));
          },undefined,{timeout:10000});
        };
        await expect(affirmationsToggle).toHaveAttribute("aria-pressed","false",{timeout:10000});
        await placeAffirmationButton();
        await affirmationsToggle.click();
        await expect(affirmationsToggle).toHaveAttribute("aria-pressed","true",{timeout:10000});
        await expect(actualAffirmations).toBeChecked({timeout:10000});
        await placeAffirmationButton();
        await affirmationsToggle.click();
        await expect(affirmationsToggle).toHaveAttribute("aria-pressed","false",{timeout:10000});
        await expect(actualAffirmations).not.toBeChecked({timeout:10000});
        const quickOverflow=await page.evaluate(()=>({
          page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
          cards:[...document.querySelectorAll("[data-video-quick-builder] > [data-video-quick-section], [data-video-quick-builder] > [data-video-quick-tier], [data-video-quick-personal]")].map(el=>({
            width:el.getBoundingClientRect().width,x:el.getBoundingClientRect().x,
          })),
        }));
        assert.ok(quickOverflow.page<=quickOverflow.viewport+2,
          engine+" "+locale+" "+width+"px quick UI overflow "+JSON.stringify(quickOverflow));
        assert.ok(quickOverflow.cards.every(rect=>rect.width<=width+1&&rect.x>=-3));
        const touchTargets=await quick.locator(
          '[data-video-quick-theme], [data-video-practice-pick], [data-video-quick-scene], [data-video-personal-affirmations], [data-video-quick-generate]'
        ).evaluateAll(nodes=>nodes.map(el=>({
          width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
        })));
        assert.ok(touchTargets.every(rect=>rect.width>=44&&rect.height>=44),
          engine+" "+locale+" "+width+"px mobile controls need 44px targets "+JSON.stringify(touchTargets));
        if(process.env.HH_HYPNO_SCREENSHOT_DIR){
          mkdirSync(process.env.HH_HYPNO_SCREENSHOT_DIR,{recursive:true});
          await quick.screenshot({
            path:process.env.HH_HYPNO_SCREENSHOT_DIR+"/"+engine+"-"+locale+"-"+width+"-approved-studio.png",
            animations:"disabled",
          });
        }

        // Older deep features still run: the original audio attach, aspect,
        // duration and phrase tests continue under the single advanced section.
        await quick.locator('[data-video-quick-style="0"]').click();
        await page.locator("[data-video-quick-legacy] > summary").click();
        const detailed=page.locator("[data-video-quick-legacy]");
        await detailed.waitFor({state:"visible",timeout:12000});
        assert.equal(await detailed.locator("[data-video-quick-aspect]").count(),3);
        assert.equal(await detailed.locator("[data-video-quick-duration]").count(),5,
          "Director adds the 15-second option while preserving 10/20/30/60");
        assert.equal(await detailed.locator('[data-video-quick-duration="15"]').count(),1);
        await detailed.locator('[data-video-quick-duration="30"]').click();
        assert.equal(await page.locator('[data-video-duration="30"]').getAttribute("aria-pressed"),"true");
        await detailed.locator('[data-video-quick-aspect="landscape"]').click();
        assert.equal(await page.locator('[data-video-aspect="landscape"]').getAttribute("aria-pressed"),"true");
        await detailed.locator('[data-video-quick-aspect="portrait"]').click();
        await detailed.locator('[data-video-quick-phrases="ready"]').click();
        assert.equal(await page.locator("[data-hypno-overview-enable]").isChecked(),true);
        await detailed.locator('[data-video-quick-phrases="ready"]').click();
        assert.equal(await page.locator("[data-hypno-overview-enable]").isChecked(),false);
        await detailed.locator("[data-video-quick-attach]").click();
        assert.equal(await page.locator("[data-video-audio-attach]").isDisabled(),true,
          "compact attachment must apply the selected WAV to MediaRecorder");
        assert.ok((await page.locator("[data-video-audio-attached]").textContent()||"").trim().length>8,
          "the applied soundtrack name remains in the original audio editor");
        await detailed.locator("[data-video-quick-section='5'] button").filter({hasText:
          {ru:"Без звука",en:"Silent",es:"Silencio"}[locale]}).last().click();
        assert.equal(await page.locator("[data-video-audio-attach]").isDisabled(),true,
          "explicit silent selection detaches the soundtrack");
        await quick.locator("[data-video-quick-wish]").fill("");
        // Keep detail view open for pre-existing complete 8-session,
        // recording/codec, privacy and audio/voice browser acceptance.
        const picks=page.locator("[data-video-daily-picks]");
        await picks.waitFor({state:"visible",timeout:12000});
        assert.equal(await picks.locator("a").count(),4,"four actionable daily recommendations");
        for (const link of await picks.locator("a").all()) assert.ok((await link.getAttribute("href"))?.startsWith("/"+locale+"/"),
          "recommendations must link to existing localized pages");
        const supportTop=page.locator("[data-video-support-layout]");
        await supportTop.waitFor({state:"visible",timeout:12000});
        assert.equal(await supportTop.locator('input[type="range"]').count(),4);
        const therapyButton=page.locator("[data-video-therapy-toggle]");
        await therapyButton.waitFor({state:"visible",timeout:12000});
        assert.equal(await therapyButton.getAttribute("aria-pressed"),"false");
        assert.equal(await page.locator("[data-video-mode-switch]").count(),0,"removed segmented mode picker");
        const inactiveTherapyBackground=await therapyButton.evaluate(el=>getComputedStyle(el).backgroundImage);
        assert.equal(inactiveTherapyBackground,"none","ordinary video must not look therapy-active");
        assert.equal(await page.locator("[data-video-category-rail] button").count(),4);
        assert.equal(await page.locator("[data-video-photo-enabled]").isChecked(),false,
          "background-only is the default; adding a personal photo is opt-in");
        assert.equal(await page.locator("[data-video-photo-picker]").count(),1);
        // Photo and affirmation controls remain practical touch targets on
        // 320–430px real Chromium/WebKit layouts, not only CSS declarations.
        const previewTouchTargets=await page.locator(
          "[data-video-preview-choices] label, [data-video-preview-choices] button, [data-video-preview-choices] a"
        ).evaluateAll(nodes=>nodes.map(node=>({
          height:node.getBoundingClientRect().height,
          width:node.getBoundingClientRect().width,
        })));
        assert.equal(previewTouchTargets.length,4,"two opt-ins and two actionable links");
        assert.ok(previewTouchTargets.every(rect=>rect.height>=44&&rect.width>=44),
          engine+" "+locale+" "+width+"px compact video touch targets: "+JSON.stringify(previewTouchTargets));
        const hero=page.locator("[data-video-mandala-hero]");
        await hero.waitFor({state:"visible",timeout:12000});
        // Reference-state capture: the approved owner screenshot starts with
        // the default ENERGY topic, before browser QA switches to MONEY.
        if(process.env.HH_HYPNO_SCREENSHOT_DIR){
          mkdirSync(process.env.HH_HYPNO_SCREENSHOT_DIR,{recursive:true});
          await captureSyntheticOverview(page, page.locator("[data-hypno-overview]"),
            process.env.HH_HYPNO_SCREENSHOT_DIR+"/"+engine+"-"+locale+"-"+width+"-default.png");
        }
        assert.equal(await hero.locator("select").count(),0,"no filters over video");
        assert.equal(await hero.locator("p").count(),0,"video displays art, not overlaid marketing copy");
        assert.equal(await hero.locator("button").count(),1,"one prominent central Play/Pause");
        assert.equal(await hero.getAttribute("data-hero-promo"),"true");
        assert.equal(await page.locator("[data-video-hero-create]").count(),1);
        assert.equal(await page.locator("[data-video-reset-settings]").count(),1);
        assert.equal(await page.locator("[data-video-affirmations-feature]").isChecked(),false);
        await page.locator("[data-video-affirmations-feature]").check();
        assert.equal(await page.locator("[data-hypno-overview-enable]").isChecked(),true);
        await page.locator("[data-video-affirmations-feature]").uncheck();
        assert.equal(await page.locator("[data-hypno-overview-enable]").isChecked(),false);
        const heroGeometry=await hero.boundingBox();
        assert.ok(heroGeometry && heroGeometry.height <= (width<=430?255:360),
          "the film frame is compact at "+width+"px");
        const landmarks=await page.evaluate(()=>{
          const top=selector=>document.querySelector(selector)?.getBoundingClientRect().top;
          return ["[data-video-daily-picks]",
            "[data-video-support-layout]","[data-video-category-rail]",
            "[data-video-preview-choices]","[data-video-mandala-hero]",
            "[data-video-therapy-banner]","#video-templates",
            "[data-video-audio-section]","[data-video-hypnosis-section]"]
            .map(top);
        });
        assert.ok(landmarks.every(Number.isFinite),"all key video blocks must be rendered");
        for(let i=1;i<landmarks.length;i++)assert.ok(landmarks[i]>landmarks[i-1],
          engine+" "+locale+" "+width+"px hierarchy "+i+": "+landmarks);
        // Banner must activate the actual existing 8-session planner without
        // rendering, downloading, buying or contacting third-party providers.
        await page.locator("[data-video-therapy-start]").click();
        await page.locator("[data-video-guided-course]").waitFor({state:"visible",timeout:12000});
        assert.equal(await therapyButton.getAttribute("aria-pressed"),"true");
        const activeTherapyBackground=await therapyButton.evaluate(el=>getComputedStyle(el).backgroundImage);
        assert.match(activeTherapyBackground,/gradient/i,"chosen therapy entry must turn green");
        // Production-stacked local meditation: real text and downloads must use
        // the SAME six-panel editor's theme/therapy state (no paid AI calls).
        const meditation=page.locator("[data-video-personal-meditation]");
        await meditation.waitFor({state:"visible",timeout:12000});
        const writeMeditation=page.locator("[data-meditation-generate]");
        await writeMeditation.click();
        const firstScript=await page.locator("[data-meditation-script]").inputValue();
        assert.ok(firstScript.includes({ru:"ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ",en:"PERSONAL MEDITATION",es:"MEDITACIÓN PERSONAL"}[locale]),
          "the selected locale generates a real personal meditation");
        assert.equal(await page.locator("[data-meditation-method]").inputValue(),"imagery");
        await page.locator("[data-meditation-method]").selectOption("grounding");
        await page.locator("[data-meditation-length]").selectOption("12");
        await writeMeditation.click();
        const grounded=await page.locator("[data-meditation-script]").inputValue();
        assert.ok(grounded.length>firstScript.length && grounded!==firstScript,
          "meditation method and length must change the actual guidance");
        assert.ok(await page.locator("[data-meditation-listen]").isVisible(),
          "real on-device voice button must be available");
        const [meditationDownload]=await Promise.all([
          page.waitForEvent("download",{timeout:15000}),
          page.locator("[data-meditation-download]").click(),
        ]);
        assert.equal(meditationDownload.suggestedFilename(),"holistic-house-personal-meditation-"+locale+".txt");
        assert.ok((await bufferFromStream(await meditationDownload.createReadStream())).length>150,
          "downloaded UTF-8 meditation is not a decorative action");
        // Close from the adjacent in-view exit, not by scrolling thousands
        // of pixels back to an old toolbar button (flaky WebKit tap target).
        await page.locator("[data-video-therapy-exit]").click();
        try {
          await page.locator("[data-video-guided-course]").waitFor({state:"detached",timeout:12000});
        } catch(error) {
          const state=await page.evaluate(()=>({
            mode:document.querySelector("[data-video-studio-mode]")?.getAttribute("data-video-studio-mode"),
            advancedOpen:document.querySelector("[data-video-quick-legacy]")?.hasAttribute("open"),
            exit:document.querySelector("[data-video-therapy-exit]")?.outerHTML.slice(0,200),
            courseVisible:!!document.querySelector("[data-video-guided-course]"),
          }));
          throw new Error("Video therapy exit did not dismiss on first click: "+JSON.stringify(state)+" / "+String(error));
        }
        assert.equal(await therapyButton.getAttribute("aria-pressed"),"false");
        await page.locator("[data-video-advanced-filters] > summary").click();
        await page.locator("[data-video-advanced-aspect]").selectOption("landscape");
        assert.equal(await page.locator('[data-video-aspect="landscape"]').getAttribute("aria-pressed"),"true");
        await page.locator("[data-video-advanced-aspect]").selectOption("portrait");
        await page.locator("[data-video-advanced-filters] > summary").click();
        await page.locator("[data-video-recommend-focus]").click();
        assert.equal(await page.locator('[data-video-theme="energy"]').getAttribute("aria-pressed"),"true");

                // New Talisman-style controls drive the same local renderer and settings.
        const catalog=page.locator("[data-video-catalog]");
        await catalog.waitFor({state:"visible"});
        assert.equal(await page.locator("[data-video-category]").count(),6);
        await page.locator("[data-video-advanced-filters] > summary").click();
        assert.equal(await page.locator("[data-video-catalog-filters] select").count(),4);
        await page.locator('[data-video-category="health"]').click();
        assert.equal(await page.locator('[data-video-category="health"]').getAttribute("aria-pressed"),"true");
        assert.equal(await hero.getAttribute("data-video-theme-active"),"health");
        assert.equal(await page.locator("[data-video-style]").inputValue(),"calm-sea");
        await page.locator("[data-video-motion]").selectOption("dynamic");
        await page.locator("[data-video-length]").selectOption("30");
        assert.equal(await page.locator('[data-video-duration="30"]').getAttribute("aria-pressed"),"true");
        // Energy must play decoded Full HD MP4, not a still Canvas artwork.
        await page.locator('[data-video-category="energy"]').click();
        const energyTile=page.locator('[data-video-template="solar-surge"]');
        await energyTile.click();
        const energyClip=energyTile.locator('[data-mandala-scene-preview="solar-surge"]');
        assert.ok((await energyClip.getAttribute("data-real-mp4") || "").endsWith("/film-collection-v2/solar-surge.mp4"),"selected Energy tile must play actual solar-surge MP4");
        // Real users scroll the gallery into view; IntersectionObserver starts
        // muted playback only when this MP4 itself is visible on the iPhone.
        // A concurrent browser context may have scrolled the button into view
        // while leaving the video thumbnail outside the visible viewport.
        await energyClip.scrollIntoViewIfNeeded();
        await energyClip.waitFor({state:"visible",timeout:12000});
        try { await page.waitForFunction(() => {
          const video=document.querySelector('[data-mandala-scene-preview="solar-surge"]');
          return video && video.readyState >= 2 && video.videoWidth >= 1080 && video.currentTime >= .15;
        },undefined,{timeout:30000}); } catch(error) {
          console.error('MANDALA_ENERGY_PREVIEW_DIAGNOSTIC', JSON.stringify(await energyClip.evaluate(video=>({
            readyState:video.readyState, networkState:video.networkState, width:video.videoWidth,
            currentTime:video.currentTime, paused:video.paused, error:video.error?.code ?? null,
            selected:video.getAttribute('data-scene-playing'),
            rect:{x:Math.round(video.getBoundingClientRect().x),y:Math.round(video.getBoundingClientRect().y),width:Math.round(video.getBoundingClientRect().width),height:Math.round(video.getBoundingClientRect().height)}
          }))));
          throw error;
        }
        await page.locator('[data-video-category="life"]').click();
        assert.equal(await page.locator('[data-video-style]').inputValue(),"wildflower-dance");
        await page.locator('[data-video-category="energy"]').click();
        await page.locator("[data-video-style]").selectOption("green-vortex");
        assert.equal(await page.locator('[data-video-template="green-vortex"]').getAttribute("aria-pressed"),"true");
        const categoryControls=page.locator("[data-video-theme]");
        assert.equal(await categoryControls.count(),4,"four prominent choices with two more in advanced");
        for(const id of ["money","energy","relationships","goals"]){
          const select=page.locator('[data-video-theme="'+id+'"]');
          await select.click();
          await page.waitForFunction(key=>
            document.querySelector('[data-video-theme="'+key+'"]')?.getAttribute("aria-pressed")==="true",
            id,{timeout:10000});
          assert.equal(await page.locator("[data-video-template]").count(),4,id+" template quartet");
        }
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
        await page.waitForFunction(()=>document.querySelector("[data-video-photo-enabled]")?.checked===true,
          undefined,{timeout:10000});
        assert.equal(await page.locator("[data-video-photo-consent]").isChecked(),false,
          "selecting a photo must not imply permission to export it");

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
        try {
          await page.waitForFunction(() => {
            const video = document.querySelector('[data-mandala-scene-preview="golden-rain"]');
            return video && video.readyState >= 2 && video.videoWidth >= 500 && video.currentTime >= .15;
          }, undefined, {timeout: 30000});
        } catch (error) {
          const state = await selectedClip.evaluate(video => ({readyState:video.readyState,
            networkState:video.networkState,paused:video.paused,currentTime:video.currentTime,
            width:video.videoWidth,error:video.error?.code ?? null,src:video.currentSrc}));
          throw new Error(`${engine}/${locale}/${width} selected MP4 did not advance: ${JSON.stringify(state)}`, {cause:error});
        }
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
          assert.equal(await moneySelector.locator("[data-mandala-money-option]").count(), 16);
          const infinity = moneySelector.locator('[data-mandala-money-option="infinite-flow"]');
          await infinity.click();
          assert.equal(await infinity.getAttribute("aria-pressed"), "true");
        }

        // Actual free video render (one synthetic client photo). All other
        // locale/width permutations check the UI without a costly 10s render.
        const studio = page.locator("[data-mandala-free-video]");
        await studio.waitFor({ state: "visible", timeout: 15000 });
        const create = page.locator("[data-mandala-video-generate]");
        // Eight resource-imagery sessions stay within this ONE video editor.
        // Browsing and planning do not send saved tests or call a provider.
        assert.equal(await page.locator("[data-video-guided-course]").count(),0,
          "8-session module only appears in the explicitly chosen Video therapy mode");
        assert.equal(await page.locator("[data-guided-profile-consent]").count(),0,
          "private profile consent remains unmounted before opening goals");
        assert.equal(await page.locator("[data-guided-profile-import]").count(),0,
          "private test access remains hidden before choosing goals");

        // Public iPhone control E2E: local affirmations change the live preview
        // and are included by the same canvas renderer in final recordings.
        // New compact one-page UI: the deep phrase editor is only opened
        // on an explicit Edit tap; existing real renderer controls are retained.
        const compactHypno = page.locator("[data-hypno-overview]");
        await compactHypno.waitFor({state:"visible",timeout:12000});
        for(const marker of ["data-hypno-request","data-hypno-phrases","data-hypno-display","data-hypno-design","data-hypno-preview"]){
          assert.equal(await compactHypno.locator("["+marker+"]").count(),1,marker);
        }
        // Public synthetic screenshot. No signed-in profile, test answers or
        // private media is captured in CI artifacts.
        if(process.env.HH_HYPNO_SCREENSHOT_DIR){
          mkdirSync(process.env.HH_HYPNO_SCREENSHOT_DIR,{recursive:true});
          await captureSyntheticOverview(page, compactHypno,
            process.env.HH_HYPNO_SCREENSHOT_DIR+"/"+engine+"-"+locale+"-"+width+".png");
        }
        const compactHeight=await compactHypno.evaluate(el=>el.getBoundingClientRect().height);
        assert.ok(compactHeight<1250,engine+" "+locale+" "+width+"px too tall: "+compactHeight);
        assert.equal(await compactHypno.locator("[data-hypno-create-video]").isDisabled(),true);
        assert.equal(await compactHypno.locator("[data-hypno-request-edit]").getAttribute("aria-expanded"),"false");
        await compactHypno.locator("[data-hypno-phrases-edit]").click();
        const affirmationsPanel = page.locator("[data-video-affirmations]");
        await affirmationsPanel.waitFor({state:"visible",timeout:12000});
        // Guest opening is only a request to import; it never marks test
        // personalization as successful or sends a profile without consent.
        await compactHypno.locator("[data-hypno-tests]").click();
        assert.equal(await compactHypno.locator("[data-hypno-tests]").getAttribute("aria-pressed"),"false");
        assert.equal(await compactHypno.locator('a[href$="/personality-profiles"]').count(),1);
        assert.equal(await affirmationsPanel.locator("[data-video-affirmation-preset]").count(),5);
        // Hypnoaffirmations: the first thing visitors see is a truthful, compact
        // explanation and the two explicit ways to choose their phrases.
        const expectedHypnoTitle={ru:"Гипноаффирмации",en:"Hypnoaffirmations",es:"Hipnoafirmaciones"}[locale];
        assert.equal(await affirmationsPanel.locator("#video-affirmations-heading").innerText(),expectedHypnoTitle);
        assert.equal(await affirmationsPanel.locator("[data-video-hypno-intro]").count(),1);
        assert.equal(await affirmationsPanel.locator("[data-video-choice-mode] button").count(),2);
        const manualSelect=affirmationsPanel.locator("[data-video-manual-select]");
        const autoSelect=affirmationsPanel.locator("[data-video-personal-suggest]");
        assert.equal(await manualSelect.getAttribute("aria-pressed"),"true");
        assert.equal(await autoSelect.getAttribute("aria-pressed"),"false");
        await manualSelect.click();
        assert.equal(await manualSelect.getAttribute("aria-pressed"),"true");
        assert.equal(await affirmationsPanel.locator("[data-video-goals-toggle]").getAttribute("aria-expanded"),"false");
        // A short, scannable mobile panel: longer controls are collapsed until asked for.
        assert.equal(await page.locator("[data-video-affirmations-custom]").getAttribute("open"),null);
        assert.equal(await page.locator("[data-video-affirmations-settings]").getAttribute("open"),null);
        assert.ok((await affirmationsPanel.locator('[data-video-affirmation-preset="0"]').innerText()).length<=26);
        assert.equal(await compactHypno.locator("[data-hypno-phrases-edit]").getAttribute("aria-expanded"),"true");
        assert.equal(await page.locator("[data-video-affirmations-enable]").isChecked(),false);
        // The production Hypno overview is now the primary visible opt-in.
        // On WebKit, clicking the nested legacy label after a long scroll can
        // fail to toggle. Test the real customer-facing checkbox and assert
        // both the advanced module and existing video recorder reflect it.
        // The site has a fixed 70px mobile navigation dock. WebKit's
        // automatic scrollIntoViewIfNeeded can leave a checkbox under it;
        // its intercepted retry clicks may cancel each other. Position the
        // real public checkbox in the safe middle viewport before activation.
        await compactHypno.locator("[data-hypno-overview-enable]").evaluate(element=>{
          element.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
        });
        await page.waitForFunction(()=>{
          const el=document.querySelector("[data-hypno-overview-enable]");
          const dock=document.querySelector("[data-mandala-support-bottom-nav]");
          if(!el)return false;
          const r=el.getBoundingClientRect(), d=dock?.getBoundingClientRect();
          return r.top>=4 && r.bottom<=innerHeight-4 && (!d || r.bottom<=d.top-8);
        },undefined,{timeout:10000});
        await compactHypno.locator("[data-hypno-overview-enable]").check();
        assert.equal(await page.locator("[data-video-affirmations-enable]").isChecked(),true,
          "main Hypno toggle must synchronize its original deep phrase editor");
        assert.equal(await compactHypno.locator("[data-hypno-create-video]").isEnabled(),true);
        assert.equal(await page.locator("[data-video-affirmations-feature]").isChecked(),true,
          "settings and top opt-in must always stay synchronized");
        await page.locator('[data-video-affirmation-preset="3"]').click();
        assert.equal(await page.locator('[data-video-affirmation-preset="3"]').getAttribute("aria-pressed"),"true");
        await page.locator("[data-video-affirmations-settings] summary").click();
        assert.equal(await page.locator("[data-video-affirmations-settings]").getAttribute("open"),"");
        await page.locator('[data-video-affirmation-density="high"]').click();
        assert.equal(await page.locator('[data-video-affirmation-density="high"]').getAttribute("aria-pressed"),"true");
        await page.locator('[data-video-affirmation-frequency="3"]').click();
        assert.equal(await page.locator('[data-video-affirmation-frequency="3"]').getAttribute("aria-pressed"),"true");
        await page.locator('[data-video-affirmation-visibility="small"] input').check();
        await page.locator('[data-video-affirmation-visibility="frame"] input').check();
        assert.equal(await page.locator('[data-video-affirmation-visibility="frame"] input').isChecked(),true);
        await page.locator('[data-video-affirmation-visibility="frame"] input').uncheck();
        await page.locator("[data-video-affirmations-custom] summary").click();
        await page.locator("[data-video-custom-affirmations]").fill("I choose a small, kind step");
        assert.match(await page.locator("[data-video-affirmations-preview]").innerText(),/5.*phrases|5.*фраз|5.*frases/i);
        assert.equal(await page.locator("[data-video-personal-suggest]").count(),1);
        await page.locator("[data-video-goals-toggle]").click();
        assert.equal(await page.locator("[data-video-goals-toggle]").getAttribute("aria-expanded"),"true");
        await page.locator('[data-video-goal="recovery"]').click();
        await page.locator('[data-video-goal="clarity"]').click();
        assert.equal(await page.locator('[data-video-goal="recovery"]').getAttribute("aria-pressed"),"true");
        await page.locator("[data-video-goals-apply]").click();
        assert.equal(await page.locator("[data-video-affirmations-enable]").isChecked(),true);
        assert.match(await page.locator("[data-video-affirmations-preview]").innerText(),/I recharge gently|Я восстанавливаю силы|Recupero mis fuerzas/i);
        // Owner screenshot acceptance: in-place request edits affect real
        // selected words, text geometry changes use the shared recorder,
        // and the live scene rail changes the original (not a mock) scene.
        await compactHypno.locator("[data-hypno-request-edit]").click();
        await compactHypno.locator('[data-hypno-problem="1"]').click();
        // The earlier real-film test selected MONEY. Match its actual goal catalogue.
        assert.equal(await hero.getAttribute("data-video-theme-active"),"money");
        await compactHypno.locator('[data-hypno-goal="value"]').click();
        await compactHypno.locator("[data-hypno-apply-request]").click();
        assert.equal(await compactHypno.locator("[data-hypno-phrases-edit]").getAttribute("aria-expanded"),"false");
        assert.match(await compactHypno.locator("[data-hypno-preview]").innerText(),/I can seek clarity|Я могу искать ясность|Puedo buscar claridad/i);
        await compactHypno.locator("[data-hypno-display-edit]").click();
        await compactHypno.locator('[data-hypno-frequency="3"]').click();
        await compactHypno.locator('[data-hypno-size="large"]').click();
        await compactHypno.locator('[data-hypno-position="bottom"]').click();
        assert.match(await compactHypno.locator("[data-hypno-display]").innerText(),/3 (?:sec|сек|s)/);
        const firstScene=compactHypno.locator("[data-hypno-scene]").first();
        const secondScene=compactHypno.locator("[data-hypno-scene]").nth(1);
        assert.ok(await firstScene.count() && await secondScene.count());
        await secondScene.click();
        assert.equal(await secondScene.getAttribute("aria-pressed"),"true");
        await firstScene.click();
        assert.equal(await firstScene.getAttribute("aria-pressed"),"true");
        // Every editor jump is an actual navigable anchor, not a decorative tab.
        const destinations = [["design","video-templates"],["audio","video-audio"],["affirmations","video-hypnosis"]];
        for (const [tab,id] of destinations) {
          const link=page.locator('[data-video-editor-tab="'+tab+'"]');
          assert.equal(await link.getAttribute("href"),"#"+id);
          await link.click();
          // The approved six-panel editor keeps legacy tools in a collapsed
          // disclosure. These links must reveal the actual tool, not only
          // update the URL hash while the target remains hidden.
          await page.waitForFunction(() => document.querySelector('[data-video-quick-legacy]')?.open === true,
            undefined,{timeout:8000});
          try {
            await page.waitForFunction(target=>window.location.hash==="#"+target,id,{timeout:10000});
            await page.waitForFunction(target=>{
              const rect=document.getElementById(target)?.getBoundingClientRect();
              return Boolean(rect && rect.top<window.innerHeight-16 && rect.bottom>16);
            },id,{timeout:10000});
          } catch (error) {
            const diagnostic=await page.evaluate(target=>{
              const selected=document.getElementById(target);
              const link=document.querySelector('[data-video-editor-tab="'+
                ({'video-templates':'design','video-audio':'audio','video-hypnosis':'affirmations'}[target])+'"]');
              const rect=selected?.getBoundingClientRect();
              return {
                wanted:'#'+target,href:window.location.href,hash:window.location.hash,
                nativeHref:link?.getAttribute('href'),targetPresent:Boolean(selected),
                detailsOpen:document.querySelector('[data-video-quick-legacy]')?.open,
                lastReactTab:document.querySelector('[data-video-editor-nav]')?.getAttribute('data-video-current-tab'),
                rect:rect?{top:Math.round(rect.top),bottom:Math.round(rect.bottom)}:null,
                viewport:window.innerHeight,
              };
            },id);
            throw new Error(engine+" "+locale+" "+width+"px deep-tab navigation "+
              tab+" failed: "+JSON.stringify(diagnostic)+" / "+String(error));
          }
        }
        // From the bottom of Hypnoaffirmations, a single click must scroll
        // back to the main film and START its existing frame engine.
        if ((await hero.getAttribute("data-preview-playing"))==="true")
          await hero.locator("[data-video-preview-toggle]").click();
        assert.equal(await hero.getAttribute("data-preview-playing"),"false");
        await page.locator("[data-video-affirmation-preview]").click();
        await page.waitForFunction(()=>document.querySelector("[data-video-mandala-hero]")?.getAttribute("data-preview-playing")==="true",
          undefined,{timeout:10000});
        await page.waitForFunction(()=>{
          const rect=document.getElementById("video-hero")?.getBoundingClientRect();
          return rect && rect.top>-140 && rect.top<window.innerHeight-120;
        },undefined,{timeout:10000});
        assert.equal(await page.locator("[data-mandala-cinematic-canvas]").count(),1,
          "affirmation preview reuses the central video canvas");
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
        // Capture the real rendered AUDIO-ONLY section on the same public
        // guest route and iPhone viewport, without iOS browser chrome.
        if(locale==="ru"&&[320,390,430].includes(width)){
          const panel=page.locator("[data-video-audio-section]");
          const dimensions=await panel.locator("[data-video-audio-tracks] [data-video-music]").first()
            .evaluate(node=>{
              const rect=node.getBoundingClientRect(),font=getComputedStyle(node.querySelector("strong")).fontSize;
              return {height:rect.height,width:rect.width,font};
            });
          assert.ok(dimensions.height>=60 && dimensions.width>200 && parseFloat(dimensions.font)>=13,
            "readable 44px+ audio-only rows at "+width+": "+JSON.stringify(dimensions));
          const attach=await panel.locator("[data-video-audio-attach]").boundingBox();
          assert.ok(attach && attach.height>=44,
            "attach action is touch-friendly "+engine+" "+width+": "+JSON.stringify(attach));
          mkdirSync("artifacts/mandala-audio",{recursive:true});
          await panel.screenshot({path:"artifacts/mandala-audio/"+engine+"-ru-"+width+".png",
            animations:"disabled",timeout:20000});
        }
        // Regression for the owner's real iPhone screenshot: native Safari
        // displayed "Ошибка" when five presets used generated blob: WAVs.
        // Every preset must now be an actual first-party HTTP audio file
        // which WebKit can load, decode and advance after a direct user tap.
        if (locale === "ru" && width === 390) {
          // Real context-aware filter and choice flow, not decorative chips.
          await page.locator('[data-video-audio-kind="nature"]').click();
          assert.equal(await page.locator('[data-video-music="rain"]').count(),1);
          assert.equal(await page.locator('[data-video-music="prosperity"]').count(),0,
            "type filter removes unrelated tracks");
          await page.locator('[data-video-audio-mood="calm"]').click();
          assert.ok(await page.locator("[data-video-audio-tracks] [data-video-music]").count()>=2);
          await page.locator('[data-video-audio-kind="all"]').click();
          await page.locator('[data-video-audio-mood="all"]').click();
          const localFavorite=page.locator("[data-video-audio-tracks] [data-video-audio-favorite]").first();
          await localFavorite.click();
          assert.equal(await localFavorite.getAttribute("aria-pressed"),"true","local heart is a working control");
          await localFavorite.click();
          assert.equal(await localFavorite.getAttribute("aria-pressed"),"false","favorite can be undone");
          assert.equal(await page.locator("[data-video-audio-mic]").count(),1,
            "microphone recording must be an actual control, not decorative");
          assert.equal(await page.locator("[data-video-audio-attach]").count(),1,
            "a real attach action must exist on all sound selections");
          await page.locator("[data-video-audio-search]").fill("дождь");
          assert.equal(await page.locator('[data-video-audio-tracks] [data-video-music]').count(),1,
            "search filters actual localized tracks");
          await page.locator("[data-video-audio-search]").fill("");
          await page.locator("[data-video-audio-sort]").selectOption("name");
          await page.locator("[data-video-audio-sort]").selectOption("best");
          await page.locator('[data-video-audio-length="20"]').click();
          await page.locator("[data-video-audio-auto]").click();
          assert.equal(await page.locator("[data-video-audio-auto]").getAttribute("aria-pressed"),"true");
          assert.ok(await page.locator("[data-video-audio-player]").getAttribute("src"));
          await page.locator("[data-video-audio-voice]").check();
          assert.equal(await page.locator("[data-video-music-volume]").inputValue(),"30",
            "voice-friendly mode lowers soundtrack volume");
          await page.locator("[data-video-audio-voice]").uncheck();
          await page.locator("[data-video-audio-auto]").click();
          await page.locator("[data-video-audio-more]").click();
          assert.equal(await page.locator('[data-video-audio-tracks] [data-video-music]').count(),13,
            "expanded audio-only library contains all 13 original WAV tracks");
          for (const preset of ["harmony","prosperity","energy","love","meditation",
            "rain","ocean","breeze","focus","grounding","breath","sunrise","pulse"]) {
            await page.locator('[data-video-music="'+preset+'"]').click();
            const native=page.locator("[data-video-audio-player]");
            await native.waitFor({state:"attached",timeout:12000});
            const src=await native.getAttribute("src");
            assert.equal(src,"/audio/mandala/"+preset+".wav",
              "preset must not use an iOS-unreliable blob URL");
            const response=await page.request.get(BASE+src,{headers:{Range:"bytes=0-63"}});
            assert.ok([200,206].includes(response.status()),preset+" media GET/range request");
            assert.match(response.headers()["content-type"]||"",/audio\/(?:wav|x-wav)/i,
              preset+" is served with an actual WAV media MIME");
            const body=Buffer.from(await response.body());
            assert.equal(body.subarray(0,4).toString("ascii"),"RIFF",preset+" starts with WAV PCM header");
            await page.locator("[data-video-music-preview]").click();
            await page.waitForFunction(() => {
              const a=document.querySelector("[data-video-audio-player]");
              return a && a.error === null && a.readyState >= 2 && a.currentTime > .3;
            },undefined,{timeout:18000});
            const detail=await native.evaluate(a=>({
              currentTime:a.currentTime,networkState:a.networkState,error:a.error?.code||null,
              source:a.currentSrc,duration:a.duration,
            }));
            assert.equal(detail.error,null,preset+" native media error");
            assert.ok(detail.duration>=7 && detail.currentTime>.3,preset+" actually plays");
            assert.equal(await page.locator("[data-video-audio-direct]").count(),0,
              "healthy preset must not show direct-open error fallback");
            await page.locator("[data-video-music-preview]").click();
          }
          // Mock-fidelity regression: five sound filters and all 13 original
          // WAVs share exactly one real player. A row Play starts native
          // Safari-compatible media but does NOT silently attach it to video.
          assert.equal(await page.locator('[data-video-quick-section="5"] audio').count(),0,
            "the compact summary cannot duplicate the audio player");
          const directPlay=page.locator('[data-video-audio-play="harmony"]');
          await directPlay.click();
          await page.waitForFunction(()=>{
            const a=document.querySelector("[data-video-audio-player]");
            return a && a.error===null && !a.paused && a.currentTime>.2;
          },undefined,{timeout:18000});
          assert.equal(await directPlay.getAttribute("aria-pressed"),"true",
            "row playback is a real active button, not a decorative triangle");
          await directPlay.click();
          await page.waitForFunction(()=>Boolean(document.querySelector(
            "[data-video-audio-player]")?.paused),undefined,{timeout:10000});
          assert.equal(await directPlay.getAttribute("aria-pressed"),"false");
        }
        if (engine === "chromium" && locale === "ru" && width === 390) {
          await page.locator("[data-video-extra-settings] > summary").click();
          await page.locator('[data-video-aspect="landscape"]').click();
          await page.waitForFunction(()=>
            document.querySelector('[data-video-aspect="landscape"]')?.getAttribute("aria-pressed")==="true",
            undefined,{timeout:10000});
          await page.locator('[data-video-duration="10"]').click();
          await page.locator('[data-video-music="harmony"]').click();
          const attachButton=page.locator("[data-video-audio-attach]");
          assert.equal(await create.isEnabled(),false,"selecting a soundtrack must not attach it silently");
          await attachButton.click();
          assert.equal(await attachButton.isDisabled(),true,"attached soundtrack acknowledged");
          assert.match(await page.locator("[data-video-audio-attached]").innerText(),/Гармония/,
            "attached identity is separate from current audio preview");
          assert.equal(await create.isEnabled(),true,"attach unlocks real audio+video export");
          const nativePlayer=page.locator("[data-video-audio-player]");
          await nativePlayer.waitFor({state:"attached",timeout:10000});
          await page.waitForFunction(()=>document.querySelector("[data-video-audio-player]")?.readyState>=2,
            undefined,{timeout:10000});
          await page.locator("[data-video-music-preview]").click();
          await page.waitForFunction(()=>document.querySelector("[data-video-audio-player]")?.currentTime>.25,
            undefined,{timeout:10000});
          await page.locator("[data-video-music-preview]").click();
          // The approved compact green Create button must initiate a real
          // MediaRecorder session, not just the legacy Generate control.
          await page.locator("[data-hypno-create-video]").click();
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
          // A new preview choice must not change an already exported file;
          // the separate Attach action invalidates that file for a new export.
          await page.locator('[data-video-music="energy"]').click();
          assert.equal(await page.locator("[data-mandala-video-download]").count(),1,
            "preview selection leaves the already encoded video untouched");
          assert.equal(await create.isEnabled(),false);
          await page.locator("[data-video-audio-attach]").click();
          await page.locator("[data-mandala-video-download]").waitFor({state:"detached",timeout:10000});
          assert.match(await page.locator("[data-video-audio-attached]").innerText(),/Энергия/);
        }

        // A free guided-imagery first video uses the REAL first-party meadow
        // MP4 and personal goal affirmations, then the SAME local recorder and
        // downloadable playable media as the existing video studio.
        if (engine === "chromium" && locale === "ru" && width === 390) {
          await page.locator("[data-video-therapy-toggle]").click();
          assert.equal(await page.locator("[data-video-therapy-toggle]").getAttribute("aria-pressed"),"true");
          await page.locator("[data-video-guided-course]").waitFor({state:"visible",timeout:12000});
          assert.equal(await page.locator("[data-video-studio-mode]").getAttribute("data-video-studio-mode"),"therapy");
          const programmeLayout=await page.evaluate(()=>{
            const rect=selector=>document.querySelector(selector)?.getBoundingClientRect();
            return {hero:rect("#video-hero"),course:rect("#guided-video-series"),nav:rect("[data-video-editor-nav]")};
          });
          assert.ok(programmeLayout.hero && programmeLayout.course && programmeLayout.nav &&
            programmeLayout.hero.bottom<=programmeLayout.course.top &&
            programmeLayout.course.bottom<=programmeLayout.nav.top,
            "therapy programme must follow its own player directly before extra video settings");
          await page.locator("[data-video-key-difficulty]").fill("Мне трудно расслабиться");
          await page.locator("[data-video-key-goal]").fill("Я хочу больше спокойствия");
          await page.locator("[data-video-goal-accents]").click();
          const goals=page.locator("[data-video-goals-filter]");
          await goals.waitFor({state:"visible"});
          assert.equal(await goals.locator("[data-guided-goal]").count(),6);
          assert.equal(await page.locator("[data-guided-profile-consent]").isChecked(),false,
            "private profile access is strictly opt-in even after opening goals");
          assert.equal(await page.locator("[data-guided-profile-import]").isDisabled(),true,
            "saved scores require explicit consent");
          await goals.locator('[data-guided-goal="relationships"]').click();
          assert.equal(await goals.locator("[data-guided-focus-goal]").count(),12);
          await goals.locator('[data-guided-focus-goal="boundaries"]').click();
          assert.equal(await goals.locator('[data-guided-goal="relationships"]').getAttribute("aria-pressed"),"true");
          await page.locator("[data-guided-create-plan]").click();
          assert.equal(await page.locator("[data-guided-session]").count(),8);
          assert.equal(await page.locator("[data-guided-free-video]").count(),1);
          await page.locator('[data-guided-session="1"] details summary').click();
          const firstScript=await page.locator('[data-guided-session="1"] details p').innerText();
          assert.match(firstScript,/Мне трудно расслабиться/);
          assert.match(firstScript,/Я хочу больше спокойствия/);
          assert.match(firstScript,/Личные границы/);
          assert.equal(await page.locator("[data-guided-score-provenance]").count(),0,
            "no private profile imported without consent");
          // Preserve both opt-ins when applying the first free symbolic video.
          const photoBeforeGuided=await page.locator("[data-video-photo-enabled]").isChecked();
          const affirmationsBeforeGuided=await page.locator("[data-video-affirmations-feature]").isChecked();
          await page.locator("[data-guided-free-video]").click();
          await page.waitForFunction(()=>{
            const master=document.querySelector("[data-mandala-master-mp4]");
            const generate=document.querySelector("[data-mandala-video-generate]");
            return master?.getAttribute("src")?.endsWith("/meadow-morning.mp4")
              && master.readyState>=2 && Boolean(generate && !generate.disabled);
          },undefined,{timeout:30000});
          assert.equal(await page.locator('[data-video-duration="60"]').getAttribute("aria-pressed"),"true",
            "default guided course length is 60 seconds");
          assert.equal(await page.locator("[data-video-photo-enabled]").isChecked(),photoBeforeGuided,
            "guided first video preserves the visitor's photo/background choice");
          assert.equal(await page.locator("[data-video-affirmations-feature]").isChecked(),affirmationsBeforeGuided,
            "guided first video preserves the visitor's affirmations checkbox");
          // The compact Hypno editor intentionally unmounts its deep inputs
          // until the visitor opens Edit. Preserve real guided-course phrases.
          await page.locator("[data-hypno-phrases-edit]").click();
          await page.locator("[data-video-custom-affirmations]").waitFor({state:"attached"});
          assert.match(await page.locator("[data-video-custom-affirmations]").inputValue(),
            /Я открыт общению|границы|Я достоин/);
          // Keep automated media verification bounded at 10s; the default
          // 60-second duration is verified above and remains available to users.
          await page.locator('[data-video-duration="10"]').click();
          await create.click();
          const guidedDownload=page.locator("[data-mandala-video-download]");
          await guidedDownload.waitFor({state:"visible",timeout:35000});
          const [download]=await Promise.all([
            page.waitForEvent("download",{timeout:15000}),guidedDownload.click(),
          ]);
          const bytes=await bufferFromStream(await download.createReadStream());
          assert.ok(bytes.length>10000,"free symbolic meadow movie has encoded bytes");
          const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type",
            "-of","json","-"],{input:bytes,encoding:"utf8"});
          assert.equal(probe.status,0,"guided free video decodes: "+(probe.stderr||""));
          assert.ok(JSON.parse(probe.stdout).streams.some(row=>row.codec_type==="video"),
            "guided video has a real moving video track");
          assert.deepEqual(uploaded,[],"no private tests, portraits or audio were POSTed");
        }

        // A second real browser recording tests the reusable atmospheric
        // clip that users can place underneath another video. No client
        // photo is submitted to a provider or required by this render mode.
        if (engine === "chromium" && locale === "en" && width === 390) {
          const backgroundMode = page.locator("[data-video-photo-enabled]");
          await backgroundMode.uncheck();
          assert.equal(await backgroundMode.isChecked(),false);
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
          assert.equal(await page.locator("[data-mandala-video-generate]").isEnabled(),false,
            "consent without attaching must not silently export a selected file");
          await page.locator("[data-video-audio-attach]").click();
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

        // True end-to-end cinematic storyboard → 4 animated Canvas shots →
        // locally captured video bytes, never an AI API submission.
        if(engine==="chromium"&&locale==="ru"&&width===390){
          const therapy=page.locator("[data-video-therapy-toggle]");
          if(await therapy.getAttribute("aria-pressed")==="true")await therapy.click();
          await page.locator("[data-video-photo-enabled]").uncheck();
          await page.locator("[data-video-affirmations-feature]").uncheck();
          const director=page.locator("[data-cinematic-director]");
          const advanced=page.locator("[data-video-quick-legacy]");
          if(!(await advanced.evaluate(el=>el.open)))
            await advanced.locator(":scope > summary").click();
          await director.waitFor({state:"visible",timeout:12000});
          const openDirector=director.locator('button[aria-controls="cinematic-director-content"]');
          if(await director.getAttribute("data-director-open")!=="true")await openDirector.click();
          assert.equal(await director.getAttribute("data-director-open"),"true");
          assert.equal(await director.locator('[data-director-field="theme"],[data-director-field="difficulty"],[data-director-field="goal"],[data-director-field="profile"]').count(),4,
            "four compact main director fields");
          assert.equal(await director.locator("[data-director-visual-preferences] > summary").count(),1);
          await director.locator('[data-director-field="profile"]').click();
          assert.equal(await page.locator("[data-director-profile-consent]").isChecked(),false,
            "private saved test profile must remain unchecked");
          assert.equal(await page.locator("[data-director-profile-import]").isDisabled(),true,
            "private test request forbidden before explicit consent");
          await page.locator('[role="dialog"] button:has-text("Готово")').click();
          await director.locator('[data-director-field="goal"]').click();
          await page.locator('[role="dialog"] textarea').fill("PRIVATE_SCRIPT_BROKEN_IF_SENT к ясному горизонту");
          await page.locator('[role="dialog"] button:has-text("Готово")').click();
          const newVisualIdea=director.locator('[data-director-visual-idea] textarea');
          await newVisualIdea.fill("UNSENT_TOKEN_8257: белый орёл летит над горами и превращается в созвездие");
          assert.equal(await director.locator('[data-director-category]').count(),5,
            "the five question categories remain compact tabs, not five mandatory forms");
          assert.ok((await director.locator('[data-director-contextual-questions] fieldset').count())<=2,
            "a complete visual idea never expands into a 96-question form");
          await director.locator('[data-director-create-plan]').click();
          const reference=director.locator('[data-director-reference-pack]');
          assert.match(await reference.locator('[data-director-recognized-visuals]').innerText(),/ор[её]л/i);
          assert.match(await reference.locator('[data-director-new-ai-status]').innerText(),/пока недоступна/i,
            "novel eagle video must not be reported as generated by the local montage");
          assert.equal(await reference.locator('li').count(),4);
          assert.ok(!(await reference.innerText()).includes("UNSENT_TOKEN_8257"));
          const [packetDownload]=await Promise.all([
            page.waitForEvent("download",{timeout:12000}),
            director.locator('[data-director-download-packet]').click(),
          ]);
          const packet=JSON.parse((await bufferFromStream(await packetDownload.createReadStream())).toString("utf8"));
          assert.equal(packet.creativeReferencePack.recognized.subject,"eagle");
          assert.equal(packet.creativeReferencePack.recognized.action,"metamorphosis");
          assert.equal(packet.creativeReferencePack.newAiVideoAvailable,false);
          assert.equal(packet.creativeReferencePack.externalTransferApproved,false);
          assert.ok(!JSON.stringify(packet).includes("UNSENT_TOKEN_8257"));
          await newVisualIdea.fill("UNSENT_TOKEN_8257: красивая история");
          assert.equal(await director.locator('[data-director-contextual-questions] fieldset').count(),2,
            "only two contextual clarifications when subject and action are unclear");
          const customSubject=director.locator('[data-director-contextual-questions] fieldset').first().locator('input');
          await customSubject.pressSequentially('Свой герой');
          assert.equal(await customSubject.inputValue(),'Свой герой',
            'custom answer stays mounted and editable across successive keystrokes');
          await customSubject.fill('');
          await director.locator('[data-director-contextual-questions] button:has-text("Другой герой")').click();
          await director.locator('[data-director-contextual-questions] button:has-text("Животное или птица")').click();
          assert.equal(await director.locator('[data-director-contextual-questions] fieldset').count(),1,
            "a chosen animal asks only for its identity before returning to the other missing details");
          await director.locator('[data-director-contextual-questions] button:has-text("Орёл")').click();
          await director.locator('[data-director-contextual-questions] button:has-text("Путешествует")').click();
          await newVisualIdea.fill("Без орла, нет другого героя");
          assert.equal(await director.locator('[data-director-contextual-questions] fieldset').count(),1,
            "revised exclusion invalidates only the contradicted subject, preserving the action");
          assert.equal(await director.locator('[data-director-contextual-questions] button:has-text("Орёл")').getAttribute('aria-pressed'),'false');
          await director.locator('[data-director-contextual-questions] button:has-text("Волк")').click();
          const savedAnimal=director.locator('[data-director-answer="PERSONAL_07"][data-director-answer-scope="global"]');
          assert.match(await savedAnimal.innerText(),/Волк/);
          await savedAnimal.getByRole('button',{name:'Изменить'}).click();
          await savedAnimal.getByRole('button',{name:'Волк'}).click();
          assert.match(await savedAnimal.innerText(),/Волк/,'confirmed answer remains visible after editing');
          await director.locator('[data-director-create-plan]').click();
          assert.match(await director.locator('[data-director-recognized-visuals]').innerText(),/волк/i);
          assert.equal(await director.locator("[data-director-shot]").count(),4,
            "four connected first-party local video shots");
          assert.match(await director.locator('[data-director-shot="1"] > div > p').innerText(),
            /[А-Яа-яЁё]/,"Russian director shot names must use the existing localized scene catalog");
          const localizedChoices=await director.locator('[data-director-scene-choice="1"] option').allTextContents();
          assert.ok(localizedChoices.length>=2&&localizedChoices.every(s=>/[А-Яа-яЁё]/.test(s)),
            "every offered scene must be labelled in Russian, not raw English provider cues");
          const storyboardText=await director.locator("[data-director-storyboard]").innerText();
          assert.ok(!storyboardText.includes("PRIVATE_SCRIPT_BROKEN_IF_SENT"),
            "private wish must not reach exported storyboard/provider-safe prompt");
          const firstScene=director.locator('[data-director-scene-choice="1"]');
          assert.ok((await firstScene.locator("option").count())>=4,
            "original approved scene options stay available for manual editing");
          const firstBefore=await firstScene.inputValue();
          const secondScene=await director.locator('[data-director-scene-choice="2"]').inputValue();
          await firstScene.selectOption(secondScene);
          assert.equal(await firstScene.inputValue(),secondScene);
          assert.equal(await director.locator('[data-director-scene-choice="2"]').inputValue(),firstBefore,
            "reusing another scene swaps rather than duplicates it");
          await director.locator('[data-director-shot-select="1"]').click();
          assert.equal(await director.locator('[data-director-category="pro"]').getAttribute('aria-pressed'),'true',
            "a specific shot opens the Pro director rather than a second global form");
          await director.locator('[data-director-contextual-questions] button:has-text("Крупным планом")').click();
          await director.locator('[data-director-shot="1"] summary').click();
          assert.match(await director.locator('[data-director-shot="1"]').innerText(),/close-up view/i,
            "a shot-level camera choice updates its visible technical prompt only");
          await director.locator("[data-director-apply-montage]").click();
          await page.waitForFunction(()=>document.querySelector("[data-mandala-master-mp4]")===null,
            undefined,{timeout:15000});
          await page.waitForFunction(()=>
            !document.querySelector("[data-mandala-video-generate]")?.disabled,
            undefined,{timeout:15000});
          await page.locator('[data-mandala-video-generate]').click();
          const montageLink=page.locator("[data-mandala-video-download]");
          await montageLink.waitFor({state:"visible",timeout:40000});
          const [clip]=await Promise.all([
            page.waitForEvent("download",{timeout:20000}),montageLink.click(),
          ]);
          const montageBytes=await bufferFromStream(await clip.createReadStream());
          assert.ok(montageBytes.length>10000,"recorded cinematic montage is not a storyboard screenshot");
          // Verify the downloaded file contains genuinely different moving
          // visual stages, not a 4-card storyboard wrapped in a movie container.
          const shotFrame=at=>spawnSync("ffmpeg",["-v","error","-i","pipe:0",
            "-ss",String(at),"-frames:v","1","-vf","scale=48:48",
            "-pix_fmt","rgb24","-f","rawvideo","pipe:1"],
            {input:montageBytes,maxBuffer:1024*1024});
          const firstStage=shotFrame(2),lastStage=shotFrame(18);
          assert.equal(firstStage.status,0,"storyboard first shot must decode from actual MP4/WebM");
          assert.equal(lastStage.status,0,"storyboard last shot must decode from actual MP4/WebM");
          // A 16px thumbnail erases the fine, intentional differences between
          // adjacent calm scenes. Use a still-tiny 48px probe so this remains
          // an encoded-movie assertion rather than a storyboard-only check.
          assert.equal(firstStage.stdout.length,6912);
          assert.equal(lastStage.stdout.length,6912);
          const pixelDifference=firstStage.stdout.reduce((sum,color,index)=>
            sum+Math.abs(color-lastStage.stdout[index]),0);
          assert.ok(pixelDifference>1800,"first and fourth real encoded scenes must differ: "+pixelDifference);
          const montageProbe=spawnSync("ffprobe",["-v","error","-show_entries",
            "stream=codec_type","-of","json","-"],{input:montageBytes,encoding:"utf8"});
          assert.equal(montageProbe.status,0,"cinematic montage media decodes");
          assert.ok(JSON.parse(montageProbe.stdout).streams.some(s=>s.codec_type==="video"));
          assert.deepEqual(uploaded,[],"no client photo/wish or render was uploaded to a provider");
          await director.getByRole('button',{name:'60 сек',exact:true}).click();
          await director.locator('[data-director-create-plan]').click();
          assert.equal(await director.locator('[data-director-shot]').count(),6,
            'a 60-second storyboard contains six scenes');
          assert.match(await director.locator('[data-director-storyboard] h4').innerText(),/60 сек/);
          await director.locator('[data-director-category="advanced"]').click();
          const moreQuestions=director.getByRole('button',{name:'Показать ещё вопросы',exact:true});
          await moreQuestions.click();
          assert.ok(await director.locator('[data-director-contextual-questions] fieldset').count()>4,
            'later optional creative questions are reachable without answering earlier ones');
          await director.locator('[data-director-category="principal"]').click();
          const durationQuestion=director.locator('fieldset').filter({hasText:'Какой длины нужен ролик?'});
          await durationQuestion.getByRole('button',{name:'30 секунд',exact:true}).click();
          assert.equal(await director.getByRole('button',{name:'30 сек',exact:true}).getAttribute('aria-pressed'),'true');
          await director.getByRole('button',{name:'60 сек',exact:true}).click();
          await director.locator('[data-director-create-plan]').click();
          assert.equal(await director.locator('[data-director-shot]').count(),6,
            'the latest duration control overrides an earlier question answer');
          await newVisualIdea.fill('Белый орёл летит над горами, на 30 секунд');
          assert.equal(await director.getByRole('button',{name:'30 сек',exact:true}).getAttribute('aria-pressed'),'true',
            'duration stated in the brief updates the existing duration control');
          await director.locator('[data-director-create-plan]').click();
          assert.match(await director.locator('[data-director-storyboard] h4').innerText(),/30 сек/);
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

        // Owner's iPhone regression: a single, functional Support dock is
        // shared with the local video editor, never a second legacy nav.
        const dock = page.locator("[data-mandala-support-bottom-nav]");
        await dock.waitFor({state:"visible",timeout:10000});
        assert.equal(await dock.count(),1,engine+" exactly one Support dock");
        assert.equal(await dock.locator("a").count(),4,engine+" four canonical links");
        assert.equal(await dock.locator('button[aria-controls="mandala-support-settings"]').count(),1,
          engine+" one settings button");
        assert.equal(await page.locator('nav[aria-current="page"]').count(),0,
          engine+" no duplicate legacy editor dock");

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
        passes++;
        console.log("PASS", engine, locale, width + "px", "HTTP 200 / synthetic photo / PNG / video iframe / focus",
          "elapsed", ((performance.now() - caseStartedAt) / 1000).toFixed(1) + "s");
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
};
// Both engines finish before result handling; never waive a failed browser.
const engineResults = await Promise.allSettled(engines.map(runEngine));
const rejectedEngines = engineResults.filter(result => result.status === "rejected");
if (rejectedEngines.length) {
  throw new AggregateError(rejectedEngines.map(result => result.reason),
    "Mandala real Chromium/WebKit E2E failed; no engine is waived");
}
assert.equal(passes, viewports.length * engines.length,
  "Every language, viewport and real browser engine must pass");
console.log("Mandala browser E2E:", passes, "of", viewports.length * engines.length, "checks passed");

