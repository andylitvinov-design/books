import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {isIdeaEditorSnapshot,planIdeaSelection,sanitizeIdeaPhrase} from "../lib/mandala/video-idea-selection.mjs";

const original=["I treat myself with care","I can find steady ground",
  "I can choose a calmer moment","I may slow down","I have choices","I feel safer","I can rest"];

test("an edited selected phrase replaces the actual first Canvas and export line",()=>{
 const next=[...original];next[0]="I welcome change";
 const projected=planIdeaSelection(next,[0,1,2,3,4],original,"en|anchor");
 assert.equal(projected.editor.options[0],"I welcome change");
 assert.equal(projected.settingsPatch.presetOverride[0],"I welcome change");
 assert.deepEqual(projected.settingsPatch.selected,[0,1,2,3,4]);
 assert.equal(projected.settingsPatch.custom,"");
 assert.equal(projected.settingsPatch.enabled,true);
 assert.ok(isIdeaEditorSnapshot(projected.editor,"en|anchor"));
 assert.equal(isIdeaEditorSnapshot(projected.editor,"es|anchor"),false);
});

test("editing an unselected line can include it and preserves a ten-line bound",()=>{
 const next=[...original];next[6]="My own words";
 const projected=planIdeaSelection(next,[0,1,2,3,4,6],original,"en");
 assert.equal(projected.settingsPatch.custom,"My own words");
 assert.deepEqual(projected.editor.chosen,[0,1,2,3,4,6]);
 assert.equal(projected.settingsPatch.presetOverride[0],original[0]);
 const ten=planIdeaSelection(Array.from({length:14},(_,i)=>"Phrase "+i),
   Array.from({length:14},(_,i)=>i),original,"en");
 assert.equal(ten.editor.chosen.length,10);
 assert.equal(ten.settingsPatch.custom.split("\n").length,5);
 assert.equal(sanitizeIdeaPhrase("<safe> "+"🌿".repeat(50)).length>0,true);
});

test("user editing, editor restore, and Canvas re-render stay connected",()=>{
 const component=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
 const setting=readFileSync(new URL("../lib/mandala/video-affirmations.ts",import.meta.url),"utf8");
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(component,/const remembered=settings\.ideasDraft/);
 assert.match(component,/isIdeaEditorSnapshot\(remembered,signature\)/);
 assert.match(component,/ideasDraft:plan\.editor/);
 assert.match(component,/const nextChosen=chosen\.includes\(index\)/);
 assert.match(component,/apply\(next,nextChosen\)/);
 assert.match(component,/onResetPreview\(\);\s*onChange\(old=>/);
 assert.match(component,/data-video-ideas-feedback role="status"/);
 assert.match(setting,/ideasDraft\?: \{ signature: string; options: string\[\]; chosen: number\[\] \}/);
 assert.match(setting,/const options = Array\.isArray\(settings\.presetOverride\)/);
 assert.match(setting,/return \[\.\.\.selected, \.\.\.custom\]\.slice\(0, 10\)/);
 assert.match(studio,/paintSingleVideoTextOverlay\(ctx,previewSeekSeconds,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips\)/);
 assert.equal((studio.match(/paintSingleVideoTextOverlay\(ctx,/g)||[]).length,5,
   "preview and all exports must use the same single text painter");
});
