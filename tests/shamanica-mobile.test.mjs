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
