import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Samir home shows three horizontal programs and no old stages or audience selector",()=>{
 const home=read("components/home-dialogue-entry.tsx"),css=read("components/home-dialogue-entry.module.css");
 assert.equal((home.match(/<form className=\{styles\.composer\}/g)||[]).length,1);
 assert.doesNotMatch(home,/data-home-mode-button=|data-home-stage-option=|data-home-stage-scroll|data-home-how-it-works/);
 for(const id of ["clarity","goal","business"])assert.ok(home.includes('id:"'+id+'"'));
 assert.match(home,/data-home-intent-option=\{art\.id\}/);
 assert.match(home,/art\.id==="business"\?"business":"self"/);
 assert.match(home,/useAliPersona\("alex"\)/);
 assert.match(css,/\.programGrid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.programCard\{position:relative;display:grid/);
 assert.match(css,/\.composerButtons \.send/);
});
test("all three program names and five tools have complete localized copy",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 for(const phrase of ["Ясность и снятие стресса","Достижение моей цели","Поддержка бизнеса","Clarity & Stress Relief","Achieving My Goal","Business Support","Claridad y alivio del estrés","Alcanzar mi meta","Apoyo empresarial","ИИ-коучи","Программы","Видео","Тесты","Практики"])assert.ok(home.includes(phrase),phrase);
 assert.match(home,/const msg=programCopy\[locale\]/);
 assert.match(home,/methodIcons=\[UsersRound,GraduationCap,Play,BarChart3,Flower2\]/);
 assert.match(home,/program\.steps\.map/);
});
test("existing persona, audio, microphone, same-tab chat handoff and shared dock remain",()=>{
 const home=read("components/home-dialogue-entry.tsx"),dock=read("components/unified-mobile-dock.tsx");
 for(const image of ["support-business-choice-photos-hd.webp","support-personal-choice-photos-hd.webp","profile-card-photos.webp","ali-inner-alchemist-hero.webp"])assert.ok(home.includes(image),image);
 assert.match(home,/src=\{picture\}/);
 assert.match(home,/playAliPersonaAudio\(persona\.id,locale/);
 assert.match(home,/variant="dictation" micMarker="data-home-intent-mic"/);
 assert.match(home,/stageHomeAliHandoff\(window\.sessionStorage/);
 assert.match(home,/router\.push\(chatPath\)/);
 assert.match(home,/app\/messages\?section=ai/);

 assert.match(home,/data-home-methods/);
 assert.match(home,/MessengerVoiceNote locale=\{locale\} variant="dictation"/);
 assert.match(dock,/UNIFIED_DOCK_IDS/);
 assert.doesNotMatch(home,/URLSearchParams|UnifiedMobileDock|data-hh-unified-dock/);
});

test("approved photo-led home keeps its idle composer compact and uses home-only integrated dock",()=>{
 const home=read("components/home-dialogue-entry.tsx"),css=read("components/home-dialogue-entry.module.css"),dock=read("components/unified-mobile-dock.module.css");
 const verify=read("scripts/verify-home-consultation-first-screen.mjs");
 assert.match(home,/data-home-has-draft=\{Boolean\(draft\.trim\(\)\)\}/);
 assert.match(home,/micDescribedBy="home-voice-disclosure"/);
 assert.match(home,/className=\{styles\.visuallyHidden\} data-home-voice-disclosure/);
 assert.match(home,/data-home-program-art=\{art\.id\}/);
 assert.match(css,/HOME_APPROVED_REFERENCE_20261124/);
 assert.match(css,/\.programSteps\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.root \.composer\[data-home-has-draft="false"\] \.send\{display:none\}/);
 assert.match(dock,/\.dock\[data-hh-home-route="true"\] \.item\[data-unified-dock-item="ai"\] svg\{position:static/);
 assert.match(verify,/all five tools fit on initial screen/);
 assert.match(verify,/active recording retains explicit provider disclosure/);
});
