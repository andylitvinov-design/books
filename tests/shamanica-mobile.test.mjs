import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SHAMANICA_GOALS,SHAMANICA_SERVICES,shamanicaRecommendations,shamanicaServiceHref,shamanicaCategoryHref} from "../lib/shamanica-recommendations.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Shamanic retains original five recommendation directions",()=>{
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
test("Support-inspired first screen uses the same visual grammar as Support",()=>{
 const css=read("components/shamanica-mobile.module.css");
 const client=read("components/shamanica-mobile.tsx");
 assert.match(css,/SHAMANIC_SUPPORT_PARITY_20261120/);
 assert.match(css,/background:radial-gradient\(ellipse at 108% 104%/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.servicePhoto/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.answer/);
 assert.match(css,/min-height:59px/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/SHAMANICA_READABLE_MOBILE_20261119/);
 assert.match(client,/className=\{styles\.heroMobileName\}/);
 assert.match(client,/className=\{styles\.heroLead\}/);
});

test("Six photographic entrances include the existing free Reiki course",()=>{
 const client=read("components/shamanica-mobile.tsx");
 assert.match(client,/serviceCards=\[\.\.\.methods,"free"\] as const/);
 assert.match(client,/serviceCards\.map\(id=>/);
 assert.match(client,/academy\/principles-of-energywork\/learn/);
 assert.match(client,/data-shamanica-service=\{id\}/);
 assert.match(client,/businessLink/);
 assert.match(client,/data-shamanica-audience=\{business\?"business":"self"\}/);
 // Answers remain one-tap controls that advance through three steps.
 assert.match(client,/onClick=\{\(\)=>select\(id\)\}/);
 assert.match(client,/router\.push\("\/"\+locale\+"\/shamanica\/results\?"/);
});

test("Shamanic branding and navigation are consistent without changing shared route slugs",()=>{
 const dock=read("components/unified-mobile-dock.tsx");
 const banner=read("components/sitewide-antistress-banner.tsx");
 const meta=read("app/[locale]/shamanica/page.tsx");
 const results=read("app/[locale]/shamanica/results/page.tsx");
 const services=read("components/services-assist-quiz.tsx");
 const dockCss=read("app/unified-mobile-dock.css");
 assert.match(dock,/practice: "Шаманик"/);
 assert.match(dock,/practice: "Shamanic"/);
 assert.doesNotMatch(dock,/practice: "Shamanica"/);
 assert.match(banner,/shamanica\(\?:\\\/business\)\?/);
 assert.match(meta,/Shamanic — practices/);
 assert.match(meta,/canonical:"\/"\+locale\+"\/shamanica"/);
 assert.match(results,/Your Shamanic path/);
 assert.match(services,/Shamanic · energy/);
 assert.match(dockCss,/SHAMANICA_ONE_SCREEN_DOCK_20261119/);
 assert.match(dockCss,/font-size:clamp\(10px,3\.05vw,12px\)/);
});

test("Every Shamanic category entrance opens three priced service cards without the quiz",()=>{
 const client=read("components/shamanica-mobile.tsx");
 const results=read("app/[locale]/shamanica/results/page.tsx");
 const css=read("components/shamanica-results-services.module.css");
 const offers=read("components/services-three-visible-options.tsx");
 for(const locale of ["ru","en","es"])for(const category of SHAMANICA_SERVICES){
  assert.equal(shamanicaCategoryHref(locale,category),`/${locale}/shamanica/results?category=${category}`);
 }
 assert.equal(shamanicaCategoryHref("ru","invalid"),"/ru/shamanica");
 assert.match(client,/shamanicaCategoryHref\(locale,id\)/);
 assert.match(client,/id==="free"\?"\/"\+locale\+"\/academy\/principles-of-energywork\/learn"/);
 assert.match(results,/data-shamanica-category-offers=\{selectedCategory\}/);
 assert.match(results,/data-shamanica-category-nav/);
 assert.match(results,/Object\.prototype\.hasOwnProperty\.call\(offerGroups,args\.category\)/);
 assert.match(results,/ServicesThreeVisibleOptions locale=\{locale\} id=\{offerGroups\[selectedCategory\]\}/);
 assert.match(results,/shamanicaRecommendations\(args\)/);
 assert.match(css,/CATEGORY_SERVICES_SUPPORT_PARITY_20261120/);
 assert.match(css,/data-support-uniform-photo/);
 assert.match(css,/data-service-card-controls/);
 assert.match(offers,/data-service-price/);
 assert.match(offers,/ServicesCardActions/);
});
