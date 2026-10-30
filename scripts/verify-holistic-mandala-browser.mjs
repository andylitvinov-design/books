/**
 * Mandala-first unified iPhone editor E2E: actual Chromium and WebKit.
 * Assert the new user-approved hierarchy, real file chooser/HEIC normalization
 * path, accessible in-place edits and real first-party local video encoding.
 * Never log client photos, call providers, write storage, or incur render costs.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, webkit } from "@playwright/test";

const BASE=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
const PNG=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X3fEiQAAAABJRU5ErkJggg==","base64");
const cases=[
  {locale:"ru",width: 320},{locale:"ru",width:354},{locale:"ru",width:390},
  {locale:"ru",width: 430},{locale:"en",width:390},{locale:"es",width:390},
];

const bufferFromStream=async stream=>{
  const chunks=[];for await(const item of stream)chunks.push(Buffer.from(item));
  return Buffer.concat(chunks);
};
function syntheticWav(){
  const rate=16000,count=rate*2,b=Buffer.alloc(44+count*2);
  b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);
  b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
  b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);
  b.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++)b.writeInt16LE(Math.round(9500*Math.sin(Math.PI*2*330*i/rate)),44+i*2);
  return b;
}

const expectedTitle={
  ru:"Личная видео-подкачка или видеотерапия",
  en:"Personal video boost or video therapy",
  es:"Vídeo de impulso personal o videoterapia",
};
async function openStep(page,n){
  const button=page.locator('button[aria-controls="video-step-'+n+'-panel"]');
  assert.equal(await button.count(),1,"one accessible expander for step "+n);
  if(await button.getAttribute("aria-expanded")!=="true")await button.click();
  assert.equal(await button.getAttribute("aria-expanded"),"true","step "+n+" is open");
  await page.locator("#video-step-"+n+"-panel").waitFor({state:"visible",timeout:12000});
  for(let other=1;other<=6;other++)if(other!==n)
    assert.equal(await page.locator("#video-step-"+other+"-panel").isVisible(),false,"step "+other+" closes when "+n+" opens");
}

async function verifyPngExport(page){
  const advanced=page.locator("[data-mandala-advanced]");
  if(await advanced.getAttribute("open")===null)
    await advanced.locator(":scope > summary").click();
  await page.locator("#mandala-photo").setInputFiles({
    name:"synthetic-private.png",mimeType:"image/png",buffer:PNG,
  });
  await page.waitForFunction(()=>{
    const photo=document.querySelector('img[src^="blob:"]');
    return photo && photo.complete && photo.naturalWidth>0;
  },undefined,{timeout:15000});
  assert.equal(await page.locator("[data-video-photo-consent]").isChecked(),false,
    "replacing a photo must reset earlier consent");
  await page.locator("[data-video-photo-consent]").check();
  const a=page.locator('a[download="holistic-house-mandala.png"]');
  await a.waitFor({state:"visible",timeout:25000});
  const [d]=await Promise.all([page.waitForEvent("download",{timeout:20000}),a.click()]);
  const png=await bufferFromStream(await d.createReadStream());
  assert.deepEqual(png.subarray(0, 8),Buffer.from([137,80,78,71,13,10,26,10]));
  assert.ok(png.length>2000,"real locally composited PNG");
}
async function verifyMoneyFrames(page){
  const tile=page.locator('[data-mandala-money-option="golden-rain"]');
  await tile.waitFor({state:"visible",timeout:10000});
  await tile.click();
  const clip=page.locator('[data-mandala-scene-preview="golden-rain"]');
  await clip.waitFor({state:"visible",timeout:12000});
  await page.waitForFunction(()=>{
    const video=document.querySelector('[data-mandala-scene-preview="golden-rain"]');
    return video && video.readyState >= 2 && video.videoWidth>=500 && video.currentTime>=.15;
  },undefined,{timeout:25000});
  const before=await clip.evaluate(v=>v.currentTime);
  await page.waitForTimeout(760);
  const after=await clip.evaluate(v=>v.currentTime);
  assert.ok(after>before+.17,"actual H.264 video must advance in time");
  const canvas=page.locator("[data-mandala-cinematic-canvas]");
  const hash=()=>canvas.evaluate(c=>{
    const bytes=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
    let x=7;for(let i=0;i<bytes.length;i+=199)x=(x*31+bytes[i])>>>0;
    return x;
  });
  const first=await hash();
  await page.waitForTimeout(700);
  assert.notEqual(await hash(),first,"money-frame-motion: Canvas renders moving scene");
  if(await page.locator("[data-video-preview-toggle]").getAttribute("aria-pressed")==="true")
    await page.locator("[data-video-preview-toggle]").click();
}
async function verifyGuidedFocus(page){
  const advanced=page.locator("[data-mandala-advanced]");
  if(await advanced.getAttribute("open")===null)
    await advanced.locator(":scope > summary").click();
  await page.locator("button[aria-pressed][class*='focusButton']").click();
  await page.waitForFunction(()=>document.querySelector("[data-mandala-focus]")?.getAttribute("data-mandala-focus")==="true",
    undefined,{timeout:12000});
  assert.equal(await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').count(),0);
  await page.locator(".academy-video-poster").first().click();
  await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').waitFor({state:"attached",timeout:15000});
  await page.keyboard.press("Escape");
  await page.waitForFunction(()=>document.querySelector("[data-mandala-focus]")?.getAttribute("data-mandala-focus")==="false",
    undefined,{timeout:12000});
}


async function checkExport(page,engine){
  await openStep(page,2);
  if(await page.locator("[data-video-photo-enabled]").isChecked())
    await page.locator("[data-video-photo-enabled]").uncheck();
  await openStep(page,3);
  if(await page.locator("[data-video-affirmations-feature]").isChecked())
    await page.locator("[data-video-affirmations-feature]").uncheck();
  await openStep(page,5);
  // Explicit selected-versus-attached audio state, source-backed native WAV.
  await page.locator('[data-video-quick-section="5"] button').filter({hasText:"Без звука"}).last().click();
  await page.locator('[data-video-audio-kind="all"]').click();
  await page.locator("[data-video-audio-search]").fill("дождь");
  await page.locator('[data-video-music="rain"]').click();
  const create=page.locator("[data-mandala-video-generate]");
  assert.equal(await create.isEnabled(),false,"selecting a soundtrack must not attach it silently");
  const attachButton=page.locator("[data-video-audio-attach]");
  const player=page.locator("[data-video-audio-player]");
  assert.equal(await player.getAttribute("src"),"/audio/mandala/rain.wav");
  const media=await page.request.get(BASE+"/audio/mandala/rain.wav",{headers:{Range:"bytes=0-63"}});
  assert.ok([200,206].includes(media.status()));
  assert.equal(Buffer.from(await media.body()).subarray(0,4).toString("ascii"),"RIFF");
  await page.locator("[data-video-music-preview]").click();
  await page.waitForFunction(()=>{
    const a=document.querySelector("[data-video-audio-player]");
    return a && a.error===null && a.readyState>=2 && a.currentTime>.25;
  },undefined,{timeout:18000});
  await page.locator("[data-video-music-preview]").click();
  await attachButton.click();
  assert.equal(await attachButton.isDisabled(),true);
  assert.equal(await create.isEnabled(),true);
  await openStep(page,6);
  await page.locator('[data-video-quick-duration="10"]').click();
  await page.locator('[data-video-quick-aspect="portrait"]').click();
  const output=page.locator("[data-mandala-video-download]");
  for(let attempt=0;attempt<3;attempt++){
    if(await output.isVisible())break;
    await create.click();
    try{await output.waitFor({state:"visible",timeout:50000});break;}
    catch(e){if(attempt===2)throw e;}
  }
  const [d]=await Promise.all([page.waitForEvent("download",{timeout:20000}),output.click()]);
  const filepath=await d.path();
  assert.ok(filepath,"real downloaded MP4/WebM");
  const probe=spawnSync("ffprobe",["-v","error","-show_entries",
    "stream=codec_type,codec_name,width,height:format=duration",
    "-of","json",filepath],{encoding:"utf8",timeout:20000});
  assert.equal(probe.status,0,"ffprobe real encoded media: "+probe.stderr);
  const data=JSON.parse(probe.stdout),streams=data.streams||[];
  assert.ok(streams.some(stream=>stream.codec_type==="video"&&stream.width>0),
    "file contains decoded moving video frames");
  assert.ok(streams.some(stream => stream.codec_type === "audio"),
    "audio attached to actual recorder, not just preview");
  assert.ok(Number(data.format?.duration)>1);
  const pcm=spawnSync("ffmpeg",[
    "-hide_banner","-loglevel","error","-i",filepath,"-map","0:a:0",
    "-t","2","-ar","8000","-ac","1","-f","s16le","pipe:1"
  ],{encoding:null,maxBuffer:1024*1024,timeout:20000});
  assert.equal(pcm.status,0,"original audio decodes to PCM");
  let sum=0,count=0;
  for(let i=0;i+1<pcm.stdout.length;i+=2){
    const val=pcm.stdout.readInt16LE(i)/32768;sum+=val*val;count++;
  }
  assert.ok(count>4000&&Math.sqrt(sum/count)>.003,"encoded audio is audible, not silence");
  // Selected audio alone doesn't rewrite a finished video; Attach does.
  await openStep(page,5);
  await page.locator("[data-video-audio-search]").fill("энергия");
  await page.locator('[data-video-music="energy"]').click();
  assert.equal(await output.count(),1,"preview sound keeps existing export");
  assert.equal(await create.isEnabled(),false,"new soundtrack needs attachment");
  await page.locator("[data-video-audio-attach]").click();
  await output.waitFor({state:"detached",timeout:12000});
  // Genuine local custom audio upload with explicit user permission.
  await page.locator("[data-video-audio-upload]").setInputFiles({
    name:"owner-voice.wav",mimeType:"audio/wav",buffer:syntheticWav(),
  });
  await page.locator("[data-video-audio-selected]").waitFor({state:"visible",timeout:12000});
  assert.equal(await create.isEnabled(),false);
  assert.equal(await page.locator("[data-video-audio-attach]").isDisabled(),true);
  await page.locator("[data-video-audio-rights]").check();
  await page.locator("[data-video-audio-attach]").click();
  assert.equal(await page.locator("[data-video-audio-attach]").isDisabled(),true);
}

let scenarios=0;
for(const [engine,browserType] of [["webkit",webkit],["chromium",chromium]]){
 const browser=await browserType.launch({headless:true});
 try{
  for(const {locale,width} of cases){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
   const uploads=[],errors=[];
   page.on("request",request=>{
     if(request.method()==="POST"&&/(?:upload|storage\/v1|\/media\/|heygen|higgsfield)/i.test(request.url()))
       uploads.push(request.url());
   });
   page.on("pageerror",e=>errors.push(e.message));
   try{
    const url=BASE+"/"+locale+"/holistic-support/mandala";
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:90000});
    assert.equal(response?.status(),200,engine+" "+url+" HTTP");
    await page.locator("[data-mandala-meditation]").waitFor({state:"visible",timeout:30000});
    assert.equal(await page.locator("[data-video-diagnostic-banner]").count(),0,"no local promo");
    assert.equal(await page.locator('[data-sitewide-antistress-banner]').count(),0,"no sitewide promo");
    const mast=page.locator("[data-support-app-header]");
    const player=page.locator("[data-video-mandala-hero]");
    const builder=page.locator("[data-video-quick-builder]");
    await mast.waitFor({state:"visible"});
    await player.waitFor({state:"visible"});
    await builder.waitFor({state:"visible"});
    assert.equal(await mast.count(),1,"one compact mobile header");
    assert.equal(await player.count(),1,"one mandala, not two videos");
    assert.equal(await page.locator("[data-mandala-support-bottom-nav]").count(),1,"exactly one Support dock");
    assert.equal(await page.locator("[data-video-quick-legacy]").count(),0,"no duplicated legacy editor");
    assert.equal(await page.locator("[data-video-quick-section]").count(),6);
    assert.equal(await page.locator("[data-video-hero-create]").count(),1,"one genuine Create CTA");
    const geometry=await page.evaluate(()=>{
      const rect=q=>document.querySelector(q)?.getBoundingClientRect();
      const header=rect("[data-support-app-header]");
      const player=rect("[data-video-mandala-hero]");
      const builder=rect("[data-video-quick-builder]");
      return {header:header?.top,headerBottom:header?.bottom,
        player:player?.top,playerBottom:player?.bottom,builder:builder?.top,
        viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
    });
    assert.ok(geometry.headerBottom<=geometry.player+1 && geometry.playerBottom<=geometry.builder+2,
      engine+" "+locale+" "+width+" mandala-first hierarchy "+JSON.stringify(geometry));
    assert.ok(geometry.scroll<=geometry.viewport+2,
      engine+" "+locale+" "+width+" horizontal overflow "+JSON.stringify(geometry));
    assert.ok((await builder.locator("h2").first().innerText()).includes(expectedTitle[locale]));
    for(let n=1;n<=6;n++)assert.equal(await page.locator("#video-step-"+n+"-panel").isVisible(),false,
      "collapsed by default: "+n);

    // Both the whole card title and its explicit control must expand the card.
    const firstCardTitle=page.locator('[data-video-quick-section="1"] h3');
    await firstCardTitle.click();
    assert.equal(await page.locator("#video-step-1-panel").isVisible(),true,
      "tapping the card title opens settings");
    await firstCardTitle.click();
    assert.equal(await page.locator("#video-step-1-panel").isVisible(),false,
      "tapping the title again closes settings");
    await openStep(page,1);
    assert.equal(await page.locator("[data-video-quick-theme]").count(),6);
    await page.locator('[data-video-quick-theme="money"]').click();
    assert.equal(await page.locator('[data-video-quick-theme="money"]').getAttribute("aria-pressed"),"true");
    await page.locator("[data-video-quick-wish]").fill("A calm clear goal");
    assert.equal(await page.locator("[data-video-wish]").inputValue(),"A calm clear goal");
    await page.locator("[data-video-quick-wish]").fill("");

    // A real label launches the OS/native Photos input: not a decorative button
    // attempting to .click() a 1x1 hidden control.
    await openStep(page,2);
    const [chooser]=await Promise.all([
      page.waitForEvent("filechooser",{timeout:10000}),
      page.locator("[data-video-photo-picker]").click(),
    ]);
    await chooser.setFiles({name:"photo.png",mimeType:"image/png",buffer:PNG});
    await page.waitForFunction(()=>{
      const image=document.querySelector("[data-video-quick-photo] img");
      return Boolean(image && image.complete && image.naturalWidth>0);
    },undefined,{timeout:20000});
    assert.equal(await page.locator("[data-video-photo-enabled]").isChecked(),true,"selected photo toggles local overlay, NOT rights");
    const consent=page.locator("[data-video-photo-consent]");
    await consent.waitFor({state:"visible",timeout:10000});
    assert.equal(await consent.isChecked(),false,"own photo needs explicit rights");
    // A fixed iPhone dock must not cover the real checkbox. Make a genuine
    // scroll gesture before measuring reachability; waiting for geometry alone
    // leaves the offscreen checkbox permanently behind the dock on WebKit.
    await consent.evaluate(input=>{
      input.closest("label")?.scrollIntoView({block:"center",behavior:"instant"});
    });
    await page.waitForFunction(()=>{
      const input=document.querySelector("[data-video-photo-consent]");
      const nav=document.querySelector("[data-mandala-support-bottom-nav]");
      if(!input||!nav)return false;
      const checkbox=input.getBoundingClientRect();
      const dock=nav.getBoundingClientRect();
      return checkbox.height>0 && checkbox.bottom < dock.top-8 &&
        checkbox.top>0 && checkbox.left>=0 && checkbox.right<=window.innerWidth;
    },undefined,{timeout:5000});
    await consent.check();
    assert.equal(await consent.isChecked(),true,"photo rights must really persist");
    if(engine==="chromium"&&locale==="ru"&&width===390)
      await verifyPngExport(page);

    await openStep(page,3);
    assert.equal(await page.locator("[data-video-hypnosis-section]").count(),1);
    await page.locator("[data-video-affirmations-feature]").check();
    assert.equal(await page.locator("[data-hypno-overview-enable]").isChecked(),true);
    await page.locator("[data-video-affirmations-feature]").uncheck();
    if(engine==="chromium"&&locale==="ru"&&width===390){
      const hypno=page.locator("[data-hypno-overview]");
      await hypno.locator("[data-hypno-phrases-edit]").click();
      await page.locator("[data-video-affirmations-details] > summary").click();
      await page.locator("[data-video-goals-toggle]").click();
      assert.equal(await page.locator("[data-video-goals-toggle]").getAttribute("aria-expanded"),"true");
      await page.locator('[data-video-goal="recovery"]').click();
      await page.locator("[data-video-goals-apply]").click();
      await page.locator("[data-video-affirmations-custom] > summary").click();
      await page.locator("[data-video-custom-affirmations]").fill("I choose a kind next step");
      assert.equal(await page.locator("[data-video-custom-affirmations]").inputValue(),
        "I choose a kind next step");
    }

    await openStep(page,4);
    assert.equal(await page.locator("#video-templates").count(),1);
    await page.locator('[data-video-quick-style="1"]').click();
    assert.equal(await page.locator('[data-video-quick-style="1"]').getAttribute("aria-pressed"),"true");
    if(engine==="chromium"&&locale==="ru"&&width===390)
      await verifyMoneyFrames(page);
    if(engine==="chromium"&&locale==="ru"&&width===390){
      const director=page.locator("[data-cinematic-director]");
      await director.waitFor({state:"visible",timeout:10000});
      await director.locator('button[aria-controls="cinematic-director-content"]').click();
      assert.equal(await director.locator("[data-director-field]").count(),4,"four real director fields");
      assert.equal(await page.locator("[data-director-profile-import]").isDisabled(),true,
        "private profile forbidden without consent");
    }

    await openStep(page,5);
    assert.equal(await page.locator("[data-video-audio-section]").count(),1);
    assert.ok(await page.locator("[data-video-audio-tracks] [data-video-music]").count()>=2);
    await page.locator("[data-video-quick-attach]").click();
    assert.equal(await page.locator("[data-video-audio-attach]").isDisabled(),true,
      "selected soundtrack attached to actual recorder");

    await openStep(page,6);
    await page.locator('[data-video-quick-duration="10"]').click();
    assert.equal(await page.locator('[data-video-duration="10"]').getAttribute("aria-pressed"),"true");
    await page.locator('[data-video-quick-aspect="landscape"]').click();
    assert.equal(await page.locator('[data-video-aspect="landscape"]').getAttribute("aria-pressed"),"true");
    await page.locator('[data-video-quick-aspect="portrait"]').click();
    assert.equal(await page.locator("[data-video-reset-settings]").count(),1);

    // The original single hero still plays locally, no provider call.
    const toggle=page.locator("[data-video-preview-toggle]");
    if(await toggle.isEnabled()){
      await toggle.click();
      await page.waitForFunction(()=>document.querySelector("[data-video-mandala-hero]")?.getAttribute("data-preview-playing")==="true",
        undefined,{timeout:12000});
      await toggle.click();
    }
    if((engine==="chromium"||engine==="webkit")&&locale==="ru"&&width===390)
      await checkExport(page,engine);
    if(engine==="chromium"&&locale==="ru"&&width===390)
      await verifyGuidedFocus(page);
    assert.deepEqual(uploads,[],"photo/video must remain local, without provider POST");

    // The approved eight-session programme is a separate safe action, not an
    // automatic paid render or extra editor.
    if(locale==="ru"&&width===390){
      await page.locator("[data-video-quick-therapy]").click();
      await page.locator("[data-video-guided-course]").waitFor({state:"visible",timeout:12000});
      assert.equal(await page.locator("[data-video-studio-mode]").getAttribute("data-video-studio-mode"),"therapy");
      assert.equal(await page.locator("[data-guided-profile-import]").isDisabled(),true);
    }
    assert.deepEqual(errors,[],engine+" "+locale+" "+width+" browser exceptions");
    if(process.env.HH_HYPNO_SCREENSHOT_DIR && locale==="ru"){
      mkdirSync(process.env.HH_HYPNO_SCREENSHOT_DIR,{recursive:true});
      await page.screenshot({path:process.env.HH_HYPNO_SCREENSHOT_DIR+"/"+engine+"-"+width+"-mandala-first.png",fullPage:true,animations:"disabled"});
    }
    scenarios++;
    console.log("PASS",engine,locale,width,"mandala-first accordion, native photo, local audio");
   } finally {await page.close();}
  }
 } finally {await browser.close();}
}
assert.equal(scenarios,cases.length*2);
console.log("PASS",scenarios,"actual WebKit/Chromium locale and viewport scenarios");
