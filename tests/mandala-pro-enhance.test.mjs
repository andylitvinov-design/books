import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import test from "node:test";
const read=path=>readFileSync(new URL("../"+path,import.meta.url));
const studio=read("components/mandala-free-video-studio.tsx").toString("utf8");
const view=read("components/mandala-pro-enhance.tsx").toString("utf8");
const css=read("components/mandala-pro-enhance.module.css").toString("utf8");
const baseCss=read("components/mandala-video-mobile.module.css").toString("utf8");
test("approved six upgrades use one first-party cinematic artwork sprite",()=>{
 const ids=[...view.matchAll(/\{id:"(cinema|characters|worlds|stories|magic|director)"/g)].map(x=>x[1]);
 assert.deepEqual(ids,["cinema","characters","worlds","stories","magic","director"]);
 for(const path of ["/images/holistic-house/pro-enhance-gallery.webp",
  "/images/holistic-house/pro-enhance-hero.webp"]){
  assert.ok(existsSync(new URL("../public"+path,import.meta.url)),path);
  const bytes=read("public"+path);
  assert.equal(bytes.toString("ascii",0,4),"RIFF",path);
  assert.equal(bytes.toString("ascii",8,12),"WEBP",path);
 }
 assert.match(view,/backgroundPosition:item\.position/);
 assert.match(view,/backgroundPosition:current\.position/);
 assert.match(css,/background-size:300% 200%/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
test("two real final actions, safe paid notice, original local free video renderer",()=>{
 for(const label of ["Add selected upgrade and generate PRO video",
  "Добавить выбранный апгрейд и сгенерировать PRO-видео",
  "Generate video without AI effects","Сгенерировать видео без ИИ-эффектов",
  "Generar vídeo sin efectos de IA"])assert.ok(view.includes(label),label);
 assert.equal((view.match(/data-video-generate-pro/g)||[]).length,1);
 assert.equal((view.match(/data-video-generate-without-ai/g)||[]).length,1);
 assert.ok(view.indexOf("data-video-generate-pro")<view.indexOf("data-video-generate-without-ai"));
 assert.ok(view.indexOf("data-video-pro-advanced-options")<view.indexOf("data-video-pro-actions"));
 assert.match(view,/onGenerateFree\(\)/);
 assert.match(studio,/onGenerateFree=\{createQuickVideo\}/);
 assert.match(view,/onClick=\{\(\)=>setShowUnavailable\(true\)\}/);
 assert.match(view,/No payment or AI render was initiated/);
 assert.doesNotMatch(view,/fetch\(|checkout|postVideoCreditAction|axios|apiKey|from €4|priceConfirmed/i);
 assert.equal((studio.match(/data-video-mandala-hero/g)||[]).length,1);
 assert.equal((studio.match(/<MandalaStoriesCharacters locale=/g)||[]).length,1);
 assert.match(view,/data-video-pro-advanced-options/);
});
test("PRO has full-width warm hero and sufficient bottom safe-area scroll",()=>{
 assert.match(baseCss,/\.studio\[data-active-workspace="pro"\] \.previewStage \.heroRail\{display:none!important\}/);
 assert.match(baseCss,/pro-enhance-hero\.webp/);
 assert.match(baseCss,/\.studio\[data-active-workspace="pro"\] \.previewStage \.heroPromo::after\{display:none!important\}/);
 assert.match(baseCss,/var\(--hh-unified-nav-height,90px\) \+ env\(safe-area-inset-bottom,0px\)/);
 assert.match(css,/\.actions button\{[\s\S]*?min-height:49px/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/@media\(max-width:759px\) and \(max-height:760px\)/);
 const tail=baseCss.slice(baseCss.lastIndexOf("/* Messenger Video validated handoff visibility."));
 assert.doesNotMatch(tail,/\.studio\[data-active-workspace="pro"\] \.previewStage \.heroRail\{display:none!important\}/);
});
