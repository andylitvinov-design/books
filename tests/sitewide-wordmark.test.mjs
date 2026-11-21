import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all six primary sections reuse one clickable Holistic House brand", () => {
  const shared = read("components/holistic-house-brand.tsx");
  assert.match(shared, /href=\{href\}/);
  assert.match(shared, /<Leaf\s+className=\{styles\.icon\}/);
  assert.match(shared, /data-hh-site-brand=\{locale\}/);
  assert.match(shared, /locale === "en" \? "\/" : `\/\$\{locale\}`/);
  for (const path of [
    "components/home-dialogue-entry.tsx",
    "components/services-assist-quiz.tsx",
    "components/my-coach-catalog.jsx",
    "components/shamanica-mobile.tsx",
    "components/mandala-free-video-studio.tsx",
    "components/app/profile-hub-tabs.jsx",
    "components/app/app-workspace.jsx",
    "components/public-site-header.tsx",
    "components/holistic-support-mobile.tsx",
  ]) assert.match(read(path), /<HolisticHouseBrand\s+locale=/, path);
});

test("former Support/Cabinet wordmarks no longer intercept home navigation", () => {
  const video = read("components/mandala-free-video-studio.tsx");
  const cabinet = read("components/app/app-workspace.jsx");
  const home = read("components/home-dialogue-entry.tsx");
  assert.doesNotMatch(video, /className=\{videoStyles\.quickBrandBack\}/);
  assert.doesNotMatch(cabinet, /<Link href=\{root\} prefetch=\{false\} className="hh-brand">/);
  assert.doesNotMatch(home, /<div className=\{styles\.brand\}>\s*<span className=\{styles\.brandIcon\}/);
});
