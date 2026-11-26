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
test("Owner-approved mobile cabinet keeps quiz, video and six authentic shelf objects",()=>{
 const css=read("components/shamanica-mobile.module.css");
 const client=read("components/shamanica-mobile.tsx");
 assert.match(css,/SHAMANIC_ALCHEMIST_SIX_SHELVES_20261121/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(client,/data-shamanica-extras/);
 assert.match(client,/data-shamanica-quiz/);
 assert.match(client,/data-shamanica-next/);
 assert.match(client,/aria-pressed=\{chosen===id\}/);
 assert.match(client,/videoRef\.current\?\.play\(\)/);
 assert.match(client,/film-collection-v3\/sun-autumn-hills\.mp4/);
 assert.match(client,/maxLength=\{280\}/);
 assert.match(client,/new URLSearchParams\(\{goal,method,start:startChoice\}\)/);
});

test("Six approved real category buttons reveal subcategories before services",()=>{
 const client=read("components/shamanica-mobile.tsx");
 const css=read("components/shamanica-mobile.module.css");
 assert.match(client,/shelfCatalog\.map\(/);
 for(const id of ["remedies","guidance","mysteries","rituals","energy","academy"])
  assert.match(client,new RegExp('id:"'+id+'"'));
 for(const title of ["Get Hints & Ideas","Remedies for Heart & Mind",
   "Mysteries & Initiations","Rituals & Artifacts",
   "Reiki & Energy Support","Shamanic & Reiki Academy"])
  assert.ok(client.includes(title),title);
 assert.match(client,/data-shamanica-service=\{id\}/);
 assert.match(client,/data-shamanica-cabinet-shelves/);
 assert.doesNotMatch(client,/shelfExtras/);
 assert.match(client,/academy\/mysteries/);
 assert.match(client,/shamanicaCategoryHref\(locale,/);
 assert.match(css,/\.serviceBody strong/);
 assert.match(client,/data-shamanica-audience=\{business\?"business":"self"\}/);
 assert.equal(shamanicaCategoryHref("en","guidance"),"/en/shamanica/results?category=guidance");
 assert.equal(shamanicaCategoryHref("ru","learning"),"/ru/shamanica/results?category=learning");
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

test("Every Shamanic category retains its existing three priced service cards after the new subcategory step",()=>{
 const client=read("components/shamanica-mobile.tsx");
 const results=read("app/[locale]/shamanica/results/page.tsx");
 const css=read("components/shamanica-results-services.module.css");
 const offers=read("components/services-three-visible-options.tsx");
 for(const locale of ["ru","en","es"])for(const category of SHAMANICA_SERVICES){
  assert.equal(shamanicaCategoryHref(locale,category),`/${locale}/shamanica/results?category=${category}`);
 }
 assert.equal(shamanicaCategoryHref("ru","invalid"),"/ru/shamanica");
 assert.match(client,/shamanicaCategoryHref\(locale,/);
 assert.match(client,/academy\/mysteries/);
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

test("Get Guidance is the real three-offer symbolic reading catalogue",()=>{
 const page=read("app/[locale]/shamanica/results/page.tsx");
 const offers=read("components/services-three-visible-options.tsx");
 assert.match(page,/guidance: "reading"/);
 assert.match(page,/guidance: \["Get Guidance"/);
 assert.match(offers,/reading: \[/);
 assert.match(offers,/Tarot · personal reading/);
 assert.deepEqual(SHAMANICA_SERVICES,["remedies","artifacts","energy","rituals","learning"]);
});

test("Approved Shamanic lounge is six correctly ordered, distinct photo buttons with existing routes",()=>{
 const client=read("components/shamanica-mobile.tsx");
 const css=read("components/shamanica-mobile.module.css");
 const dock=read("app/unified-mobile-dock.css");
 const expected=["guidance","rituals","remedies","mysteries","energy","academy"];
 const markers=expected.map(id=>client.indexOf('id:"'+id+'"'));
 assert.ok(markers.every(pos=>pos>0), "all six offerings exist");
 assert.deepEqual([...markers].sort((a,b)=>a-b),markers,"row-major visual order matches approved screen");
 assert.match(client,/Get Hints & Ideas/);
 assert.match(client,/Remedies for Heart & Mind/);
 for(const id of expected)assert.match(client,new RegExp('id:"'+id+'"'));
 assert.match(client,/data-shamanica-subcategories=\{selectedShelf\}/);
 assert.match(client,/setSelectedShelf\(id\)/);
 assert.match(client,/shamanic-sun-hd\.avif/);
 assert.match(css,/shamanic-lounge-hd\.avif/);
 assert.match(css,/shamanic-cards-personal-hd\.avif/);
 assert.match(css,/SHAMANIC_LUXURY_LOUNGE_APPROVED_20261121/);
 assert.match(css,/grid-auto-rows:101px/);
 assert.match(css,/\.serviceBody svg/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(dock,/SHAMANIC_LUXURY_LOUNGE_DOCK_20261121/);
 assert.match(dock,/data-unified-dock-item="practice"/);
 assert.match(client,/shamanicaCategoryHref\(locale,/);
 assert.match(client,/data-shamanica-extras/);
});
