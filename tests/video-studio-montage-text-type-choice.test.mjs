import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const choice=readFileSync(new URL("../components/mandala-montage-text-choice.tsx",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ideas=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-montage-text-choice.module.css",import.meta.url),"utf8");
test("three accessible EN/RU/ES text modes with 0/0/+50 XP",()=>{
 assert.match(choice,/type MontageTextMode="simple"\|"standard"\|"personalized"/);
 assert.deepEqual([...choice.matchAll(/\{id:"(simple|standard|personalized)",image:/g)].map(m=>m[1]),["simple","standard","personalized"]);
 assert.match(choice,/"\+50 XP":"0 XP"/);
 assert.match(choice,/data-video-text-choice-continue/);
 assert.match(choice,/aria-pressed=\{active\}/);
 for(const language of ["en:","ru:","es:"])assert.ok(choice.includes(language));
 assert.doesNotMatch(choice,/fetch\(|postVideoCreditAction|localStorage/);
});
test("Audio enters Text selection, Simple clears overlays; premium blocks unpriced export",()=>{
 assert.match(studio,/setMontageTextStage\("choice"\);setMontagePanel\("text"\)/);
 assert.match(studio,/montageTextStage==="choice" \? <MandalaMontageTextChoice/);
 assert.match(studio,/setCaptionMode\("none"\);setCustomCaption\(""\)/);
 assert.match(studio,/setTimelineTextClips\(null\);setMontageScriptText\(""\)/);
 assert.match(studio,/captionTexts:shots\.map\(\(_,index\)=>montageTextMode==="simple"\?""/);
 assert.match(studio,/data-video-text-personal-request/);
 assert.match(studio,/data-video-text-premium-unavailable/);
 assert.match(studio,/phraseMode=\{montageTextMode==="standard"\?"standard":"personalized"\}/);
 assert.match(css,/@media\(max-width:355px\)/);
});
test("standard selects classic phrases while personalized uses local goal",()=>{
 assert.match(ideas,/phraseMode\?:"standard"\|"personalized"/);
 assert.match(ideas,/phraseMode==="standard"/);
 assert.match(ideas,/categoryPhrases\.support\[captionLocale\]/);
});
