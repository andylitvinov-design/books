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
// Real React interactions, synthetic MediaRecorder and intercepted transcription.
// These tests never open a real microphone or call a speech provider.
async function installDictationMock(page){
 await page.addInitScript(()=>{
  const stats={opened:0,closed:0,started:0,stopped:0};
  window.__hhDictationQA=stats;
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async()=>{
   stats.opened++;
   let stopped=false;
   const stream=new MediaStream();
   Object.defineProperty(stream,"getTracks",{value:()=>[{stop(){if(!stopped){stopped=true;stats.closed++;}}}]});
   return stream;
  }}});
  class FakeRecorder{
   static isTypeSupported(type){return type==="audio/mp4";}
   constructor(){this.state="inactive";this.mimeType="audio/mp4";}
   start(){stats.started++;this.state="recording";}
   stop(){
    stats.stopped++;this.state="inactive";
    setTimeout(()=>{
     this.ondataavailable?.({data:new Blob(["synthetic-local-qa-audio"],{type:"audio/mp4"})});
     this.onstop?.();
    },30);
   }
  }
  Object.defineProperty(window,"MediaRecorder",{configurable:true,value:FakeRecorder});
 });
 const calls={count:0};
 await page.route("**/api/holistic-support/audio-storyboard",async route=>{
  calls.count++;
  assert.equal(route.request().method(),"POST");
  assert.match(route.request().headers()["content-type"]||"",/multipart\/form-data/);
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({version:"hh-audio-dictation-v1",text:"Я хочу больше денег",charged:false,locallyStored:false})});
 });
 return calls;
}
async function verifyDictation(page,form,marker,calls,baseText){
 const input=form.locator("textarea");
 const mic=form.locator(marker);
 const panel=form.locator("[data-hh-dictation-active]");
 const phase=form.locator('[data-hh-dictation-phase="recording"]');
 await mic.waitFor({state:"visible",timeout:30000});
 await form.locator(marker+'[data-hh-dictation-ready="true"]:not([disabled])').waitFor({state:"visible",timeout:30000});
 await page.bringToFront();
 await input.fill(baseText);
 await input.blur();
 await page.evaluate(()=>window.scrollTo(0,0));
 const initialCalls=calls.count;
 await mic.click();
 try{await phase.waitFor({state:"visible",timeout:10000});}catch(error){
  console.error("dictation first click diagnostic",await page.evaluate(()=>({fixture:window.__hhDictationQA,hidden:document.hidden,phase:document.querySelector("[data-hh-dictation-phase]")?.getAttribute("data-hh-dictation-phase"),alert:document.querySelector("[data-hh-dictation-active] [role=alert]")?.textContent,button:document.querySelector("[data-hh-composer-dictation-mic]")?.outerHTML})));
  throw error;
 }
 assert.equal(await input.isVisible(),false,"dictation replaces composer input");
 assert.equal(calls.count,initialCalls,"no speech upload before confirm");
 await panel.getByRole("button",{name:"Отменить",exact:true}).click();
 await mic.waitFor({state:"visible"});
 assert.equal(calls.count,initialCalls,"cancel never transmits audio");
 assert.equal(await input.inputValue(),baseText,"cancel preserves draft");
 await mic.click();
 await phase.waitFor({state:"visible",timeout:10000});
 assert.equal(await panel.getByRole("button",{name:"Распознать запись",exact:true}).isEnabled(),true);
 await panel.getByRole("button",{name:"Распознать запись",exact:true}).click();
 await mic.waitFor({state:"visible",timeout:15000});
 assert.equal(calls.count,initialCalls+1,"one explicit recording upload");
 assert.equal(await input.inputValue(),baseText+" Я хочу больше денег","transcription appends editable Russian text");
 const stats=await page.evaluate(()=>window.__hhDictationQA);
 assert.equal(stats.opened,stats.closed,"all synthetic microphone tracks released");
 assert.ok(stats.opened>=2,"cancel and confirm each acquired microphone");
 assert.equal(stats.started,stats.opened,"recorder really started after each successful acquisition");
}

