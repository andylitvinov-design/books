import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TAOIST_TALISMANS} from "../lib/practitioners/taoist-talismans.js";
import {normalizeTalismanEnquiry, readTalismanRequestDraft, formatTalismanRequestDraft} from "../lib/practitioners/remote-energy-support.js";
const read = p => readFileSync(new URL("../" + p,import.meta.url),"utf8");
const approved={slug:"remote-energy-support",area_key:"energy_spiritual",
  status:"published",active:true,delivery_format:"online",pricing_mode:"fixed"};

test("Public Holistic Support uses compact photographic cards and the existing enquiry basket",()=>{
  const page=read("app/[locale]/holistic-support/page.tsx");
  const widget=read("components/taoist-talisman-catalog.tsx");
  const css=read("components/taoist-talisman-catalog.module.css");
  assert.match(page,/TaoistTalismanCatalog locale=\{locale\}/);
  assert.doesNotMatch(page,/<SupportTalismanGallery locale=\{locale\}/);
  assert.match(widget,/data-taoist-talisman-catalog/);
  assert.match(widget,/role="region" tabIndex=\{0\}/);
  assert.match(widget,/data-tao-talisman-order=\{item.id\}/);
  assert.match(widget,/data-tao-talisman-details=\{item.id\}/);
  assert.match(widget,/router\.push\("\/" \+ locale \+ "\/talismans\/cart"\)/);
  assert.match(widget,/archiveOpen && <div/);
  assert.match(widget,/SupportTalismanGallery locale=\{locale\}/);
  assert.match(css,/overflow:auto/);
  assert.match(css,/grid-template-columns:75px minmax\(0,1fr\)/);
  assert.match(css,/max-width:355px/);
  for (const locale of ["en","ru","es"]) {
    assert.match(widget,new RegExp("\\b"+locale+":\\s*\\{"));
  }
});
test("Three Daoist-style examples; no fabricated prices or guaranteed results",()=>{
  assert.deepEqual(TAOIST_TALISMANS.map(item=>item.id),
    ["fu-prosperity","fu-harmony","fu-balance"]);
  assert.equal(new Set(TAOIST_TALISMANS.map(item=>item.goal)).size,3);
  for(const item of TAOIST_TALISMANS) {
    assert.match(item.image,/^\/images\/holistic-house\/tao-fu-[a-z]+\.webp$/);
    for(const locale of ["en","ru","es"]){
      assert.ok(item[locale].title.length>5);
      assert.ok(item[locale].description.length>25);
    }
    assert.equal(Object.hasOwn(item,"price"),false);
  }
  const widget=read("components/taoist-talisman-catalog.tsx");
  assert.match(widget,/Confirmed by the master/);
  assert.match(widget,/Уточняется у мастера/);
});
test("Generic master enquiry remains allowlisted; basket does not imply a confirmed purchase",()=>{
  const now=Date.now();
  for(const item of TAOIST_TALISMANS) {
    const input={version:1,goal:item.goal,catalogId:item.id};
    assert.deepEqual(normalizeTalismanEnquiry(input,approved),
      {kind:"talisman_enquiry",goal:item.goal,catalogId:item.id});
    const draft={...input,serviceId:"service-1",practitioner:"Master",savedAt:now};
    const storage={getItem:()=>JSON.stringify(draft)};
    const parsed=readTalismanRequestDraft(storage,"service-1",now);
    assert.equal(parsed.catalogId,item.id);
    assert.ok(formatTalismanRequestDraft(parsed,"en").includes(item.en.title));
    assert.throws(()=>normalizeTalismanEnquiry({...input,goal:"Personal intention"},approved));
  }
  assert.deepEqual(normalizeTalismanEnquiry({version:1,goal:"Work and money"},approved),
    {kind:"talisman_enquiry",goal:"Work and money"});
  for(const catalogId of ["fake","/secret","fu-PROSPERITY"]) {
    assert.throws(()=>normalizeTalismanEnquiry({version:1,goal:"Work and money",catalogId},approved));
  }
  assert.throws(()=>normalizeTalismanEnquiry({version:1,goal:"Work and money",catalogId:"fu-prosperity",price:50},approved));
  assert.match(read("components/remote-energy-support-booking.tsx"),/catalogId && talismanFromCatalog/);
  assert.match(read("components/app/app-workspace.jsx"),/catalogId:talismanDraft\.catalogId/);
  assert.match(read("lib/app/repository.js"),/talismanEnquiry\.catalogId/);
  assert.match(read("lib/app/repository.js"),/createPractitionerClientMessages/);
  assert.doesNotMatch(read("components/taoist-talisman-catalog.tsx"),/sessionStorage|localStorage/);
  assert.doesNotMatch(read("components/taoist-talisman-catalog.tsx"),/HolisticInlineSupportOrder/);
});
test("Themed wizard remains separate from the dedicated multi-item basket",()=>{
  const filter=read("components/holistic-support-topic-filter.tsx");
  const catalog=read("components/taoist-talisman-catalog.tsx");
  assert.match(filter,/hh-support-order-open/);
  assert.match(filter,/setOrderKind\(null\)/);
  assert.doesNotMatch(catalog,/hh-support-order-open/);
  assert.match(catalog,/saveBrowserTalismanCart/);
  assert.match(catalog,/TALISMAN_CART_UPDATED_EVENT/);
});

test("compact Fu cards keep two always-visible actions and a real quote-only basket",()=>{
 const widget=read("components/taoist-talisman-catalog.tsx");
 const css=read("components/taoist-talisman-catalog.module.css");
 for(const label of ['details: "Details"','details: "Детали"','details: "Detalles"',
   'order: "Order"','order: "Заказать"','order: "Solicitar"',
   'priceBadge: "Price on request"','priceBadge: "Цена по запросу"','priceBadge: "Precio a consultar"']){
   assert.ok(widget.includes(label),label);
 }
 assert.match(widget,/data-tao-talisman-price/);
 assert.match(widget,/aria-expanded=\{expanded\} aria-controls=\{detailsId\}/);
 assert.match(widget,/hidden=\{!expanded\}/);
 assert.match(widget,/onRate=\{expanded \? value => stars.rate\(item.id, value\) : undefined\}/);
 assert.match(widget,/saveBrowserTalismanCart\(\[\.\.\.cartIds, itemId\]\)/);
 assert.match(widget,/router.push\("\/" \+ locale \+ "\/talismans\/cart"\)/);
 assert.match(css,/\.price\{position:absolute;top:0;right:0/);
 assert.match(css,/\.actions\{grid-column:1\/-1;grid-row:2;display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.scroller\{max-height:none;overflow:visible/);
 assert.match(css,/\.moreDetails\[hidden\]\{display:none!important\}/);
});
