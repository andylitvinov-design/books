import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const css = read("components/holistic-support-mobile.module.css");
const client = read("components/holistic-support-mobile.tsx");
const page = read("app/[locale]/holistic-support/mobile/page.tsx");
const banner = read("components/sitewide-antistress-banner.tsx");
const original = read("app/[locale]/holistic-support/page.tsx");

test("optional app surface excludes commercial header/ribbon, preserving regular Support", () => {
  assert.doesNotMatch(page, /PublicSiteHeader/);
  assert.match(client, /data-support-app-header/);
  assert.match(css, /\.compactAppHeader \{ display: none; \}/);
  assert.match(banner, /holistic-support\\\/mobile/);
  assert.match(original, /PublicSiteHeader/);
  assert.match(original, /HolisticSupportChoices/);
});

test("original 3-zone mock: ratings left, inline portrait/focus center, four functions right", () => {
  assert.match(css, /@media \(max-width: 640px\)\s*\{/);
  assert.match(css, /@media \(max-width: 350px\)\s*\{/);
  assert.match(css, /grid-template-areas: "assessment profile tools"/);
  assert.match(css, /\.assessment \{ grid-area: assessment;/);
  assert.match(css, /\.tools \{ grid-area: tools;/);
  assert.match(css, /\.profile \{ grid-area: profile;/);
  assert.match(css, /\.scaleList \{ display: flex; flex-direction: column;/);
  assert.match(css, /\.toolButton \{ min-width: 0; min-height: 104px/);
  assert.match(css, /\.photo \{ flex: none; align-self: center;/);
  assert.match(client, /className=\{styles\.recommendShort\}/);
  assert.match(client, /className=\{styles\.toolCompact\}/);
  assert.match(client, /aria-label=\{t.options\[id\]\}/);
  assert.match(client, /type="range" min="1" max="10"/);
  assert.match(client, /URL\.createObjectURL/);
});

test("original four-pillar video header includes visible meditation, Master, Program and Topic", () => {
  assert.match(css, /grid-template-columns: minmax\(0,1.19fr\) repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.heroMode \{ display: flex;/);
  assert.match(css, /\.heroFilter select \{ position: absolute;[\s\S]*?opacity: 0;/);
  assert.match(client, /className=\{styles\.filterValue\}/);
  for (const name of ["master", "program", "theme"]) assert.ok(client.includes("t." + name), name);
  assert.match(css, /\.hero\[data-playing="true"\] \.heroFilters/);
  assert.match(client, /data-support-player data-playing=/);
});

test("four source-verified videos are all visible at once, not hidden in a swipe gallery", () => {
  assert.match(client, /\.slice\(0, 4\)/);
  assert.match(css, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /scroll-snap-type: none/);
  assert.match(client, /shortVideoTitle\(video.title, locale\)/);
  assert.match(client, /aria-label=\{video.title\}/);
  assert.match(client, /className=\{styles\.seeAll\}/);
  assert.match(client, /progressTotal = relevantVideos\.length/);
  assert.match(client, /progressCount = relevantVideos\.filter/);
  assert.match(page, /freeMeditationVideos\("ru"\)/);
  assert.match(page, /englishGuidedMeditations/);
  assert.match(client, /onClick=\{startVideo\}/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|fetch\(/);
});
