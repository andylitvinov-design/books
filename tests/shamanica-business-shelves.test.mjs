import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {shamanicaBusinessHref} from "../lib/shamanica-business.mjs";

const source=readFileSync(new URL("../components/shamanica-business-content.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../components/shamanica-business-content.module.css",import.meta.url),"utf8");
test("business shelf grid keeps exact owner order without changing For Me",()=>{
 const ownerTitles=[
  "Express Business Insight","Remedies for Clarity & Leadership",
  "Strategy & Business Analyses","Artefacts for Goal Support",
  "Business Energy Support","Energywork in Business"];
 const positions=ownerTitles.map(title=>source.indexOf('"'+title+'"'));
 assert.ok(positions.every(i=>i>0));
 assert.ok(positions.every((p,i)=>i===0||p>positions[i-1]));
 assert.match(source,/businessShelves\.map/);
 assert.match(styles,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(source,/data-business-shelf=\{id\}/);
 assert.match(styles,/SHAMANIC_BUSINESS_SIX_SHELVES_20261121/);
 assert.doesNotMatch(source,/data-shamanica-cabinet-shelves/);
});
test("six categories present five priced Express choices and four strategic options",()=>{
 for(const title of ["Express Insight","Advanced Insight","Express Live Consulting",
   "Full Live Consulting","Live Consulting + Support",
   "Strategic Goal Review","Business Functions Analyses","Business Teams Review",
   "Growth Strategy & Implementation","Personal Remedy Selection","Mandala for Focus"])
  assert.ok(source.includes('"'+title+'"'),title);
 for(const label of ["Express Business Insight","Strategic Business Analyses",
   "Academy of Business Energywork"])assert.ok(source.includes('"'+label+'"'),label);
 for(const former of ['"Strategy & Business Analyses"','"Energywork in Business"'])
  assert.ok(!source.includes(former),"old label remains: "+former);
 assert.match(source,/const expressPrices=\["FREE","45 CAD","75 CAD","200 CAD","300 CAD"\]/);
 assert.match(source,/activeShelf\.id==="express"\|\|activeShelf\.id==="strategy"/);
 assert.match(source,/t\.expressMeta\[index\]/);
 for(const locale of ["ru","en","es"]){
  for(const id of ["express","analysis","support","team","leader","artifacts","remedies"]){
   const href=shamanicaBusinessHref(locale,id);
   assert.ok(href.startsWith("/"+locale+"/"),href);
  }
 }
 assert.match(source,/data-business-second-level=\{activeShelf.id\}/);
 assert.match(source,/data-business-subservice=/);
 assert.match(source,/setSelectedShelf\(null\);setSelectedOption\(null\)/);
 assert.match(source,/t\.subservices\[shelfIndex\]\[index\]/);
 assert.match(styles,/\.root \.offerChoice/);
 assert.match(styles,/\.root \.secondCard/);
});
test("Get details reveals official WhatsApp and Telegram service channels, not a fake checkout",()=>{
 const messenger=readFileSync(new URL("../components/mandatory-messenger-actions.tsx",import.meta.url),"utf8");
 const routing=readFileSync(new URL("../app/api/public/telegram-service-entry/route.js",import.meta.url),"utf8");
 assert.match(source,/MandatoryMessengerActions locale=\{locale\} collapsed compact/);
 assert.match(source,/label=\{t\.getDetails\}/);
 assert.match(source,/telegramBusinessStrategyRequestUrl\(locale\)/);
 assert.match(source,/telegramServiceRequestUrl\("business",locale\)/);
 assert.match(source,/whatsappUrl=\{whatsappEnquiryUrl\(/);
 assert.match(source,/option:selectedOption===null\?undefined:/);
 assert.match(source,/data-business-get-details=\{activeShelf.id\}/);
 assert.match(messenger,/data-messenger-only-channel="whatsapp"/);
 assert.match(messenger,/data-messenger-only-channel="telegram"/);
 assert.match(routing,/resolveTelegramServiceEntry/);
 assert.match(routing,/status:503/);
 assert.doesNotMatch(source,/payment successful|booking confirmed/i);
});
test("energy and ritual choices use relevant existing support routes, not unrelated business consulting",()=>{
 assert.match(source,/id==="remote-energy"/);
 assert.match(source,/services\/remote-energy-support/);
 assert.match(source,/id==="ritual"/);
 assert.match(source,/holistic-support\/mandala/);
 assert.match(source,/href=\{businessDetailHref\(locale,target\)\}/);
});
