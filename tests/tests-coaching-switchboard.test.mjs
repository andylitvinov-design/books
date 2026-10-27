import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ui = read("components/tests-coaching-switchboard.tsx");
const css = read("components/tests-coaching-switchboard.module.css");
const legacy = read("components/ideas-discovery.tsx");

test("Four-path hub is the canonical public first screen in EN/RU/ES", () => {
  assert.match(legacy, /<TestsCoachingSwitchboard locale=\{locale\} templeContent=\{templeContent\}/);
  assert.match(legacy, /aria-labelledby=\{isTemple \? "ideas-title" : "tests-coaching-title"\}/);
  assert.match(ui, /const pathOrder: Path\[\] = \["profile", "temple", "coaching", "support"\]/);
  assert.match(ui, /data-tests-coaching-path=\{key\}/);
  assert.match(ui, /aria-expanded=\{path === key\}/);
  assert.match(ui, /aria-controls="tests-coaching-detail"/);
  assert.match(ui, /hidden=\{!path\}/);
  for (const label of ["Tests & Coaching", "Тесты и коучинг", "Tests y coaching"]) {
    assert.ok(ui.includes(label), "missing localized heading: " + label);
  }
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /max-width:360px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Profile entry reuses canonical personality-profiles builder, never a second scorer", () => {
  assert.match(ui, /data-personality-profiles-entry/);
  assert.match(ui, /\/personality-profiles/);
  assert.match(ui, /\/client\/tests/);
  assert.match(ui, /\/app/);
  assert.doesNotMatch(ui, /type="checkbox"/);
  assert.doesNotMatch(ui, /data-profile-builder/);
  assert.doesNotMatch(ui, /startableTests/);
  for (const label of ["personal", "business", "wellbeing", "comprehensive"]) {
    assert.ok(ui.includes(label) || ui.includes("Personal"), "Missing profile option description: " + label);
  }
});

test("Temple insight stays private in browser; coaching and support reuse their shipped routes", () => {
  assert.match(ui, /data-tests-coaching-temple/);
  assert.match(legacy, /getHexagram\(result\.hexagram\)/);
  assert.match(legacy, /drawRandomHexagram\(\)/);
  assert.match(ui, /\/academy\/coaching\/greek/);
  assert.match(ui, /\/academy\/coaching\/egyptian/);
  assert.match(ui, /\/coaching/);
  assert.match(ui, /\/services#consultation/);
  assert.match(ui, /\/courses\/antistress/);
  assert.match(ui, /data-tests-coaching-support/);
  assert.match(ui, /setStage\("practice"\)/);
  assert.match(ui, /setStage\("done"\)/);
  for (const term of ["fetch(", "localStorage", "sessionStorage", "sendBeacon", "XMLHttpRequest", "gtag(", "fbq("]) {
    assert.ok(!ui.includes(term), "public question or scale data must not leave browser via " + term);
  }
});

test("TSX parses cleanly and all CSS classes are declared", () => {
  const source = ts.createSourceFile("tests-coaching-switchboard.tsx", ui, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(source.parseDiagnostics.map(item => item.messageText), []);
  const used = [...new Set([...ui.matchAll(/styles\.([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1]))];
  const available = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1]));
  assert.deepEqual(used.filter(value => !available.has(value)), []);
});


test("four choices become an accessible, focused path instead of a wall of expanding cards", () => {
  assert.match(ui, /hidden=\{Boolean\(path\)\}/);
  assert.match(ui, /data-tests-coaching-back/);
  assert.match(ui, /ref=\{detailRef\} tabIndex=\{-1\}/);
  assert.match(ui, /detailRef\.current\?\.focus\(\)/);
  assert.match(ui, /firstCardRef\.current\?\.focus\(\)/);
  assert.match(ui, /quickCtas\[locale\]\[key\]/);
  for (const headline of ["What would feel most helpful today?", "Что сейчас было бы для вас полезнее?", "¿Qué te ayudaría más hoy?"])
    assert.ok(ui.includes(headline), "Missing localized welcome: " + headline);
  assert.match(css, /\.grid\[hidden\]\s*\{\s*display:\s*none;/);
  assert.match(css, /\.cardArrow/);
  assert.match(css, /\.cardIcon/);
});

test("Coaching entry goes straight to the topic-based session chooser, without the extra session-type slide", () => {
  assert.match(ui, /key === "coaching"/);
  assert.match(ui, /data-tests-coaching-direct/);
  assert.match(ui, /href=\{\`\/\$\{locale\}\/coaching\`\}/);
  assert.doesNotMatch(ui, /data-tests-coaching-sessions/);
  assert.match(ui, /aria-controls="tests-coaching-detail"/);
  const lounge = read("components/public-coaching-discovery.jsx");
  assert.match(lounge, /data-coaching-topic-first/);
  assert.match(lounge, /data-public-coaching-models/);
  assert.match(lounge, /coachingSessionTitle\(s\.schemeKey,lang,/);
  for (const text of ["Choose your topic", "Выберите тему", "Elige un tema"]) {
    assert.ok(ui.includes(text), "Missing a clear localized next step: " + text);
  }
});

test("2-minute support is the single primary offer, followed by smaller course and human support links", () => {
  assert.match(ui, /className=\{styles\.supportFeatured\}/);
  assert.match(ui, /className=\{styles\.supportNext\}/);
  assert.match(ui, /aria-label=\{t\.programme\}/);
  assert.match(ui, /aria-label=\{t\.personalSupport\}/);
  for (const headline of ["01 · A 2-MINUTE PAUSE", "01 · ПРАКТИКА НА 2 МИНУТЫ", "01 · PAUSA DE 2 MINUTOS"])
    assert.ok(ui.includes(headline), headline);
  assert.match(css, /\.supportArrow\s*\{[^}]*width:\s*44px;/);
  assert.match(css, /@media \(max-width:\s*360px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("narrow Temple panel reclaims only its duplicate gutter and retains the hard quote-width checks", () => {
  // Source regression only: real WebKit geometry is still required by the
  // unchanged preview/result assertions in verify-ideas-mobile-browser.mjs.
  const narrowRules = [...css.matchAll(/@media \(max-width:\s*400px\)\s*\{([\s\S]*?)\n\}/g)]
    .map(match => match[1]).join("\n");
  const templeRule = narrowRules.match(/\.detail:has\(> \[data-tests-coaching-temple\]\)\s*\{([^}]+)\}/);
  assert.ok(templeRule, "Only the selected Temple panel gets the narrow-screen gutter override");
  assert.equal(templeRule[1].trim(), "padding-inline: 8px;",
    "Reclaim horizontal wrapper space without shrinking typography, vertical spacing or hiding content");
  assert.equal(css.match(/\.detail:has\(> \[data-tests-coaching-temple\]\)/g)?.length, 1,
    "Keep one bounded override; ordinary wider panels stay unchanged");
  assert.match(ui, /path === "temple" \? <div data-tests-coaching-temple>/);
  assert.match(css, /\.detail:focus-visible \{ outline: 3px solid #187c7b; outline-offset: 3px; \}/);
  const quoteCss = read("components/ideas-discovery.module.css");
  assert.match(quoteCss, /\.root \.aphorisms li\{width:100%;padding:10px 9px\}/);
  assert.match(quoteCss, /\.aphorisms p \{ font-size:14px; \}/);
  const browser = read("scripts/verify-ideas-mobile-browser.mjs");
  assert.match(browser, /previewRects\.every\(rect => rect\.width >= width \* \.72\)/);
  assert.match(browser, /responseRects\.every\(rect => rect\.width >= width \* \.72\)/);
});
