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
 assert.match(entry,/data-home-mode-button="self"/);
 assert.match(entry,/data-home-mode-button="business"/);
 for(const label of ["Для себя","Для бизнеса","For myself","For business","Para mí","Para mi negocio"])
   assert.ok(entry.includes(label),label);
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
 assert.match(lazy,/ssr:false/);
 assert.match(content,/ssr:false/);
 assert.match(content,/MySpaceTopics/);
 assert.doesNotMatch(content,/^import \{ MySpaceTopics \} from/m);
 assert.match(content,/import\("\.\/my-space-topics"\)/);
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
 assert.match(home,/onClick=\{\(\)=>startConversationWith\(hint\.prompt,hint\.id==="business"\?"business":mode\)\}/);
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

test("approved scenic Home shows four clear choices above the wide Ali composer in three languages",()=>{
 const entry=read("components/home-dialogue-entry.tsx");
 const css=read("components/home-dialogue-entry.module.css");
 const deferred=read("components/home-deferred-content.tsx");
 for(const phrase of ["Energy & Stress Release","Love & Confidence","Money & Growth","Business Support","Holistic House","What do you need today?","Энергия и снятие стресса","Apoyo empresarial"])
   assert.ok(entry.includes(phrase),phrase);
 for(const id of ["stress","love","money","business"])assert.ok(entry.includes('id:"'+id+'"'),id);
 assert.match(entry,/data-home-free-review/);
 assert.match(entry,/freeReviewTitle:"Understand my situation"/);
 assert.match(entry,/freeReviewDetail:"Get a free personal review"/);
 assert.match(entry,/freeReviewTitle:"Разобраться в своей ситуации"/);
 assert.match(entry,/freeReviewTitle:"Comprender mi situación"/);
 assert.match(entry,/services\/free-situation-review/);
 assert.ok(entry.indexOf("data-home-intent-form")<entry.indexOf("data-home-focus-grid"));
 assert.ok(entry.indexOf("data-home-intent-form")<entry.indexOf("data-home-focus-grid"));
 assert.match(css,/\.reviewCta\{box-sizing:border-box;display:flex/);
 assert.match(css,/@media\(min-width:356px\) and \(max-width:430px\)/);
 assert.match(css,/\.language summary\{min-width:44px\}/);
 assert.match(css,/\{width:44px;min-width:44px\}/);
 assert.match(entry,/data-home-focus-grid/);
 assert.ok(entry.indexOf('data-home-focus-grid')<entry.indexOf('data-home-free-review'));
 assert.match(entry,/data-home-continue-path/);
 assert.match(entry,/data-home-send-to-ali/);
 assert.match(css,/\.focusGrid\{display:grid;grid-template-columns:repeat\(2/);
 assert.match(css,/\.composer\{display:flex;flex-direction:column/);
 assert.match(css,/\.scene\{[^\n]*ideas-pine-reference\.webp/);
 assert.doesNotMatch(entry,/<iframe|<video|fetch\(/);
 assert.doesNotMatch(entry,/data-home-service-action/);
 assert.match(deferred,/<MySpaceTopics locale=\{locale\} publicHome\/>/);
});

test("owner-approved compact first screen keeps persona, full composer, categories and help CTAs",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 const styles=read("components/home-dialogue-entry.module.css");
 for(const label of ["Get Ideas","Diagnostic & Hints","Get Support","Session & Service",
   "Choose a direction","How it works — in 3 simple steps","Start free chat"]) {
   assert.ok(home.includes(label),label);
 }
 for(const fragment of ["data-home-open-ali-persona","data-home-ali-greeting-play",
   "data-home-intent-composer","data-home-how-it-works","data-home-request-session"]) {
   assert.ok(home.includes(fragment),fragment);
 }
 assert.ok(home.indexOf("data-home-dialogue-hero")<home.indexOf("data-home-intent-form"));
 assert.ok(home.indexOf("data-home-intent-form")<home.indexOf("data-home-focus-grid"));
 assert.ok(home.indexOf("data-home-focus-grid")<home.indexOf("data-home-how-it-works"));
 assert.ok(home.indexOf("data-home-how-it-works")<home.indexOf("data-home-request-session"));
 assert.match(styles,/HOME_SCREEN_VISUAL_20261120/);
 assert.match(styles,/max-height:800px/);
 assert.match(styles,/\.heroPortrait/);
 assert.match(styles,/\.focusPhoto/);
 assert.match(styles,/\.finalActions/);
 assert.doesNotMatch(home,/<iframe|<video|fetch\(/);
});

test("mobile correction preserves distinct business help links and prevents clipped hero",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 const styles=read("components/home-dialogue-entry.module.css");
 assert.match(home,/service-group-business/);
 assert.match(home,/hint.id==="love"\?Heart/);
 assert.match(home,/hint.id==="money"\?TrendingUp/);
 assert.match(styles,/MOBILE_HERO_CONTENT_SAFE_20261120/);
 assert.match(styles,/\.heroStory\{height:auto;min-height:165px/);
 const before=home.indexOf("data-home-intent-form");
 const after=home.indexOf("data-home-focus-grid");
 assert.ok(before>=0&&after>before,"The Ali composer must appear before the topic tiles");
});

test("approved Max hero paints without eager Persona dialog bundle and unrelated catalog CSS",()=>{
 const home=read("components/home-dialogue-entry.tsx");
 const hook=read("components/app/use-ali-persona.js");
 const root=read("app/layout.tsx");
 const catalog=read("components/catalog-showcase.tsx");
 assert.ok(home.includes('import dynamic from "next/dynamic"'));
 assert.ok(home.includes('dynamic(()=>import("@/components/app/ali-persona-picker")'));
 assert.ok(home.includes('{personaOpen&&<AliPersonaPicker open={personaOpen}'));
 assert.ok(home.includes('useAliPersona("max")'));
 assert.ok(hook.includes('export function useAliPersona(initialId=ALI_DEFAULT_PERSONA_ID)'));
 assert.ok(root.includes('import "./holistic-light-tokens.css"'));
 assert.ok(!root.includes('import "./catalog-showcase.css"'));
 assert.ok(catalog.includes('import "@/app/catalog-showcase.css"'));
});

test("full approved React Home preloads its existing tiny CSS hero scene without replacing it with the legacy static shell",()=>{
 const entry=read("components/home-dialogue-entry.tsx");
 const css=read("components/home-dialogue-entry.module.css");
 const middleware=read("middleware.ts");
 const root=read("app/page.tsx");
 const es=read("app/es/page.tsx");
 const locale=read("app/[locale]/page.tsx");
 const hint='<link rel="preload" as="image" href="/images/holistic-house/ideas-pine-reference.webp" fetchPriority="high" />';
 assert.equal(entry.split(hint).length-1,1,"one shared high-priority hint for EN/RU/ES");
 assert.match(css,/ideas-pine-reference\\.webp/);
 assert.match(entry,/data-home-dialogue-hero/);
 assert.match(entry,/data-home-open-ali-persona/);
 assert.match(entry,/data-home-focus-grid/);
 assert.match(entry,/data-home-intent-composer/);
 assert.match(entry,/data-home-how-it-works/);
 assert.match(entry,/data-home-request-session/);
 assert.match(root,/<HolisticHouseHome locale="en"/);
 assert.match(es,/<HomeDialogueEntry locale="es"/);
 assert.match(locale,/<HolisticHouseHome locale=/);
 assert.match(middleware,/HH_ENABLE_LEGACY_INSTANT_HOME/);
 assert.match(middleware,/process\\.env\\.HH_ENABLE_LEGACY_INSTANT_HOME === 'true'/);
 assert.doesNotMatch(middleware,/^\\s*const fastLocale = instantHomeLocale\\(/m);
});
