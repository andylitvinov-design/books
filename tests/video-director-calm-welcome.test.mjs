import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {videoChatTreeOptions} from "../lib/mandala/video-chat-tree.mjs";

const component=readFileSync(new URL("../components/mandala-video-director-chat.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../components/mandala-video-director-chat.module.css",import.meta.url),"utf8");
const browser=readFileSync(new URL("../scripts/benchmarking/video-director-chat-live-acceptance.mjs",import.meta.url),"utf8");

test("calm iHelp first screen reuses canonical Video Director and five localized goal choices",()=>{
 for(const locale of ["ru","en","es"]){
   const goals=videoChatTreeOptions({categoryId:null},"category",locale);
   assert.equal(goals.length,5,locale);
   assert.deepEqual(goals.map(x=>x.id),["body","business","energy","love","stress"]);
 }
 assert.match(component,/data-video-chat-welcome/);
 assert.match(component,/data-video-chat-welcome-goals/);
 assert.match(component,/welcomeChoices\.map\(\(\[label,value\]\)=>/);
 assert.match(component,/data-video-chat-welcome-goal=\{value\}/);
 assert.match(component,/onClick=\{\(\)=>\{setWelcomeDismissed\(true\);answer\(value\);\}\}/);
 assert.match(component,/data-video-chat-tree-choice=\{value\}/);
 assert.match(component,/showWelcome\?<div className=\{css\.welcome\}/);
 assert.match(component,/WELCOME_TOPIC_ORDER=\["body","energy","love","business","stress"\]/);
 assert.match(component,/\:lines\.map\(line=>line\.role===/);
 assert.ok(component.includes('href={"/"+locale+"/mytube"}'));
});
test("welcome is readable and safe, then yields to the existing conversation",()=>{
 for(const value of ["Привет!","Let's create your video","Creemos tu vídeo",
   "Your goal or idea…","data-video-chat-welcome-create",
   "data-video-chat-welcome-help","data-video-chat-welcome-how",
   "data-chat-welcome={showWelcome?","aria-label={t.placeholder}"])
   assert.ok(component.includes(value),value);
 assert.match(styles,/\.welcomeTitle\{[^}]*font:850 clamp\(29px/);
 assert.match(styles,/\.goalRail\{[^}]*overflow-x:auto/);
 assert.match(styles,/@media\(max-width:355px\)/);
 assert.match(styles,/\.window\[data-chat-welcome="true"\] \.aiOptIn\{display:none\}/);
 assert.match(component,/const \[aiConsent,setAiConsent\]=useState\(false\)/);
 assert.match(component,/setWelcomeDismissed\(false\)/);
 assert.match(component,/setWelcomeDismissed\(true\);answer\("помоги"\)/);
 assert.ok(component.includes("data-video-chat-composer"));
 assert.ok(component.includes("{showWelcome&&<button className={css.composerMic}"));
 assert.ok(component.includes("{!showWelcome&&composer}"));
 assert.ok(component.includes("data-welcome-action-media=\"create\""));
 assert.ok(component.includes("data-welcome-action-media=\"ideas\""));
 assert.ok(component.includes("data-welcome-action-media=\"ask\""));
 assert.match(component,/thread\.scrollTop=showWelcome\?0:thread\.scrollHeight/);
 assert.match(styles,/\.welcomeHero\{[\s\S]*?url\("\/images\/holistic-house\/reiki-approved-sunrise-v3\.webp"\)/);
 assert.ok(styles.includes('.actionMedia[data-welcome-action-media="create"]'));
 assert.ok(styles.includes('.actionMedia[data-welcome-action-media="ideas"]'));
 assert.ok(styles.includes('.actionMedia[data-welcome-action-media="ask"]'));
 assert.ok(styles.includes('.window[data-chat-welcome="true"] .chatTabs{order:2'));
 assert.ok(styles.includes('.window[data-chat-welcome="true"] .composer{display:flex'));
 assert.ok(component.includes('rows={showWelcome?1:2}'));
 assert.ok(component.includes('w.topicNames[value as keyof typeof w.topicNames]'));
 assert.match(browser,/CALM_WELCOME_MUST_START_AT_TOP/);
 assert.match(browser,/CALM_WELCOME_GREETING_MUST_BE_IN_VIEWPORT/);
 assert.match(browser,/CALM_WELCOME_CANONICAL_FIVE_GOALS/);
 assert.match(browser,/CALM_WELCOME_MUST_YIELD_TO_REAL_CHAT/);
});

test("Create and every subsequent step retain the same photographic iHelp shell",()=>{
 assert.match(component,/data-chat-dialogue=\{!showWelcome\?"true":undefined\}/);
 assert.match(component,/data-video-chat-dialogue-hero/);
 assert.match(component,/className=\{\`\$\{css\.welcomeHero\} \$\{css\.dialogueHero\}\`\}/);
 for(const value of ["Ваше видео — ваш сюжет","Your video, your story",
   "Tu vídeo, tu historia","data-video-chat-advanced","{chatNav}",
   "{!showWelcome&&composer}","setWelcomeDismissed(true)"])
   assert.ok(component.includes(value),value);
 assert.match(styles,/\.dialogueHero\{[^}]*min-height:160px/);
 assert.match(styles,/\.window\[data-chat-dialogue="true"\] \.thread\{[^}]*overflow-x:hidden/);
 assert.match(styles,/\.window\[data-chat-dialogue="true"\] \.composer\{/);
 assert.match(styles,/\.window\[data-chat-dialogue="true"\] \.chatTabs\{/);
 assert.match(component,/\{!showWelcome&&<button className=\{css\.composerMic\}/);
 assert.match(component,/const \[aiConsent,setAiConsent\]=useState\(false\)/);
 for(const marker of ["PHOTO_HERO_MUST_SURVIVE_CREATE","PHOTO_HERO_LOST_AT_STAGE_",
   "ACTIVE_REPLY_COMPOSER_MUST_BE_VISIBLE","AI_ORDERS_CLIENTS_AFTER_COMPOSER"])
   assert.ok(browser.includes(marker),marker);
});
