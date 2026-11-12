import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync("components/services-spiritual-reading.tsx", "utf8");
const css = readFileSync("components/services-spiritual-reading.module.css", "utf8");
const route = readFileSync("app/[locale]/services/spiritual-reading/page.tsx", "utf8");
const services = readFileSync("app/[locale]/services/page.tsx", "utf8");
const spanish = readFileSync("app/es/services/page.tsx", "utf8");

test("Spiritual Reading is discoverable on RU/EN/ES services and has a localized route", () => {
  assert.match(services, /<SpiritualReadingEntry locale=/);
  assert.match(spanish, /<SpiritualReadingEntry locale="es"/);
  for (const locale of ["ru", "en", "es"]) {
    assert.match(component, new RegExp("^  " + locale + ": \\{", "m"));
    assert.match(route, new RegExp('"/' + locale + '/services/spiritual-reading"'));
  }
});

test("Four approved cards have real actions and clear non-AI symbolic disclosure", () => {
  for (const id of ["tao-ai", "tao-master", "tarot", "tarot-masters"]) {
    assert.ok(component.includes('data-spiritual-service="' + id + '"'));
  }
  assert.match(component, /holistic-support#dao-guidance/);
  assert.match(component, /ContactChannelChooser/);
  assert.match(component, /generative AI is not connected yet/);
  assert.match(component, /data-spiritual-master-finder/);
  assert.doesNotMatch(component, /fake|dummy|placeholder.*master/i);
});

test("Only approved published Tarot practitioners are included, never invented prices", () => {
  assert.match(route, /listPublicPractitioners\(locale\)/);
  assert.match(route, /master\.services\.some/);
  assert.match(route, /tarot\|таро/);
  assert.doesNotMatch(component, /€\s*\d+|CAD\s*\d+/);
  assert.match(component, /noMasters/);
  assert.match(component, /mastersUnavailable/);
});

test("Mobile layout keeps large one-tap buttons and safe focus", () => {
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /min-height:47px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /\.entry/);
});
