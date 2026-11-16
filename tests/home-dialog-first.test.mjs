import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HOME_INTENT_HANDOFF_KEY,HOME_INTENT_MAX_LENGTH,HOME_INTENT_TTL_MS,parseHomeIntentHandoff} from "../lib/home-intent-handoff.mjs";
import {UNIFIED_DOCK_IDS,unifiedMobileDockHref,isUnifiedMobileDockHomePath} from "../lib/unified-mobile-dock.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("the approved landing preserves exactly seven existing bottom navigation choices",()=>{
 assert.deepEqual(UNIFIED_DOCK_IDS,["mytube","video","coach","ai","services","practice","profile"]);
 assert.equal(isUnifiedMobileDockHomePath("/"),true);
 assert.equal(isUnifiedMobileDockHomePath("/ru"),true);
 assert.equal(isUnifiedMobileDockHomePath("/es"),true);
 for(const locale of ["en","ru","es"])for(const id of UNIFIED_DOCK_IDS)
   assert.ok(unifiedMobileDockHref(locale,id),"Missing "+locale+"/"+id);
 const shared=read("components/unified-mobile-dock.tsx");
 assert.match(shared,/UNIFIED_DOCK_IDS\.map\(id =>/);
 assert.match(shared,/data-unified-dock-item=\{id\}/);
});
test("the first Home response is conversation-first with three language and purpose variants",()=>{
 const entry=read("components/home-dialog-first.tsx");
 const wrapper=read("components/holistic-house-home.tsx");
 const spanish=read("app/es/page.tsx");
 assert.match(wrapper,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(spanish,/<HomeDialogFirst locale="es"\/>/);
 for(const copy of ["Для себя","Для бизнеса","For myself","For business","Para mí","Para negocios","My Space"])
   assert.ok(entry.includes(copy),copy);
 assert.match(entry,/data-home-first-header/);
 assert.match(entry,/data-home-purpose-switch/);
 assert.match(entry,/data-home-intent-form/);
 assert.match(entry,/data-home-intent-microphone/);
 assert.match(entry,/data-home-intent-submit/);
 assert.match(entry,/data-home-quick-intents/);
 assert.doesNotMatch(wrapper,/HomeFeaturedWorkspace|HomeSectionCarousel|PersonalTestimonials|HomePresentationVideoSection/);
 assert.doesNotMatch(entry,/<video|<iframe|autoplay|fetch\(/);
 assert.match(entry,/priority unoptimized/);
 const css=read("components/home-dialog-first.module.css");
 assert.match(css,/\.hero\{position:relative/);
 assert.match(css,/max-width:850px/);
 assert.match(css,/@media\(max-width:350px\)/);
});
test("a user-submitted message survives only an exact same-tab, short-lived handoff",()=>{
 const now=1800000000000;
 const valid={text:"  Я хочу создать курс Рейки  ",locale:"ru",mode:"business",at:now};
 assert.equal(HOME_INTENT_HANDOFF_KEY,"hh:home-intent-handoff:v1");
 assert.equal(parseHomeIntentHandoff(JSON.stringify(valid),"ru",now)?.text,"Я хочу создать курс Рейки");
 for(const mutation of [
  {...valid,mode:"nope"},
  {...valid,locale:"en"},
  {...valid,text:" "},
  {...valid,text:"x".repeat(HOME_INTENT_MAX_LENGTH+1)},
  {...valid,at:now-HOME_INTENT_TTL_MS-1},
  {...valid,at:now+5001},
  {...valid,at:"now"},
 ]){
  assert.equal(parseHomeIntentHandoff(JSON.stringify(mutation),"ru",now),null);
 }
 for(const bad of ["","{","[]","null",JSON.stringify(valid).repeat(300)])
   assert.equal(parseHomeIntentHandoff(bad,"ru",now),null);
 assert.equal(parseHomeIntentHandoff(JSON.stringify(valid),"en",now),null);
});
test("Home sends only after explicit intent, Ali consumes once through the owned AI safety pipeline",()=>{
 const home=read("components/home-dialog-first.tsx");
 const bridge=read("components/app/messenger-ai-workspace.jsx");
 const agent=read("components/holistic-agent-chat.tsx");
 assert.match(home,/onSubmit=\{submit\}/);
 assert.match(home,/sessionStorage\.setItem\(HOME_INTENT_HANDOFF_KEY/);
 assert.match(home,/window\.location\.assign\(assistant\)/);
 assert.doesNotMatch(home,/localStorage\.setItem|searchParams\.set\("message"|sendBeacon|dangerouslySetInnerHTML/);
 assert.match(bridge,/sessionStorage\.removeItem\(HOME_INTENT_HANDOFF_KEY\)/);
 assert.match(bridge,/parseHomeIntentHandoff\(raw,locale\)/);
 assert.match(bridge,/autoSubmit:true/);
 assert.match(agent,/homeIntentConsumed\.current===quickPrompt\.revision/);
 assert.match(agent,/void sendTurn\(quickPrompt\.text\)/);
 assert.match(agent,/mode==="owned"&&!agree/);
 assert.match(agent,/requiresProtectedReply\(text,turnLocale\)/);
});
