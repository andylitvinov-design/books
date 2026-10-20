import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("YouTube video stills bypass Vercel image transforms but keep the source fallback chain", () => {
  const player = read("components/site-video-player.tsx");
  assert.match(player, /src=\{\x60https:\/\/i\.ytimg\.com\/vi\//);
  assert.match(player, /<Image key=\{poster\}[^>]*\bunoptimized\b/);
  assert.match(player, /current === "maxres" \? "hq" : current === "hq" \? "direct" : null/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /onError=\{showFallbackPoster\}/);
});

test("Andy portrait uses already-built responsive static variants on all audited placements", () => {
  const player = read("components/site-video-player.tsx");
  const home = read("components/holistic-house-home.tsx");
  const serviceHero = read("components/services-conversion-hero.tsx");
  const serviceCards = read("components/services-studio-offers.tsx");
  const portrait = read("components/static-portrait.tsx");
  assert.match(player, /<StaticPortrait className="site-video-poster" src="\/images\/holistic-house\/andy-about\.png"/);
  assert.equal((home.match(/<StaticPortrait\b/g) || []).length, 2);
  assert.match(serviceHero, /<StaticPortrait[\s\S]*?src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(serviceCards, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(read("app/[locale]/services/free-situation-review/page.tsx"), /<FreeEntryLanding locale=\{locale\} kind="situation" \/>/);
  assert.match(portrait, /unoptimized: true/);
  assert.match(portrait, /srcSet=\{srcSet\}/);
});

test("service cards reuse the verified responsive Andy portrait instead of a 2MB PNG transform", () => {
  const services = read("components/services-solutions.tsx");
  assert.match(services, /import \{ StaticPortrait \} from "@\/components\/static-portrait"/);
  assert.match(services, /\(isHome \? homepageMedia\[offer\.id\] : offer\.image\) === "\/images\/holistic-house\/andy-about\.png"/);
  assert.match(services, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png" alt="" fill/);
  const portrait = JSON.parse(read("data/static-portrait.json"));
  assert.ok(portrait.sourceBytes > 2000000);
  assert.ok(portrait.variants.some(variant => variant.width === 828 && variant.bytes < 160000));
});

test("public Services studio only bypasses transforms for small verified owned images", () => {
  const studio = read("components/services-studio-offers.tsx");
  const images = [
    "/images/holistic-house/course-start-heron.webp",
    "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "/images/holistic-house/video-posters/constellations-en-v1.webp",
    "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    "/academy/reiki-yggdrasil/source/basic-program.jpg",
  ];
  for (const src of images) {
    assert.ok(studio.includes('"' + src + '"'), src);
    const bytes = statSync(new URL("../public" + src, import.meta.url)).size;
    assert.ok(bytes > 1000 && bytes <= 104000, src + " must be small enough for direct delivery");
  }
  assert.match(studio, /unoptimized=\{directStaticServiceImages\.has\(offer\.image\)\}/);
  assert.match(studio, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.doesNotMatch(studio, /\bimages:\s*\{\s*unoptimized:\s*true/);
});

test("the image optimizer remains available for the book images that benefit from resizing", () => {
  const config = read("next.config.ts");
  const book = read("components/book-catalog.tsx");
  assert.doesNotMatch(config, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(book, /bookCoverArtworkUrl\(book\.id, "\/media\/" \+ book\.mediaSeries/);
  assert.match(book, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/);
  assert.match(config, /minimumCacheTTL: 2678400/);
});
