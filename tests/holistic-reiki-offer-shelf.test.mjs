import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {listPublicReikiAcademyOffers,filterPublicReikiAcademyOffers} from "../lib/academy/reiki-public-offers.mjs";
import {REIKI_LEVEL_PRICES} from "../lib/academy/reiki-level-pricing.js";

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");

test("Academy catalogue is the seven real linked public programmes, never duplicate services", () => {
  for (const locale of ["ru","en","es"]) {
    const offers = listPublicReikiAcademyOffers(locale);
    assert.equal(offers.length,7);
    assert.equal(new Set(offers.map(o=>o.id)).size,7);
    assert.equal(offers.filter(o=>o.kind==="initiation").length,3);
    assert.equal(offers.filter(o=>o.kind==="course").length,4);
    for (const offer of offers) {
      assert.match(offer.href,new RegExp("^/"+locale+"/academy/reiki/"));
      assert.ok(offer.title.length > 10 && offer.description.length > 20);
      assert.equal(offer.source,"public_academy");
      assert.equal(offer.deliveryTiming,null);
      assert.equal(offer.reportMode,null);
      assert.equal(offer.certificateAvailable,null);
    }
    assert.ok(offers.some(o=>o.id==="reiki-practitioner-course" && o.priceOptions.some(p=>p.amountEur===0)));
  }
});

test("canonical paid initiation fees are reused without claiming course tuition", () => {
  const offers=listPublicReikiAcademyOffers("ru");
  const byId=Object.fromEntries(offers.map(o=>[o.id,o]));
  assert.deepEqual(byId["tantra-initiation"].priceOptions.map(o=>o.amountEur),[0,REIKI_LEVEL_PRICES.tantra.amountEur]);
  assert.deepEqual(byId["yggdrasil-initiation"].priceOptions.map(o=>o.amountEur),[0,REIKI_LEVEL_PRICES.yggdrasil.amountEur]);
  assert.equal(byId["kundalini-initiation"].priceOptions[1].amountEur,null);
  for (const id of ["tantra-reiki-course","kundalini-reiki-course","yggdrasil-reiki-course"]) {
    assert.equal(byId[id].priceOptions[0].amountEur,null,id+" must not claim unapproved tuition");
  }
});

test("price filter honors published EUR bands and never invents an unknown fee", () => {
  const filter=(kind,price)=>filterPublicReikiAcademyOffers("ru",{kind,price}).map(x=>x.id);
  assert.deepEqual(filter("initiation","free").sort(),["kundalini-initiation","tantra-initiation","yggdrasil-initiation"]);
  assert.deepEqual(filter("initiation","mid"),["tantra-initiation"]);
  assert.deepEqual(filter("initiation","high"),["yggdrasil-initiation"]);
  assert.deepEqual(filter("initiation","low"),[]);
  assert.deepEqual(filter("initiation","premium"),[]);
  assert.deepEqual(filter("course","free"),["reiki-practitioner-course"]);
  assert.deepEqual(filter("course","high"),[]);
  assert.equal(filter("course","all").length,4);
  assert.equal(filterPublicReikiAcademyOffers("ru",{kind:"session"}).length,0);
});

