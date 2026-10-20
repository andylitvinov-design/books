import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("components/holistic-house-home.tsx");
const wrapper = read("components/homepage-contact-cta.tsx");
const capture = read("components/homepage-free-capture.tsx");
const css = read("components/consultation-choice-capture.module.css");

test("the approved bottom blue capture contains the three requested free offers, without a duplicate chooser", () => {
  assert.doesNotMatch(home, /<FreeInsightsPaths|import \{ FreeInsightsPaths \}/);
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/);
  assert.match(wrapper, /id="home-consultation"/);
  assert.match(wrapper, /data-home-contact-capture/);
  assert.match(wrapper, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(capture, /data-home-free-capture="true"/);
  assert.match(capture, /data-consultation-capture="home-free"/);
  assert.match(capture, /data-choice-layout="home-free"/);
  assert.match(capture, /type FreeOffer = "selfTest" \| "analysis" \| "reiki"/);
  assert.match(capture, /offerOrder: FreeOffer\[\] = \["selfTest", "analysis", "reiki"\]/);
  assert.doesNotMatch(capture, /"wu"|"stress"/);
});

test("each free offer leads directly to its existing entry route, with self-test selected by default", () => {
  for (const slug of ["/client/tests", "/services/free-situation-review", "/academy/principles-of-energywork/learn"]) {
    assert.ok(capture.includes(slug), "Missing destination: " + slug);
  }
  for (const path of [
    "app/[locale]/client/tests/page.tsx",
    "app/[locale]/services/free-situation-review/page.tsx",
    "app/[locale]/academy/[[...slug]]/page.tsx",
  ]) assert.ok(read(path).length > 200, path);
  assert.match(read("app/[locale]/academy/[[...slug]]/page.tsx"), /key === "principles-of-energywork\/learn"/);
  assert.match(read("components/energywork-ai-learner.tsx"), /shortTitle: "Reiki Practitioner"/);
  assert.match(capture, /useState<FreeOffer>\("selfTest"\)/);
  assert.match(capture, /aria-pressed=\{selected === id\}/);
  assert.match(capture, /onClick=\{\(\) => setSelected\(id\)\}/);
  assert.match(capture, /data-home-free-action": selected/);
  assert.match(capture, /event=\{selected === "selfTest" \? "self_check_start" : selected === "analysis" \? "service_request_start" : "service_view"\}/);
  assert.match(capture, /analyticsEvent=\{selected === "analysis" \? "free_situation_assessment_click" : undefined\}/);
  assert.match(capture, /href=\{href\}/);
  assert.match(capture, /prefetch=\{false\}/);
});

test("EN/RU copy describes real free services and preserves accurate safety and teacher-initiation limits", () => {
  for (const phrase of [
    "Free Self-Test",
    "Free Personal Analysis",
    "Free Reiki Practitioner Program",
    "Бесплатный самотест",
    "Бесплатный личный анализ",
    "Бесплатная программа «Практик Рейки»",
    "not medical diagnoses",
    "не медицинская диагностика",
    "not a free live consultation",
    "письменный разбор",
    "not automatic",
    "автоматически",
    "Tantra Reiki",
    "Kundalini Reiki",
    "Рейки Иггдрасиль",
  ]) assert.ok(capture.includes(phrase), phrase);
  assert.doesNotMatch(capture, /localStorage|sessionStorage|fetch\(|sendBeacon|FormData|guaranteed cure/i);
  assert.match(capture, /event="contact_click"/);
  assert.match(capture, /href=\{\x60\/\$\{locale\}\/services\x60\}/);
});

test("mobile option buttons and primary burgundy CTA remain touch-friendly and isolated from paid selectors", () => {
  assert.match(css, /linear-gradient\(125deg, #e9f7fe/);
  assert.match(css, /\.homeFreeChoices\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.homeFreeChoices \.homeFreeChoice:last-child\{grid-column:1\/-1/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.homeCapture \.action\{min-height:46px;padding:10px;font-size:14px\}/);
  assert.match(capture, /compactTitle: "Free self-test"/);
  assert.match(capture, /compactTitle: "Free personal analysis"/);
  assert.match(capture, /compactTitle: "Free Reiki practitioner program"/);
  assert.match(capture, /aria-label=\{\x60\$\{t\.offers\[id\]\.title\}/);
  assert.doesNotMatch(capture, /<small>\{t\.offers\[id\]\.description\}<\/small>/);
  assert.match(css, /\.capture :is\(a,button\):focus-visible/);
  assert.match(capture, /role="group"/);
  const old = read("components/consultation-choice-capture.tsx");
  assert.match(old, /serviceChoices: ServiceChoice\[\] = \["session", "questions", "free"\]/);
  assert.match(old, /60-minute personal session · €100/);
  assert.match(old, /30-minute express consultation · €50/);
});
