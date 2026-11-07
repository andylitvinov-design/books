/**
 * PRO Enhance: guest-only visual & click acceptance on one actual Studio route.
 * No payments, provider uploads, customer media, account or AI spend.
 * This runs inside the existing Mandala browser job, not a new workflow.
 */
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";

export async function verifyProEnhanceVisual({BASE,chromium,webkit,expect}){
 const cases=[
  {engine:chromium,locale:"en",width:320,height:760},
  {engine:chromium,locale:"en",width:354,height:844},
  {engine:chromium,locale:"en",width:390,height:844},
  {engine:chromium,locale:"en",width:430,height:844},
  {engine:chromium,locale:"ru",width:390,height:844},
  {engine:chromium,locale:"es",width:390,height:844},
  {engine:webkit,locale:"en",width:390,height:844},
  {engine:webkit,locale:"ru",width:320,height:760},
  {engine:webkit,locale:"es",width:430,height:844},
 ];
 const out="artifacts/hypno-compact";
 await mkdir(out,{recursive:true});
 for(const {engine,locale,width,height} of cases){
  const browser=await engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height},isMobile:true,
   hasTouch:true,reducedMotion:"reduce",serviceWorkers:"block"});
  const label=engine.name()+"-"+locale+"-"+width;
  const writes=[];
  try{
   const page=await context.newPage();
   page.on("request",req=>{
    if(!["GET","HEAD"].includes(req.method()))writes.push(req.method()+" "+req.url());
   });
   await page.route("**/*",route=>{
    const req=route.request(),url=new URL(req.url());
    if(!["GET","HEAD"].includes(req.method())||url.origin!==new URL(BASE).origin)
      return route.abort();
    return route.continue();
   });
   const res=await page.goto(BASE+"/"+locale+"/holistic-support/mandala",
     {waitUntil:"domcontentloaded",timeout:90000});
   assert.equal(res?.status(),200,label+" page");
   await expect(page.locator('[data-video-studio-hydrated]'))
      .toHaveAttribute("data-video-studio-hydrated","true",{timeout:60000});
   await page.locator('[data-video-quick-control="pro"]').click();
   const panel=page.locator("[data-video-pro-enhance]");
   await expect(panel).toBeVisible({timeout:20000});
   const cards=panel.locator("[data-pro-upgrade-id]");
   await expect(cards).toHaveCount(6);
   await expect(cards.first()).toHaveAttribute("aria-pressed","true");
   await cards.nth(2).click();
   await expect(cards.nth(2)).toHaveAttribute("aria-pressed","true");
   await expect(panel.locator("[data-pro-selected-summary]")).toContainText(
     locale==="ru"?"AI-сцены":locale==="es"?"Escenas IA":"AI scenes");
   await expect(page.locator("[data-video-mandala-hero]")).toBeVisible();
   const geometry=await page.evaluate(()=>{
    const rect=el=>{const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const get=s=>document.querySelector(s);
    const hero=get("[data-video-mandala-hero]");
    const rail=get("[data-video-intro-my-rail]");
    const a=get("[data-video-generate-pro]"),b=get("[data-video-generate-without-ai]");
    const dock=[...document.querySelectorAll("nav")].filter(el=>
      getComputedStyle(el).position==="fixed"&&el.getBoundingClientRect().bottom>innerHeight-20)
      .sort((x,y)=>y.getBoundingClientRect().width-x.getBoundingClientRect().width)[0];
    return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
      hero:rect(hero),railDisplay:getComputedStyle(rail).display,
      a:rect(a),b:rect(b),dock:dock?rect(dock):null,
      image:getComputedStyle(get('[data-pro-artwork="cinema"] [aria-hidden="true"]')).backgroundImage,
      poster:getComputedStyle(get("[data-video-mandala-hero] [class*='heroPromo']")).backgroundImage};
   });
   assert.ok(geometry.scroll<=geometry.viewport+1,label+" no horizontal overflow");
   assert.equal(geometry.railDisplay,"none",label+" single full-width hero");
   assert.ok(geometry.hero.width>width*.82,label+" full-width hero");
   assert.ok(geometry.image.includes("pro-enhance-gallery.webp"),label+" approved art");
   assert.ok(geometry.poster.includes("pro-enhance-hero.webp"),label+" approved hero");
   const free=panel.locator("[data-video-generate-without-ai]");
   await free.scrollIntoViewIfNeeded();
   const visible=await page.evaluate(()=>{
    const el=document.querySelector("[data-video-generate-without-ai]");
    const b=el.getBoundingClientRect();
    const dock=[...document.querySelectorAll("nav")].filter(el=>
      getComputedStyle(el).position==="fixed"&&el.getBoundingClientRect().bottom>innerHeight-20)
      .sort((x,y)=>y.getBoundingClientRect().width-x.getBoundingClientRect().width)[0];
    const top=dock?.getBoundingClientRect().top??innerHeight;
    const c=document.elementFromPoint(b.left+b.width/2,Math.min(b.bottom-4,innerHeight-2));
    return {b:{top:b.top,bottom:b.bottom,height:b.height},dockTop:top,
      unobscured:el===c||el.contains(c)};
   });
   assert.ok(visible.b.height>=44,label+" full 44px CTA");
   assert.ok(visible.b.bottom<=visible.dockTop-2,label+" CTA above fixed dock");
   assert.ok(visible.unobscured,label+" CTA touch point unobscured");
   await panel.locator("[data-video-generate-pro]").click();
   await expect(panel.locator("[data-video-pro-unavailable]")).toBeVisible();
   assert.deepEqual(writes,[],label+" no paid or provider write");
   await panel.locator("[data-pro-upgrade-id='characters']").click();
   await expect(panel.locator("[data-video-pro-unavailable]")).toHaveCount(0);
   await page.screenshot({path:out+"/pro-enhance-"+label+".png",fullPage:false});
   console.log("PRO visual PASS",label,"hero",Math.round(geometry.hero.width),
      "dock safe",Math.round(visible.dockTop-visible.b.bottom));
  }finally{await context.close();await browser.close();}
 }
}
