import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Support uses one mobile style across localized pages",()=>{
 for(const p of ["app/[locale]/services/page.tsx","app/es/services/page.tsx"]){
  const s=read(p);assert.match(s,/services-support-uniform.module.css/);
  assert.match(s,/uniformStyles.page/);assert.match(s,/ServicesAssistQuiz/);
 }
});
test("All five Support offer families share large photo, copy, price and two controls",()=>{
 for(const p of ["components/services-personal-consultation-mobile.tsx",
  "components/services-three-visible-options.tsx","components/services-studio-offers.tsx",
  "components/assist-top-recommendations.tsx","components/services-unified-catalog.tsx"]){
  const s=read(p);
  for(const k of ["data-support-uniform-card","data-support-uniform-photo","data-support-uniform-copy",
   "data-support-uniform-price","ServicesCardActions"])assert.ok(s.includes(k),p+" "+k);
 }
 const a=read("components/services-card-actions.tsx");
 for(const k of ["data-service-card-controls","data-service-card-details",
  "data-service-card-order","MandatoryMessengerActions"])assert.ok(a.includes(k));
 const css=read("components/services-support-uniform.module.css");
 for(const k of ["@media(max-width:760px)","@media(max-width:350px)",
  "grid-column:2;grid-row:2","grid-column:1/-1;grid-row:3",
  "data-messenger-only-channel"])assert.ok(css.includes(k));
});
test("14 catalog groups retain three source-backed choices and messenger expansion",()=>{
 const catalog=read("components/services-unified-catalog.tsx");
 assert.match(catalog,/hasVariants \? <ServicesThreeVisibleOptions/);
 assert.match(catalog,/<ServicesCardActions locale=\{context.locale\}/);
 const rec=read("components/assist-top-recommendations.tsx");
 assert.match(rec,/actionTrackingId=\{id\}/);
 const browser=read("scripts/verify-public-services-production.mjs");
 assert.match(browser,/Inline messenger choices span the full card, under the photo/);
});

test("browser obtains optional Telegram service code before strict handoff checks",()=>{
 const browser=read("scripts/verify-public-services-production.mjs");
 assert.match(browser,/for\(const key of expectedStress\)\{\s*const code=requestIds\[key\];/);
 assert.match(browser,/if\(code\)\{/);
});

test("Business suggestion expands verified inline messenger links, not href on Order button",()=>{
 const browser=read("scripts/verify-public-services-production.mjs");
 assert.match(browser,/const orderButton=businessCard.locator\('/);
 assert.match(browser,/orderButton\.click\(\)/);
 assert.match(browser,/const telegram=businessCard.locator\(/);
 assert.match(browser,/resolveTelegramServiceHandoffUrl\(businessUrl,locale\)/);
 assert.doesNotMatch(browser,/data-assist-best-action="business"[^\n]*\n\s*\.toHaveAttribute\("href"/);
});
