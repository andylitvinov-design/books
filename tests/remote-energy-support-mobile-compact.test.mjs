import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("focus-first: compact choice and optional preferences before published specialist cards", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const css = read("components/remote-energy-support-booking.module.css");
  const route = read("app/[locale]/services/remote-energy-support/page.tsx");
  assert.ok(jsx.indexOf('className={styles.focusChips}') < jsx.indexOf('id="remote-intention"'));
  assert.ok(jsx.indexOf('id="remote-intention"') < jsx.indexOf('data-remote-find-options'));
  assert.ok(jsx.indexOf('data-remote-find-options') < jsx.indexOf("matchingMasters.map((master) => {"));
  assert.ok(jsx.indexOf('className={styles.focusChips}') < jsx.indexOf("matchingMasters.map((master) => {"));
  assert.ok(jsx.indexOf('className={styles.results}') < jsx.indexOf("matchingMasters.map((master) => {"));
  assert.match(jsx, /maxLength=\{1000\} rows=\{2\}/);
  assert.match(jsx, /master\.photo\s*\?\s*<img src=\{master\.photo\} alt=""/);
  assert.match(jsx, /master\.description \|\| t\.defaultDescription/);
  assert.match(jsx, /<details className=\{styles\.cardDetails\}>/);
  assert.match(jsx, /className=\{styles\.requestButton\}/);
  assert.match(jsx, /\{isOpen && \(requestKind === "talisman" \? \(/);
  assert.match(jsx, /<form id=\{"remote-request-" \+ master\.serviceId\} className=\{styles\.bookingForm\} onSubmit=\{submit\}>/);
  assert.match(jsx, /\) : \(\s*<form id=/);
  assert.match(jsx, /disabled=\{requestKind === "energy" && !offers\.length\}/);
  const sharedOffers = read("lib/practitioners/public-remote-support-masters.ts");
  assert.match(route, /listRemoteEnergySupportMasters\(locale\)/);
  assert.match(sharedOffers, /description: service\.copy\?\.shortDescription \|\| service\.copy\?\.description/);
  assert.match(sharedOffers, /service\.slug === "remote-energy-support" && service\.areaKey === "energy_spiritual"/);
  assert.match(css, /\.masterCard\{display:grid;grid-template-columns:minmax\(110px,34%\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:365px\)/);
  assert.match(css, /\.masterCard\{grid-template-columns:87px minmax\(0,1fr\)/);
  assert.match(css, /\.cardDetails summary,\.requestButton\{[^}]*min-height:44px/);
  assert.doesNotMatch(jsx, /<select id="remote-master"/);
});

test("only published duration and price pairs are displayed, never invented options", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  assert.match(jsx, /master\.priceOptions\s*\.filter\(\(offer\) => Number\.isFinite\(offer\.price\) && offer\.price > 0 &&/);
  assert.match(jsx, /REMOTE_SUPPORT_DURATIONS\.map/);
  assert.match(jsx, /disabled=\{!published\} checked=\{duration === minutes\}/);
  assert.match(jsx, /<span>\{minutes\} \{t\.minutes\}<\/span>/);
  assert.match(jsx, /Not booked · No payment yet/);
  assert.match(jsx, /Не подтверждено · Без оплаты/);
  assert.match(jsx, /Sin confirmar · Sin pago/);
  assert.match(jsx, /not a confirmed appointment/);
  assert.match(jsx, /not medical treatment/);
  assert.match(jsx, /Continue to request/);
  assert.doesNotMatch(jsx, /createPaymentIntent|checkoutSession|stripe\./i);
});

test("private intention is not in URLs, browser storage, analytics or public booking data", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const bridge = read("lib/practitioners/remote-energy-support.js");
  const cabinet = read("components/app/app-workspace.jsx");
  const block = jsx.slice(jsx.indexOf("const draft = {"), jsx.indexOf("window.sessionStorage.setItem(REMOTE_SUPPORT_DRAFT_KEY"));
  assert.ok(block.startsWith("const draft = {"));
  assert.doesNotMatch(block, /intention|privateIntention/);
  assert.match(jsx, /stageRemoteSupportPrivateIntention\(selected\.serviceId, intention\)/);
  assert.match(jsx, /router\.push\("\/" \+ cabinetLocale \+ "\/app\/consultations\?service="/);
  assert.match(bridge, /let pendingPrivateIntention = null/);
  assert.match(bridge, /pendingPrivateIntention = null\s*return staged\?\.serviceId/);
  const handoff = bridge.slice(bridge.indexOf("let pendingPrivateIntention = null"))
    .replace(/\/\/[^\n]*/g, "");
  assert.doesNotMatch(handoff, /sessionStorage|localStorage|document\.cookie|navigator\.sendBeacon|fetch\(/);
  assert.match(cabinet, /takeRemoteSupportPrivateIntention\(service\.id\)/);
  assert.match(cabinet, /message: note/);
  assert.match(cabinet, /await appFetch\('requests', body\)/);
  assert.match(jsx, /window\.sessionStorage\.setItem\(REMOTE_SUPPORT_DRAFT_KEY, JSON\.stringify\(draft\)\)/);
});

test("expanded phone session compactness preserves truthful price and disclosure", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const css = read("components/remote-energy-support-booking.module.css");
  assert.match(jsx,/data-booking-open=\{isOpen \? "true" : undefined\}/);
  assert.match(css,/\.masterOffer\[data-booking-open="true"\] \.masterCard\{grid-template-columns:78px/);
  assert.match(css,/\.bookingForm\{grid-template-columns:minmax\(0,1fr\);gap:7px;padding:10px 11px/);
  assert.match(css,/\.bookingForm \.durationGroup label:has\(input:disabled\)\{display:none\}/);
  assert.match(jsx,/<details className=\{styles\.requestSummary\}>/);
  assert.match(jsx,/<summary className=\{styles\.requestSummaryToggle\}>/);
  assert.match(jsx,/<p>\{t\.noSlots\} \{t\.price\}<\/p>/);
  for(const label of ["Distance · no call","Дистанционно","Sin llamada"]){assert.ok(jsx.includes(label));}
  assert.match(jsx,/aria-label=\{t\.async\}/);
  assert.match(jsx,/aria-label=\{t\.live\}/);
  assert.doesNotMatch(jsx,/checkoutSession|createPaymentIntent/);
});

test("one-screen EN/RU/ES finder has five approved categories, an optional note and functional reveal", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const css = read("components/remote-energy-support-booking.module.css");
  const options = jsx.slice(jsx.indexOf("const FOCUSES = ["), jsx.indexOf("] as const;", jsx.indexOf("const FOCUSES = [")));
  assert.equal((options.match(/\bid:/g) || []).length, 5, "exactly five selectable sectors");
  for (const approved of ["Inner balance and calm", "Grounding and body awareness",
    "Connection and relationships", "Energy and resources", "Work and money"]) {
    assert.ok(options.includes(approved), "missing approved sector: " + approved);
  }
  assert.doesNotMatch(options, /Clarity and life direction|Personal intention/);
  for (const localized of ["Find options", "Найти варианты", "Buscar opciones",
    "Any preferences? (optional)", "Ваши пожелания (необязательно)", "¿Alguna preferencia? (opcional)"]) {
    assert.ok(jsx.includes(localized), "missing localized copy: " + localized);
  }
  assert.match(jsx, /data-remote-find-options/);
  assert.match(jsx, /aria-controls="remote-results" aria-expanded=\{showResults\}/);
  assert.match(jsx, /hidden=\{!showResults\}/);
  assert.match(jsx, /onClick=\{findOptions\}/);
  assert.match(jsx, /document\.getElementById\("remote-practitioners-title"\)/);
  assert.match(jsx, /if \(!goal\) \{/);
  assert.match(css, /\.focusChips\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.focusChips button\{[^}]*min-height:44px/);
  assert.match(css, /\.findButton\{[^}]*min-height:48px/);
  assert.match(css, /\.results\[hidden\]\{display:none\}/);
});
