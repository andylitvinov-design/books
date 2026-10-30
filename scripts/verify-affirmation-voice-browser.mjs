/**
 * Mocked-Gemini E2E: real Next UI and actual client WAV handling without API
 * credentials, provider billing or customer data. NOT a provider E2E claim.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {chromium,webkit} from "@playwright/test";

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
for(const [engine,browserType] of [["webkit",webkit],["chromium",chromium]]) {
  const browser=await browserType.launch({headless:true});
  try {
    const locale=engine==="webkit"?"ru":"en";
    const context=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true,serviceWorkers:"block"});
    try{
      const page=await context.newPage();
      const payloads=[];
      const errors=[];
      const requests=[];
      page.on("request",req=>{if(req.url().includes("/api/holistic-support/voice"))requests.push({method:req.method(),url:req.url()});});
      page.on("requestfailed",req=>{if(req.url().includes("/api/holistic-support/voice"))errors.push("network:"+req.method()+":"+req.failure()?.errorText);});
      page.on("pageerror",e=>errors.push(e.message));
      await page.route("**/api/holistic-support/voice",async route=>{
        const req=route.request();
        if(req.method()==="GET"){
          await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,publicAffirmationsEnabled:true})});
          return;
        }
        const body=req.postDataJSON();
        payloads.push(body);
        await route.fulfill({status:200,contentType:"audio/wav",body:wav()});
      });
      await page.goto(BASE+"/"+locale+"/holistic-support/mandala",{waitUntil:"domcontentloaded",timeout:90000});
      await page.locator("[data-video-quick-builder]").waitFor({state:"visible",timeout:25000});
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
      const selected=await page.locator("[data-video-audio-selected]").innerText();
      assert.match(selected,/holistic-house-affirmations/);
      const attached=await page.locator("[data-video-audio-attached]").innerText();
      assert.match(attached,/holistic-house-affirmations/);
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),false);
      if(engine==="chromium") {
        // Real locally encoded file: not a mere blob preview or a silent fake.
        await page.waitForFunction(()=>{
          const v=document.querySelector("[data-mandala-master-mp4]");
          return !v || v.readyState>=2;
        },undefined,{timeout:25000});
        await page.locator("[data-video-quick-generate]").click();
        const output=page.locator("[data-mandala-video-download]");
        await output.waitFor({state:"visible",timeout:45000});
        const [download]=await Promise.all([
          page.waitForEvent("download",{timeout:20000}),output.click(),
        ]);
        const parts=[];
        for await(const chunk of await download.createReadStream())parts.push(Buffer.from(chunk));
        const bytes=Buffer.concat(parts);
        assert.ok(bytes.length>10000,"real video must be recorded");
        const probe=spawnSync("ffprobe",["-v","error","-show_entries","stream=codec_type",
          "-of","json","-"],{input:bytes,encoding:"utf8"});
        assert.equal(probe.status,0,"real video container must decode: "+probe.stderr);
        const tracks=JSON.parse(probe.stdout).streams.map(row=>row.codec_type);
        assert.ok(tracks.includes("video"),"real video stream present");
        assert.ok(tracks.includes("audio"),"generated affirmation WAV survived into exported video");
        const pcm=spawnSync("ffmpeg",["-v","error","-i","pipe:0","-map","0:a:0",
          "-t","1","-ar","8000","-ac","1","-f","s16le","pipe:1"],
          {input:bytes,maxBuffer:1024*1024});
        assert.equal(pcm.status,0,"generated voice audio decodes: "+pcm.stderr);
        assert.ok(pcm.stdout.some(value=>value!==0),"the encoded audio must not be silent");
      }
      await page.locator('[data-video-quick-phrases="ready"]').click();
      await page.locator("[data-video-narration-stale]").waitFor({state:"visible"});
      assert.equal(await page.locator("[data-video-quick-generate]").isDisabled(),true);
      assert.deepEqual(errors,[],engine+" should not log client exceptions");
      process.stdout.write("PASS "+engine+" "+locale+" mocked TTS + real local nature WAV attachment + stale guard\n");
    }finally{await context.close();}
  }finally{await browser.close();}
}
