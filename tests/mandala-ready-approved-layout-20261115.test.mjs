import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
const studioCss=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const effectCss=readFileSync(new URL("../components/mandala-video-effect-journey.module.css",import.meta.url),"utf8");

test("Ready keeps one approved status and full-aspect preview in every phase",()=>{
  assert.match(ready,/const completed=Boolean\(verified&&video\)/);
  assert.match(ready,/data-ready-status-phase=\{completed\?"complete":rendering\?"rendering":checking\?"verifying":"idle"\}/);
  assert.match(ready,/<strong>\{completed\?t\.ready:pendingStatus\}<\/strong>/);
  assert.match(ready,/\{video\?<video key=\{video\.url\}/);
  assert.match(ready,/onCanPlay=\{event=>onVerifyPlayback\(event\.currentTarget\)\}/);
  assert.doesNotMatch(ready,/<span>\{rendering\?t\.generating:checking\?t\.verifying:t\.notReady\}<\/span>/);
  assert.match(css,/\.root\[data-ready-state="choose"\] \.selectedVideo:not\(\[data-video-file="true"\]\)/);
  assert.match(css,/aspect-ratio:16\/9/);
  assert.match(ready,/\{!completed&&!waiting\?<button type="button" className=\{css\.primary\}/);
  assert.match(ready,/\{waiting&&!completed&&rendering\?<div className=\{css\.generateProgress\} data-ready-generating>/);
  assert.match(ready,/<ReadyGenerationCheckIn locale=\{locale\}/);
  assert.doesNotMatch(ready,/data-ready-checkin>\{progressQuestionnaire\}/);
});

test("finished Ready follows reference order: real video, save/Telegram, two cards, new-video CTA",()=>{
  const status=ready.indexOf('data-ready-status-phase=');
  const preview=ready.indexOf('{header}',status);
  const save=ready.indexOf('data-ready-save><Download',preview);
  const med=ready.indexOf('data-ready-meditation',save);
  const course=ready.indexOf('data-ready-journey',med);
  const newVideo=ready.indexOf('data-ready-generate-new onClick={onStartNewVideo}',course);
  assert.ok(status>0&&preview>status&&save>preview&&med>save&&course>med&&newVideo>course);
  assert.match(ready,/src=\{completed\?"\/images\/holistic-house\/ready-save-sunrise-portrait\.jpg"/);
  assert.match(ready,/src=\{completed\?"\/images\/holistic-house\/messenger-zen-stones\.svg"/);
  assert.match(ready,/\{completed\?<button type="button" data-ready-generate-new onClick=\{onStartNewVideo\}>/);
  assert.doesNotMatch(ready,/<div className=\{css\.journey\}>\s*\{completed\?<button/);
  assert.match(css,/\.root\[data-ready-state="complete"\] > \[data-ready-generate-new\]\{display:flex/);
  assert.match(css,/\.root\[data-ready-state="complete"\] \.actions\{grid-template-columns:repeat\(2/);
});

test("only verified exported files show Save; legacy export notices and portal pill do not clutter Ready",()=>{
  assert.match(ready,/\{completed\?<>\s*<div className=\{css\.actions\}/);
  assert.match(ready,/if\(!verified\|\|!video\|\|disabled\)return/);
  assert.match(ready,/onGenerateBasicVideo\(\)/);
  assert.match(studioCss,/\.studio\[data-active-workspace="ready"\] \.notice/);
  assert.match(studioCss,/\.studio\[data-active-workspace="ready"\] \[data-video-result-empty\]/);
  assert.match(effectCss,/body:has\(\[data-active-workspace="ready"\]\) \.reopen\{display:none\}/);
  for(const locale of ["en","ru","es"]) assert.match(ready,new RegExp("  "+locale+":\\{"));
});

test("browser release tests exercise the current 7-card Ready wizard",()=>{
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(browser,/\[data-ready-checkin\] \[data-ready-sequential-checkin\]/);
  assert.match(browser,/data-ready-checkin-score="5"/);
  assert.match(browser,/await expect\(readyCheckin\)\.toContainText\("2 \/ 7"\)/);
  assert.doesNotMatch(browser,/\[data-ready-checkin\] \[data-video-checkin\]/);
  assert.match(browser,/await expect\(page\.locator\("\[data-video-effect-reopen\]"\)\)\.toBeHidden\(\)/);
});

test("Ready pending poster stays full 16:9 on iPhone instead of a 43px or 54px strip",()=>{
  const tail=css.slice(css.indexOf("/* Approved iPhone Ready reference:"));
  assert.match(tail,/width:100%;height:auto;min-height:0;max-height:none;aspect-ratio:16\/9/);
  assert.match(tail,/\.root\[data-ready-state="choose"\] \.selectedVideo:not\(\[data-video-file="true"\]\)/);
  assert.doesNotMatch(tail,/\.selectedVideo:not\(\[data-video-file="true"\]\)\{height:(?:43|54|64)px/);
});


test("Ready keeps the local Canvas compositor active but visually hidden",()=>{
  const match=studioCss.match(/\.studio\[data-active-workspace="ready"\] \.quickBuilder>\.previewStage\{([^}]+)\}/);
  assert.ok(match,"Ready needs one preserved source compositor");
  assert.match(match[1],/display:block!important/);
  assert.match(match[1],/position:absolute!important/);
  assert.match(match[1],/width:2px!important;height:2px!important/);
  assert.match(match[1],/opacity:0!important;pointer-events:none!important/);
  assert.doesNotMatch(studioCss,/\.studio\[data-active-workspace="ready"\] \.quickBuilder>\.previewStage,\s*\.studio\[data-active-workspace="ready"\] \.quickBuilder>\.workspaceHeading/);
  const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
  assert.match(browser,/const sourceCompositor=await readySourceStage.evaluate/);
  assert.match(browser,/assert.notEqual\(sourceCompositor.display,"none"/);
});

test("Montage Settings Audio works on a real iPhone touch and remains keyboard accessible",()=>{
 const idx=studio.indexOf("data-video-montage-open-audio");
 assert.ok(idx>0);
 const button=studio.slice(idx,idx+400);
 assert.ok(button.includes('onPointerUp={openMontageAudioFromSettings}'));
 assert.ok(button.includes('onClick={openMontageAudioFromSettings}'));
 assert.ok(studio.includes('const montageAudioNavQueuedRef=useRef(false)'));
 assert.ok(studio.includes('window.requestAnimationFrame(()=>{\n      montageAudioNavQueuedRef.current=false'));
 assert.ok(studio.includes('montageAudioShortcutIgnoreNextUntilRef.current=performance.now()+600'));
 assert.ok(studio.includes('performance.now()<montageAudioShortcutIgnoreNextUntilRef.current'));

 const browser=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");
 for(const name of ["montageAudio","ownAudioStep","montageAudioTab","montageAudioAfterExport"])
   assert.ok(browser.includes('if(engine==="webkit")await '+name+'.tap();'),name+" requires actual WebKit touch");
 assert.ok(browser.includes('toHaveAttribute("data-montage-panel","audio",{timeout:15000})'));
 assert.ok(browser.includes('requestAnimationFrame(()=>requestAnimationFrame(resolve))'));
 assert.ok(browser.includes("ready-real-encoded-mp4-auth-gate-verified"));
});
