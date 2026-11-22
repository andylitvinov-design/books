import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUSINESS_GOALS,BUSINESS_CONCERNS,BUSINESS_STARTS,BUSINESS_SERVICES,shamanicaBusinessHref,shamanicaBusinessRecommendations} from "../lib/shamanica-business.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Business mode is the approved Shamanica audience and reuses existing mobile dock",()=>{
 const base=read("components/shamanica-mobile.tsx"),page=read("app/[locale]/shamanica/business/page.tsx");
 const dock=read("lib/unified-mobile-dock.mjs");
 assert.match(page,/ShamanicaMobile locale=\{locale\} audience="business"/);
 assert.match(base,/shamanica\/business/);
 assert.match(base,/business\?<ShamanicaBusinessContent/);
 assert.match(dock,/shamanica\(\?:\\\/\|\$\)/);
 assert.doesNotMatch(read("components/shamanica-business-content.tsx"),/MobileBottomNavigation|UnifiedMobileDock/);
});
test("All business paths are existing service or analysis destinations",()=>{
 assert.equal(shamanicaBusinessHref("ru","express"),"/ru/services/free-situation-review?topic=business");
 assert.equal(shamanicaBusinessHref("ru","analysis"),"/ru/explore/business");
 assert.equal(shamanicaBusinessHref("ru","team"),"/ru/services/systemic-constellations");
 assert.equal(shamanicaBusinessHref("en","remedies"),"/en/services/psychohomeopathy");
 assert.equal(shamanicaBusinessHref("es","artifacts"),"/es/holistic-support#talismans");
 assert.equal(BUSINESS_SERVICES.length,6);
});
test("Three-step quiz always provides exactly two different relevant paths",()=>{
 assert.equal(BUSINESS_GOALS.length,4);
 for(const goal of BUSINESS_GOALS)for(const concern of BUSINESS_CONCERNS)for(const start of BUSINESS_STARTS){
  const items=shamanicaBusinessRecommendations({goal,concern,start});
  assert.equal(items.length,2);assert.notEqual(items[0],items[1]);
  assert.ok(items.every(item=>item==="express"||BUSINESS_SERVICES.includes(item)));
  if(start==="free")assert.equal(items[0],"express");
 }
 assert.deepEqual(shamanicaBusinessRecommendations({goal:"team",concern:"conflict",start:"team"}),["team","support"]);
});
test("Approved calm mobile layout, localized quiz, service cards and real taps",()=>{
 const ui=read("components/shamanica-business-content.tsx"),css=read("components/shamanica-business-content.module.css");
 for(const value of ["Бизнес-анализ и поддержка","Экспресс-диагностика ситуации","Что сейчас больше всего нужно вашему бизнесу?","Аналитическая поддержка","Диагностика команды","Поддержка руководителя","Предметы силы","Подбор препаратов"])assert.ok(ui.includes(value),value);
 for(const value of ["Business analysis & support","Análisis y apoyo empresarial"])assert.ok(ui.includes(value));
 assert.match(ui,/data-business-quiz/);assert.match(ui,/data-business-recommendations/);assert.match(ui,/data-business-shelf=/);assert.match(ui,/data-business-subservice=/);
 assert.match(css,/@media\(max-width:359px\)/);assert.match(css,/min-height:78px/);assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});

test("Business mobile fits the approved illustrated screen with one real help trigger",()=>{
 const ui=read("components/shamanica-business-content.tsx");
 const compact=read("components/shamanica-business-content.module.css");
 const shell=read("components/shamanica-mobile.tsx");
 const shellCss=read("components/shamanica-mobile.module.css");
 const siteBanner=read("components/sitewide-antistress-banner.tsx");
 const help=read("components/sitewide-ihelp.tsx");
 assert.match(shellCss,/shamanic-lounge-hd\.avif/);
 assert.match(compact,/shamanic-cards-business-hd\.avif/);
 assert.match(shell,/data-shamanica-business-page/);
 assert.match(shell,/data-shamanica-ihelp-trigger/);
 assert.ok(siteBanner.includes("shamanica(?:\\/business)?"));
 assert.match(help,/hh:open-ihelp/);
 assert.match(help,/hidden=\{businessShamanica\}/);
 assert.match(shellCss,/--hh-unified-nav-height/);
 assert.match(compact,/max-height:885px/);
 assert.match(compact,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(compact,/grid-auto-rows:clamp\(72px,10\.8dvh,99px\)/);
 assert.match(compact,/@media\(max-width:359px\)/);
 assert.match(compact,/focus-visible/);
 for(const id of ["express","remedies","strategy","artifacts","energy","energywork"])assert.ok(ui.includes(`id:"${id}"`),id);
 assert.match(shell,/className=\{styles\.helpButton\} data-shamanica-ihelp-trigger=\{business\|\|undefined\}/);
});
