import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("inline CSS removes external render-blocking stylesheets", () => {
  assert.match(read("next.config.ts"), /experimental:\s*\{\s*inlineCss:\s*true\s*\}/);
});
test("existing hero artwork is preloaded at high priority", () => {
  const hero = read("components/home-dialogue-entry.tsx");
  const css = read("components/home-dialogue-entry.module.css");
  const image = "/images/holistic-house/ideas-pine-reference.webp";
  assert.ok(hero.includes('rel="preload" as="image" href="' + image + '" fetchPriority="high"'));
  assert.ok(css.includes('url("' + image + '")'));
  assert.ok(hero.includes('data-home-dialogue-entry'));
});
test("existing live CDN-first EN/RU homepage remains enabled", () => {
  assert.match(read("middleware.ts"), /const fastLocale = instantHomeLocale\(/);
  for (const locale of ["en","ru"]) {
    const html=read("public/instant-home/"+locale+".html");
    assert.match(html, /<style data-home-critical-css>/);
    assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"/);
  }
});
test("below-the-fold resources remain deferred", () => {
  assert.match(read("components/holistic-house-home.tsx"), /loading="lazy"/);
  assert.match(read("app/es/page.tsx"), /fill loading="lazy" sizes=/);
  assert.match(read("components/pwa-registration.tsx"), /window\.addEventListener\('load', afterLoad/);
});
