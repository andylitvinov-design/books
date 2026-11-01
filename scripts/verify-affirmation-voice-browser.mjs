/**
 * Mocked-Gemini E2E: real Next UI and actual client WAV handling without API
 * credentials, provider billing or customer data. NOT a provider E2E claim.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {chromium,webkit,expect} from "@playwright/test";

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
  const browser=await browserType.launch({headless:true});
  try {
    const locale=engine==="webkit"?"ru":"en";
    const context=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true,serviceWorkers:"block"});
    // Playwright has no default action timeout: an obscured iPhone control can
    // otherwise hang until the six-minute process watchdog with no locator.
    context.setDefaultTimeout(25000);
    context.setDefaultNavigationTimeout(90000);
    try{
      const page=await context.newPage();
      const payloads=[];
      const errors=[];
      const requests=[];
      page.on("request",req=>{if(req.url().includes("/api/holistic-support/voice"))requests.push({method:req.method(),url:req.url()});});
      page.on("requestfailed",req=>{if(req.url().includes("/api/holistic-support/voice"))errors.push("network:"+req.method()+":"+req.failure()?.errorText);});
      page.on("pageerror",e=>errors.push(e.message));
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
      // The approved compact mobile UI moves advanced voice and duration settings
      // into an initially collapsed disclosure. Verify the actual user path.
      const advanced=page.locator("[data-video-quick-legacy]");
      assert.equal(await advanced.getAttribute("open"),null);
      await advanced.locator(":scope > summary").click();
      await page.locator('[data-video-quick-phrases="ready"]').waitFor({state:"visible"});
      assert.equal(await page.locator("[data-video-generate-affirmation-audio]").isDisabled(),true);
      await page.locator('[data-video-quick-phrases="ready"]').click();
      await page.locator('[data-video-quick-duration="10"]').click();
      const transcript=await page.locator("[data-video-affirmation-spoken-text]").innerText();
      assert.ok(transcript.length>5,"should speak actual selected affirmations");
      assert.equal(await page.locator("[data-video-affirmation-voice-select] option").count(),6);
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
      assert.equal(payloads.length,1);
      assert.equal(payloads[0].mode,"affirmations");
      assert.equal(payloads[0].text,transcript);
      assert.equal(payloads[0].voiceId,"maya");
      assert.equal(payloads[0].consent,true);
      assert.equal(payloads[0].language,locale);
      const expectedFileName="holistic-house-affirmations-"+locale+"-maya.wav";
      // The voice attachment and downloaded filename must be visible within
      // the disclosure opened by the user before generating the narration.
      assert.notEqual(await advanced.getAttribute("open"),null);
      const selectedFile=page.locator("[data-video-audio-selected] strong");
      const attachedFile=page.locator("[data-video-audio-attached] strong");
      await selectedFile.waitFor({state:"visible"});
      await attachedFile.waitFor({state:"visible"});
      assert.equal(await selectedFile.innerText(),expectedFileName);
      assert.equal(await attachedFile.innerText(),expectedFileName);
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
      assert.equal(payloads.length,1,"remixing voice/music must not invoke Google again");
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),false,
        "newly remixed WAV must automatically attach to local movie");
      await advanced.locator(":scope > summary").click();
      await selectedFile.waitFor({state:"hidden"});
      // Wait for actual capture readiness; an enabled button must not silently
      // prime an unloaded HD source and require a second user click.
      const generate=page.locator("[data-video-quick-generate]");
      if(engine==="chromium"||engine==="webkit") {
        // Real locally encoded file: not a mere blob preview or a silent fake.
        await page.waitForFunction(()=>{
          const v=document.querySelector("[data-mandala-master-mp4]");
          return !v || v.readyState>=2;
        },undefined,{timeout:25000});
        await expect(generate).toBeEnabled({timeout:30000});
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
          throw new Error(engine+" recorded video never became downloadable: "+JSON.stringify(uiState),{cause:error});
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
      // React can restore this disclosure's open state after the export rerender.
      // Reopen only when closed, not blindly toggle an existing visible panel.
      if((await advanced.getAttribute("open"))===null)
        await advanced.locator(":scope > summary").click();
      await page.locator('[data-video-quick-phrases="ready"]').waitFor({state:"visible"});
      await page.locator('[data-video-quick-phrases="ready"]').click();
      await page.locator("[data-video-narration-stale]").waitFor({state:"visible"});
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),true);
      const voicePanel=page.locator("[data-video-voice-studio]");
      await voicePanel.locator(":scope > summary").click();
      const studio=voicePanel.locator("[data-voice-studio]");
      await studio.waitFor({state:"visible"});
      assert.equal(await studio.locator("[data-voice-id]").count(),6);
      await studio.locator("[data-voice-studio-generate]").click();
      await studio.locator("[data-voice-studio-audio]").waitFor({state:"visible",timeout:30000});
      const sample=payloads.find(item=>item.mode==="sample");
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
