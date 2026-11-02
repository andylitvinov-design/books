import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
const url=new URL(origin);
if(!["localhost","127.0.0.1"].includes(url.hostname)||
 !["http:","https:"].includes(url.protocol))throw Error("Use an isolated local QA server");
const folder="artifacts/unified-six-dock";
mkdirSync(folder,{recursive:true});
const results=[];
const ids=["mytube","video","ai","practice","master","profile"];
async function inspect(browserType,locale,width){
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,
  locale:locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US"});
 const page=await context.newPage();
 const id=browserType.name()+":"+locale+":"+width;
 try{
  await page.goto(origin+"/"+locale+"/mytube",{waitUntil:"domcontentloaded",timeout:75000});
  await page.locator("[data-mytube-page]").waitFor({timeout:45000});
  const dock=page.locator("[data-hh-unified-dock]");
  await dock.waitFor({state:"visible",timeout:20000});
  const links=dock.locator("[data-unified-dock-item]");
  assert.deepEqual(await links.evaluateAll(els=>els.map(el=>el.dataset.unifiedDockItem)),ids,id);
  const bounds=await links.evaluateAll(els=>els.map(el=>{
   const r=el.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};
  }));
  assert.ok(bounds.every(b=>b.height>=44),id+" 44px touch targets");
  assert.ok(bounds.every((b,i)=>i===0||b.left>=bounds[i-1].right-1),id+" no dock overlap");
  const geometry=await dock.evaluate(el=>{
   const r=el.getBoundingClientRect(),v=window.visualViewport;
   return {bottom:r.bottom,visibleBottom:v?v.offsetTop+v.height:innerHeight,
     position:getComputedStyle(el).position};
  });
  assert.equal(geometry.position,"fixed",id+" six-tab dock must never scroll in page flow");
  assert.ok(Math.abs(geometry.bottom-geometry.visibleBottom)<=3,id+" footer must be pinned to Safari visual viewport");
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>{
    const el=document.querySelector("[data-hh-unified-dock]");
    if(!el)return false;
    const v=window.visualViewport;
    return Math.abs(el.getBoundingClientRect().bottom-(v?v.offsetTop+v.height:innerHeight))<=3;
  },null,{timeout:10000});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,id+" horizontal overflow "+overflow);
  assert.equal(await page.locator("[data-video-life-area]").count(),4,id);
  const cards=page.locator('[data-video-layout="mytube"] article');
  assert.ok(await cards.count()>0,id+" reviewed public video cards");
  const area=page.locator('[data-video-life-area="energy_health"]');
  await area.click();
  assert.equal(await area.getAttribute("aria-pressed"),"true",id);
  await area.click();
  const first=cards.first();
  const title=(await first.locator("h2").innerText()).trim();
  const search=page.locator("[data-mytube-search]");
  await search.fill(title.slice(0,Math.min(6,title.length)));
  assert.ok(await cards.count()>=1,id+" search");
  await search.fill("");
  const visual=await first.locator('[class*="visual"]').first().boundingBox();
  assert.ok(visual&&Math.abs(visual.width/visual.height-16/9)<.23,id+" 16:9 poster");
  assert.equal(await page.locator('iframe[src*="youtube-nocookie.com"]').count(),0,id+" no autoplay or pre-consent embed");
  await first.locator("button").first().click();
  await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').first().waitFor({timeout:12000});
  if(browserType===webkit&&locale==="ru"&&width===390)
   await page.screenshot({path:folder+"/mytube-webkit-ru-390.png",fullPage:false});
  results.push({id,bottom:geometry.bottom,visibleBottom:geometry.visibleBottom,
   overflow,publishedCards:await cards.count(),playerClick:true});
 }finally{await context.close();await browser.close();}
}
for(const locale of ["ru","en","es"]){
 for(const width of [320,390,430])await inspect(webkit,locale,width);
}
await inspect(chromium,"ru",390);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(origin+"/ru/mytube",{waitUntil:"domcontentloaded",timeout:75000});
 const dock=page.locator("[data-hh-unified-dock]");
 await dock.waitFor({state:"visible"});
 await dock.locator('[data-unified-dock-item="video"]').click();
 await page.waitForURL(/\/ru\/holistic-support\/mandala\/?$/,{timeout:45000});
 await page.locator("[data-hh-unified-dock]").waitFor({state:"visible"});
 const videoHeader=page.locator("[data-video-hypno-scroll-start]");
 await videoHeader.waitFor({state:"visible",timeout:45000});
 assert.equal((await videoHeader.innerText()).trim(),"Видео-мандала","Video has a single short mobile title");
 assert.equal(await page.locator("[data-mandala-legacy-header]:visible").count(),0,
   "no duplicate end-of-page header");
 assert.equal(await page.locator("[data-mandala-support-bottom-nav]:visible").count(),0,
   "no legacy footer alongside the unified dock");
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 await page.waitForFunction(()=>{
   const el=document.querySelector("[data-hh-unified-dock]");
   if(!el)return false;
   const v=window.visualViewport;
   return Math.abs(el.getBoundingClientRect().bottom-(v?v.offsetTop+v.height:innerHeight))<=3;
 },null,{timeout:10000});
 await page.locator('[data-unified-dock-item="ai"]').click();
 await page.waitForURL(/\/ru\/app\/messages\?section=ai/,{timeout:30000});
 await page.locator("[data-chat-top-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-chat-top-tabs] > *").count(),3);
 const rail=page.locator("[data-chat-menu-rail]");
 await rail.waitFor({state:"visible",timeout:30000});
 assert.equal(await rail.locator("button").count(),5);
 await rail.locator('[data-hh-ai-quick-action="video"]').click();
 await page.locator("[data-hh-agent-preview] textarea").waitFor({state:"visible"});
 assert.ok((await page.locator("[data-hh-agent-preview] textarea").inputValue()).length>10);
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-orders-panel"]').click();
 await page.locator("#hh-orders-panel").waitFor({state:"visible"});
 await page.locator('[data-chat-top-tabs] button[aria-controls="hh-clients-panel"]').click();
 await page.locator("#hh-clients-panel").waitFor({state:"visible"});
 assert.equal(await page.locator("[data-hh-unified-dock]:visible").count(),1);
 await page.locator("[data-unified-dock-item=practice]").click();
 await page.waitForURL(/\/ru\/holistic-support\/mobile\/?$/,{timeout:30000});
 await page.locator("[data-support-practice-tabs]").waitFor({state:"visible",timeout:30000});
 assert.equal(await page.locator("[data-support-practice-tabs] > *").count(),3);
 await page.locator('[data-support-practice-tabs] button').nth(1).click();
 assert.equal(await page.locator('[data-support-practice-tabs] button').nth(1).getAttribute("aria-pressed"),"true");
 results.push({journey:"MyTube → Video → Messenger AI rail → private Orders/Clients → Practice",passed:true});
}finally{await browser.close();}
writeFileSync(folder+"/results.json",JSON.stringify(results,null,2));
console.log("Unified six-dock browser acceptance passed",results.length);
