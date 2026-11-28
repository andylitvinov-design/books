import {verifyMyCoachHome} from './verify-my-coach-home-entry.mjs'
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
async function verifyDictation(page,form,marker,calls,baseText,instant=false){
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
 const sendLabel=instant?"Отправить голосовое сообщение":"Распознать запись";
 assert.equal(await panel.getByRole("button",{name:sendLabel,exact:true}).isEnabled(),true);
 if(instant){
  await page.route("**/api/holistic-agent/turn",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({reply:"Тестовый ответ без внешней модели.",recommendations:[]})}));
  await panel.getByRole("button",{name:"Остановить запись",exact:true}).click();
  await form.locator('[data-hh-dictation-phase="ready"]').waitFor({state:"visible"});
  assert.equal(calls.count,initialCalls,"stop alone does not upload");
 }
 await panel.getByRole("button",{name:sendLabel,exact:true}).click();
 try{await mic.waitFor({state:"visible",timeout:15000});}catch(error){
  console.error("dictation confirm diagnostic",JSON.stringify({requests:calls.count-initialCalls,...await form.evaluate(root=>({phase:root.querySelector("[data-hh-dictation-phase]")?.getAttribute("data-hh-dictation-phase"),alert:root.querySelector("[data-hh-dictation-active] [role=alert]")?.textContent,fixture:window.__hhDictationQA,hidden:document.hidden}))}));
  throw error;
 }
 assert.equal(calls.count,initialCalls+1,"one explicit recording upload");
 if(instant){
  await page.getByText(baseText+" Я хочу больше денег",{exact:true}).waitFor({state:"visible",timeout:15000});
  assert.equal(await input.inputValue(),"","speech is sent to chat, not staged in composer");
  const readyMic=form.locator(marker+'[data-hh-dictation-ready="true"]:not([disabled])');
  async function holdMic(){
   await readyMic.waitFor({state:"visible",timeout:15000});
   await readyMic.scrollIntoViewIfNeeded();
   const box=await readyMic.boundingBox();
   assert.ok(box,"microphone has a real pointer target");
   const x=box.x+box.width/2,y=box.y+box.height/2;
   await page.mouse.move(x,y);
   await page.mouse.down();
   await phase.waitFor({state:"visible",timeout:10000});
   await page.getByText("Отпустите для отправки",{exact:true}).waitFor({state:"visible"});
   // Keep the pointer down long enough to cross the explicit hold threshold.
   await page.waitForTimeout(400);
   return {x,y};
  }
  const p=await holdMic();
  await page.mouse.move(p.x-100,p.y,{steps:5});
  await page.getByText("Отпустите для отмены",{exact:true}).waitFor({state:"visible"});
  await page.mouse.up();
  await readyMic.waitFor({state:"visible"});
  assert.equal(calls.count,initialCalls+1,"slide-to-cancel sends nothing");
  await holdMic();
  await page.mouse.up();
  await mic.waitFor({state:"visible",timeout:15000});
  assert.equal(calls.count,initialCalls+2,"hold release uploads exactly once");
  await page.getByText("Я хочу больше денег",{exact:true}).waitFor({state:"visible",timeout:15000});
  assert.equal(await input.inputValue(),"","hold release auto-sends without confirmation");
 }else assert.equal(await input.inputValue(),baseText+" Я хочу больше денег","home transcription remains editable");
 const stats=await page.evaluate(()=>window.__hhDictationQA);
 assert.equal(stats.opened,stats.closed,"all synthetic microphone tracks released");
 assert.ok(stats.opened>=2,"cancel and confirm each acquired microphone");
 assert.equal(stats.started,stats.opened,"recorder really started after each successful acquisition");
}

for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  for(const [locale,path] of [
   ["en","/",["Clarity & Stress Relief","Achieving My Goal","Business Support","Reiki Practic"]],
   ["ru","/ru",["Ясность и снятие стресса","Достижение моей цели","Поддержка бизнеса","Reiki Practic"]],
   ["es","/es",["Claridad y alivio del estrés","Alcanzar mi meta","Apoyo empresarial","Reiki Practic"]]
  ]){
   for(const width of [320,354,390,430]){
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:"reduce",serviceWorkers:"block"});
    const name=engine.name()+":"+locale+":"+width;const errors=[];
    page.on("pageerror",e=>errors.push(e.message.slice(0,200)));
    page.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,200))});
    try{
     const dictationCalls=locale==="ru"&&width===390?await installDictationMock(page):null;
     const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
     assert.equal(response?.status(),200,name);
     await verifyMyCoachHome(page,locale);
     const dock=page.locator("[data-hh-unified-dock]");
     await dock.waitFor({state:"visible",timeout:30000});
     assert.deepEqual(await dock.locator("[data-unified-dock-item]").evaluateAll(xs=>xs.map(x=>x.getAttribute("data-unified-dock-item"))),
       ["mytube","reiki","coach","ai","services","practice","profile"],name+": seven dock targets");
     assert.equal(await dock.locator('[data-unified-dock-item="coach"]').getAttribute('aria-current'),'page');
     assert.deepEqual(errors,[],name+": no script errors");
     evidence.push({engine:engine.name(),locale,width,myCoachHome:true});
     if(engine===webkit&&width===390)await page.screenshot({path:output+"/my-coach-"+locale+"-webkit-390.png",fullPage:false});
     if(width===390){
      for(const [id,count] of [["clarity",3],["goal",8],["business",8],["reiki",5]]){
       await page.goto(origin+"/"+locale+"/programs/"+id,{waitUntil:"domcontentloaded",timeout:60000});
       const overview=page.locator('[data-public-program="'+id+'"]');
       await overview.waitFor({state:"visible"});
       assert.equal(await overview.locator("[data-program-session]").count(),count,name+": "+id+" sessions");
       const start=overview.locator(id==="reiki"?"[data-reiki-start-free]":"[data-program-start]");
       assert.equal(await start.count(),1,name+": "+id+" primary start");
       assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,name+": "+id+" no overflow");
      }
     }
     if(dictationCalls){
      await page.goto(origin+"/ru/app/messages?section=ai",{waitUntil:"domcontentloaded",timeout:60000});
      const form=page.locator("[data-hh-ai-chat-composer]");
      await verifyDictation(page,form,"[data-hh-conversation-mic]",dictationCalls,"Моя цель",true);
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
console.log("My Coach Home Chromium/WebKit first-screen PASS",evidence.length);
