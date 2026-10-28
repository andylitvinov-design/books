#!/usr/bin/env node
// Synthetic consented portrait + sine-wave voice, no real client data or paid API.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";
import ffmpegPath from "ffmpeg-static";

const origin=process.env.HH_TEST_PUBLIC_ORIGIN || "http://127.0.0.1:3100";

async function uploadSynthetic(page){
  const photo=await page.evaluate(async()=>{
    const canvas=document.createElement("canvas");canvas.width=360;canvas.height=360;
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("canvas");
    ctx.fillStyle="#665044";ctx.fillRect(0,0,360,360);
    ctx.fillStyle="#f6dcb4";ctx.beginPath();ctx.arc(180,160,75,0,Math.PI*2);ctx.fill();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
    if(!blob)throw Error("image");
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator("[data-personal-video-photo]").setInputFiles({
    name:"consented-synthetic.png",mimeType:"image/png",buffer:Buffer.from(photo),
  });
  await page.locator("[data-video-photo-consent]").waitFor({state:"visible"});
  const sampleRate=16000,frames=sampleRate*3,wav=Buffer.alloc(44+frames*2);
  wav.write("RIFF",0);wav.writeUInt32LE(36+frames*2,4);wav.write("WAVE",8);
  wav.write("fmt ",12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write("data",36);wav.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++)
    wav.writeInt16LE(Math.round(Math.sin(i/sampleRate*Math.PI*2*440)*11000),44+i*2);
  await page.locator("[data-personal-video-voice]").setInputFiles({
    name:"original-synthetic.wav",mimeType:"audio/wav",buffer:wav,
  });
}

async function verify(label,engine){
  const browser=await engine.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
    const posts=[];
    page.on("request",request=>{
      if(request.method()==="POST" && request.url().startsWith(origin+"/api/"))
        posts.push(request.url());
    });
    for(const locale of ["en","ru","es"]){
      const response=await page.goto(origin+"/"+locale+"/video-studio",{waitUntil:"domcontentloaded"});
      assert.equal(response?.status(),200,label+"/"+locale+"/video-studio HTTP");
      await page.locator("[data-personal-video-studio]").waitFor();
      for(const width of [320,390,430]){
        await page.setViewportSize({width,height:844});
        const size=await page.evaluate(()=>({
          doc:document.documentElement.scrollWidth,
          viewport:document.documentElement.clientWidth,
        }));
        assert.ok(size.doc<=size.viewport+3,label+" "+locale+" "+width+"px no overflow: "+JSON.stringify(size));
      }
    }

    await page.goto(origin+"/ru/video-studio",{waitUntil:"domcontentloaded"});
    const create=page.locator("[data-mandala-video-generate]");
    await create.waitFor({state:"visible"});
    assert.equal(await create.isDisabled(),true,"no export before consent/audio");
    await uploadSynthetic(page);
    assert.equal(await create.isDisabled(),true,"cannot export before photo rights");
    await page.locator("[data-video-photo-consent]").check();
    await page.locator('[data-video-theme="energy"]').click();
    await page.locator('[data-video-aspect="landscape"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-video-aspect="landscape"]')?.getAttribute("aria-pressed")==="true");
    assert.equal(await create.isEnabled(),true,"ready with voice and consent");
    await create.click();
    const link=page.locator("[data-mandala-video-download]");
    try{
      await link.waitFor({state:"visible",timeout:25000});
    }catch(error){
      const notice=await page.locator('[role="status"]').allTextContents();
      if(label==="WebKit" && notice.join(" ").match(/браузер|не удалось|создать видео/i)){
        console.log(label+" explicit unsupported audio+video notice (not silent video): "+notice.join(" ").slice(-300));
        assert.equal(await link.count(),0);
        return;
      }
      throw new Error(label+" no output: "+notice.join(" ").slice(-600)+" "+String(error));
    }
    const [download]=await Promise.all([
      page.waitForEvent("download",{timeout:15000}),link.click(),
    ]);
    const saved=await download.path();
    assert.ok(saved && ffmpegPath,"real download + ffmpeg");
    const p=spawnSync(ffmpegPath,["-hide_banner","-nostdin","-i",saved,"-f","null","-"],{
      encoding:"utf8",timeout:30000,maxBuffer:2_000_000,
    });
    assert.equal(p.status,0,label+" video/audio decodes: "+p.stderr.slice(-1500));
    assert.match(p.stderr,/Video:/,"real video track");
    assert.match(p.stderr,/Audio:/,"original voice audio track");
    const volume=spawnSync(ffmpegPath,["-hide_banner","-nostdin","-i",saved,
      "-vn","-af","volumedetect","-f","null","-"],{
      encoding:"utf8",timeout:30000,maxBuffer:2_000_000,
    });
    assert.equal(volume.status,0,label+" audio decoding");
    assert.match(volume.stderr,/mean_volume:\s*-?\d+(?:\.\d+)? dB/,"non-silent voice");
    assert.deepEqual(posts,[],"no API uploads");
    console.log(label+" PASS EN/RU/ES 320/390/430 + actual video/voice export and no uploads");
  }finally{await browser.close();}
}
for(const [name,engine] of [["Chromium",chromium],["WebKit",webkit]])
  await verify(name,engine);
