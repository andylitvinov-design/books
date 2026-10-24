import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("remote support keeps all mobile choices compact without losing disclosures", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const css = read("components/remote-energy-support-booking.module.css");

  assert.match(jsx, /<details className=\{styles\.masterDetails\}>/);
  assert.match(jsx, /<summary aria-label=\{t\.profile \+ ": " \+ selected\.name\}/);
  assert.match(jsx, /className=\{styles\.masterThumb\}/);
  assert.match(jsx, /<select id="remote-master"/);
  assert.match(jsx, /<select id="remote-goal"/);
  assert.match(jsx, /<select id="remote-method"/);
  assert.match(jsx, /<fieldset className=\{styles\.formatGroup\}>/);
  assert.match(jsx, /<fieldset className=\{styles\.durationGroup\}>/);
  assert.match(jsx, /<input id="remote-date" type="date" required/);
  assert.match(jsx, /<input id="remote-time" type="time" required/);
  assert.match(jsx, /<details className=\{styles\.review\}>/);
  assert.match(css, /\.form\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.durationGroup label\{box-sizing:border-box;flex:1 1 calc\(25% - 4px\)/);
  assert.ok(css.lastIndexOf(".timeFields{grid-template-columns:repeat(2,minmax(0,1fr))") >
    css.lastIndexOf("@media(max-width:365px)"), "320px date and time must stay side-by-side");
  assert.ok(css.lastIndexOf(".formatGroup label{flex:1 1 calc(50% - 3px)}") >
    css.lastIndexOf("@media(max-width:365px)"), "320px formats must not stack vertically");
});

test("mobile pricing stays truthful, localized and uses the existing request handoff", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  assert.match(jsx, /REMOTE_SUPPORT_DURATIONS\.map/);
  assert.match(jsx, /disabled=\{!published\}/);
  assert.match(jsx, /published \? priceLabel\(published\.price/);
  assert.match(jsx, /Not booked · No payment yet/);
  assert.match(jsx, /Не подтверждено · Без оплаты/);
  assert.match(jsx, /Sin confirmar · Sin pago/);
  assert.match(jsx, /not a confirmed appointment/);
  assert.match(jsx, /window\.sessionStorage\.setItem\(REMOTE_SUPPORT_DRAFT_KEY/);
  assert.match(jsx, /app\/consultations\?service=/);
  assert.doesNotMatch(jsx, /createPaymentIntent|checkoutSession|stripe\./i);
});
