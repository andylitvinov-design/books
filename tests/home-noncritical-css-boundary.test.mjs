import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Home does not eagerly import unused global ribbon or enquiry CSS", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /SitewideAntistressBannerDeferred initialLocale=\{lang\}/);
  assert.doesNotMatch(layout, /import \{ SitewideAntistressBanner \}/);
  assert.doesNotMatch(layout, /import "\.\/sitewide-capture\.css"/);
  const deferred = source("components/sitewide-antistress-banner-deferred.tsx");
  assert.match(deferred, /dynamic\(/);
  assert.match(deferred, /import\("\.\/sitewide-antistress-banner"\)/);
  assert.match(deferred, /pathname === "\/"/);
  assert.match(deferred, /ru\|en\|es/);
  assert.doesNotMatch(deferred, /ssr:\s*false/, "non-Home ribbons must retain SSR");
  assert.match(source("components/sitewide-lead-capture.tsx"),
    /import "@\/app\/sitewide-capture\.css"/);
  assert.match(source("components/sitewide-lead-capture-deferred.tsx"),
    /classifyPublicLead\(pathname\)/);
});

test("The approved first-screen copy, portrait, scene and four focus photos remain intact", () => {
  const home = source("components/home-dialogue-entry.tsx");
  const css = source("components/home-dialogue-entry.module.css");
  const shell = source("components/holistic-house-home.tsx");
  for (const expected of [
    /data-home-dialogue-hero/, /data-home-ali-persona/,
    /loading="eager" fetchPriority="high"/, /ideas-pine-reference\.webp/,
    /stress\.webp/, /love\.webp/, /growth\.webp/, /energy\.webp/,
    /Hi! I.m/, /data-home-focus-grid/,
  ]) assert.match(home, expected);
  assert.match(css, /\.heroPortrait\{/);
  assert.match(shell, /service-home-about__portrait/);
  assert.match(shell, /<StaticPortrait/);
});
