import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SHAMANICA_GOALS,SHAMANICA_SERVICES,shamanicaRecommendations,shamanicaServiceHref} from "../lib/shamanica-recommendations.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Shamanica replaces Study destination and preserves real catalog",()=>{
 const p=read("app/[locale]/shamanica/page.tsx"),client=read("components/shamanica-mobile.tsx"),results=read("app/[locale]/shamanica/results/page.tsx");
 assert.match(p,/ShamanicaMobile/);assert.match(client,/data-shamanica-quiz/);assert.match(client,/data-shamanica-service/);
 for(const text of ["Энергия и защита","Гармония в отношениях","Деньги","Личностное развитие"])assert.ok(client.includes(text));
 assert.doesNotMatch(client,/Рекомендовано для вас/);assert.match(results,/data-shamanica-results/);
 assert.deepEqual(SHAMANICA_SERVICES,["remedies","artifacts","energy","rituals","learning"]);
 assert.equal(SHAMANICA_GOALS.length,4);
});
test("All service actions lead to existing public routes",()=>{
 assert.equal(shamanicaServiceHref("ru","remedies"),"/ru/services/psychohomeopathy");
 assert.equal(shamanicaServiceHref("ru","artifacts"),"/ru/holistic-support#talismans");
 assert.equal(shamanicaServiceHref("ru","energy"),"/ru/services/remote-energy-support");
 assert.equal(shamanicaServiceHref("ru","rituals"),"/ru/holistic-support/mandala");
 assert.equal(shamanicaServiceHref("ru","learning"),"/ru/academy");
});
test("Quiz always selects exactly two distinct known directions",()=>{
 for(const goal of SHAMANICA_GOALS)for(const method of ["remedies","artifacts","energy","rituals","learning","unsure"])for(const start of ["free","personal","object","course"]){
 const result=shamanicaRecommendations({goal,method,start});assert.equal(result.length,2);assert.equal(new Set(result).size,2);
 assert.ok(result.every(id=>SHAMANICA_SERVICES.includes(id)));
 }
 assert.deepEqual(shamanicaRecommendations({goal:"money",method:"artifacts",start:"object"}),["artifacts","rituals"]);
 assert.equal(shamanicaRecommendations({goal:"growth",method:"unsure",start:"free"})[0],"learning");
});
test("Large mobile targets, focus and reduced motion",()=>{
 const css=read("components/shamanica-mobile.module.css");
 assert.match(css,/min-height:81px/);assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/focus-visible/);assert.match(css,/safe-area-inset-bottom/);assert.match(css,/prefers-reduced-motion/);
});

test("approved one-viewport mobile layout keeps quiz and all five services above the dock",()=>{
 const css=read("components/shamanica-mobile.module.css");
 const dockCss=read("app/unified-mobile-dock.css");
 const client=read("components/shamanica-mobile.tsx");
 assert.match(client,/data-shamanica-audience=\{business\?"business":"self"\}/);
 assert.match(css,/SHAMANICA_ONE_SCREEN_20261119/);
 assert.match(css,/@media \(max-width:600px\)/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.hero/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.quiz/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.serviceCard:last-child \{/);
 assert.match(css,/inset:0 0 0 auto/); // image overlays, not a tall banner
 assert.match(css,/min-height:61px/);
 assert.match(css,/min-height:44px/); // quiz taps remain accessible
 assert.match(css,/@media \(max-width:600px\) and \(max-height:760px\)/);
 assert.match(dockCss,/SHAMANICA_ONE_SCREEN_DOCK_20261119/);
 assert.match(dockCss,/body:has\(\[data-hh-unified-dock\]\):has\(main\[data-shamanica-audience="self"\]\)/);
 assert.match(dockCss,/white-space:nowrap/);
});


test("readable typography uses the existing one-screen room",()=>{
 const css=read("components/shamanica-mobile.module.css");
 const global=read("app/unified-mobile-dock.css");
 const client=read("components/shamanica-mobile.tsx");
 assert.match(css,/SHAMANICA_READABLE_MOBILE_20261119/);
 assert.match(css,/font-size:clamp\(14px,4\.18vw,16px\)/); // service headings
 assert.match(css,/font-size:clamp\(11\.5px,3\.45vw,13px\)/); // descriptions
 assert.match(css,/font-size:clamp\(14px,4vw,16px\)/); // quiz answers
 assert.match(css,/min-height:70px/);
 assert.match(css,/min-height:52px/);
 assert.match(css,/height:auto/); // content may expand with text zoom
 assert.match(css,/max-height:740px/);
 assert.match(global,/SHAMANICA_READABLE_DOCK_20261119/);
 assert.match(client,/Homeopathy advice/);
 assert.match(client,/Талисманы и места силы/);
 assert.match(client,/Reiki sessions/);
 assert.match(client,/Chamanismo, Reiki y magia/);
});


test("353px mobile WebKit fit repair preserves readable typography while reclaiming spacing",()=>{
 const css=read("components/shamanica-mobile.module.css");
 const client=read("components/shamanica-mobile.tsx");
 const browser=read("scripts/verify-unified-six-dock-browser.mjs");
 assert.match(css,/SHAMANICA_READABLE_FIT_REPAIR_20261120/);
 assert.match(css,/height:clamp\(113px,14\.7dvh,125px\)/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.answer \{\s*min-height:44px/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.serviceGrid \{\s*gap:4px/);
 assert.match(css,/font-size:clamp\(14px,4\.18vw,16px\)/);
 assert.match(css,/font-size:clamp\(11\.5px,3\.45vw,13px\)/);
 for(const text of ["Рейки, магия, энергия и развитие.","Reiki, magic, energy & growth.","Reiki, magia, energía y desarrollo."])assert.ok(client.includes(text));
 assert.match(browser,/readablePhone\.lastCardBottom<=readablePhone\.dockTop-22/);
});