test("one filtered offers shelf replaces legacy master-only thumbnail for Reiki, without duplicate CRM", () => {
  const parent=read("components/holistic-support-master-gallery.tsx");
  const shelf=read("components/holistic-reiki-offer-shelf.tsx");
  const publicDb=read("lib/practitioners/public-remote-support-masters.ts");
  const css=read("components/holistic-reiki-offer-shelf.module.css");
  assert.match(parent,/kind === "healing" \? <HolisticReikiOfferShelf/);
  assert.match(parent,/filterPublicReikiAcademyOffers\(locale/);
  assert.match(shelf,/data-reiki-service-card=\{master\.serviceId\}/);
  assert.match(shelf,/data-reiki-academy-offer=\{offer\.id\}/);
  assert.match(shelf,/data-support-master-thumb=\{master\.serviceId\}/);
  assert.match(shelf,/master\.serviceTitle/);
  assert.match(shelf,/master\.reikiOffer/);
  assert.match(shelf,/matchReikiVariants/);
  assert.match(shelf,/onRequestMaster\(master\.serviceId\)/);
  assert.match(shelf,/href=\{offer\.href\}/);
  assert.doesNotMatch(shelf,/certificateAvailable === true/); // Academy never promises a certificate
  assert.match(publicDb,/serviceTitle: service\.copy\?\.title/);
  assert.match(css,/\.shelf \.action/);
  assert.doesNotMatch(shelf,/createPayment|insert into|serviceRoleKey|autoSubmit|window\.localStorage/);
});

test("quick three-way Reiki type switch shares the real session/initiations/programmes engine", () => {
  const parent=read("components/holistic-support-master-gallery.tsx");
  const css=read("components/holistic-support-master-gallery.module.css");
  assert.match(parent,/data-support-reiki-quick-format/);
  assert.match(parent,/data-support-reiki-quick-kind=\{value\}/);
  assert.match(parent,/aria-pressed=\{reikiFormat === value\}/);
  assert.match(parent,/chooseReikiFormat\(value, true\)/);
  assert.match(parent,/onClick=\{\(\) => chooseReikiFormat\(value\)\}/);
  assert.match(parent,/format=\{reikiFormat\} price=\{reikiPrice\}/);
  for (const word of ["Course", "Курс", "Curso"]) assert.ok(parent.includes(word));
  assert.match(css,/\.viewer \.reikiQuickFormat button\[aria-pressed="true"\]/);
  assert.match(css,/min-height:44px/);
});

test("Reiki support is a service marketplace with one concise picker and genuine booking paths", () => {
  const parent=read("components/holistic-support-master-gallery.tsx");
  const galleryCss=read("components/holistic-support-master-gallery.module.css");
  const shelf=read("components/holistic-reiki-offer-shelf.tsx");
  const shelfCss=read("components/holistic-reiki-offer-shelf.module.css");
  const browse=parent.indexOf('data-support-reiki-marketplace');
  const formats=parent.indexOf('data-support-reiki-quick-format');
  const foci=parent.indexOf('data-support-reiki-filters');
  const hero=parent.indexOf('data-support-reiki-sales-hero');
  const offers=parent.indexOf('kind === "healing" ? <HolisticReikiOfferShelf');
  assert.ok(browse !== -1 && browse < formats && formats < foci && foci < offers);
  assert.ok(hero > 0 && hero < browse, "hero definition is reused, not duplicated");
  assert.match(parent,/data-support-reiki-find aria-expanded=\{reikiTab === "filter"\}/);
  assert.match(parent,/aria-controls="reiki-active-panel" onClick=\{\(\) => setReikiTab\("filter"\)\}/);
  for(const value of ["session","initiation","course"]) {
    assert.ok(parent.includes('data-support-reiki-quick-kind={value}'));
    assert.ok(parent.includes('value === "'+value+'"') || value==="course");
  }
  assert.match(parent,/reikiFormat === "session" && <div className=\{styles\.reikiFocusBar\}/);
  assert.match(parent,/chooseReikiFormat\(value, true\)/);
  assert.match(parent,/filterPublicReikiAcademyOffers\(locale/);
  assert.match(parent,/matchingReikiOptions\(master\)/);
  assert.match(parent,/data-support-reiki-request/);
  assert.match(parent,/setOrderOpen\(true\)/);
  assert.match(parent,/<RemoteEnergySupportBooking/);
  assert.match(galleryCss,/\.reikiBrowseHeading/);
  assert.match(parent,/className=\{styles\.reikiBrowseIntro\}/);
  assert.match(galleryCss,/width: calc\(100% - 12px\)/);
  assert.match(galleryCss,/min-height: 305px; height: auto; max-height: none/);
  assert.match(galleryCss,/min-height: 64px/);
  assert.match(galleryCss,/scroll-snap-type: x proximity/);
  assert.match(galleryCss,/\.reikiStage\[data-active-tab="main"\] \.reikiStageTabs \{ order: 2/);
  assert.match(galleryCss,/@media\(max-width:640px\)/);
  assert.match(galleryCss,/@media\(max-width:350px\)/);
  assert.match(shelfCss,/grid-template-columns:116px minmax\(0,1fr\)/);
  assert.match(shelf,/data-reiki-service-card=\{master\.serviceId\}/);
  assert.match(shelf,/data-reiki-academy-offer=\{offer\.id\}/);
  assert.match(shelf,/master\.serviceHref/);
  assert.match(shelf,/option\.amountEur === null \? t\.unknownPrice/);
  assert.doesNotMatch(shelf,/createPayment|autoSubmit|fake(?:Track|Price)|hardcoded(?:Booking|Slot)/);
  assert.doesNotMatch(parent,/Треки поддержки|Поддержка за 21 день/);
});
