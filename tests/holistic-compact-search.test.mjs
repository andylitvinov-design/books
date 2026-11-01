import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesHolisticEuroBudget, matchesHolisticGoal } from "../lib/practitioners/holistic-search-budgets.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("exactly three owner themes map to approved service areas without invented matches", () => {
  assert.equal(matchesHolisticGoal("business_money", "Work and money"), true);
  assert.equal(matchesHolisticGoal("career_purpose", "Work and money"), true);
  assert.equal(matchesHolisticGoal("relationships", "Connection and relationships"), true);
  for (const area of ["energy_spiritual", "body_somatic", "emotional_psychological", "homeopathy_holistic"]) {
    assert.equal(matchesHolisticGoal(area, "Inner balance and calm"), true);
  }
  assert.equal(matchesHolisticGoal("relationships", "Work and money"), false);
  assert.equal(matchesHolisticGoal("business_money", "Inner balance and calm"), false);
  assert.equal(matchesHolisticGoal("unknown", "Work and money"), false);
  const component = read("components/holistic-inline-support-order.tsx");
  const topics = component.slice(component.indexOf("const TOPICS = ["), component.indexOf("] as const;"));
  assert.equal((topics.match(/goal:/g) || []).length, 3);
  for (const label of ["Бизнес и деньги", "Отношения", "Энергия и здоровье",
    "Business & money", "Relationships", "Energy & health",
    "Negocios y dinero", "Relaciones", "Energía y salud"]) {
    assert.ok(component.includes(label), "missing localized theme " + label);
  }
});

test("free, €20 and €100 selections never convert currencies or invent a price", () => {
  const match = matchesHolisticEuroBudget;
  assert.equal(match(null, "", "contact", "any"), true);
  assert.equal(match(null, "", "contact", "free"), false);
  assert.equal(match(null, "", "contact", "100"), false);
  assert.equal(match(0, "EUR", "free", "free"), true);
  assert.equal(match(null, "", "free", "free"), true);
  assert.equal(match(0, "CAD", "fixed", "free"), true);
  assert.equal(match(20, "EUR", "fixed", "20"), true);
  assert.equal(match(20.01, "EUR", "fixed", "20"), false);
  assert.equal(match(50, "EUR", "fixed", "100"), true);
  assert.equal(match(100, "EUR", "fixed", "100"), true);
  assert.equal(match(100.01, "EUR", "fixed", "100"), false);
  assert.equal(match(15, "CAD", "fixed", "20"), false);
  assert.equal(match(60, "USD", "fixed", "100"), false);
  assert.equal(match(9, "EUR", "contact", "20"), false);
  assert.equal(match(NaN, "EUR", "fixed", "100"), false);
  assert.equal(match(-1, "EUR", "fixed", "free"), false);
  assert.equal(match(60, "CAD", "fixed", "any"), true);
});

test("mobile chooser is one-stage, full-width, 3 × 3 × 4 choices and one Search CTA", () => {
  const component = read("components/holistic-inline-support-order.tsx");
  const css = read("components/holistic-inline-support-order.module.css");
  assert.match(component, /data-support-theme=\{item\.id\}/);
  assert.match(component, /data-support-choice=\{value\}/);
  assert.match(component, /data-support-budget=\{value\}/);
  assert.match(component, /data-support-search/);
  assert.match(component, /setSearched\(true\)/);
  assert.match(component, /hidden=\{!searched\}/);
  assert.match(component, /"energy", "talisman", "consultation"/);
  assert.match(component, /"any", "free", "20", "100"/);
  assert.match(component, /matchesHolisticEuroBudget\(/);
  assert.match(component, /matchesHolisticGoal\(/);
  assert.match(css, /\.threeColumns\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.fourColumns\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /width:calc\(100vw - 16px\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /max-width:360px/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|tracking|analytics|pixel/);
});

test("price-filtered results preserve verified practitioner booking and real consultation route", () => {
  const jsx = read("components/remote-energy-support-booking.tsx");
  const api = read("app/api/public/remote-energy-support-masters/route.ts");
  const directory = read("lib/practitioners/public-remote-support-masters.ts");
  const chooser = read("components/holistic-inline-support-order.tsx");
  assert.match(jsx, /compactFinder\?: boolean/);
  assert.match(jsx, /!compactFinder && <section className=\{styles\.intentPanel\}/);
  assert.match(jsx, /matchingMasters\.map\(\(master\)/);
  assert.match(jsx, /matchesHolisticEuroBudget\(/);
  assert.match(jsx, /published.*price/i);
  assert.match(jsx, /currentPrice\.price/);
  assert.match(jsx, /stageRemoteSupportPrivateIntention\(selected\.serviceId, intention\)/);
  assert.match(chooser, /&kind=consultation/);
  assert.match(api, /kind === "consultation"/);
  assert.match(api, /listPublishedConsultationOffers\(locale\)/);
  assert.match(directory, /service\.status === "published" && service\.active/);
  assert.match(directory, /\["session", "assessment", "intro"\]/);
  assert.match(directory, /getPublicServiceDetailHref\(locale, practitioner\.slug, service\.slug\)/);
  assert.doesNotMatch(chooser, /checkout|paymentIntent|paid=true/i);
  assert.doesNotMatch(api, /processPayment|chargeCustomer|sendMessage/i);
});
