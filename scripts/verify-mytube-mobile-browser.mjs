// MyTube public-only video channel acceptance: local Next server, no live links,
// no private auth, no YouTube requests and no client media uploads.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/,"Only isolated loopback browser testing is allowed");
const dir="artifacts/mytube-mobile";
await mkdir(dir,{recursive:true});

async function scenario(browser,locale,width){
 const context=await browser.newContext({
   viewport:{width,height:844},hasTouch:true,isMobile:true,
   deviceScaleFactor:1,reducedMotion:"reduce"
 });
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 const label=browser.browserType().name()+"/"+locale+"/"+width;
 try {
   const response=await page.goto(origin+"/"+locale+"/mytube",{waitUntil:"domcontentloaded",timeout:90000});
   assert.equal(response?.status(),200,label+": route must return 200");
   const discovery=page.locator('[data-hh-video-discovery="mytube-v1"]');
   await discovery.waitFor({state:"visible",timeout:45000});
   const dock=page.locator("[data-mytube-video-dock]");
   await dock.waitFor({state:"visible",timeout:30000});
   assert.equal(await dock.locator(":scope > a, :scope > button").count(),7,label+": seven dock actions");
   assert.equal(await dock.locator("[data-video-my-tube]").getAttribute("aria-current"),"page");
   assert.equal(await page.locator(".mobile-bottom-navigation").count(),0,label+": no second public dock");
   assert.equal(await page.locator("[data-video-life-area]").count(),4,label+": four main life areas");
   assert.equal(await discovery.locator('input[type="search"]').count(),1,label+": search");
   const position=await dock.evaluate(el=>{
     const r=el.getBoundingClientRect(),v=window.visualViewport;
     return {position:getComputedStyle(el).position,bottom:r.bottom,
       visualBottom:v?v.offsetTop+v.height:window.innerHeight,height:r.height};
   });
   assert.equal(position.position,"fixed",label+": fixed, never a scrolling dock");
   assert.ok(position.height>=55,label+": accessible toolbar height");
   assert.ok(Math.abs(position.visualBottom-position.bottom)<=22,
     label+": toolbar reaches the visual viewport bottom");
   const area=page.locator('[data-video-life-area="relationships"]');
   await area.click();
   assert.equal(await area.getAttribute("aria-pressed"),"true",label+": filter changes state");
   await area.click();
   assert.equal(await area.getAttribute("aria-pressed"),"false",label+": filter can be cleared");
   const advanced=discovery.locator("details").first();
   await advanced.locator("summary").click();
   assert.notEqual(await advanced.getAttribute("open"),null,label+": detailed selectors open");
   assert.ok(await advanced.locator("select").count()>=2,label+": deep filters");
   const search=discovery.locator('input[type="search"]');
   await search.fill("no-results-mytube-unique-query-12345");
   await discovery.locator('p[class*="empty"]').waitFor({state:"visible",timeout:10000});
   await search.fill("");
   const shelf=discovery.locator('section[class*="youtubeFeed"]');
   await shelf.waitFor({state:"visible",timeout:10000});
   assert.ok(await shelf.locator('button[class*="playButton"]').count()>0,label+": real public video posters");
   assert.equal(await shelf.locator('iframe').count(),0,label+": do not load YouTube without a click");
   const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(horizontal<=3,label+": no horizontal mobile overflow: "+horizontal);
   await page.screenshot({path:dir+"/"+browser.browserType().name()+"-"+locale+"-"+width+".png"});
   assert.deepEqual(errors,[],label+": no uncaught JavaScript errors");
   console.log("PASS MyTube",label);
 }finally{await context.close();}
}
const browsers=[[chromium,[["en",320],["en",390],["ru",390],["ru",430],["es",390]]],
                [webkit,[["ru",390],["en",320]]]];
for(const [engine,cases] of browsers){
 const browser=await engine.launch({headless:true});
 try{
   for(const [locale,width] of cases)await scenario(browser,locale,width);
 }finally{await browser.close();}
}
