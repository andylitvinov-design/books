import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("YouTube video stills bypass Vercel image transforms but keep the source fallback chain", () => {
  const player = read("components/site-video-player.tsx");
  assert.match(player, /src=\{\x60https:\/\/i\.ytimg\.com\/vi\//);
  assert.match(player, /<Image key=\{poster\}[^>]*\bunoptimized\b/);
  assert.match(player, /current === "maxres" \? "hq" : current === "hq" \? "direct" : null/);
  assert.match(player, /const playbackYouTubeId = mirrorId \|\| video\.youtubeId/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /onError=\{showFallbackPoster\}/);
});

test("Andy portrait uses already-built responsive static variants on all audited placements", () => {
  const player = read("components/site-video-player.tsx");
  const intake = read("app/[locale]/services/free-situation-review/page.tsx");
  const portrait = read("components/static-portrait.tsx");
  assert.match(player, /<StaticPortrait className="site-video-poster" src="\/images\/holistic-house\/andy-about\.png"/);
  assert.equal((intake.match(/<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/g) || []).length, 2);
  assert.doesNotMatch(intake, /<Image src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(portrait, /unoptimized: true/);
  assert.match(portrait, /srcSet=\{srcSet\}/);
});

test("the image optimizer remains available for the book images that benefit from resizing", () => {
  const config = read("next.config.ts");
  const book = read("components/book-catalog.tsx");
  assert.doesNotMatch(config, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(book, /bookCoverArtworkUrl\(book\.id, "\/media\/" \+ book\.mediaSeries/);
  assert.match(book, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/);
  assert.match(config, /minimumCacheTTL: 2678400/);
});
