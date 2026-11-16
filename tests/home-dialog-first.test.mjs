import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {encodeHomeAiHandoff,parseHomeAiHandoff,takeHomeAiHandoff,HOME_AI_HANDOFF_KEY} from "../lib/home-ai-handoff.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Home is one lightweight intent-first screen in EN, RU and ES, seven-item dock untouched",()=>{
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const prompt=read("components/home-dialog-first.tsx");
 const css=read("components/home-dialog-first.module.css");
 const dock=read("lib/unified-mobile-dock.mjs");
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.doesNotMatch(home,/<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<PersonalTestimonials|<HomeMoreDisclosure|<HomePresentationVideoSection|<MySpaceTopics/);
 assert.match(es,/<HolisticHouseHome locale="es"\/>/);
 for(const label of ["Для себя","Для бизнеса","For me","For business","Para mí","Para negocios"])
   assert.ok(prompt.includes(label),label);
 for(const label of ["data-hh-home-composer","data-hh-home-business-switch","<SiteNavigation locale={locale} compact />","data-hh-home-continue"])
   assert.ok(prompt.includes(label),label);
 assert.match(css,/reiki-approved-sunrise-v3\.webp/);
 assert.match(css,/min-height:clamp\(320px,52svh/);
 assert.match(dock,/UNIFIED_DOCK_IDS=Object\.freeze\(\["mytube","video","coach","ai","services","practice","profile"\]\)/);
});

test("Home handoff is 1-use, bounded, only same-tab, no prompt or private notes in URL",()=>{
 const now=1794800000000;
 const p=encodeHomeAiHandoff({text:"  Начать свой курс  ",locale:"ru",mode:"business",now});
 assert.deepEqual(parseHomeAiHandoff(p,"ru",now+3000),
   {text:"Начать свой курс",locale:"ru",mode:"business"});
 assert.equal(parseHomeAiHandoff(p,"en",now+3000),null);
 assert.equal(parseHomeAiHandoff(p,"ru",now+121000),null);
 assert.equal(parseHomeAiHandoff(p,"ru",now-6000),null);
 assert.equal(encodeHomeAiHandoff({text:"X".repeat(1201),locale:"en"}),null);
 assert.equal(parseHomeAiHandoff("{secret}", "en"),null);
 const store=new Map([[HOME_AI_HANDOFF_KEY,p]]);
 const storage={getItem:key=>store.get(key),removeItem:key=>store.delete(key)};
 assert.equal(takeHomeAiHandoff(storage,"ru",now)?.text,"Начать свой курс");
 assert.equal(takeHomeAiHandoff(storage,"ru",now),null);
 const prompt=read("components/home-dialog-first.tsx");
 const chat=read("components/holistic-agent-chat.tsx");
 assert.match(prompt,/window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
 assert.match(prompt,/router\.push\("\/"\+locale\+"\/app\/messages\?section=ai"\)/);
 assert.doesNotMatch(prompt,/localStorage|encodeURIComponent\(draft\)|\?prompt=|\?message=/);
 assert.match(chat,/takeHomeAiHandoff/);
 assert.match(chat,/void sendTurn\(handoff\.text\)/);
 assert.match(chat,/consumedHomeHandoff\.current=true/);
});
