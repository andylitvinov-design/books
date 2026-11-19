import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import {pickSingleVideoTextSource} from "../lib/mandala/single-video-text-track.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const studio=readFileSync(resolve(root,"components/mandala-free-video-studio.tsx"),"utf8");
const css=readFileSync(resolve(root,"components/mandala-video-mobile.module.css"),"utf8");
test("DOM sequence: goal, topic, format, styles, phrases",()=>{
 const tokens=['data-video-quick-section="1"','data-video-topic-section','data-video-quick-tier','data-video-quick-section="4"','data-video-quick-phrases'];
 const p=tokens.map(v=>studio.indexOf(v));
 assert.ok(p.every(n=>n>=0));
 assert.deepEqual(p,[...p].sort((a,b)=>a-b));
});
test("desktop has visible separate supporting phrase step; mobile retains old wizard",()=>{
 assert.ok(studio.indexOf('data-video-desktop-phrase-step')<studio.indexOf('id="video-ideas-concept-panel"'));
 assert.match(studio,/data-video-desktop-phrases-enabled/);
 assert.match(studio,/data-video-desktop-phrase-next/);
 assert.match(css,/\.desktopPhraseStep\{display:none\}/);
 assert.match(css,/@media\(min-width:760px\)/);
});
test("explicit selections overlay automatic storyboard but not manual text",()=>{
 const q={affirmationsEnabled:true,affirmationLines:["I am calm"],affirmationVisibility:["large"],storyboardCaptions:["different auto caption"],preferSelectedAffirmations:true};
 assert.equal(pickSingleVideoTextSource(q),"affirmations");
 assert.equal(pickSingleVideoTextSource({...q,timelineCaptions:[]}),"affirmations");
 assert.equal(pickSingleVideoTextSource({...q,timelineCaptions:[{text:"Own text"}]}),"stage");
 assert.equal(pickSingleVideoTextSource({...q,captionMode:"custom",caption:"Own caption"}),"caption");
 assert.match(studio,/preferSelectedAffirmations:desktopPhrasePinned/);
});
