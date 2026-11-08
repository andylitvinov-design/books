import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import test from "node:test";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const view=readFileSync(new URL("../components/mandala-pro-enhance.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-pro-enhance.module.css",import.meta.url),"utf8");
const pageCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const catalog=readFileSync(new URL("../components/mandala-stories-characters.tsx",import.meta.url),"utf8");

test("approved compact iPhone PRO contains 2×3 upgrades, short nav and add-on rail",()=>{
  const featureList=view.split("const cards=[")[1]?.split("] as const;")[0]||"";
  const features=[...featureList.matchAll(/\{id:"([^"]+)",Icon:/g)].map(match=>match[1]);
  assert.deepEqual(features,["greeting","cinema","place","home","director","quality"]);
  const addList=view.split("const additions=[")[1]?.split("] as const;")[0]||"";
  const additions=[...addList.matchAll(/\{id:"([^"]+)",Icon:/g)].map(match=>match[1]);
  assert.deepEqual(additions,["scenes","characters","cinema","places","homes","audio"]);
  for(const phrase of ["PRO-монтаж и улучшение","Приветствие персонажа","Киносцена (портал)",
    "Место силы","Дом (уютное пространство)","AI-режиссёр","Качество",
    "Добавить в видео","Перейти к монтажу"]) assert.ok(view.includes(phrase),phrase);
  assert.match(view,/data-video-pro-shortcuts/);
  assert.match(view,/data-video-pro-feature-grid/);
  assert.match(view,/data-video-pro-add-panel/);
  assert.match(css,/\.grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.top\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:355px\)/);
});

test("PRO selections lead to existing catalog or Montage, not fictitious video generation",()=>{
  assert.equal((view.match(/data-video-pro-to-montage/g)||[]).length,1);
  assert.match(view,/onClick=\{\(\)=>onGoToMontage\("effects"\)\}/);
  assert.match(view,/onGoToMontage\("audio"\)/);
  assert.match(view,/onChooseCatalog\(kind\)/);
  assert.match(view,/data-video-pro-free-option/);
  assert.match(view,/data-video-pro-paid-option/);
  assert.match(view,/data-video-pro-unavailable/);
  assert.match(studio,/onGenerateFree=\{createQuickVideo\}/);
  assert.match(studio,/onChooseCatalog=\{setProCatalogKind\}/);
  assert.match(studio,/onGoToMontage=\{panel=>/);
  assert.match(catalog,/requestedKind\?:StoryAddonKind/);
  assert.match(catalog,/useEffect\(\(\)=>\{if\(requestedKind\)setActive\(requestedKind\);\},\[requestedKind\]\)/);
  assert.match(view,/data-video-generate-without-ai/);
  assert.match(view,/data-video-generate-pro/);
  assert.match(view,/onClick=\{onGenerateFree\}/);
  assert.ok(view.includes("No payment or render was initiated."));
  assert.doesNotMatch(view,/fetch\(|checkout|postVideoCreditAction|axios|apiKey/i);
  assert.equal((studio.match(/data-video-mandala-hero/g)||[]).length,1);
  assert.equal((studio.match(/<MandalaStoriesCharacters locale=/g)||[]).length,1);
  assert.match(view,/data-video-pro-advanced-options/);
});

test("hero/premium gallery are first-party artwork, preview/player remains original",()=>{
  for(const filename of ["/images/holistic-house/pro-enhance-hero.webp",
      "/images/holistic-house/pro-enhance-gallery.webp"]){
    const path=new URL("../public"+filename,import.meta.url);
    assert.ok(existsSync(path),filename);
    const bytes=readFileSync(path);
    assert.equal(bytes.toString("ascii",0,4),"RIFF",filename);
    assert.equal(bytes.toString("ascii",8,12),"WEBP",filename);
  }
  assert.match(view,/backgroundPosition:item\.pos/);
  assert.match(css,/background-size:300% 200%/);
  assert.match(pageCss,/pro-enhance-hero\.webp/);
  assert.match(pageCss,/data-active-workspace="pro"/);
  assert.match(pageCss,/safe-area-inset-bottom,0px/);
  assert.match(css,/min-height:57px/);
  assert.match(css,/outline:3px solid #176e6e/);
});
