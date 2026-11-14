import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {rankAssistProducts} from "../lib/assist/product-recommendations.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const component=read("components/assist-top-recommendations.tsx");
const shell=read("components/services-assist-mobile.tsx");
const css=read("components/assist-top-recommendations.module.css");

test("products, not general direction filters, occupy the recommendation shelf",()=>{
  assert.match(component,/rankAssistProducts\(focus\?\?"general",preferences\)/);
  assert.doesNotMatch(component,/data-assist-direction|const directions|const shelves/);
  for(const id of ["review","therapy","constellation","business","opora","reiki","mandala"])
    assert(component.includes(id+":{path:"),id);
  assert.match(component,/data-assist-product-link=\{id\}/);
  assert.match(component,/data-assist-best-action=\{id\}/);
  assert.match(shell,/!crisis&&selection\?<AssistTopRecommendations/);
  assert.match(shell,/preferences=\{preferences\}/);
});

test("a visitor feeling lost sees three existing concrete offers in helpful order",()=>{
  assert.deepEqual(rankAssistProducts("growth",{}),["review","therapy","constellation"]);
  assert.match(shell,/\\blost\\b/);
  assert.match(shell,/\\bdirection\\b/);
  assert.match(component,/services\/free-situation-review/);
  assert.match(component,/services\/imagery-therapy/);
  assert.match(component,/services\/systemic-constellations/);
});

test("horizontal mobile rows have readable prices and real single-product actions",()=>{
  assert.match(css,/\.card\{display:grid;grid-template-columns:minmax\(0,1fr\) 87px/);
  assert.match(css,/\.product\{display:grid;grid-template-columns:67px/);
  assert.match(css,/\.action\{[^}]*min-height:44px/);
  assert.match(component,/assistPriceLabel/);
  assert.match(component,/telegramServiceRequestUrl/);
  assert.match(component,/href=\{href\}/);
  assert.match(component,/referrerPolicy="no-referrer"/);
  assert.doesNotMatch(component,/href="#"/);
});

test("local-only matching, crisis guard and all three languages remain",()=>{
  for(const marker of ["ru:{","en:{","es:{","Free Personal Situation Review",
    "Бесплатный разбор ситуации","Revisión personal gratuita"])
    assert(component.includes(marker),marker);
  assert.match(shell,/urgent\.test\(selection\.text\)/);
  assert.doesNotMatch(component,/fetch\(|localStorage|sessionStorage|sendBeacon/);
});
