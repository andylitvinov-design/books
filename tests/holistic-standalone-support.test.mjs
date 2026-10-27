import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { TAOIST_TALISMANS } from "../lib/practitioners/taoist-talismans.js";
import { normalizeTalismanEnquiry } from "../lib/practitioners/remote-energy-support.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Hub links to the two dedicated pages; talisman media and practitioner results are not duplicated on hub", () => {
  const hub = read("app/[locale]/holistic-support/page.tsx");
  const topics = read("components/holistic-support-topic-filter.tsx");
  assert.match(hub, /data-holistic-talisman-catalog-link/);
  assert.match(hub, /href=\{"\/" \+ locale \+ "\/talismans"\}/);
  assert.doesNotMatch(hub, /<TaoistTalismanCatalog/);
  assert.match(topics, /\/talismans/);
  assert.match(topics, /\/support-options\?topic=/);
  assert.doesNotMatch(topics, /HolisticInlineSupportOrder|sessionStorage|localStorage/);
  for (const segment of ["talismans", "support-options"]) {
    const page = read("app/[locale]/" + segment + "/page.tsx");
    assert.match(page, /PublicSiteHeader locale=\{locale\}/);
    assert.match(page, /alternates:/);
    assert.match(page, /en:.*ru:.*es:.*"x-default"/);
    for (const locale of ["en", "ru", "es"]) assert.match(page, new RegExp("\\b" + locale + ":\\s*\\{"));
  }
});

test("Practitioners load on mount and refresh with filters, never behind the Search action", () => {
  const page = read("app/[locale]/support-options/page.tsx");
  const chooser = read("components/holistic-inline-support-order.tsx");
  const wrapper = read("components/holistic-support-order-page.tsx");
  assert.match(page, /query\.topic === "love" \|\| query\.topic === "health"/);
  assert.match(chooser, /useState\(true\)/);
  assert.doesNotMatch(chooser, /setSearched\(false\)/);
  assert.match(chooser, /fetch\(query, \{ credentials: "omit"/);
  assert.match(chooser, /controller\.abort\(\)/);
  assert.match(chooser, /standalone \? " " \+ styles\.standalone/);
  assert.match(wrapper, /<HolisticInlineSupportOrder standalone/);
  assert.match(wrapper, /router\.push\("\/" \+ locale \+ "\/talismans"\)/);
  assert.doesNotMatch(wrapper, /checkout|confirmBooking|markPaid/);
});

test("Talisman product photos, names and descriptions appear before a secondary live practitioner card", () => {
  const route = read("app/[locale]/talismans/page.tsx");
  const gallery = read("components/taoist-talisman-catalog.tsx");
  const booking = read("components/remote-energy-support-booking.tsx");
  assert.match(route, /<TaoistTalismanCatalog locale=\{locale\} standalone/);
  assert.match(gallery, /standalone \? TAOIST_TALISMANS\[0\] : null/);
  assert.match(gallery, /data-tao-selected-item=\{selection\.id\}/);
  assert.ok(gallery.indexOf("selection.image") < gallery.indexOf("<HolisticInlineSupportOrder key={selection.id}"));
  assert.match(booking, /requestKind === "talisman"\s*\? <p className=\{styles\.talismanMasterCaption\}>/);
  assert.match(booking, /data-remote-support-specialist=\{master\.serviceId\}/);
  assert.match(booking, /window\.sessionStorage\.setItem\(TALISMAN_REQUEST_DRAFT_KEY/);
  assert.match(booking, /stageRemoteSupportPrivateIntention\(selected\.serviceId, intention\)/);
  for (const item of TAOIST_TALISMANS) {
    assert.ok(existsSync(new URL("../public" + item.image, import.meta.url)), "missing illustration " + item.id);
    for (const locale of ["en", "ru", "es"]) {
      assert.ok(item[locale].title.length > 7);
      assert.ok(item[locale].description.length > 20);
    }
    assert.equal(Object.hasOwn(item,"price"), false, "do not invent talisman prices");
  }
  const approved={slug:"remote-energy-support",area_key:"energy_spiritual",status:"published",
    active:true,delivery_format:"online",pricing_mode:"fixed"};
  assert.deepEqual(normalizeTalismanEnquiry({version:1,goal:TAOIST_TALISMANS[0].goal,
    catalogId:TAOIST_TALISMANS[0].id},approved),{
    kind:"talisman_enquiry",goal:TAOIST_TALISMANS[0].goal,catalogId:TAOIST_TALISMANS[0].id});
});

test("Standalone mobile geometry has no offset panels, 44px actions and EN/RU/ES sitemap routes", () => {
  const css = read("components/holistic-inline-support-order.module.css");
  const catalogCss = read("components/taoist-talisman-catalog.module.css");
  const masterCss = read("components/remote-energy-support-booking.module.css");
  const sitemap = read("app/sitemap.ts");
  assert.match(css,/\.panel\.standalone\{width:100%;max-width:100%;left:auto;margin:0/);
  assert.match(css,/max-width:360px/);
  assert.match(css,/min-height:44px/);
  assert.match(catalogCss,/\.standalone \.scroller\{max-height:none;overflow:visible/);
  assert.match(catalogCss,/max-width:355px/);
  assert.match(masterCss,/\.compactResults\[data-support-request-kind="talisman"\]/);
  assert.match(sitemap,/\/talismans/);
  assert.match(sitemap,/\/support-options/);
});
