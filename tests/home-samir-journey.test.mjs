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
 assert.match(home,/stepIcons=\[Route,Sparkles,Leaf,CheckCircle2,Heart,TrendingUp,ArrowUp\]/);
 assert.match(home,/methodIcons=\[UsersRound,CheckCircle2,Play,Leaf,Sparkles\]/);
 assert.match(home,/data-home-stage-scroll/);
});
test("home graphics reuse verified local assets, audio, microphone and same-tab handoff",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 for(const image of ["growth.webp","love.webp","energy.webp","stress.webp"])assert.ok(home.includes(image),image);
 assert.match(home,/src=\{picture\}/);
 assert.match(home,/playAliPersonaAudio\(persona\.id,locale/);
 assert.match(home,/speech\.start\(\)/);
 assert.match(home,/stageHomeAliHandoff\(window\.sessionStorage/);
 assert.match(home,/router\.push\(chatPath\)/);
 assert.match(home,/app\/messages\?section=ai/);
 assert.doesNotMatch(home,/URLSearchParams/);
});
