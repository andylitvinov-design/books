import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {HOME_ALI_HANDOFF_KEY, HOME_ALI_HANDOFF_MAX_AGE,prepareHomeAliHandoff,stageHomeAliHandoff,consumeHomeAliHandoff,peekHomeAliHandoff,acknowledgeHomeAliHandoff} from "../lib/home-ali-handoff.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function memoryStorage(){
 const map=new Map();
 return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key),entries:()=>[...map.entries()]};
}

test("public Home has one light conversation-first entry and preserves seven real dock routes",()=>{
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const entry=read("components/home-dialogue-entry.tsx");
 const dock=read("lib/unified-mobile-dock.mjs");
 const globalDock=read("components/unified-mobile-dock.tsx");
 for(const source of [home,es]) {
   assert.match(source,/<HomeDialogueEntry locale=\{/);
   assert.match(source,/<HomeDeferredSections locale=\{/);
   assert.doesNotMatch(source,/<ProfileHubTabs|<HomeFeaturedWorkspace|<HomeSectionCarousel|<HomeMoreDisclosure/);
 }
 assert.match(home,/data-home-design="dialogue-first-v1"/);
 assert.match(home,/data-home-video-below-fold/);
 assert.match(entry,/data-home-dialogue-header/);
 assert.match(entry,/<h1>Holistic House<\/h1>/);
 assert.match(entry,/<SiteNavigation locale=\{locale\} compact \/>/);
 assert.match(entry,/data-home-intent-form/);
 assert.match(entry,/data-home-send-to-ali/);
 assert.doesNotMatch(entry,/data-home-mode-button=/);
 assert.match(entry,/data-home-intent-option="understand"/);
 assert.match(entry,/data-home-intent-option="goal"/);
 assert.match(entry,/data-home-intent-option="talk"/);
 assert.match(entry,/data-home-stage-option=\{index\+1\}/);
 assert.match(dock,/"mytube","video","coach","ai","services","practice","profile"/);
 assert.match(globalDock,/UNIFIED_DOCK_IDS\.map\(id =>/);
});

test("initial paint is local and deferred: no media network or large course bundle ahead of Ali composer",()=>{
 const main=read("components/holistic-house-home.tsx");
 const entry=read("components/home-dialogue-entry.tsx");
 const lazy=read("components/home-deferred-sections.tsx");
 const content=read("components/home-deferred-content.tsx");
 const catalog=read("components/home-expanded-catalog.tsx");
 const styles=read("components/home-dialogue-entry.module.css");
 const image=statSync(new URL("../public/images/holistic-house/ideas-pine-reference.webp",import.meta.url));
 assert.ok(image.size<=16*1024,"The initial Home hero image must remain tiny");
 assert.match(styles,/ideas-pine-reference\.webp/);
 assert.match(lazy,/IntersectionObserver/);
 assert.match(lazy,/rootMargin:"220px 0px"/);
 assert.match(lazy,/const HomeDeferredContent = lazy\(/);
 assert.match(content,/const HomeExpandedCatalog = lazy\(/);
 assert.match(content,/MySpaceTopics/);
 // The topic component is allowed as a direct import INSIDE the deferred module.
 // The first-screen observer must not import its CSS-bearing content eagerly.
 assert.doesNotMatch(lazy,/^import \{ MySpaceTopics \} from/m);
 assert.match(content,/^import \{ MySpaceTopics \} from/m);
 assert.match(catalog,/HomeFeaturedWorkspace/);
 assert.doesNotMatch(main,/<HomeFeaturedWorkspace|<HomeSectionCarousel|<MySpaceTopics/);
 assert.doesNotMatch(entry,/https:\/\/|<iframe|<video|fetch\(/);
 assert.match(styles,/white-space:nowrap/);
 assert.match(styles,/\.header h1/);
});

test("one-time Ali handoff never leaks prompts into URL or long-term browser state",()=>{
 const storage=memoryStorage();
 const input={text:"Хочу создать свой курс",locale:"ru",mode:"business",now:10000};
 assert.deepEqual(prepareHomeAliHandoff(input),{
   v:1,source:"home",text:input.text,locale:"ru",mode:"business",createdAt:10000
 });
 assert.equal(stageHomeAliHandoff(storage,input),true);
 assert.deepEqual(storage.entries().map(([key])=>key),[HOME_ALI_HANDOFF_KEY]);
 assert.equal(consumeHomeAliHandoff(storage,"ru",10001)?.text,input.text);
 assert.equal(storage.entries().length,0);
 assert.equal(consumeHomeAliHandoff(storage,"ru",10002),null);
 assert.equal(stageHomeAliHandoff(storage,input),true);
 assert.equal(consumeHomeAliHandoff(storage,"en",10010),null,"no cross-language replay");
 assert.equal(storage.entries().length,0);
 assert.equal(stageHomeAliHandoff(storage,input),true);
 assert.equal(consumeHomeAliHandoff(storage,"ru",10000+HOME_ALI_HANDOFF_MAX_AGE+1),null);
 for(const bad of [{...input,mode:"invalid"},{...input,locale:"other"},{...input,text:" "},{...input,text:"x".repeat(2001)}])
   assert.equal(prepareHomeAliHandoff(bad),null);
});

test("Ali receives the once-consumed Home request in the established chat, behind existing consent",()=>{
 const entry=read("components/home-dialogue-entry.tsx");
 const chat=read("components/holistic-agent-chat.tsx");
 const route=read("app/[locale]/app/messages/page.tsx");
 assert.match(entry,/stageHomeAliHandoff\(window\.sessionStorage/);
 assert.match(entry,/router\.push\(chatPath\)/);
 assert.match(entry,/app\/messages\?section=ai/);
 assert.match(chat,/peekHomeAliHandoff\(window\.sessionStorage,routeLocale\)/);
 assert.match(chat,/acknowledgeHomeAliHandoff\(window\.sessionStorage,pending\.payload\)/);
 assert.match(chat,/homeHandoffConsumed\.current=true/);
 assert.match(chat,/void sendTurn\(message\)/);
 assert.match(chat,/mode==="owned"&&!agree/);
 assert.match(route,/MessagesOrdersClients/);
 assert.doesNotMatch(entry,/URLSearchParams|setItem\(["']localStorage/);
});

test("non-destructive Home handoff and compare-and-delete prevent missing first turn",()=>{
 const storage=memoryStorage();
 const old={text:"Понять себя",locale:"ru",mode:"self",now:10000};
 assert.equal(stageHomeAliHandoff(storage,old),true);
 const first=peekHomeAliHandoff(storage,"ru",10001);
 assert.equal(first?.text,"Понять себя");
 assert.equal(storage.entries().length,1);
 assert.equal(peekHomeAliHandoff(storage,"en",10002),null);
 assert.equal(storage.entries().length,1);
 assert.equal(stageHomeAliHandoff(storage,{...old,text:"Новый запрос",now:10003}),true);
 assert.equal(acknowledgeHomeAliHandoff(storage,first),false);
 const latest=peekHomeAliHandoff(storage,"ru",10004);
 assert.equal(latest?.text,"Новый запрос");
 assert.equal(acknowledgeHomeAliHandoff(storage,latest),true);
 assert.equal(storage.entries().length,0);
 assert.equal(acknowledgeHomeAliHandoff(storage,latest),false);
 assert.equal(stageHomeAliHandoff(storage,{...old,now:10010}),true);
 assert.equal(peekHomeAliHandoff(storage,"ru",10010+HOME_ALI_HANDOFF_MAX_AGE+1),null);
 assert.equal(storage.entries().length,0);
});
test("Home starter sends on one tap, Ali preserves original wording and shows retry",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 const chat=read("components/holistic-agent-chat.tsx");
 const hub=read("components/app/messages-orders-clients.jsx");
 assert.match(home,/openGoalIntent\(msg\.findPrompt\)/);
 assert.match(home,/startConversationWith\(draft\)/);
 assert.match(chat,/homeHandoffPhase==="queued"/);
 assert.match(chat,/homeHandoffPhase==="retry"/);
 assert.match(chat,/data-home-handoff-pending/);
 assert.match(chat,/data-home-handoff-retry/);
 assert.match(chat,/newTurns\.slice\(userIndex\+1\)\.some\(turn=>turn\.role==="assistant"\)/);
 assert.match(chat,/startContent\(turnLocale,text\)/);
 assert.doesNotMatch(chat,/text:safeIntent/);
 assert.match(hub,/const timeout=window\.setTimeout\(\(\)=>controller\.abort\(\),6000\)/);
});

test("Samir approved homepage has three gentle entry paths and a seven-step journey",()=>{
 const entry=read("components/home-dialogue-entry.tsx");
 const styles=read("components/home-dialogue-entry.module.css");
 const deferred=read("components/home-deferred-content.tsx");
 for(const text of ["Помоги разобраться","У меня уже есть цель","Давай просто поговорим",
   "7 шагов к твоей цели","В нашей работе мы используем:","ИИ-коучи","Специалисты","Видео","Тесты","Практики"])
   assert.ok(entry.includes(text),text);
 assert.doesNotMatch(entry,/data-home-mode-button=/);
 assert.match(entry,/data-home-intent-option="understand"/);
 assert.match(entry,/data-home-intent-option="goal"/);
 assert.match(entry,/data-home-intent-option="talk"/);
 assert.match(entry,/data-home-stage-option=\{index\+1\}/);
 assert.equal((entry.match(/<form className=\{styles\.composer\}/g)||[]).length,1);
 assert.match(entry,/useAliPersona\("alex"\)/);
 assert.match(entry,/data-home-open-ali-persona/);
 assert.match(entry,/data-home-ali-greeting-play/);
 assert.match(entry,/data-home-intent-composer/);
 assert.match(entry,/data-home-send-to-ali/);
 assert.match(entry,/data-home-request-session/);
 assert.match(entry,/data-home-continue-path/);
 assert.match(styles,/SAMIR_HOME_OWNER_APPROVED_20261123/);
 assert.match(styles,/\.journeyScroll\{display:flex/);
 assert.match(styles,/scroll-snap-type:x mandatory/);
 assert.match(styles,/max-height:800px/);
 assert.match(deferred,/<MySpaceTopics locale=\{locale\} publicHome\/>/);
 assert.doesNotMatch(entry,/<iframe|<video|fetch\(/);
});
