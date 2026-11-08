import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const view=readFileSync(new URL("../components/mandala-pro-enhance.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-pro-enhance.module.css",import.meta.url),"utf8");

test("PRO offers exactly three accessible priced tabs rather than six unrelated tool tiles",()=>{
 const items=view.split('const tiers=[')[1]?.split('] as const;')[0]||"";
 assert.deepEqual([...items.matchAll(/"(standard|extra|pro)"/g)].map(match=>match[1]),["standard","extra","pro"]);
 assert.match(view,/role="tablist"/);
 assert.match(view,/role="tab"/);
 assert.match(view,/aria-selected=\{tier===item\}/);
 assert.match(view,/role="tabpanel"/);
 assert.match(view,/data-video-pro-tier-panel=\{tier\}/);
 assert.match(view,/€3/);
 assert.match(view,/€5/);
 assert.doesNotMatch(view,/data-video-pro-shortcuts|data-pro-shortcut|data-video-pro-feature-grid/);
});

test("Standard reuses the one existing real multitrack montage editor and guarded renderer",()=>{
 assert.equal((studio.match(/<MandalaMultiTrackTimeline locale=\{locale\}/g)||[]).length,1);
 assert.match(studio,/const sharedMontageTimeline = \(/);
 assert.match(studio,/activeWorkspace==="editor" \? sharedMontageTimeline : null/);
 assert.match(studio,/activeWorkspace==="pro"\?sharedMontageTimeline:null/);
 assert.match(studio,/data-video-final-editor/);
 assert.match(studio,/onMoveShot=\{moveTimelineShot\}/);
 assert.match(studio,/onResizeShot=\{shiftFilmCut\}/);
 assert.match(studio,/onSplitCaption=\{splitTimelineText\}/);
 assert.match(studio,/onGenerateFree=\{createQuickVideo\}/);
 assert.match(view,/tier==="standard"\)onGenerateFree\(\);else addToCart\(\)/);
 assert.match(view,/data-video-generate-without-ai=\{tier==="standard"/);
 assert.match(view,/disabled=\{disabled\} onClick=/);
 assert.match(studio,/creditCatalog\?\.chargeRequired&&creditSession!=="guest"/);
});

test("Extra reuses existing photo picker and catalog, PRO wish stays in same local Goal state",()=>{
 assert.match(studio,/onPickPhoto=\{onPickPhoto\}/);
 assert.match(view,/data-video-pro-upload-photo onClick=\{onPickPhoto\}/);
 assert.match(view,/photoSelected/);
 assert.match(view,/onChooseCatalog\("character"\)/);
 assert.match(view,/data-video-pro-character-catalog/);
 assert.match(studio,/<MandalaStoriesCharacters locale=\{locale\}/);
 assert.match(studio,/onApply=\{next=>/);
 assert.match(studio,/storySelectionItems\(next\)/);
 assert.match(studio,/proWish=\{wish\} onProWishChange=\{setWish\}/);
 assert.match(view,/data-video-pro-brief value=\{proWish\}/);
 assert.match(view,/maxLength=\{800\}/);
 assert.match(studio,/proTools=\{activeWorkspace==="pro"\?deepVideoDirectorPane:null\}/);
});

test("one context-specific bottom action, no fake paid request, correct mobile dock",()=>{
 assert.equal((view.match(/data-video-pro-actions/g)||[]).length,1);
 assert.equal((view.match(/data-video-pro-create=\{tier\}/g)||[]).length,1);
 assert.match(view,/t.cartAdd\+" · "\+t.prices\[tier\]/);
 assert.match(view,/data-video-pro-paid-unavailable/);
 assert.match(view,/VIDEO_CART_STORAGE_KEY/);
 assert.match(view,/router.push\("\/"\+locale\+"\/cart\?video="\+id\)/);
 assert.doesNotMatch(view,/fetch\(|checkout\s*\(|postVideoCreditAction|axios|apiKey/i);
 assert.match(css,/\.actions\{position:fixed;z-index:55/);
 assert.match(css,/bottom:calc\(78px \+ env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/@media\(min-width:760px\)/);
 assert.match(css,/outline:3px solid #176e6e/);
 assert.match(css,/Design Bible §10.13/);
 assert.match(css,/:global\(\[data-mandala-mode="video"\]\)/);
 assert.match(css,/var\(--hh-studio-surface/);
 assert.match(css,/var\(--hh-studio-border/);
 for(const language of ["ru","en","es"]) assert.ok(view.includes(" "+language+":{"),language);
});
