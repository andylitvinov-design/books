import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("one owner-supplied YouTube video serves exactly the intended three service landings", () => {
  const library = read("data/service-video-library.ts");
  const showcase = read("components/service-video-showcase.tsx");
  const personal = read("components/personal-service-landing.tsx");
  const business = read("components/business-consulting-landing.tsx");
  const free = read("components/free-entry-landing.tsx");

  assert.equal((library.match(/youtubeId: "sfVFOQNr2qk"/g) ?? []).length, 1,
    "keep one canonical video ID, not a copied per-page URL");
  assert.match(library, /const constellationCase: ServiceVideoMedia/);
  assert.equal((library.match(/"constellation-case": constellationCase/g) ?? []).length, 2,
    "both EN and RU records should point at the same approved source; ES uses EN media");
  assert.match(library, /locale === "es" \? "en" : locale/);
  assert.match(library, /poster: "\/images\/holistic-house\/andy-about.png"/);
  assert.doesNotMatch(library, /autoplay|private|drive.google.com/);

  assert.match(personal, /service === "systemic-constellations" \? "constellation-case"/);
  assert.match(business, /<ServiceVideoShowcase topic="constellation-case" locale=\{locale\} id="business-constellation-video" \/>/);
  assert.match(free, /getServiceVideoMedia\("constellation-case", locale\)/);
  assert.match(free, /data-featured-constellations-video/);
  assert.match(free, /<SiteVideoPlayer video=\{situationVideo\.video\}/);
  assert.doesNotMatch(free, /<ServiceVideoShowcase topic="overview"/);
  assert.equal((showcase.match(/"constellation-case": \{/g) ?? []).length, 3,
    "the three locale descriptions must explain the video without inventing a transcript");
  assert.match(library, /language: "en", title: "Business Constellations"/);
});

test("all three placements reuse the existing click-to-load video player and keep a direct YouTube fallback", () => {
  const showcase = read("components/service-video-showcase.tsx");
  const player = read("components/site-video-player.tsx");
  assert.match(showcase, /<SiteVideoPlayer video=\{video.video\} locale=\{locale\}/);
  assert.match(player, /playing \? \(/);
  assert.match(player, /onClick=\{\(\) => \{ setShowRecovery\(false\); setPlaying\(true\); \}\}/);
  assert.match(player, /youtube-nocookie.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /const externalLink = internalOnly \? null/);
});

test("mobile free-review starts with the recording, with a compact single-screen CTA", () => {
 const free = read("components/free-entry-landing.tsx");
 const css = read("components/free-entry-landing.module.css");
 const video = free.indexOf("data-featured-constellations-video");
 assert.ok(video > free.indexOf('aria-labelledby="free-entry-title"') && video < free.indexOf('id="what-you-get"'));
 assert.match(free, /<SiteVideoPlayer video=\{situationVideo\.video\}/);
 assert.match(free, /siteVideoWatchUrl\(situationVideo\.video\)/);
 assert.match(free, /Один вопрос и простой рисунок/);
 assert.match(free, /Una pregunta y un dibujo sencillo/);
 assert.match(css, /\.situationHero \.situationVideo\{order:0/);
 assert.match(css, /\.situationHero \.heroCopy\{order:1/);
 assert.match(css, /\.situationHero \.primary\{width:100%/);
 assert.match(css, /@media\(max-width:600px\) and \(max-height:730px\)/);
 assert.match(css, /\.situationScene\{min-height:0/);
 assert.match(css, /@media\(max-width:360px\) and \(max-height:620px\)/);
 assert.match(css, /\.situationScene \.sceneImage\{display:none\}/);
 assert.match(css, /\.situationHero \.primary\{min-height:44px\}/);
 assert.match(css, /\.situationHero \.videoSource\{right:7px;top:7px;min-height:44px/);
 assert.match(css, /\.situationVideo :global\(\.site-video-poster-title\)\{left:86px/);
 assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.situationVideo :global\(\.site-video-poster-title\)\{left:72px/);
});
