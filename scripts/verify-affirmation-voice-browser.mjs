/**
 * Mocked-Gemini E2E: real Next UI and actual client WAV handling without API
 * credentials, provider billing or customer data. NOT a provider E2E claim.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdirSync} from "node:fs";
import {chromium,webkit,expect} from "@playwright/test";
import {verifyGuidedPractices} from "./verify-mandala-practices-browser.mjs";

const BASE=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
function wav(seconds=3) {
  const rate=24000,n=rate*seconds,b=Buffer.alloc(44+n*2);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);b.write("fmt ",12);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*280/rate)*8000),44+i*2);
  return b;
}
// Linux WebKit often lacks Canvas capture codecs. Run the very same real
// encoded video+audio acceptance on macOS WebKit and Linux Chromium.
// The default still exercises BOTH engines for developer/manual runs.
const requestedEngine=process.env.HH_VOICE_E2E_ENGINE||"both";
assert.ok(["both","webkit","chromium"].includes(requestedEngine),"unknown test browser");
// Test a real native window/compositor on macOS WebKit only; Chromium stays headless.
// This flag never relaxes downloaded media, PCM, consent or privacy assertions.
const headedWebKit=requestedEngine==="webkit" && process.env.HH_VOICE_E2E_HEADED==="1";
if(process.env.HH_VOICE_E2E_HEADED==="1"){
  assert.equal(requestedEngine,"webkit","headed media acceptance is WebKit-only");
  assert.equal(process.platform,"darwin","headed WebKit acceptance requires macOS");
}
// Fail closed with evidence instead of consuming the entire macOS runner quota.
// Actual encoded 10-second voice video should not run indefinitely.
let lastPhase="not-started";
const phase=(engine,stage)=>{lastPhase=engine+":"+stage;console.log("VOICE_E2E_PHASE "+lastPhase);};
// A frozen WebKit renderer can make page.evaluate or browser.close wait forever.
// Playwright's default action timeout does NOT cover page.evaluate. Keep the
// real-media acceptance red, but surface the original recorder failure promptly.
const withDeadline=(work,ms,label)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error(label+" timed out after "+ms+"ms")),ms);
  Promise.resolve(work).then(
    value=>{clearTimeout(timer);resolve(value);},
    error=>{clearTimeout(timer);reject(error);}
  );
});
const watchdog=setTimeout(()=>{
  console.error("VOICE_E2E_WATCHDOG_TIMEOUT engine="+requestedEngine+" elapsed_seconds=360 last_phase="+lastPhase);
  process.exit(1);
},360000);
for(const [engine,browserType] of [["webkit",webkit],["chromium",chromium]]
  .filter(([name])=>requestedEngine==="both"||name===requestedEngine)) {
  phase(engine,"launch");
  const browser=await browserType.launch({headless:!(engine==="webkit" && headedWebKit)});
  try {
    const locale=engine==="webkit"?"ru":"en";
    const context=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true,serviceWorkers:"block"});
    // Playwright has no default action timeout: an obscured iPhone control can
    // otherwise hang until the six-minute process watchdog with no locator.
    context.setDefaultTimeout(25000);
    context.setDefaultNavigationTimeout(90000);
    try{
      if(process.env.HH_VOICE_SKIP_GUIDED_PRACTICES==="1"){
        // The workflow runs dedicated consent-only WebKit acceptance separately.
        // Real encoded voice/video media acceptance continues below.
        phase(engine,"guided-practices-skipped-by-exact-ci-only-policy");
      }else{
        phase(engine,"guided-practices-mobile");
        await verifyGuidedPractices({browser,base:BASE,engine});
        phase(engine,"guided-practices-passed");
      }
      const page=await context.newPage();
      const payloads=[];
      const errors=[];
      const requests=[];
      page.on("request",req=>{if(req.url().includes("/api/holistic-support/voice"))requests.push({method:req.method(),url:req.url()});});
      page.on("requestfailed",req=>{if(req.url().includes("/api/holistic-support/voice"))errors.push("network:"+req.method()+":"+req.failure()?.errorText);});
      page.on("pageerror",e=>errors.push(e.message));
      page.on("console",msg=>{
        const code=msg.text();
        if(code.startsWith("HH_WEBKIT_MP4_EXPORT_FAILURE:"))errors.push(code);
      });
      page.on("crash",()=>phase(engine,"page-crashed"));
      await page.route("**/api/holistic-support/voice",async route=>{
        const req=route.request();
        if(req.method()==="GET"){
          await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,publicAffirmationsEnabled:true,languages:["ru","en","es"]})});
          return;
        }
        const body=req.postDataJSON();
        payloads.push(body);
        await route.fulfill({status:200,contentType:"audio/wav",body:wav()});
      });
      phase(engine,"navigate");
      await page.goto(BASE+"/"+locale+"/holistic-support/mandala",{waitUntil:"domcontentloaded",timeout:90000});
      await page.locator("[data-video-quick-builder]").waitFor({state:"visible",timeout:25000});
      phase(engine,"editor-ready");
      // A real visitor sets duration in the visible Music panel, then moves to
      // the visible Phrases workspace. The deprecated legacy disclosure is
      // intentionally hidden; tests must not click an invisible summary.
      await page.locator('[data-video-quick-control="video"]').click();
      const advancedToggle=page.locator("[data-video-advanced-toggle]");
      if(await advancedToggle.isVisible() && await advancedToggle.getAttribute("aria-expanded")==="false")
        await advancedToggle.click();
      const musicSettings=page.locator("[data-video-audio-details]");
      await musicSettings.waitFor({state:"visible",timeout:25000});
      // A previously opened disclosure must not be toggled closed. Exercise
      // the actual visible 10 s control, not a hidden legacy copy.
      if(await musicSettings.getAttribute("open")===null)
        await musicSettings.locator(":scope > summary").click();
      const lengthButton=musicSettings.locator('[data-video-audio-length="10"]');
      await lengthButton.waitFor({state:"visible",timeout:25000});
      await lengthButton.click();
      await page.locator('[data-video-quick-control="phrases"]').click();
      const phrases=page.locator('[data-workspace-section="phrases"][data-video-quick-phrases]');
      await phrases.waitFor({state:"visible"});
      // Owner-approved Phrases: measure the actual DOM in three iPhone widths.
      // These checks fail on double-row tabs, a tall portrait player or overflow.
      for(const width of [320,390,430]){
        phase(engine,"phrases-geometry-"+width);
        await page.setViewportSize({width,height:840});
        const measured=await page.evaluate(()=>{
          const nav=document.querySelector("[data-video-quick-controls]");
          const stage=document.querySelector("[data-video-mandala-hero]");
          const tabs=[...nav.querySelectorAll("button")].map(node=>{
            const rect=node.getBoundingClientRect();
            return {top:rect.top,bottom:rect.bottom};
          });
          const rect=stage.getBoundingClientRect();
          return {tabs,navBottom:nav.getBoundingClientRect().bottom,
            stageTop:rect.top,ratio:rect.width/rect.height,
            documentWidth:document.documentElement.scrollWidth,
            viewportWidth:document.documentElement.clientWidth};
        });
        assert.equal(measured.tabs.length,6,"six workspace tabs: "+width);
        assert.ok(measured.tabs.every(t=>Math.abs(t.top-measured.tabs[0].top)<3),
          "single row of six tabs: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.navBottom<=measured.stageTop+2,
          "tabs above video: "+width+" "+JSON.stringify(measured));
        assert.ok(Math.abs(measured.ratio-16/9)<.18,
          "video is 16:9: "+width+" "+JSON.stringify(measured));
        assert.ok(measured.documentWidth<=measured.viewportWidth+2,
          "no horizontal overflow: "+width+" "+JSON.stringify(measured));
        if(engine==="chromium"){
          mkdirSync("artifacts/hypno-compact",{recursive:true});
          await page.screenshot({path:"artifacts/hypno-compact/phrases-"+locale+"-"+width+".png",fullPage:true});
        }
      }
      await page.setViewportSize({width:390,height:840});
      for(const name of ["tone","focus","length"])
        await expect(phrases.locator("[data-hypno-select-"+name+"]")).toBeVisible();
      await phrases.locator("[data-hypno-select-tone]").selectOption("balanced");
      await phrases.locator("[data-hypno-select-focus]").selectOption("confidence");
      await phrases.locator("[data-hypno-select-length]").selectOption("short");

      // The current Phrases workspace uses the canonical Hypno phrase cards,
      // not the retired data-video-quick-affirmation buttons.
      const readyPhrases=phrases.locator('[data-hypno-ready]');
      await readyPhrases.click();
      await expect(readyPhrases).toHaveAttribute("aria-pressed","true");
      const chosenPhrase=phrases.locator('[data-hypno-phrase="0"]');
      await expect(chosenPhrase).toHaveAttribute("aria-pressed","true");
      // Exercise the real visitor's individual phrase selection twice and
      // ensure the approved text is actually restored before TTS submission.
      await chosenPhrase.click();
      await expect(chosenPhrase).toHaveAttribute("aria-pressed","false");
      await chosenPhrase.click();
      await expect(chosenPhrase).toHaveAttribute("aria-pressed","true");
      // Reproduction of the phone screenshot: unsaved phrase edits block
      // narration generation, NOT male/female selection or voice previews.
      await expect(page.locator("[data-hypno-pending]")).toBeVisible();
      const chooserPending=page.locator("[data-video-affirmation-voice-select]");
      await expect(chooserPending.locator('[data-video-affirmation-gender="male"]')).toBeEnabled();
      await chooserPending.locator('[data-video-affirmation-gender="male"]').click();
      await chooserPending.locator('[data-video-affirmation-voice-card="leon"]').click();
      await expect(chooserPending.locator('[data-video-affirmation-voice-card="leon"]')).toHaveAttribute("aria-pressed","true");
      const previewButton=chooserPending.locator('[data-video-affirmation-voice-preview="leon"]');
      await expect(previewButton).toBeEnabled();
      await previewButton.click();
      await expect(page.locator('[data-video-affirmation-sample-ready] audio')).toBeVisible({timeout:30000});
      const preview=payloads.find(item=>item.mode==="sample"&&item.voiceId==="leon");
      assert.ok(preview,"actual male sample request reaches the TTS route");
      assert.equal(preview.language,locale);
      assert.ok(!("text" in preview)&&!("consent" in preview),"fixed public samples contain no private script");
      await chooserPending.locator('[data-video-affirmation-gender="female"]').click();
      await expect(page.locator("[data-video-affirmation-sample-ready]")).toHaveCount(0);
      await expect(chooserPending.locator('[data-video-affirmation-voice-card="maya"]')).toHaveAttribute("aria-pressed","true");
      await expect(page.locator("[data-video-generate-affirmation-audio]")).toBeDisabled();
      // Only the explicit phrase approval unlocks private narration.
      await page.locator("[data-hypno-approve]").click();
      await page.locator("[data-video-affirmation-voice]").waitFor({state:"visible"});
      // Record two independent browser-local tracks using the real
      // MediaRecorder and a deterministic WebAudio microphone fixture.
      const ownMode=page.locator('[data-video-affirmation-gender="own"]');
      await expect(ownMode).toBeEnabled();
      await ownMode.click();
      const ownPanel=page.locator("[data-video-own-voice]");
      await expect(ownPanel).toBeVisible();
      await expect(page.locator('[data-video-affirmation-voice-card="maya"]')).toBeHidden();
      const beforeOwnRequests=payloads.length;
      if(engine==="chromium"){
        const available=await page.evaluate(()=>{
          if(!navigator.mediaDevices||typeof MediaRecorder==="undefined"||
            !["audio/mp4","audio/webm;codecs=opus","audio/webm"].some(
              type=>MediaRecorder.isTypeSupported(type)))return false;
          const ctx=new AudioContext(),tone=ctx.createOscillator(),
            gain=ctx.createGain(),destination=ctx.createMediaStreamDestination();
          gain.gain.value=.2;tone.frequency.value=330;
          tone.connect(gain);gain.connect(destination);tone.start();
          Object.defineProperty(navigator.mediaDevices,"getUserMedia",{
            configurable:true,value:async()=>destination.stream.clone()});
          window.__hhSyntheticMic={ctx,tone};
          return true;
        });
        assert.ok(available,"real Chromium audio MediaRecorder is available");
        const record=ownPanel.locator("[data-video-own-voice-record]");
        for(let count=1;count<=2;count++){
          await record.click();
          await expect(record).toHaveAttribute("aria-pressed","true");
          await page.evaluate(()=>window.__hhSyntheticMic.ctx.resume());
          await page.waitForTimeout(900);
          await record.click();
          await expect(ownPanel.locator("[data-video-own-voice-track]")).toHaveCount(count,{timeout:15000});
        }
        const tracks=ownPanel.locator("[data-video-own-voice-track]");
        const file=await tracks.nth(1).locator("audio").evaluate(async audio=>{
          const blob=await fetch(audio.src).then(res=>res.blob());
          return {size:blob.size,type:blob.type};
        });
        assert.ok(file.size>128&&file.type.startsWith("audio/"),
          "real MediaRecorder wrote a playable local file "+JSON.stringify(file));
        await tracks.nth(1).locator("[data-video-own-voice-attach]").click();
        await expect(page.locator("[data-video-live-audio]")).toContainText("holistic-house-voice-2");
        // Confirm the chosen recorded track survives the ACTUAL local MP4/WebM
        // export. Reading a selection badge or blob URL is not E2E evidence.
        await page.locator('[data-video-quick-control="editor"]').click();
        const ownCreate=page.locator("[data-video-quick-generate]");
        await expect(ownCreate).toBeEnabled({timeout:30000});
        await ownCreate.click();
        const ownDownload=page.locator("[data-mandala-video-download]");
        await ownDownload.waitFor({state:"visible",timeout:45000});
        const [ownFile]=await Promise.all([
          page.waitForEvent("download",{timeout:20000}),ownDownload.click(),
        ]);
        const ownBytes=[];
        for await(const chunk of await ownFile.createReadStream())
          ownBytes.push(Buffer.from(chunk));
        const ownedVideo=Buffer.concat(ownBytes);
        assert.ok(ownedVideo.length>10000,"recorded personal voice produced a real movie");
        const ownProbe=spawnSync("ffprobe",["-v","error",
          "-show_entries","stream=codec_type","-of","json","-"],
          {input:ownedVideo,encoding:"utf8",timeout:15000});
        assert.equal(ownProbe.status,0,"own-voice movie decodes: "+ownProbe.stderr);
        const ownStreams=JSON.parse(ownProbe.stdout).streams.map(x=>x.codec_type);
        assert.ok(ownStreams.includes("video")&&ownStreams.includes("audio"),
          "personal track exported as a real movie with audio");
        const ownPcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0",
          "-map","0:a:0","-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:ownedVideo,maxBuffer:1024*1024,timeout:20000});
        assert.equal(ownPcm.status,0,"own-voice audio decodes: "+ownPcm.stderr);
        assert.ok(ownPcm.stdout.some(byte=>byte!==0),"recorded voice is audible, not silent");
        phase(engine,"own-voice-encoded-video-passed");
        await page.locator('[data-video-quick-control="phrases"]').click();
        await expect(ownPanel).toBeVisible();

        await tracks.nth(1).locator("button").last().click();
        await expect(tracks).toHaveCount(1);
        await expect(page.locator("[data-video-live-audio]")).toHaveCount(0);
        await tracks.nth(0).locator("[data-video-own-voice-attach]").click();
        await expect(page.locator("[data-video-live-audio]")).toContainText("holistic-house-voice-1");
        await tracks.nth(0).locator("button").last().click();
        await expect(tracks).toHaveCount(0);
        await expect(page.locator("[data-video-live-audio]")).toHaveCount(0);
        await page.evaluate(async()=>{
          const mic=window.__hhSyntheticMic;
          if(mic){mic.tone.stop();await mic.ctx.close();}
        });
      }
      assert.equal(payloads.length,beforeOwnRequests,"local voice cannot leak to a TTS provider");
      await page.locator('[data-video-affirmation-gender="female"]').click();
      await expect(ownPanel).toBeHidden();
      // Original TTS review and balance controls are intentionally collapsed
      // by the owner-approved Phrases UI, rather than appearing as video presets.
      await page.locator("[data-video-affirmation-transcript-review] > summary").click();
      await page.locator("[data-video-affirmation-voice-advanced] > summary").click();

      assert.equal(await page.locator("[data-video-generate-affirmation-audio]").isDisabled(),true);
      const transcript=await page.locator("[data-video-affirmation-spoken-text]").innerText();
      assert.ok(await page.locator("[data-video-affirmation-spoken-text]").isVisible(),"review wording is readable on request");
      assert.ok(transcript.length>5,"should speak actual selected affirmations");
      const chooser=page.locator("[data-video-affirmation-voice-select]");
      assert.equal(await chooser.locator("[data-video-affirmation-voice-card]").count(),3);
      await chooser.locator('[data-video-affirmation-gender="male"]').click();
      assert.equal(await chooser.locator("[data-video-affirmation-voice-card]").count(),3);
      await chooser.locator('[data-video-affirmation-gender="female"]').click();
      await expect(chooser.locator('[data-video-affirmation-voice-card="maya"]')).toHaveAttribute("aria-pressed","true");
      await page.locator("[data-video-affirmation-bed]").selectOption("ocean");
      await page.locator("[data-video-affirmation-voice-consent]").check();
      await page.locator("[data-video-generate-affirmation-audio]").click();
      try {
        await page.locator("[data-video-affimations-audio-ready]").waitFor({state:"visible",timeout:30000});
        phase(engine,"voice-wav-ready");
      }catch(error){
        const status=await page.locator('[data-video-affirmation-voice] [role="status"]').allTextContents();
        const buttonDisabled=await page.locator("[data-video-generate-affirmation-audio]").isDisabled();
        throw new Error(engine+" voice failed: "+JSON.stringify({status,buttonDisabled,
          providerRequests:payloads.length,networkRequests:requests,jsErrors:errors}),{cause:error});
      }
      const affirmationRequests=payloads.filter(item=>item.mode==="affirmations");
      assert.equal(affirmationRequests.length,1);
      assert.equal(affirmationRequests[0].text,transcript);
      assert.equal(affirmationRequests[0].voiceId,"maya");
      assert.equal(affirmationRequests[0].consent,true);
      assert.equal(affirmationRequests[0].language,locale);
      const expectedFileName="holistic-house-affirmations-"+locale+"-maya.wav";
      // Real attached WAV is reflected on the shared live video stage, not
      // merely in a hidden legacy audio panel or a transient preview label.
      await expect(page.locator("[data-video-live-audio]")).toContainText(expectedFileName);
      assert.equal(await page.locator('[data-hypno-music] [data-phrase-music-attach]').first().isDisabled(),true,
        "standalone music cannot silently replace mixed narration WAV");
      const firstAudio=await page.locator("[data-video-affimations-audio-ready] audio").getAttribute("src");
      assert.equal(await page.locator("[data-video-affirmation-bed] option").count(),14,
        "the first-party library offers none and thirteen backgrounds");
      await page.locator("[data-video-voice-volume]").focus();
      await page.keyboard.press("ArrowLeft");
      await page.locator("[data-video-bed-volume]").focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(previous=>{
        const audio=document.querySelector("[data-video-affimations-audio-ready] audio");
        return audio?.getAttribute("src") && audio.getAttribute("src")!==previous;
      },firstAudio,{timeout:25000});
      phase(engine,"offline-remix-ready");
      assert.equal(payloads.filter(item=>item.mode==="affirmations").length,1,
        "remixing voice/music must not invoke voice generation again");
      await page.locator('[data-video-quick-control="video"]').click();
      await page.locator('[data-video-quick-control="editor"]').click();
      const generate=page.locator("[data-video-quick-generate]");
      await expect(generate).toBeVisible({timeout:30000});
      await expect(page.locator("[data-video-quick-generate]")).toBeEnabled({timeout:30000});
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),false,
        "newly remixed WAV must automatically attach to local movie");
      // One Create tap decodes the idle MP4 and exports the actual voice video.
      if(engine==="chromium"||engine==="webkit") {
        const sourceVideo=page.locator("[data-mandala-master-mp4]");
        if(await sourceVideo.count()) {
          assert.equal(await sourceVideo.getAttribute("preload"),"none",
            "the initial Video Studio must defer the 1 MB HD source");
        }
        // Real locally encoded file: not a mere blob preview or a silent fake.
        await expect(generate).toBeEnabled({timeout:30000});
        const mediaCapabilities=await page.evaluate(()=>({
          userAgent:navigator.userAgent,
          canvasCapture:typeof HTMLCanvasElement.prototype.captureStream==="function",
          supportedMimes:['video/webm;codecs="vp8,opus"','video/webm',
            'video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4'].filter(
              mime=>typeof MediaRecorder!=="undefined" && MediaRecorder.isTypeSupported(mime)),
        }));
        console.log("VOICE_E2E_MEDIA_CAPABILITIES "+engine+" "+JSON.stringify(mediaCapabilities));
        phase(engine,"start-media-recorder");
        await generate.click();
        phase(engine,"recording-started");
        const output=page.locator("[data-mandala-video-download]");
        phase(engine,"waiting-for-export");
        try {
          await output.waitFor({state:"visible",timeout:45000});
        } catch (error) {
          phase(engine,"download-control-timed-out");
          let uiState;
          try {
            uiState=await withDeadline(page.evaluate(()=>{
            const video=document.querySelector("[data-mandala-master-mp4]");
            const create=document.querySelector("[data-video-quick-generate]");
            const result=document.querySelector("[data-video-result]");
            return {
              canClick:create instanceof HTMLButtonElement ? !create.disabled : null,
              source:video instanceof HTMLVideoElement ? {
                readyState:video.readyState,width:video.videoWidth,height:video.videoHeight,
                error:video.error?.code??null
              } : null,
              resultHidden:result instanceof HTMLElement ? result.hidden : null,
              progress:document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")??null,
              notices:[...document.querySelectorAll('[role="status"],[role="alert"]')].map(x=>x.textContent?.trim()).filter(Boolean).slice(0,8),
            };
          }),4000,engine+" media-state evaluation");
          } catch (diagnosticError) {
            uiState={diagnosticsUnavailable:diagnosticError instanceof Error
              ? diagnosticError.message:"WebKit renderer did not respond"};
          }
          phase(engine,"recording-error-reported");
          throw new Error(engine+" recorded video never became downloadable: "+
            JSON.stringify({...uiState,encoderFailureCodes:errors.filter(item=>
              item.startsWith("HH_WEBKIT_MP4_EXPORT_FAILURE:")).slice(-5)}),{cause:error});
        }
        phase(engine,"download-control-ready");
        const [download]=await Promise.all([
          page.waitForEvent("download",{timeout:20000}),output.click(),
        ]);
        phase(engine,"download-started");
        const parts=[];
        for await(const chunk of await download.createReadStream())parts.push(Buffer.from(chunk));
        const bytes=Buffer.concat(parts);
        assert.ok(bytes.length>10000,"real video must be recorded");
        const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type",
          "-of","json","-"],{input:bytes,encoding:"utf8",timeout:15000});
        assert.equal(probe.status,0,"real video container must decode: "+probe.stderr);
        const tracks=JSON.parse(probe.stdout).streams.map(row=>row.codec_type);
        assert.ok(tracks.includes("video"),"real video stream present");
        assert.ok(tracks.includes("audio"),"generated affirmation WAV survived into exported video");
        const pcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0","-map","0:a:0",
          "-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:bytes,maxBuffer:1024*1024,timeout:20000});
        assert.equal(pcm.status,0,"generated voice audio decodes: "+pcm.stderr);
        assert.ok(pcm.stdout.some(value=>value!==0),"the encoded audio must not be silent");
        phase(engine,"encoded-audio-verified");
      }
      // A real phrase edit must invalidate the old voice attachment. The
      // visitor changes the wording in its visible workspace, then returns.
      await page.locator('[data-video-quick-control="phrases"]').click();
      const nextPhrase=page.locator('[data-workspace-section="phrases"] [data-hypno-phrase="4"]');
      await expect(nextPhrase).toHaveAttribute("aria-pressed","false");
      await nextPhrase.click();
      await expect(nextPhrase).toHaveAttribute("aria-pressed","true");
      await expect(page.locator("[data-hypno-pending]")).toBeVisible({timeout:10000});
      // The phrase editor propagates its pending state to the shared voice
      // panel in a React effect. Wait for the *actual disabled control*
      // instead of racing the next render frame.
      await expect(page.locator("[data-video-generate-affirmation-audio]")).toBeDisabled({timeout:10000});
      assert.equal(await page.locator("[data-video-narration-stale]").isVisible(),false,
        "unapproved phrase cannot invalidate existing sound");
      await page.locator('[data-hypno-approve]').click();
      await page.locator("[data-video-narration-stale]").waitFor({state:"visible"});
      // The approved Video Studio puts narration in fifth Montage → Voice.
      // Do not click the removed global voice disclosure in the first workspace.
      await page.locator('[data-video-quick-control="editor"]').click();
      await page.locator('[data-video-basic-tab="voice"]').click();
      // Consent for the previous transcript never carries over to new lines.
      await expect(page.locator("[data-video-affirmation-voice-consent]")).not.toBeChecked({timeout:10000});
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),true);
      const voicePanel=page.locator("[data-video-voice-studio]");
      await voicePanel.waitFor({state:"visible",timeout:25000});
      if(await voicePanel.getAttribute("open")===null)
        await voicePanel.locator(":scope > summary").click();
      const studio=voicePanel.locator("[data-voice-studio]");
      await studio.waitFor({state:"visible"});
      assert.equal(await studio.locator("[data-voice-id]").count(),6);
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const sample=payloads.find(item=>item.mode==="sample"&&item.voiceId==="mark");
      assert.ok(sample,engine+" free text-to-speech sample reached provider");
      assert.equal(sample.voiceId,"mark");
      assert.equal(sample.language,locale);
      assert.ok(!("text" in sample),"public voice sample never sends private content");
      await studio.getByRole("button",{name:locale==="ru"?"Мой текст":"My own script",exact:true}).click();
      const customText=locale==="ru"?"Сегодня я выбираю спокойствие.":"Today I choose calm.";
      await studio.locator("textarea").fill(customText);
      await studio.locator("input[type=checkbox]").check();
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const typed=payloads.find(item=>item.mode==="short_text");
      assert.ok(typed,engine+" guest short text reached TTS API");
      assert.equal(typed.text,customText);
      assert.equal(typed.consent,true);
      assert.deepEqual(errors,[],engine+" should not log client exceptions");
      phase(engine,"all-assertions-passed");
      process.stdout.write("PASS "+engine+" "+locale+" mocked TTS + locally encoded video/audio + nature WAV attachment + stale guard\n");
    }finally{phase(engine,"closing-context");await withDeadline(context.close(),10000,engine+" context.close");}
  }finally{phase(engine,"closing-browser");await withDeadline(browser.close(),10000,engine+" browser.close");phase(engine,"closed");}
}
clearTimeout(watchdog);
