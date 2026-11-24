import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Samir homepage has one WhatsApp-style composer, no audience selector, three starts",()=>{
 const home=read("components/home-dialogue-entry.tsx"),css=read("components/home-dialogue-entry.module.css");
 assert.equal((home.match(/<form className=\{styles\.composer\}/g)||[]).length,1);
 assert.doesNotMatch(home,/data-home-mode-button=/);
 for(const id of ["understand","goal","talk"])assert.ok(home.includes('data-home-intent-option="'+id+'"'));
 assert.match(home,/useAliPersona\("alex"\)/);
 assert.match(css,/SAMIR_HOME_OWNER_APPROVED_20261123/);
 assert.match(css,/\.composerButtons \.send/);
});
test("all seven stages and five tools are real content in RU EN ES",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 for(const phrase of ["7 шагов к твоей цели","7 steps to your goal","7 pasos hacia tu meta",
  "Помоги разобраться","У меня уже есть цель","Давай просто поговорим",
  "ИИ-коучи","Специалисты","Видео","Тесты","Практики"])
  assert.ok(home.includes(phrase),phrase);
 assert.match(home,/data-home-stage-option=\{index\+1\}/);
 assert.match(home,/stepIcons=\[Compass,Flame,Flower2,ClipboardList,Shield,Sprout,ChevronsRight\]/);
 assert.match(home,/methodIcons=\[UsersRound,GraduationCap,Play,BarChart3,Flower2\]/);
 assert.match(home,/data-home-stage-scroll/);
});
test("home graphics reuse verified local assets, audio, microphone and same-tab handoff",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 for(const image of ["growth.webp","love.webp","energy.webp","stress.webp"])assert.ok(home.includes(image),image);
 assert.match(home,/src=\{picture\}/);
 assert.match(home,/playAliPersonaAudio\(persona\.id,locale/);
 assert.match(home,/variant="dictation" micMarker="data-home-intent-mic"/);
 assert.match(home,/stageHomeAliHandoff\(window\.sessionStorage/);
 assert.match(home,/router\.push\(chatPath\)/);
 assert.match(home,/app\/messages\?section=ai/);
 assert.doesNotMatch(home,/URLSearchParams/);
});

test("approved mock: seven connected circles, separate graphics, shared dock untouched",()=>{
 const home=read("components/home-dialogue-entry.tsx"),style=read("components/home-dialogue-entry.module.css"),dock=read("components/unified-mobile-dock.tsx");
 assert.match(style,/SAMIR_MOCK_FIDELITY_20261123_V2/);
 assert.match(style,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
 assert.match(style,/\.journeyScroll:before/);
 for(const picture of ["wealth-sunrise.jpg","sun-warm-ocean-dawn.jpg","ali-inner-alchemist-hero.webp"])assert.ok(home.includes(picture));
 assert.doesNotMatch(home,/src="[^"]*samir-goal-(sunrise|sailboat)\.svg"/);
 assert.match(style,/SAMIR_PHOTO_FIRST_SCREEN_V3/);
 assert.match(home,/data-home-methods/);
 assert.match(home,/MessengerVoiceNote locale=\{locale\} variant="dictation"/);
 assert.match(dock,/UNIFIED_DOCK_IDS/);
 assert.doesNotMatch(home,/UnifiedMobileDock|data-hh-unified-dock/);
});
