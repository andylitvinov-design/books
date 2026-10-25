import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/ideas-discovery.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/ideas-discovery.module.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/[locale]/holistic-support/page.tsx", import.meta.url), "utf8");

test("Holistic Support keeps functional question + symbolic and energy choices inside scenic hero", () => {
  assert.match(component, /form="ideas-question-form"[^>]*data-ideas-tao/);
  assert.match(component, /data-ideas-energy-support/);
  assert.match(component, /stageRemoteSupportLandingIntention\(question\)/);
  assert.match(component, /data-holistic-entry=\{isHolistic \? "true"/);
  assert.match(component, /\{!isHolistic \? heroUtility : null\}/);
  assert.match(component, /\{isHolistic \? \([\s\S]*data-holistic-quick-cards/);
});
test("Meditations and talismans are two separate linked photograph cards, not stacked hero CTA rows", () => {
  assert.match(component, /<nav className=\{styles\.holisticQuickCards\}/);
  assert.match(component, /href="#meditation-practices"[^>]*data-ideas-meditations/);
  assert.match(component, /href="#talismans"[^>]*data-ideas-talismans/);
  assert.equal((component.match(/data-ideas-meditations/g)||[]).length, 1);
  assert.equal((component.match(/data-ideas-talismans/g)||[]).length, 1);
  assert.match(css, /\.holisticQuickCards\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.holisticQuickLink:nth-child\(2\)::before/);
  assert.match(page, /id="meditation-practices"/);
  assert.match(page, /id="talismans"/);
});
test("EN/RU/ES copy and private insight/test controls survive redesign", () => {
  for (const item of ["Find calm, clarity and inner balance.", "Практики для спокойствия и ясности.", "Una pausa para encontrar calma y claridad."]) {
    assert.ok(component.includes(item), item);
  }
  assert.match(component, /<details className=\{styles\.privacyDisclosure\}>/);
  assert.match(component, /data-ideas-free-test data-temple-test-catalog/);
  assert.match(component, /\{heroUtility\}/);
  assert.equal((component.match(/data-ideas-hero-utility/g)||[]).length, 1);
});
test("Mobile layout explicitly guards narrow 320–430px widths and tap targets", () => {
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /\.root\[data-holistic-entry="true"\] \.heroActions \.testButton\{[\s\S]*?min-height:67px/);
  assert.match(css, /\.root\[data-holistic-entry="true"\] \.heroActions \.diagnosticAction\{[\s\S]*?min-height:57px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
