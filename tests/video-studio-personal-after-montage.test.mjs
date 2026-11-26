import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const extra=read("components/mandala-montage-extra-personal.tsx");
const goal=read("components/mandala-video-idea-goal.tsx");
const goalCss=read("components/mandala-video-idea-goal.module.css");
const css=read("components/mandala-video-personal-compact.module.css");
test("top order and Magic Mirror navigate to Montage before Personal",()=>{
 const start=studio.indexOf("const workspaceTabs=[");
 const nav=studio.slice(start,studio.indexOf("const mobileWorkspaceCopy",start));
 assert.deepEqual([...nav.matchAll(/\{id:"([^"]+)",Icon:/g)].map(m=>m[1]),
  ["video","editor","phrases","pro","ready","effects"]);
 assert.match(studio,/const continueToMontage =/);
 assert.doesNotMatch(studio,/const continueToIdeas =/);
 assert.match(studio,/setIdeasSubtab\("goal"\);setActiveWorkspace\("editor"\);setMontagePanel\("effects"\)/);
 for(const localeLabel of ['phrases:{tab:"Personal"','phrases:"Personal"'])assert.ok(studio.includes(localeLabel));
});
test("Audio → photo-led Extra; Standard goes Text, Personal owns its phrases",()=>{
 assert.match(studio,/montagePanel==="audio"\)\{\s*setMontagePanel\("promo"\)/);
 assert.match(studio,/onPersonal=\{\(\)=>\{/);
 assert.match(studio,/setIdeasSubtab\("goal"\);setIdeasVoiceAdvancedOpen\(false\)/);
 assert.match(studio,/data-video-extra-advanced-formats/);
 assert.match(studio,/onSupport=\{\(\)=>\{/);
 assert.match(studio,/requestText="" profile=\{undefined\} languagePicker phraseMode="standard"/);
 assert.match(studio,/data-video-personal-phrases/);
 assert.match(studio,/if\(extraTextChoice==="personal"\)\{\s*setActiveWorkspace\("phrases"\);setIdeasSubtab\("concept"\);setPersonalPhrasesOpen\(true\)/);
 assert.match(studio,/blockUnpricedPersonalExport/);
 for(const id of ["simple","support","personal"])assert.ok(extra.includes('id:"'+id+'"'));
 for(const file of ["sun-autumn-hills.jpg","heart-flow.jpg","sun-warm-ocean-dawn.jpg"])
  assert.ok(extra.includes(file),"Extra has original first-party photo "+file);
 assert.match(extra,/data-video-extra-text-option=\{card\.id\}/);
 assert.match(extra,/No credits are charged here/);
 assert.doesNotMatch(extra,/fetch\(|checkout\(|postVideoCreditAction/);
});
test("mobile Personal has no duplicate banner, all goal options and one Canvas",()=>{
 assert.match(css,/data-video-ideas-photo/);
 assert.match(css,/display:none!important/);
 assert.match(goalCss,/@media\(max-width:759px\)/);
 assert.match(goalCss,/min-height:76px/);
 assert.match(goal,/visible\.map\(choice=>/);
 assert.match(goal,/data-video-ideas-goal-next/);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
});
