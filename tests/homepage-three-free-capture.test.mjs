import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("components/holistic-house-home.tsx");
const wrapper = read("components/homepage-contact-cta.tsx");
const capture = read("components/homepage-free-capture.tsx");
const css = read("components/consultation-choice-capture.module.css");

test("only the existing bottom blue capture presents the three free choices on Home", () => {
  assert.doesNotMatch(home, /<FreeInsightsPaths|import \{ FreeInsightsPaths \}/);
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/);
  assert.match(wrapper, /id="home-consultation"/);
  assert.match(wrapper, /data-home-contact-capture/);
  assert.match(wrapper, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(capture, /data-home-free-capture="true"/);
  assert.match(capture, /data-consultation-capture="home-free"/);
  assert.match(capture, /data-choice-layout="home-free"/);
  assert.deepEqual([...capture.matchAll(/type FreeOffer = "([^"]+)" \| "([^"]+)" \| "([^"]+)";/g)].map(m => m.slice(1, 4)), [["situation", "wu", "stress"]]);
  assert.match(capture, /offerOrder: FreeOffer\[\] = \["situation", "wu", "stress"\]/);
});

test("each selection opens its exact existing entry route, changing the orange CTA", () => {
  for (const slug of ["free-situation-review", "dao-health-profile", "client#cabinet-tests"]) {
    assert.ok(capture.includes(slug), "Missing destination: " + slug);
  }
  for (const path of [
    "app/[locale]/services/free-situation-review/page.tsx",
    "app/[locale]/services/dao-health-profile/page.tsx",
    "app/[locale]/client/page.tsx",
  ]) assert.ok(read(path).length > 200, path);
  assert.match(capture, /useState<FreeOffer>\("situation"\)/);
  assert.match(capture, /aria-pressed=\{selected === id\}/);
  assert.match(capture, /onClick=\{\(\) => setSelected\(id\)\}/);
  assert.match(capture, /data-home-free-action": selected/);
  assert.match(capture, /selected === "stress" \? "self_check_start" : "service_request_start"/);
  assert.match(capture, /href=\{href\}/);
  assert.match(capture, /prefetch=\{false\}/);
});

test("EN/RU copy is clear, free and appropriately limits diagnosis promises", () => {
  for (const text of [
    "Free situation analysis",
    "Free Wu Xing resources & wellbeing analysis",
    "Stress check & personality portrait",
    "Бесплатный анализ ситуации",
    "Бесплатный анализ ресурсов и самочувствия по У-Син",
    "Анализ стресса и психологический портрет",
    "not a medical diagnosis",
    "не медицинская диагностика",
    "written review",
    "письменный разбор",
  ]) assert.ok(capture.includes(text), text);
  assert.doesNotMatch(capture, /localStorage|sessionStorage|fetch\(|sendBeacon|FormData|private client data|guaranteed cure/i);
  assert.match(capture, /event="contact_click"/);
  assert.match(capture, /href=\{`\/\$\{locale\}\/services`\}/);
});

test("home free options use accessible, touch-friendly cards without changing paid selectors elsewhere", () => {
  assert.match(css, /linear-gradient\(125deg, #e9f7fe/);
  assert.match(css, /\.homeFreeChoices \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /\.homeFreeChoices \{ grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.capture :is\(a,button\):focus-visible/);
  assert.match(capture, /role="group"/);
  const old = read("components/consultation-choice-capture.tsx");
  assert.match(old, /serviceChoices: ServiceChoice\[\] = \["session", "questions", "free"\]/);
  assert.match(old, /60-minute personal session · €100/);
  assert.match(old, /30-minute express consultation · €50/);
});
