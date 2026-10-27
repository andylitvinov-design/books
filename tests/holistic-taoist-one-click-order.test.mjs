import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Catalog Order loads published talisman master without repeating search filters",()=>{
 const item=read("components/taoist-talisman-catalog.tsx");
 const wizard=read("components/holistic-inline-support-order.tsx");
 const booking=read("components/remote-energy-support-booking.tsx");
 assert.match(item,/initialGoal=\{selection\.goal\} initialTalismanId=\{selection\.id\}/);
 assert.match(wizard,/const catalogMode = kind === "talisman" && Boolean\(initialTalismanId\)/);
 assert.match(wizard,/useState\(true\)/);
 assert.doesNotMatch(wizard,/setSearched\(false\)/);
 assert.match(item,/standalone \? TAOIST_TALISMANS\[0\] : null/);
 assert.match(item,/data-tao-selected-item=\{selection.id\}/);
 assert.match(wizard,/\{!catalogMode && <div className=\{styles\.picker\}>/);
 assert.match(wizard,/\{catalogMode \? t\.catalogTitle : t\.title\}/);
 assert.match(wizard,/fetch\(query, \{ credentials: "omit"/);
 assert.match(wizard,/role="alert"/);
 assert.match(booking,/initialTalismanId && selectedKind === "talisman" && masters\.length === 1/);
 assert.match(booking,/masters\[0\]\.serviceId/);
 assert.match(booking,/selectedServiceId === master\.serviceId/);
 assert.match(booking,/isOpen && \(requestKind === "talisman" \? \(/);
 assert.match(booking,/window\.sessionStorage\.setItem\(TALISMAN_REQUEST_DRAFT_KEY/);
 assert.match(booking,/stageRemoteSupportPrivateIntention\(selected\.serviceId, intention\)/);
 assert.match(item,/onClick=\{\(\) => choose\(item\)\}/);
 assert.doesNotMatch(item,/fetch\(|sessionStorage|localStorage|checkout|charge/);
});
test("Generic topic finder keeps filters, catalogue preserves EN RU ES and consent",()=>{
 const wizard=read("components/holistic-inline-support-order.tsx");
 const catalog=read("components/taoist-talisman-catalog.tsx");
 for(const k of ["en","ru","es"]){
  assert.match(wizard,new RegExp("\\b"+k+":\\s*\\{"));
  assert.match(catalog,new RegExp("\\b"+k+":\\s*\\{"));
 }
 assert.match(wizard,/data-support-search/);
 assert.match(wizard,/data-support-choice=\{value\}/);
 assert.match(wizard,/data-support-budget=\{value\}/);
 assert.match(wizard,/hidden=\{!searched\}/);
 assert.match(wizard,/initialTalismanId=\{initialTalismanId\} compactFinder/);
 const repository=read("lib/app/repository.js");
 assert.match(repository,/createPractitionerClientMessages/);
 assert.match(repository,/talismanEnquiry\.catalogId/);
 assert.match(repository,/SHARING_NOT_ALLOWED/);
});
