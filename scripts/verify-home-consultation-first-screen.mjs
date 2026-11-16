// Protected browser acceptance for the owner's lightweight conversation-first
// Home. Test the actual first paint, seven existing dock items and real links;
// do not require any legacy video/carousel to render above the conversation.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
 throw Error("Homepage acceptance requires isolated local production server");
const output="artifacts/home-first-screen";
await mkdir(output,{recursive:true});
const results=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  for(const [locale,path,self,business] of [
    ["en","/","For myself","For business"],
    ["ru","/ru","Для себя","Для бизнеса"],
    ["es","/es","Para mí","Para negocios"],
  ]){
   for(const width of [320,390,430]){
    const page=await browser.newPage({viewport:{width,height:844},
      deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:"reduce"});
    const label=engine.name()+"/"+locale+"/"+width;
    try{
     const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
     assert.equal(response?.status(),200,label+": HTTP 200");
     const home=page.locator("main[data-home-dialog-first]");
     await home.waitFor({state:"visible",timeout:25000});
     const header=home.locator("[data-home-first-header]");
     const hero=home.locator("[data-home-conversation-hero]");
     const input=home.locator("[data-home-intent-input]");
     const send=home.locator("[data-home-intent-submit]");
     assert.equal(await header.locator("h1").innerText(),"My Space",label+": one-line title");
     assert.equal(await home.locator("[data-profile-hub-tabs], [data-home-section-carousel], iframe, video").count(),0,
       label+": no heavy Profile/video on first paint");
     assert.equal(await page.locator("[data-sitewide-antistress-banner], .house-header--services").count(),0,
       label+": no promotional/old masthead");
     await hero.waitFor({state:"visible"});
     await input.waitFor({state:"visible"});
     await send.waitFor({state:"visible"});
     const [hb,ib]=await Promise.all([header.boundingBox(),input.boundingBox()]);
     assert.ok(hb&&ib&&hb.y<hb.y+hb.height&&ib.y<844-65,label+": conversation first fold");
     assert.equal(await send.isDisabled(),true,label+": empty message cannot send");
     const mode=home.locator("[data-home-purpose-switch]");
     const selfButton=mode.locator('[data-home-purpose="self"]');
     const businessButton=mode.locator('[data-home-purpose="business"]');
     assert.equal((await selfButton.innerText()).trim(),self,label+": self label");
     assert.equal((await businessButton.innerText()).trim(),business,label+": business label");
     assert.equal(await selfButton.getAttribute("aria-pressed"),"true",label+": default self");
     // DOMContentLoaded can precede Next hydration on a cold iPhone. Check
     // the real React click handler, not just static SSR button geometry.
     await page.waitForFunction(()=>{
       const button=document.querySelector('[data-home-purpose="business"]');
       const key=Object.keys(button||{}).find(name=>name.startsWith('__reactProps
     assert.equal(await businessButton.getAttribute("aria-pressed"),"true",label+": business changes mode");
     assert.equal(await home.locator("[data-home-quick-intent]").count(),3,label+": three business intents");
     assert.equal(await home.locator("[data-home-continue]").getAttribute("href"),"/"+locale+"/practice",
       label+": business enters existing public Work");
     await selfButton.click();
     assert.equal(await selfButton.getAttribute("aria-pressed"),"true",label+": reversible");
     assert.equal(await home.locator("[data-home-quick-intent]").count(),3,label+": three personal intents");
     assert.equal(await home.locator("[data-home-continue]").getAttribute("href"),
       "/"+(locale==="es"?"en":locale)+"/app/portrait",label+": real existing profile");
     const dock=page.locator("[data-hh-unified-dock]");
     await dock.waitFor({state:"visible"});
     const ids=await dock.locator("[data-unified-dock-item]").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-unified-dock-item")));
     assert.deepEqual(ids,["mytube","video","coach","ai","services","practice","profile"],label+": seven existing dock links");
     const search=header.locator("[data-site-search-trigger]");
     const menu=header.locator("[data-home-menu] summary");
     const lang=header.locator("[data-home-language] summary");
     for(const item of [search,menu,lang]){
       const b=await item.boundingBox();
       assert.ok(b&&b.width>=38&&b.height>=43,label+": large, reachable header action");
     }
     await lang.click();
     assert.equal(await header.locator("[data-home-language]").getAttribute("open"),"",label+": language menu opens");
     assert.equal(await header.locator("[data-home-language] nav a").count(),3,label+": three real locale links");
     await lang.click();
     await menu.click();
     assert.equal(await header.locator("[data-home-menu] nav a").count(),4,label+": site menu destinations");
     await menu.click();
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
     assert.ok(overflow<=2,label+": no horizontal overflow "+overflow);
     const rect=await hero.boundingBox();
     assert.ok(rect&&rect.width<=width+2,label+": hero fits viewport");
     results.push({engine:engine.name(),locale,width,sevenDock:true,dialogFirst:true});
     if(width===390&&engine===webkit)
       await page.screenshot({path:output+"/dialog-"+locale+"-webkit-390.png",fullPage:false});
    }finally{await page.close();}
   }
  }
 }finally{await browser.close();}
}
await writeFile(output+"/first-screen-results.json",JSON.stringify(results,null,2));
console.log("Dialog-first Home Chromium/WebKit EN/RU/ES 320/390/430 PASS",results.length);
));
       return Boolean(key&&typeof button[key]?.onClick==='function');
     },undefined,{timeout:30000});
     await businessButton.click();
     assert.equal(await businessButton.getAttribute("aria-pressed"),"true",label+": business changes mode");
     assert.equal(await home.locator("[data-home-quick-intent]").count(),3,label+": three business intents");
     assert.equal(await home.locator("[data-home-continue]").getAttribute("href"),"/"+locale+"/practice",
       label+": business enters existing public Work");
     await selfButton.click();
     assert.equal(await selfButton.getAttribute("aria-pressed"),"true",label+": reversible");
     assert.equal(await home.locator("[data-home-quick-intent]").count(),3,label+": three personal intents");
     assert.equal(await home.locator("[data-home-continue]").getAttribute("href"),
       "/"+(locale==="es"?"en":locale)+"/app/portrait",label+": real existing profile");
     const dock=page.locator("[data-hh-unified-dock]");
     await dock.waitFor({state:"visible"});
     const ids=await dock.locator("[data-unified-dock-item]").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-unified-dock-item")));
     assert.deepEqual(ids,["mytube","video","coach","ai","services","practice","profile"],label+": seven existing dock links");
     const search=header.locator("[data-site-search-trigger]");
     const menu=header.locator("[data-home-menu] summary");
     const lang=header.locator("[data-home-language] summary");
     for(const item of [search,menu,lang]){
       const b=await item.boundingBox();
       assert.ok(b&&b.width>=38&&b.height>=43,label+": large, reachable header action");
     }
     await lang.click();
     assert.equal(await header.locator("[data-home-language]").getAttribute("open"),"",label+": language menu opens");
     assert.equal(await header.locator("[data-home-language] nav a").count(),3,label+": three real locale links");
     await lang.click();
     await menu.click();
     assert.equal(await header.locator("[data-home-menu] nav a").count(),4,label+": site menu destinations");
     await menu.click();
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
     assert.ok(overflow<=2,label+": no horizontal overflow "+overflow);
     const rect=await hero.boundingBox();
     assert.ok(rect&&rect.width<=width+2,label+": hero fits viewport");
     results.push({engine:engine.name(),locale,width,sevenDock:true,dialogFirst:true});
     if(width===390&&engine===webkit)
       await page.screenshot({path:output+"/dialog-"+locale+"-webkit-390.png",fullPage:false});
    }finally{await page.close();}
   }
  }
 }finally{await browser.close();}
}
await writeFile(output+"/first-screen-results.json",JSON.stringify(results,null,2));
console.log("Dialog-first Home Chromium/WebKit EN/RU/ES 320/390/430 PASS",results.length);
