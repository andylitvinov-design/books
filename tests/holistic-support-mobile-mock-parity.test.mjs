import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const css = read("components/holistic-support-mobile.module.css");
const client = read("components/holistic-support-mobile.tsx");
const page = read("app/[locale]/holistic-support/mobile/page.tsx");
const banner = read("components/sitewide-antistress-banner.tsx");
const original = read("app/[locale]/holistic-support/page.tsx");

test("alternative mobile workspace omits only the heavy public header and sitewide marketing ribbon", () => {
  assert.doesNotMatch(page, /PublicSiteHeader/);
  assert.match(client, /data-support-app-header/);
  assert.match(client, /Holistic House/);
  assert.match(banner, /holistic-support\\\/mobile/);
  assert.match(original, /PublicSiteHeader/);
  assert.match(original, /HolisticSupportChoices/);
});

test("mobile screenshot feedback: check-in and support choices share a first-row grid; avatar is the second row", () => {
  assert.match(css, /@media \(max-width: 640px\)\s*\{/);
  assert.match(css, /@media \(max-width: 375px\)\s*\{/);
  assert.match(css, /grid-template-areas:\s*"assessment tools" "profile profile"/);
  assert.match(css, /\.assessment\s*\{ grid-area: assessment;/);
  assert.match(css, /\.tools\s*\{ grid-area: tools;/);
  assert.match(css, /\.profile\s*\{[\s\S]*?grid-area: profile/);
  assert.match(css, /\.scaleList\s*\{ grid-template-columns: 1fr;/);
  assert.match(css, /\.toolButton\s*\{ min-width: 0; min-height: 91px/);
  assert.match(css, /\.photo\s*\{ grid-row: 1 \/ 3;/);
  assert.match(css, /\.recommendButton\s*\{ grid-row: 2;/);
  assert.match(client, /type="range" min="1" max="10"/);
  assert.match(client, /aria-valuetext/);
  assert.match(client, /URL\.createObjectURL/);
});

test("Master, Program and Topic buttons are all visible in one row, not clipped by a horizontal scroller", () => {
  assert.match(css, /\.heroFilters\s*\{ display: grid; grid-template-columns: repeat\(3, minmax\(0,1fr\)\)/);
  assert.match(css, /\.heroMode\s*\{ display: none;/);
  assert.match(css, /\.heroFilter\s*\{[\s\S]*?min-width: 0;/);
  assert.match(css, /\.heroFilter select\s*\{[\s\S]*?position: absolute;[\s\S]*?opacity: 0;/);
  assert.match(client, /className=\{styles\.filterValue\}/);
  assert.match(client, /t\.master/);
  assert.match(client, /t\.program/);
  assert.match(client, /t\.theme/);
  assert.match(css, /\.hero\[data-playing="true"\] \.heroFilters/);
});

test("only four source-backed recording cards appear in a single swipeable mobile rail", () => {
  assert.match(client, /\.slice\(0, 4\)/);
  assert.match(css, /grid-auto-flow: column; grid-auto-columns: minmax\(156px, 45%\)/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(client, /progressTotal = relevantVideos\.length/);
  assert.match(client, /progressCount = relevantVideos\.filter/);
  assert.match(page, /freeMeditationVideos\("ru"\)/);
  assert.match(page, /englishGuidedMeditations/);
  assert.match(client, /onClick=\{startVideo\}/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|fetch\(/);
});
