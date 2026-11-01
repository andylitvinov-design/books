import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Catalog first click adds a public item and second click opens the dedicated basket",()=>{
 const catalog=read("components/taoist-talisman-catalog.tsx");
 const cart=read("components/taoist-talisman-cart.tsx");
 const page=read("app/[locale]/talismans/cart/page.tsx");
 assert.match(catalog,/data-tao-talisman-order=\{item.id\}/);
 assert.match(catalog,/cartIds\.includes\(itemId\)/);
 assert.match(catalog,/saveBrowserTalismanCart\(\[\.\.\.cartIds, itemId\]\)/);
 assert.match(catalog,/cartIds\.includes\(item\.id\) \? t\.order : t\.add/);
 assert.match(catalog,/router\.push\("\/" \+ locale \+ "\/talismans\/cart"\)/);
 assert.match(page,/TaoistTalismanCart locale=\{locale as PublicLocale\}/);
 assert.match(cart,/data-taoist-talisman-cart/);
 assert.match(cart,/data-cart-talisman=\{item\.id\}/);
 assert.match(cart,/saveBrowserTalismanCart\(ids\.filter/);
 assert.doesNotMatch(catalog,/fetch\(|sessionStorage|localStorage|checkout|charge/);
});
test("Basket holds payment until master approves unpublished price and saves consented CRM quote",()=>{
 const cart=read("components/taoist-talisman-cart.tsx");
 const route=read("app/api/service-enquiries/route.js");
 for(const key of ["en","ru","es"])
  assert.match(cart,new RegExp("\\b"+key+":\\s*\\{"));
 for(const method of ['"square"','"paypal"','"wise"'])
  assert.ok(cart.includes(method));
 assert.match(cart,/master confirms/);
 assert.match(cart,/price.*delivery/);
 assert.match(cart,/contactConsent:true/);
 assert.match(cart,/fetch\("\/api\/service-enquiries"/);
 assert.match(cart,/data\?\.saved !== true/);
 assert.match(cart,/data\?\.contactPending !== false/);
 assert.match(cart,/data-talisman-quote-saved/);
 assert.match(cart,/payment receipt will only appear after real provider confirmation/i);
 assert.doesNotMatch(cart,/\/api\/payments\/square\/checkout/);
 assert.doesNotMatch(cart,/t\.me\/|api\.telegram\.org|sendMessage|window\.open/);
 assert.match(route,/requireSameOrigin\(request, config\)/);
 assert.match(route,/createPublicServiceEnquiry\(config, payload\)/);
});
test("Generic topic finder and existing master enquiry remain intact",()=>{
 const wizard=read("components/holistic-inline-support-order.tsx");
 const booking=read("components/remote-energy-support-booking.tsx");
 for(const k of ["en","ru","es"])
  assert.match(wizard,new RegExp("\\b"+k+":\\s*\\{"));
 assert.match(wizard,/data-support-search/);
 assert.match(wizard,/data-support-choice=\{value\}/);
 assert.match(wizard,/data-support-budget=\{value\}/);
 assert.match(wizard,/hidden=\{!searched\}/);
 assert.match(wizard,/initialTalismanId=\{initialTalismanId\} compactFinder/);
 assert.match(booking,/isOpen && \(requestKind === "talisman" \? \(/);
 const repository=read("lib/app/repository.js");
 assert.match(repository,/createPractitionerClientMessages/);
 assert.match(repository,/talismanEnquiry\.catalogId/);
 assert.match(repository,/SHARING_NOT_ALLOWED/);
});