for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  for(const [locale,path,labels] of [
   ["en","/",["Clarity & Stress Relief","Achieving My Goal","Business Support"]],
   ["ru","/ru",["Ясность и снятие стресса","Достижение моей цели","Поддержка бизнеса"]],
   ["es","/es",["Claridad y alivio del estrés","Alcanzar mi meta","Apoyo empresarial"]]
  ]){
   for(const width of [320,354,390,430]){
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:"reduce"});
    const name=engine.name()+":"+locale+":"+width;const errors=[];
    page.on("pageerror",e=>errors.push(e.message.slice(0,200)));
    page.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,200))});
    try{
     const dictationCalls=locale==="ru"&&width===390?await installDictationMock(page):null;
     const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
     assert.equal(response?.status(),200,name);
     const root=page.locator("[data-home-dialogue-entry]");
     await root.waitFor({state:"visible",timeout:30000});
     await page.locator('[data-home-dialogue-entry][data-home-interactive="true"]').waitFor({state:"visible",timeout:20000});
     const head=root.locator("[data-home-dialogue-header]");
     assert.equal((await head.locator("h1").innerText()).trim(),"Holistic House",name);
     assert.equal(await root.locator('[data-home-mode-button]').count(),0,name+": no audience tabs");
     assert.equal(await root.locator("[data-home-intent-form]").count(),1,name+": one composer");
     assert.equal(await root.locator("[data-home-stage-option]").count(),0,name+": no homepage seven-step panel");
     assert.equal(await root.locator("[data-home-intent-option]").count(),3,name+": three program entries");
     for(const [i,id] of ["clarity","goal","business"].entries()){
       const card=root.locator('[data-home-intent-option="'+id+'"]');
       assert.equal(await card.count(),1,name+": "+id);
       assert.ok((await card.innerText()).includes(labels[i]),name+": localized "+id);
     }
     assert.equal(await root.locator("[data-home-ali-greeting-play]").count(),1,name+": real greeting control");
     const hitTargets=await root.locator('[data-home-intent-form] button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height}}));
     assert.ok(hitTargets.length===2&&hitTargets.every(r=>r.width>=44&&r.height>=44),name+": safe 44px mobile input controls "+JSON.stringify(hitTargets));
     const input=root.locator("[data-home-intent-composer]"),send=root.locator("[data-home-send-to-ali]");
     await input.fill(locale==="ru"?"Хочу разобраться":locale==="es"?"Quiero comprender":"I want clarity");
     assert.equal(await send.isEnabled(),true,name+": editable send");
     await input.blur();
     await page.evaluate(()=>window.scrollTo(0,0));
     const layout=await root.evaluate(element=>{
      const keys=["[data-home-dialogue-hero]","[data-home-intent-form]","[data-home-focus-grid]","[data-home-methods]"];
      return keys.map(key=>{const el=element.querySelector(key);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,width:r.width,top:r.top,bottom:r.bottom}})});
     assert.ok(layout.every(Boolean),name+": all graphic sections rendered");
     assert.ok(layout[0].top<layout[1].top&&layout[1].top<layout[2].top&&layout[2].top<layout[3].top,name+": hierarchy");

     assert.ok(layout.every(box=>box.x>=-2&&box.x+box.width<=width+2),name+": sections fit");
     const cards=await root.locator('[data-home-intent-option]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,bottom:r.bottom,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}}));
     assert.equal(cards.length,3,name+": three rows");
     assert.ok(cards.every((s,i)=>s.x>=0&&s.right<=width+2&&s.width>=width*.85&&s.scrollWidth<=s.clientWidth+2&&(i===0||s.top>=cards[i-1].bottom)),name+": full width horizontal cards, no overflow");
     const copyFits=await root.locator('[data-home-intent-option] strong, [data-home-intent-option] small').evaluateAll(items=>items.every(el=>el.scrollWidth<=el.clientWidth+2));
     assert.ok(copyFits,name+": no clipped copy");
     const graphics=await root.locator('img').evaluateAll(async imgs=>Promise.all(imgs.map(async img=>{try{await img.decode()}catch{}return {url:img.getAttribute("src"),width:img.naturalWidth}})));
     assert.ok(graphics.every(img=>img.width>0),name+": real photo assets loaded "+JSON.stringify(graphics));
     assert.equal(await page.locator("iframe").count(),0,name+": no video iframe");
     const dock=page.locator("[data-hh-unified-dock]");
     await dock.waitFor({state:"visible",timeout:30000});
     assert.deepEqual(await dock.locator("[data-unified-dock-item]").evaluateAll(xs=>xs.map(x=>x.getAttribute("data-unified-dock-item"))),
       ["mytube","video","coach","ai","services","practice","profile"],name+": seven dock targets");
     await root.locator("[data-home-methods]").evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));
     const fold=await page.evaluate(()=>{
       const methods=document.querySelector('[data-home-methods]');
       const nav=document.querySelector('[data-hh-unified-dock]');
       const orb=nav?.querySelector('[data-unified-dock-item="ai"] svg');
       return {methodsBottom:methods?.getBoundingClientRect().bottom,dockTop:nav?.getBoundingClientRect().top,orbTop:orb?.getBoundingClientRect().top};
     });
     assert.ok(fold.methodsBottom<=Math.min(fold.dockTop,fold.orbTop)+2,name+": all five method icons reachable above existing dock "+JSON.stringify(fold));
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,name+": zero horizontal overflow");
     assert.deepEqual(errors,[],name+": no script errors");
     evidence.push({engine:engine.name(),locale,width,heroY:Math.round(layout[0].top),programWidth:Math.round(layout[2].width)});
     if(engine===webkit&&width===390){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:output+"/samir-"+locale+"-webkit-390.png",fullPage:false});}
     if(dictationCalls){
      await verifyDictation(page,root.locator("[data-home-intent-form]"),"[data-home-intent-mic]",dictationCalls,"Хочу разобраться");
      assert.equal(new URL(page.url()).pathname,path,"dictation alone does not navigate");
      await page.goto(origin+"/ru/app/messages?section=ai",{waitUntil:"domcontentloaded",timeout:60000});
      const form=page.locator("[data-hh-ai-chat-composer]");
      await verifyDictation(page,form,"[data-hh-conversation-mic]",dictationCalls,"Моя цель");
      assert.equal(new URL(page.url()).pathname,"/ru/app/messages","dictation alone stays in chat");
      assert.equal(await form.locator("[data-hh-ai-voice-consent]").count(),0,"no old continuous-mode consent gate");
      evidence.push({engine:engine.name(),locale,width,manualDictation:true,cancel:true,confirmed:true,requests:dictationCalls.count});
     }
    }finally{await page.close()}
   }
  }
 }finally{await browser.close()}
}
await writeFile(output+"/samir-first-screen-results.json",JSON.stringify(evidence,null,2));
console.log("Samir Home Chromium/WebKit first-screen PASS",evidence.length);
