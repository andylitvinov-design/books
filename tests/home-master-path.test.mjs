import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("components/holistic-house-home.tsx");
const spanish = read("app/es/page.tsx");
const widget = read("components/home-master-path.tsx");
const styles = read("components/home-master-path.module.css");

test("Master is the final immersion stage, not a repeated footer promotion", () => {
  const feature = read("components/home-featured-workspace.tsx");
  for (const page of [home, spanish]) {
    assert.equal((page.match(/<HomeFeaturedWorkspace\b/g) || []).length, 1);
    assert.doesNotMatch(page, /<HomeMasterPath\b/);
    assert.ok(page.indexOf("<HomeFeaturedWorkspace") < page.indexOf("<footer"));
  }
  assert.match(feature, /"courses",\s*"personality",\s*"situation",\s*"coaching",\s*"alchemy",\s*"energy",\s*"master"/);
  assert.match(feature, /data-home-module=\{id\}/);
  for (const action of ['"pro"', '"service"', '"course"']) assert.ok(feature.includes(action));
  assert.match(widget, /data-home-master-invitation/);
});

test("the compact invitation has localized actionable Pro and My Practice links without fake publication", () => {
  const pro = read("app/[locale]/pro/page.tsx");
  const practice = read("components/app/practice-workspace.jsx");
  assert.ok(widget.includes('href={"/" + locale + "/pro"}'));
  assert.ok(widget.includes('href={"/" + locale + "/practice"}'));
  assert.ok(!widget.includes('accountLocale + "/app/practice"'));
  assert.match(pro, /<ProfiHub locale=\{locale\}/);
  assert.match(practice, /if\(params\.get\('panel'\)==='services'\)\s*\{?\s*setActivePanel\('services'\)/);
  for (const label of ["Become a Master", "Станьте мастером", "Hazte profesional",
    "List my services", "Разместить свои услуги", "Publicar mis servicios"]) {
    assert.ok(widget.includes(label), label);
  }
  assert.match(widget, /reviewed before publication/);
  assert.match(widget, /после модерации/);
  assert.match(widget, /does not grant a professional qualification/);
  assert.doesNotMatch(widget, /fetch\(|sendBeacon|autoPublish|checkout|payment/);
});

test("the footer invitation is compact, photo-led, mobile-accessible and has no duplicated steps", () => {
  assert.match(widget, /<Image[\s\S]*?loading="lazy"/);
  assert.match(widget, /portrait-static\/andy-828-3dcbabded1e9\.webp/);
  assert.match(widget, /data-home-master-action="explore-pro"/);
  assert.match(widget, /data-home-master-action="publish-service"/);
  assert.match(styles, /grid-template-columns: 234px minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /grid-template-columns: 108px minmax\(0, 1fr\)/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /:focus-visible/);
  assert.doesNotMatch(widget, /<ol|<button|mode === "personal"/);
});
