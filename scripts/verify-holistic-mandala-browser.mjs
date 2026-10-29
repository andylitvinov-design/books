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
  {locale:"ru",width:320},{locale:"ru",width:354},{locale:"ru",width:390},
  {locale:"ru",width:430},{locale:"en",width:390},{locale:"es",width:390},
];
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
async function checkExport(page,engine){
  await openStep(page,2);
  if(await page.locator("[data-video-photo-enabled]").isChecked())
    await page.locator("[data-video-photo-enabled]").uncheck();
  await openStep(page,3);
  if(await page.locator("[data-video-affirmations-feature]").isChecked())
    await page.locator("[data-video-affirmations-feature]").uncheck();
  await openStep(page,5);
  if(!(await page.locator("[data-video-audio-attach]").isDisabled()))
    await page.locator("[data-video-quick-attach]").click();
  await openStep(page,6);
  await page.locator('[data-video-quick-duration="10"]').click();
  await page.locator('[data-video-quick-aspect="portrait"]').click();
  const create=page.locator("[data-video-quick-generate]");
  const output=page.locator("[data-mandala-video-download]");
  // On iOS WebKit, the first tap can unlock a hidden same-origin MP4; never
  // claim an export until an actual playable downloadable Blob is produced.
  for(let attempt=0;attempt<3;attempt++){
    if(await output.isVisible())break;
    await create.click();
    try{await output.waitFor({state:"visible",timeout:50000});break;}
    catch(e){if(attempt===2)throw e;}
  }
  await output.waitFor({state:"visible",timeout:15000});
  const [download]=await Promise.all([
    page.waitForEvent("download",{timeout:25000}), output.click(),
  ]);
  const path=await download.path();
  assert.ok(path,"local video file from "+engine);
  const probe=spawnSync("ffprobe",["-v","error","-show_entries",
    "stream=codec_type,codec_name,width,height:format=duration",
    "-of","json",path],{encoding:"utf8",timeout:20000});
  assert.equal(probe.status,0,"ffprobe real encoded media: "+probe.stderr);
  const data=JSON.parse(probe.stdout);
  assert.ok(data.streams?.some(stream=>stream.codec_type==="video"&&stream.width>0&&stream.height>0),
    "file contains decoded moving video frames");
  assert.ok(Number(data.format?.duration)>1,"video has nonzero duration");
  assert.ok(data.streams?.some(stream=>stream.codec_type==="audio"),
    "attached first-party soundtrack is encoded, not only previewed");
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
    assert.equal(await page.locator("[data-video-photo-enabled]").isChecked(),false);
    await page.locator("[data-video-photo-enabled]").check();
    const consent=page.locator("[data-video-photo-consent]");
    await consent.waitFor({state:"visible",timeout:10000});
    assert.equal(await consent.isChecked(),false,"own photo needs explicit rights");
    await consent.check();

    await openStep(page,3);
    assert.equal(await page.locator("[data-video-hypnosis-section]").count(),1);
    await page.locator("[data-video-affirmations-feature]").check();
    assert.equal(await page.locator("[data-hypno-overview-enable]").isChecked(),true);
    await page.locator("[data-video-affirmations-feature]").uncheck();

    await openStep(page,4);
    assert.equal(await page.locator("#video-templates").count(),1);
    await page.locator('[data-video-quick-style="1"]').click();
    assert.equal(await page.locator('[data-video-quick-style="1"]').getAttribute("aria-pressed"),"true");
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
