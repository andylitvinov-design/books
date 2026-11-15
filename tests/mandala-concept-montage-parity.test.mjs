import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("relationship film: Ideas' six approved actions become the six Montage guides, without changing their order",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Ready for a Relationship",
   theme:"relationships",selectedTopicId:"ready-relationship"});
 const directions=getVideoCreativeDirections(base,"en");
 assert.ok(directions.length>=1,"Creative Director must supply a film");
 const selected=applyVideoCreativeDirection(base,directions[0]);
 assert.equal(selected.storyboard?.length,6,"A selected film is exactly six shots");
 const guides=buildAlignedStorySceneGuides({locale:"en",goal:selected.goal,
   phrases:[],concept:selected,count:6,pace:"slow"});
 assert.equal(guides.scenes.length,6);
 assert.deepEqual(guides.scenes.map(scene=>scene.visual),
   selected.storyboard.map(shot=>shot.action));
 assert.deepEqual(guides.scenes.map(scene=>scene.index),[1,2,3,4,5,6]);
 assert.ok(guides.scenes.every(scene=>scene.requiresLiteralMatch===true));
});

test("Story UI displays the full authored screenplay and does not let stock titles replace script actions",()=>{
 const ui=source("components/mandala-automatic-storyboard.tsx");
 assert.match(ui,/const visibleCount=manualFiveReady\?5:guides\.scenes\.length/);
 assert.doesNotMatch(ui,/Math\.min\(5,guides\.scenes\.length\)/);
 assert.match(ui,/const guide=guides\.scenes\[index\]/);
 assert.match(ui,/data-storyboard-scene-action/);
 assert.match(ui,/data-storyboard-scene-time/);
 assert.match(ui,/\{guide\.visual\}/);
 assert.match(ui,/data-storyboard-aligned-to-concept/);
 assert.match(ui,/const defaultFilm=useMemo/);
 assert.match(ui,/sameIntent\(draftConcept\)/);
});

test("Curated and v3 six-shot fiction are not auto-bound to clips based on vague metadata",()=>{
 const ui=source("components/mandala-automatic-storyboard.tsx");
 assert.match(ui,/const v3RequiresActionProof=Array\.isArray\(concept\.storyboard\)/);
 assert.match(ui,/const eligible=filmedProposalReady&&!v3RequiresActionProof/);
 assert.match(ui,/const applied=Boolean\(!v3RequiresActionProof/);
 assert.match(ui,/data-storyboard-clips=\{manualFiveReady\?fiveSceneShots/);
 assert.match(ui,/onChooseQuality\(sourceReady\)/);
 const studio=source("components/mandala-free-video-studio.tsx");
 assert.match(studio,/if\(!sourceReady\)\{/);
 assert.match(studio,/setMontagePanel\("concept"\)/);
 assert.match(studio,/draftConcept=\{draftVideoConcept\}/);
 assert.match(studio,/setAppliedStoryKey\(null\)/);
});

test("Selecting or editing any film in Ideas updates Montage's editorial source before approval",()=>{
 const ideas=source("components/mandala-video-concept.tsx");
 assert.match(ideas,/onDraftChange\?:\(concept:ApprovedVideoConcept\)=>void/);
 assert.match(ideas,/onDraftChange\?\.\(draftByDirection\[next\.signature\]\|\|next\)/);
 assert.match(ideas,/onDraftChange\?\.\(next\)/);
 const studio=source("components/mandala-free-video-studio.tsx");
 assert.match(studio,/setDraftVideoConcept\(draft\)/);
 assert.match(studio,/setDraftVideoConcept\(approved\)/);
 assert.match(studio,/draftConcept=\{draftVideoConcept\}/);
});
