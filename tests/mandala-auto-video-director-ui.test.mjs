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
