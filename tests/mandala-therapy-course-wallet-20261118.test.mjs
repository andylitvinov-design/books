import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildAdaptiveMeditationOutline} from "../lib/mandala/adaptive-meditation-course.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const course=read("components/mandala-personal-meditation.tsx");
const parent=read("components/mandala-free-video-studio.tsx");
const ready=read("components/mandala-video-ready.tsx");
const wallet=read("components/mandala-therapy-wallet-dialog.tsx");
const css=read("components/mandala-personal-meditation.module.css");

test("My Course displays eight distinct local topics immediately, with source focus and three languages",()=>{
 for(const locale of ["en","ru","es"]){
  const plan=buildAdaptiveMeditationOutline({locale,theme:"energy",request:"stress",details:[]});
  assert.equal(plan.days.length,8);
  assert.equal(new Set(plan.days.map(day=>day.title)).size,8);
  assert.ok(plan.days.every((day,i)=>day.number===i+1));
  assert.equal(plan.remainingAudioGenerated,false);
  assert.equal(plan.remainingScriptsPublished,false);
 }
 assert.match(course,/data-therapy-eight-course-preview/);
 assert.match(course,/data-therapy-eight-topics/);
 assert.match(course,/coursePlan\.days\.map/);
 assert.match(course,/data-therapy-course-focus/);
 assert.match(course,/data-therapy-course-price/);
 assert.match(course,/coursePreview&&compactTherapy/);
 assert.match(course,/data-therapy-go-ready-free/);
 assert.match(course,/data-therapy-go-ready-course/);
 assert.match(course,/fullEditor/);
 for(const phrase of ["Стоимость курса из 8 видео","Price of the 8-video course","Precio del curso de 8 vídeos"]){
  assert.ok(course.includes(phrase));
 }
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:355px\)/);
});

test("Course CTA reuses the existing protected Ready workspace and free local video pipeline",()=>{
 assert.match(parent,/onCourseStart=\{\(\)=>\{/);
 assert.match(parent,/setReadyCourseFlow\(true\);setStudioMode\("pump"\);setActiveWorkspace\("ready"\)/);
 assert.match(parent,/courseFlow=\{readyCourseFlow\}/);
 assert.match(ready,/data-ready-course-choices/);
 assert.match(ready,/data-ready-course-free/);
 assert.match(ready,/data-ready-course-paid/);
 assert.match(ready,/onClick=\{generateSelectedVideo\}/);
 assert.match(ready,/onClick=\{\(\)=>setWalletOpen\(true\)\}/);
 assert.match(ready,/if\(!basicFreeAvailable\)/);
 assert.match(ready,/onGenerateBasicVideo\(\)/);
 assert.doesNotMatch(course,/appFetch\("wallet\/create"/);
});

test("Wallet popup is explicit, exact-CAD, account gated and safe when provider unavailable",()=>{
 assert.match(ready,/walletOpen\?<MandalaTherapyWalletDialog/);
 assert.doesNotMatch(ready,/useEffect\(\(\)=>setWalletOpen\(true\)/);
 assert.match(wallet,/data-course-topup-total/);
 for(const amount of ["5.00","10.00","20.00"])assert.ok(wallet.includes('"'+amount+'"'));
 for(const locale of ["en","ru","es"])assert.match(wallet,new RegExp("\\b"+locale+":\\{title:"));
 assert.match(wallet,/data-course-wallet-checkout/);
 assert.match(wallet,/getCabinetBootstrap\("portrait",\{refresh:true\}\)/);
 assert.match(wallet,/appFetch\("wallet\/status",undefined,"GET",\{accountId:id\}\)/);
 assert.match(wallet,/data\.enabled!==true\|\|data\.currency!=="CAD"/);
 assert.match(wallet,/!signedIn\|\|!accountId\|\|status!=="available"\|\|!selected\|\|!amountValid\|\|busy/);
 assert.match(wallet,/appFetch\("wallet\/create",\{/);
 assert.match(wallet,/\},"POST",\{accountId\}\)/);
 assert.match(wallet,/operationId:operation\.current\.id,amount,provider:selected,locale/);
 assert.match(wallet,/trustedPaymentUrl\(result\.redirectUrl,selected,amount\)/);
 assert.match(wallet,/url\.hostname==="paypal\.me"/);
 assert.match(wallet,/url\.hostname==="square\.link"/);
 assert.match(wallet,/role="dialog" aria-modal="true"/);
 assert.match(wallet,/event\.key==="Escape"/);
 assert.match(wallet,/document\.body\.style\.overflow=overflow/);
 assert.doesNotMatch(wallet,/stripe|Stripe|window\.location\s*=/);
});
