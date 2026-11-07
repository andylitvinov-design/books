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
 assert.match(component,/choices\.map\(\(\[label,value\]\)=>/);
 assert.match(component,/data-video-chat-welcome-goal=\{value\}/);
 assert.match(component,/onClick=\{\(\)=>\{setWelcomeDismissed\(true\);answer\(value\);\}\}/);
 assert.match(component,/data-video-chat-tree-choice=\{value\}/);
 assert.match(component,/showWelcome\?<div className=\{css\.welcome\}/);
 assert.match(component,/\:lines\.map\(line=>line\.role===/);
 assert.ok(component.includes('href={"/"+locale+"/mytube"}'));
});
test("welcome is readable and safe, then yields to the existing conversation",()=>{
 for(const value of ["Привет!","Let's create your video","Creemos tu vídeo",
   "Or tell me in your own words","data-video-chat-welcome-create",
   "data-video-chat-welcome-help","data-video-chat-welcome-how",
   "data-chat-welcome={showWelcome?","aria-label={t.placeholder}"])
   assert.ok(component.includes(value),value);
 assert.match(styles,/\.welcomeTitle\{[^}]*font:850 clamp\(29px/);
 assert.match(styles,/\.goalRail\{[^}]*overflow-x:auto/);
 assert.match(styles,/@media\(max-width:370px\)/);
 assert.match(styles,/\.window\[data-chat-welcome="true"\] \.aiOptIn\{display:none\}/);
 assert.match(component,/const \[aiConsent,setAiConsent\]=useState\(false\)/);
 assert.match(component,/setWelcomeDismissed\(false\)/);
 assert.match(component,/setWelcomeDismissed\(true\);answer\("помоги"\)/);
 assert.match(component,/thread\.scrollTop=showWelcome\?0:thread\.scrollHeight/);
 assert.match(browser,/CALM_WELCOME_MUST_START_AT_TOP/);
 assert.match(browser,/CALM_WELCOME_GREETING_MUST_BE_IN_VIEWPORT/);
 assert.match(browser,/CALM_WELCOME_CANONICAL_FIVE_GOALS/);
 assert.match(browser,/CALM_WELCOME_MUST_YIELD_TO_REAL_CHAT/);
});
