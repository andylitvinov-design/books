import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pickSingleVideoTextSource} from "../lib/mandala/single-video-text-track.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const css=read("components/mandala-video-mobile.module.css");
const ideas=read("components/mandala-video-ideas.tsx");
test("desktop advanced goal, topic, format, styles and Personal use one DOM sequence",()=>{
 const tokens=['data-video-quick-section="1"','data-video-topic-section','data-video-quick-tier','data-video-quick-section="4"','data-video-quick-phrases'];
 const pos=tokens.map(v=>studio.indexOf(v));assert.ok(pos.every(n=>n>=0));assert.deepEqual(pos,[...pos].sort((a,b)=>a-b));
 assert.equal((studio.match(/data-video-quick-tier\s+data-workspace-section/g)||[]).length,1);
});
test("eight axes and concept approval precede the existing personal phrase editor",()=>{
 assert.ok(studio.indexOf("<MandalaVideoEightAxes")<studio.indexOf('id="video-ideas-concept-panel"'));
 assert.ok(studio.indexOf('id="video-ideas-concept-panel"')<studio.indexOf("data-video-desktop-phrase-step"));
 assert.match(studio,/extraTextChoice==="personal"&&personalPhrasesOpen/);
 assert.match(css,/@media\(min-width:760px\)/);
 assert.match(ideas,/onExplicitSelection\?\.\(signature\)/);
 assert.match(studio,/desktopPhraseSignature===affirmations\.ideasDraft\?\.signature/);
});
test("explicit desktop phrase preference never replaces manually authored or explicitly empty text",()=>{
 const q={affirmationsEnabled:true,affirmationLines:["I am calm"],affirmationVisibility:["large"],storyboardCaptions:["different auto caption"],preferSelectedAffirmations:true};
 assert.equal(pickSingleVideoTextSource(q),"affirmations");
 assert.equal(pickSingleVideoTextSource({...q,timelineCaptions:[]}),"none");
 assert.equal(pickSingleVideoTextSource({...q,timelineCaptions:[{text:"Own text"}]}),"stage");
 assert.equal(pickSingleVideoTextSource({...q,captionMode:"custom",caption:"Own caption"}),"caption");
});
