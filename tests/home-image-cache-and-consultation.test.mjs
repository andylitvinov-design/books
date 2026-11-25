import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const dialogue = readFileSync(new URL("../components/home-dialogue-entry.tsx", import.meta.url), "utf8");

test("approved homepage first-screen artwork exists at its cacheable public paths", () => {
  for (const path of [
    "public/images/holistic-house/ali-inner-alchemist-hero.webp",
    "public/images/holistic-house/my-coach-motion/max-living.webp",
    "public/images/holistic-house/ideas-pine-reference.webp",
    ...["stress", "love", "growth", "energy"].map(name => `public/images/video-goal-art/${name}.webp`),
  ]) assert.ok(existsSync(new URL("../" + path, import.meta.url)), `Missing homepage image: ${path}`);
});

test("homepage first-screen photography is CDN/browser cached without HTML or private routes", () => {
  for (const source of [
    "/images/holistic-house/ali-inner-alchemist-hero.webp",
    "/images/holistic-house/my-coach-motion/:path*",
    "/images/holistic-house/ideas-pine-reference.webp",
    "/images/video-goal-art/:path*",
    "/images/holistic-house/andy-about.png",
  ]) assert.ok(config.includes(source), "Expected homepage image cache rule: " + source);
  assert.match(config, /\.\.\.homepagePublicImageSources\.map/);
  assert.match(config, /max-age=3600, s-maxage=86400, stale-while-revalidate=120/);
  assert.doesNotMatch(config.slice(config.indexOf("homepagePublicImageSources"), config.indexOf("] as const;", config.indexOf("homepagePublicImageSources"))), /\/api\/|\/app\/|\/client\//);
});

test("the first screen has a native localized booking link before the program choices", () => {
  assert.match(dialogue, /<Link className=\{styles\.sessionLink\} href=\{`\/\$\{locale\}\/services#consultation`\} prefetch=\{false\} data-home-request-session>/);
  for (const label of ["Request a session · from €50", "Запросить сессию · от €50", "Solicitar sesión · desde 50 €"]) {
    assert.ok(dialogue.includes(label));
  }
  assert.ok(dialogue.indexOf("data-home-request-session") < dialogue.indexOf("data-home-focus-grid"));
});
