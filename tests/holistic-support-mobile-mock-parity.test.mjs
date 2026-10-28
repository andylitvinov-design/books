import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const css = read("components/holistic-support-mobile.module.css");
const client = read("components/holistic-support-mobile.tsx");
const page = read("app/[locale]/holistic-support/mobile/page.tsx");
const banner = read("components/sitewide-antistress-banner.tsx");
const original = read("app/[locale]/holistic-support/page.tsx");

test("mobile alternative preserves standard Support and excludes redundant marketing header", () => {
  assert.doesNotMatch(page, /PublicSiteHeader/);
  assert.match(client, /data-support-app-header/);
  assert.match(css, /\.compactAppHeader \{ display: none; \}/);
  assert.match(banner, /holistic-support\\\/mobile/);
  assert.match(original, /PublicSiteHeader/);
  assert.match(original, /HolisticSupportChoices/);
});

test("original screenshot: three zones in one compact row and 4 prominent 2x2 action tiles", () => {
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /grid-template-areas: "assessment profile tools"/);
  assert.match(css, /\.scaleDetail \{ display: contents; \}/);
  assert.match(css, /\.scaleLabel \{ grid-column: 1 \/ 3; grid-row: 1;/);
  assert.match(css, /\.toolGrid \{ display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-template-rows: repeat\(2,minmax\(0,77px\)\)/);
  assert.match(css, /\.toolMicro \{ display: block;/);
  assert.match(css, /\.photo \{ align-self: center;/);
  assert.match(client, /support-reference-avatar\.webp/);
  assert.match(client, /support-mock-hero\.webp/);
  assert.match(css, /support-mock-video-posters\.webp/);
  assert.match(client, /choices\.filter\(item => item\.id !== "pump"\)/);
  assert.match(client, /data-support-tool="pump"/);
  assert.match(client, /className=\{styles\.toolShortcuts\}/);
  assert.match(client, /data-support-tool="masters"/);
  assert.match(client, /className=\{styles\.recommendShort\}/);
  assert.match(client, /type="range" min="1" max="10"/);
  assert.match(client, /URL\.createObjectURL/);
});

test("reference avatar is a real WebP, and 4 nature posters/hero are bundled", () => {
  for (const filename of [
    "support-reference-avatar.webp", "support-mock-hero.webp", "support-mock-video-posters.webp",
  ]) {
    const bytes=readFileSync(new URL("../public/images/holistic-house/"+filename, import.meta.url));
    assert.equal(bytes.toString("ascii",0,4),"RIFF",filename+" RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP",filename+" WEBP");
    assert.ok(bytes.length>1000,filename+" non-empty");
  }
});

test("scenic player keeps four visible filters and source-backed recordings", () => {
  assert.match(css, /grid-template-columns: minmax\(0,1.19fr\) repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.heroMode \{ display: flex;/);
  assert.match(css, /\.heroFilter select \{ position: absolute;/);
  assert.match(client, /className=\{styles\.filterValue\}/);
  for (const name of ["master","program","theme"]) assert.ok(client.includes("t."+name));
  assert.match(css, /\.hero\[data-playing="true"\] \.heroFilters/);
  assert.match(client, /data-support-player data-playing=/);
  assert.match(client, /\.slice\(0, 4\)/);
  assert.match(css, /grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /scroll-snap-type: none/);
  assert.match(client, /shortVideoTitle\(video.title, locale\)/);
  assert.match(client, /aria-label=\{video.title\}/);
  assert.match(page, /freeMeditationVideos\("ru"\)/);
  assert.match(page, /englishGuidedMeditations/);
  assert.match(client, /onClick=\{startVideo\}/);
  assert.match(client, /youtube-nocookie\.com\/embed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|fetch\(/);
});

test("progress is derived from local opens and four self-ratings, never fake streaks", () => {
  assert.match(client, /progressTotal = relevantVideos\.length/);
  assert.match(client, /progressCount = relevantVideos\.filter/);
  assert.match(client, /averageScore = \(focusOrder\.reduce/);
  assert.match(client, /className=\{styles\.progressStarted\}/);
  assert.match(client, /className=\{styles\.progressAverage\}/);
  assert.doesNotMatch(client, /fakeStreak|mockStreak|lastSevenDays/);
});


test("approved screenshot uses scenic video first; every category has matching thumbnail navigation", () => {
  const masters = read("components/holistic-support-master-gallery.tsx");
  const talisman = read("components/holistic-support-talisman-viewer.tsx");
  const talismanCss = read("components/holistic-support-talisman-viewer.module.css");
  assert.ok(client.indexOf('data-support-player data-playing=') <
    client.indexOf('id="support-meditation-gallery"'),
    "big original meditation player must precede thumbnails");
  assert.match(client, /data-support-tool="masters"/);
  assert.match(client, /HolisticSupportMasterGallery locale=\{locale\} kind=\{choice\}/);
  assert.match(client, /HolisticSupportMasterGallery locale=\{locale\} kind="consultation"/);
  assert.match(masters, /data-support-master-hero/);
  assert.match(masters, /data-support-master-rail/);
  assert.match(masters, /data-support-master-request/);
  assert.match(masters, /data-support-offer-request/);
  assert.match(talisman, /data-support-talisman-rail/);
  assert.match(talismanCss, /\.rail\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
