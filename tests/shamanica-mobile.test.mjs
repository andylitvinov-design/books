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
test("Magic Mirror-inspired personal landing preserves readable 3-step interaction",()=>{
 const css=read("components/shamanica-mobile.module.css");
 const client=read("components/shamanica-mobile.tsx");
 assert.match(css,/SHAMANIC_MIRROR_REFERENCE_20261120/);
 assert.match(css,/\.mirrorLaptop/);
 assert.match(css,/\.mirrorScreen/);
 assert.match(css,/\.mirrorPlay/);
 assert.match(css,/\.answerPhoto/);
 assert.match(css,/\.answerSelected/);
 assert.match(css,/\.page\[data-shamanica-audience="self"\] \.audiences/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(client,/data-shamanica-next/);
 assert.match(client,/aria-pressed=\{chosen===id\}/);
 assert.match(client,/onClick=\{\(\)=>choose\(id\)\}/);
 assert.match(client,/videoRef\.current\?\.play\(\)/);
 assert.match(client,/film-collection-v3\/sun-autumn-hills\.mp4/);
 assert.match(client,/maxLength=\{280\}/);
 assert.match(client,/new URLSearchParams\(\{goal,method,start:startChoice\}\)/);
 assert.doesNotMatch(client,/new URLSearchParams\(\{goal,method,start:choice\}\)/);
});

test("Six photographic entrances include the existing free Reiki course",()=>{
 const client=read("components/shamanica-mobile.tsx");
 assert.match(client,/serviceCards=\[\.\.\.methods,"free"\] as const/);
 assert.match(client,/serviceCards\.map\(id=>/);
 assert.match(client,/academy\/principles-of-energywork\/learn/);
 assert.match(client,/data-shamanica-service=\{id\}/);
 assert.match(client,/businessLink/);
 assert.match(client,/data-shamanica-audience=\{business\?"business":"self"\}/);
 // A card now selects with visible aria-pressed state; Next advances the three-step quiz.
 assert.match(client,/onClick=\{\(\)=>choose\(id\)\}/);
 assert.match(client,/data-shamanica-next/);
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

test("Direct Shamanic category is a compact three-offer phone screen with full Details/Order preserved",()=>{
 const css=read("components/shamanica-results-services.module.css");
 const page=read("app/[locale]/shamanica/results/page.tsx");
 assert.match(css,/SHAMANIC_CATEGORY_ONE_SCREEN_20261120/);
 assert.match(css,/\.categoryPage\[data-shamanica-category\]/);
 assert.match(css,/grid-template-columns:clamp\(70px,21vw,82px\) minmax\(0,1fr\)/);
 assert.match(css,/data-service-card-controls/);
 assert.match(css,/-webkit-line-clamp:2/);
 assert.match(css,/grid-row:3/);
 assert.match(page,/data-shamanica-results-title/);
 assert.match(page,/orderedCategories\.map\(id =>/);
 assert.match(page,/data-shamanica-priority-groups/);
});

test("Alchemist cabinet displays nine real clickable shelf objects, not a static screenshot",()=>{
 const client=read("components/shamanica-mobile.tsx");
 const css=read("components/shamanica-mobile.module.css");
 assert.match(client,/data-shamanica-cabinet-shelves/);
 assert.match(client,/shelfExtras\.map\(/);
 assert.match(client,/data-shamanica-shelf-quick-link=\{category\}/);
 assert.match(client,/href=\{shamanicaCategoryHref\(locale,category\)\}/);
 assert.match(client,/Alchemist’s Cabinet/);
 assert.match(client,/Кабинет алхимика/);
 assert.match(css,/ALCHEMIST_SHELF_REFERENCE_20261120/);
 assert.match(css,/\.serviceGrid/);
 assert.match(css,/\.servicePhoto/);
 assert.match(css,/ridge #765032/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(client,/data-shamanica-answer=\{id\}/);
 assert.match(client,/aria-pressed=\{chosen===id\}/);
});
