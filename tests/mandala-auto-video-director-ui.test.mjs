import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
const policy=readFileSync(new URL("../lib/mandala/auto-video-director.mjs",import.meta.url),"utf8");

test("Auto Director is below the soundtrack and above the playable file in the existing studio",()=>{
 assert.ok(studio.includes("<MandalaAutoVideoDirector"));
 assert.ok(studio.indexOf('data-video-quick-audio-choices') < studio.indexOf("<MandalaAutoVideoDirector"));
 assert.ok(studio.indexOf("<MandalaAutoVideoDirector") < studio.indexOf('id="personal-video-result"'));
 assert.ok(studio.includes("compileFreeFilmPreset(preset,locale,seconds"));
 assert.ok(studio.includes("onApply={applyAutoFilm}"));
 assert.ok(studio.includes("setPracticeLevels(value=>({...value,video:\"basic\"}))"));
});
test("only one goal input, a visible proposal and a confirmation gate",()=>{
 assert.ok(director.includes("data-auto-video-director"));
 assert.ok(director.includes("data-auto-video-input"));
 assert.ok(director.includes("data-auto-video-confirm"));
 assert.ok(director.includes("recommendAutoVideo({goal,locale,fallbackTheme:theme,presets,scenes})"));
 assert.ok(director.includes("data-auto-video-goal={item.id}"));
 assert.ok(studio.includes('scenes={FREE_FILM_CATALOG}'));
 assert.ok(director.includes('scene.description[locale]'));
 assert.ok(director.includes('scene.tags.slice(0,3)'));
 assert.ok(director.includes("onClick={()=>chooseReadyGoal(item.id)}"));
 assert.ok(director.includes("goalId:selectedGoalId"));
 assert.ok(director.includes("onGoalChange(nextGoal)"));
 assert.ok(!studio.includes("<input data-video-quick-wish"));
 assert.ok(director.includes("onClick={()=>onApply(chosen.id,length"));
 assert.ok(director.includes("data-auto-video-story-options"));
 assert.ok(director.includes("data-auto-video-option={id}"));
 assert.ok(director.includes("aria-pressed={chosen.id===id}"));
 assert.ok(director.includes("proposalContext?.goal===goal"));
 assert.ok(studio.includes("setWish(next.slice(0,160))"),"accept trailing spaces while editing");
 assert.ok(!studio.includes("setWish(graphemeTrim(next))"),"do not trim the final word boundary");
 assert.ok(studio.includes("aspect={aspect}"),"retain user-selected aspect");
});
test("recommendation never initiates external paid generation or user-data upload",()=>{
 assert.ok(policy.includes("paidRenderApproved:false"));
 assert.ok(policy.includes("noExternalClientData:true"));
 assert.ok(!director.includes("fetch("));
 assert.ok(!director.includes("providerApi"));
 assert.ok(!policy.includes("localStorage"));
 assert.ok(!policy.includes("sessionStorage"));
});

test("iPhone goal fields stay at native scale and the browser retries real codec options",()=>{
 const style=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");
 const free=readFileSync(new URL("../components/mandala-first-video-start.module.css",import.meta.url),"utf8");
 assert.match(style,/\.goal input\{[^}]*font-size:16px/);
 assert.match(style,/\.storyChoices button\[aria-pressed="true"\]/);
 assert.match(free,/iOS Safari zooms any editable control/);
 assert.match(studio,/forceMp4:forceMp4ForRetry\|\|\(isApplePhone&&!preferWebm\)/);
 assert.match(studio,/data-video-retry-compatible/);
 assert.match(studio,/data-video-save-direct/);
 assert.match(studio,/data-mandala-video-preview/);
});

test("owner's iPhone mock uses ONE live player, one shared goal and four pictured story options",()=>{
 const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
 const autoCss=readFileSync(new URL("../components/mandala-auto-video-director.module.css",import.meta.url),"utf8");
 const taxonomy=JSON.parse(readFileSync(new URL("../data/video-catalog/scene-taxonomy.json",import.meta.url),"utf8"));
 assert.equal((studio.match(/data-video-director-goal-controls/g)||[]).length,1,
   "the theme card provides exactly one portal host for the actual Director input");
 assert.match(director,/createPortal\(goalPanel,goalTarget\)/,
   "the same interactive goal controls move to the theme card; no second goal state");
 assert.equal((director.match(/data-auto-video-input value=\{goal\}/g)||[]).length,1);
 assert.match(director,/primaryGoalIds=new Set\(\["confidence","connection","fresh-start","stability"\]\)/);
 assert.match(director,/data-auto-video-more-goals/,"other goals remain available");
 assert.match(director,/data-auto-video-clarify/);
 assert.match(director,/data-auto-video-refine-panel/);
 assert.match(director,/data-auto-video-option=\{id\}/);
 assert.match(director,/scenePoster\(option\.clips\[0\]\)/);
 assert.match(director,/scenePoster\(clip\)/);
 assert.match(director,/data-auto-video-create/);
 assert.match(studio,/onCreate=\{createQuickVideo\}/,"the button calls the existing local MediaRecorder path");
 assert.match(studio,/canCreate=\{canGenerate\}/,"four decoded originals + selected audio stay required");
 assert.match(studio,/data-video-result-empty/);
 assert.match(studio,/data-video-result-play/);
 assert.match(studio,/resultVideoRef\.current/);
 assert.match(studio,/playAudioTrack\(id\);setAttachedAudio\(\{kind:"preset",id\}\)/);
 assert.match(studio,/audioMatches\.filter\(track=>track\.kind==="melody"\)\.slice\(0,3\)/);
 assert.match(studio,/data-video-theme-advanced/,"existing six topical video scenes remain editable");
 assert.match(css,/\.studio \.quickBuilder>\.previewStage\{order:1/);
 assert.match(css,/\[data-video-quick-section="1"\]\{order:3/);
 assert.match(css,/\[data-video-quick-audio-choices\]\{order:4/);
 assert.match(css,/\[data-auto-video-director\]\{order:5/);
 assert.match(css,/\[data-video-result\]/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
   "six workspaces fit into one mobile row");
 assert.match(autoCss,/\.storyChoices\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(autoCss,/\.shots\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 const approved=taxonomy.scenes.filter(scene=>scene.status==="approved");
 assert.equal(approved.length,44);
 assert.ok(approved.every(scene=>scene.poster?.startsWith("/videos/holistic-house/")&&
   scene.poster.endsWith(".jpg") && scene.video.endsWith(".mp4")));
});
