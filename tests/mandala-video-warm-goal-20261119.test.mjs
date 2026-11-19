import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../components/"+n,import.meta.url),"utf8");
const director=read("mandala-auto-video-director.tsx");
const studio=read("mandala-free-video-studio.tsx");
const routeCss=read("mandala-video-goal-refresh.css");
const directorCss=read("mandala-auto-video-director.module.css");

test("approved Codex-sized prompt is the one existing request, not a visual duplicate",()=>{
 assert.match(director,/<textarea data-auto-video-input value=\{requestDraft\}/);
 assert.match(director,/rows=\{4\} maxLength=\{160\}/);
 assert.match(director,/data-video-request-card/);
 assert.match(director,/data-video-request-toolbar/);
 assert.match(director,/data-video-request-design className=\{css.designRequest\}/);
 assert.match(director,/onClick=\{designFromRequest\}/);
 assert.match(director,/event.ctrlKey\|\|event.metaKey/);
 assert.match(studio,/data-video-request-prompt/);
 assert.equal((studio.match(/data-video-request-prompt/g)||[]).length,1);
 assert.match(routeCss,/textarea\[data-auto-video-input\]/);
 assert.match(directorCss,/\.requestToolbar/);
});

test("underlined links Free/Pro and Guide me/Just make it preserve native handlers",()=>{
 assert.match(director,/data-video-prompt-tier/);
 assert.match(director,/data-video-prompt-flow/);
 assert.match(director,/onOpenPro\?\.\(\)/);
 assert.match(director,/onPickPhoto\?\.\(\)/);
 assert.match(director,/onOpenAudio\?\.\(\)/);
 assert.match(studio,/onOpenPro=\{\(\)=>activateQuickWorkspace\("pro"\)\}/);
 assert.match(studio,/onPickPhoto=\{\(\)=>onPickPhoto\(\)\}/);
 assert.match(directorCss,/\.composerMenu>summary/);
});

test("Life/Work and quick wishes work with existing verified 4-category source",()=>{
 assert.match(director,/data-video-quick-start/);
 assert.match(director,/data-video-quick-scope=\{scope\}/);
 assert.match(director,/data-video-quick-intents/);
 assert.match(director,/data-video-quick-intent=\{id\}/);
 for(const term of ["Быстрый старт","Quick Start","Inicio rápido","Жизнь","Life","Vida","Работа","Work","Trabajo"])assert.ok(director.includes(term),term);
 assert.match(director,/chooseCategory\(item.theme,item.id\)/);
 assert.match(routeCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(routeCss,/data-video-goal-art/);
});

test("Create Video routes to protected workflow without starting export or credits",()=>{
 assert.match(studio,/data-video-goal-create-cta/);
 assert.match(studio,/if\(goalQuizReady\)\{continueToIdeas\(\);return;\}/);
 assert.match(studio,/data-video-quick-controls/);
 assert.match(studio,/data-video-quick-hero-play/);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 assert.match(studio,/onClick=\{continueToIdeas\}/);
 assert.match(studio,/onCreate=\{openReadyForGeneration\}/);
 assert.match(routeCss,/data-video-goal-create-cta/);
});

test("one audience selector, real video format state and speech-to-goal dictation",()=>{
 assert.match(director,/quickScope=videoAudience==="self"\?"life":"work"/);
 assert.match(director,/changeVideoAudience\(scope==="life"\?"self":"others"\)/);
 assert.doesNotMatch(director,/data-auto-video-audience/);
 assert.match(director,/data-video-prompt-aspect/);
 assert.match(director,/data-video-request-aspect=\{format\}/);
 assert.match(director,/onAspectChange\?\.\(format\)/);
 assert.match(director,/videoAudience==="others"&&format!=="portrait"/);
 assert.match(director,/startDeviceVoiceCapture\(locale\)/);
 assert.match(director,/data-video-request-microphone/);
 assert.match(director,/onClick=\{togglePromptDictation\}/);
 assert.match(director,/applyRequestDraft\(next\)/);
 assert.match(director,/promptDictationGeneration\.current\+=1/);
 assert.match(director,/data-video-prompt-dictation-status/);
 assert.match(routeCss,/grid-template-columns:32px 34px/);
 assert.match(routeCss,/max-height:880px/);
 assert.match(directorCss,/\.formatMenuList/);
});
