import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("constellation video stays on its related paid service landings, not the free express-review hero", () => {
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
  assert.doesNotMatch(free, /getServiceVideoMedia\("constellation-case", locale\)/);
  assert.match(free, /getServiceVideoMedia\("overview", locale\)/);
  assert.match(free, /data-free-review-intro-video/);
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

test("personal free review has portrait-led hero, a separate locale-matched explainer and three visible previews", () => {
  const free = read("components/free-entry-landing.tsx");
  const css = read("components/free-entry-landing.module.css");
  const hero = free.indexOf('aria-labelledby="free-entry-title"');
  const video = free.indexOf('data-free-review-intro-video');
  const outcome = free.indexOf('id="what-you-get"');
  const proof = free.indexOf('data-featured-free-review-testimonials');
  const process = free.indexOf('id="how-it-works"');
  assert.ok(hero >= 0 && hero < video && video < outcome && outcome < proof && proof < process,
    "Portrait → intro → value → three authentic client videos → steps");
  assert.match(free, /getServiceVideoMedia\("overview", locale\)/);
  assert.match(free, /heygenId: "2c251709aba74fd96ae8be43257a080b"/);
  assert.match(free, /language: "es" as const/);
  assert.match(free, /const featuredReviewVideos/);
  assert.match(free, /testimonialVideos\.ru\[4\]/);
  assert.match(free, /testimonialVideos\[locale\]\.slice\(0, 3\)/);
  assert.match(free, /featuredReviewVideos\.map/);
  assert.match(free, /data-testimonial-video-id=\{item\.id\}/);
  assert.match(free, /locallyArchivedVideoPosterIds\.has\(item\.id\)/);
  assert.match(free, /item\.language === "ru"/);
  assert.match(free, /"Esta revisión exprés gratuita"|vídeo específico sobre la revisión exprés/);
  assert.match(free, /"Видео Андрея · русский язык"/);
  assert.match(free, /"Andrey's introduction · English audio"/);
  assert.match(free, /href=\{kind === "situation" \? "#request-free-review"/);
  assert.match(free, /<PersonalExpressEnquiry locale=\{locale\} intro=\{/);
  assert.match(free, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.doesNotMatch(free, /data-featured-constellations-video|siteVideoWatchUrl/);
  assert.match(css, /\.situationHero \.heroVisual/);
  assert.match(css, /\.reviewIntro/);
  assert.match(css, /\.reviewPreviewGrid/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /:focus-visible/);
});
