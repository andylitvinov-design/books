// Real production-build first-screen acceptance for the owner-approved Samir homepage.
// Only synthetic text; no external chat providers, bookings or payments.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir,writeFile } from "node:fs/promises";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))throw new Error("Local-only Samir QA");
const output="artifacts/home-first-screen";await mkdir(output,{recursive:true});
const evidence=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  for(const [locale,path,labels] of [
   ["en","/",["Help me figure it out","I already have a goal"]],
   ["ru","/ru",["Помоги разобраться","У меня уже есть цель"]],
   ["es","/es",["Ayúdame a entender","Ya tengo una meta"]]
  ]){
   for(const width of [320,354,390,430]){
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:"reduce"});
    const name=engine.name()+":"+locale+":"+width;const errors=[];
    page.on("pageerror",e=>errors.push(e.message.slice(0,200)));
    page.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,200))});
    try{
     const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
     assert.equal(response?.status(),200,name);
     const root=page.locator("[data-home-dialogue-entry]");
     await root.waitFor({state:"visible",timeout:30000});
     await page.locator('[data-home-dialogue-entry][data-home-interactive="true"]').waitFor({state:"visible",timeout:20000});
     const head=root.locator("[data-home-dialogue-header]");
     assert.equal((await head.locator("h1").innerText()).trim(),"Holistic House",name);
     assert.equal(await root.locator('[data-home-mode-button]').count(),0,name+": no audience tabs");
     assert.equal(await root.locator("[data-home-intent-form]").count(),1,name+": one composer");
     assert.equal(await root.locator("[data-home-stage-option]").count(),7,name+": seven stage cards");
     assert.equal(await root.locator("[data-home-intent-option]").count(),3,name+": three conversational entries");
     assert.ok((await root.locator('[data-home-intent-option="understand"]').innerText()).includes(labels[0]),name);
     assert.ok((await root.locator('[data-home-intent-option="goal"]').innerText()).includes(labels[1]),name);
     assert.equal(await root.locator("[data-home-ali-greeting-play]").count(),1,name+": real greeting control");
     const hitTargets=await root.locator('[data-home-intent-form] button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height}}));
     assert.ok(hitTargets.length===2&&hitTargets.every(r=>r.width>=44&&r.height>=44),name+": safe 44px mobile input controls "+JSON.stringify(hitTargets));
     const input=root.locator("[data-home-intent-composer]"),send=root.locator("[data-home-send-to-ali]");
     await input.fill(locale==="ru"?"Хочу разобраться":locale==="es"?"Quiero comprender":"I want clarity");
     assert.equal(await send.isEnabled(),true,name+": editable send");
     const layout=await root.evaluate(element=>{
      const keys=["[data-home-dialogue-hero]","[data-home-intent-form]","[data-home-focus-grid]","[data-home-how-it-works]","[data-home-stage-scroll]"];
      return keys.map(key=>{const el=element.querySelector(key);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,width:r.width,top:r.top,bottom:r.bottom}})});
     assert.ok(layout.every(Boolean),name+": all graphic sections rendered");
     assert.ok(layout[0].top<layout[1].top&&layout[1].top<layout[2].top&&layout[2].top<layout[3].top,name+": hierarchy");
     assert.ok(layout[2].bottom-layout[2].top<=205,name+": compact goal choices");
     assert.ok(layout[3].bottom-layout[3].top<=185,name+": compact stages");
     assert.ok(layout.every(box=>box.x>=-2&&box.x+box.width<=width+2),name+": sections fit");
     assert.ok(await root.locator("[data-home-stage-scroll]").evaluate(el=>el.scrollWidth<=el.clientWidth+2),name+": all seven stages visible without swipe");
     const stageBoxes=await root.locator('[data-home-stage-option]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top}}));
     assert.equal(stageBoxes.length,7,name+": seven visible steps");
     assert.ok(stageBoxes.every((s,i)=>s.x>=0&&s.right<=width+2&&(i===0||s.x>=stageBoxes[i-1].x)),name+": steps in one row");
     assert.equal(await page.locator("iframe").count(),0,name+": no video iframe");
     const dock=page.locator("[data-hh-unified-dock]");
     await dock.waitFor({state:"visible",timeout:30000});
     assert.deepEqual(await dock.locator("[data-unified-dock-item]").evaluateAll(xs=>xs.map(x=>x.getAttribute("data-unified-dock-item"))),
       ["mytube","video","coach","ai","services","practice","profile"],name+": seven dock targets");
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,name+": zero horizontal overflow");
     assert.deepEqual(errors,[],name+": no script errors");
     evidence.push({engine:engine.name(),locale,width,heroY:Math.round(layout[0].top),journeyWidth:Math.round(layout[4].width)});
     if(engine===webkit&&width===390)await page.screenshot({path:output+"/samir-"+locale+"-webkit-390.png",fullPage:true});
    }finally{await page.close()}
   }
  }
 }finally{await browser.close()}
}
await writeFile(output+"/samir-first-screen-results.json",JSON.stringify(evidence,null,2));
console.log("Samir Home Chromium/WebKit first-screen PASS",evidence.length);
