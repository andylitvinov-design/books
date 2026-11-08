import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import test from "node:test";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const view=readFileSync(new URL("../components/mandala-pro-enhance.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-pro-enhance.module.css",import.meta.url),"utf8");
const pageCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("PRO has six mutually exclusive under-player tabs and one contextual lower panel",()=>{
 const items=view.split("const tabs=[")[1]?.split("] as const;")[0]||"";
 const ids=[...items.matchAll(/\{id:"([^"]+)",Icon:/g)].map(m=>m[1]);
 assert.deepEqual(ids,["montage","greeting","cinema","place","home","quality"]);
 assert.match(view,/useState<TabId>\("greeting"\)/);
 assert.match(view,/data-pro-shortcut=\{item.id\}/);
 assert.match(view,/aria-pressed=\{selected===item.id\}/);
 assert.match(view,/setSelected\(id\);setCatalogOpen\(false\)/);
 assert.match(view,/data-video-pro-dynamic-panel/);
 assert.match(view,/hasGallery\?<div className=\{styles.gallery\}/);
 assert.doesNotMatch(view,/data-video-pro-add-panel|const additions=\[/);
 assert.match(css,/\.gallery\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test("each category shows real catalog examples; free apply stays in existing exporter",()=>{
 for(const id of ["C01","C02","C03","S02","S04","L01","L02","L03","L05","L11"])
   assert.ok(view.includes('"'+id+'"'),id);
 assert.match(view,/STORY_ADDONS\.find/);
 assert.match(view,/entry.id===id/);
 assert.match(view,/item.capability==="local"\?openCatalog\(\):setShowUnavailable\(true\)/);
 assert.match(view,/onChooseCatalog\(kind\)/);
 assert.match(view,/data-video-pro-catalog-open/);
 assert.match(view,/\{children\}/);
 assert.match(view,/data-video-pro-free-option/);
 assert.match(view,/data-video-pro-paid-option/);
 assert.match(studio,/<MandalaStoriesCharacters locale=\{locale\}/);
 assert.match(studio,/onApply=\{next=>/);
 assert.match(studio,/storySelectionItems\(next\)/);
 assert.match(studio,/onChooseCatalog=\{setProCatalogKind\}/);
 assert.match(studio,/onGoToMontage=\{panel=>/);
 assert.match(view,/onGoToMontage\("audio"\)/);
 assert.match(view,/onGoToMontage\("effects"\)/);
 assert.match(view,/data-video-pro-unavailable/);
 assert.doesNotMatch(view,/fetch\(|checkout|postVideoCreditAction|axios|apiKey/i);
});

test("always-visible first-screen action bar stays above bottom navigation on mobile",()=>{
 assert.equal((view.match(/data-video-pro-to-montage/g)||[]).length,1);
 assert.equal((view.match(/data-video-generate-without-ai/g)||[]).length,1);
 assert.match(view,/onClick=\{onGenerateFree\}/);
 assert.match(studio,/onGenerateFree=\{createQuickVideo\}/);
 assert.match(css,/\.actions\{display:grid/);
 assert.match(css,/\.actions\{position:fixed;z-index:55/);
 assert.match(css,/bottom:calc\(78px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/calc\(100dvh - 490px\)/);
 assert.match(css,/\.section\{max-height:clamp/);
 assert.match(css,/\.catalogScroll\{display:grid/);
 assert.match(css,/\.legacy :global\(\[data-video-final-editor\]\)/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/@media\(min-width:760px\)/);
 assert.match(css,/outline:3px solid #176e6e/);
 for(const filename of ["/images/holistic-house/pro-enhance-gallery.webp","/images/holistic-house/pro-enhance-hero.webp"]){
  const path=new URL("../public"+filename,import.meta.url);
  assert.ok(existsSync(path),filename);
  assert.equal(readFileSync(path).toString("ascii",0,4),"RIFF");
 }
 assert.match(view,/backgroundPosition:activeTab.pos/);
 assert.match(pageCss,/pro-enhance-hero\.webp/);
 assert.match(pageCss,/data-active-workspace="pro"/);
});
