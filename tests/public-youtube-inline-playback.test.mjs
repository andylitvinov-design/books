import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("public site video poster mounts exactly sourced YouTube iframe only after Play", () => {
  const source = read("components/site-video-player.tsx");
  assert.match(source, /const playbackYouTubeId = mirrorId \|\| video\.youtubeId/);
  assert.match(source, /https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(source, /autoplay: "1", playsinline: "1"/);
  assert.match(source, /\{playing \? \(\s*<iframe ref=\{playerRef\}/);
  assert.match(source, /data-video-playback=\{playbackYouTubeId \? "youtube" : "heygen"\}/);
  assert.match(source, /<button className="site-video-play"/);
  assert.doesNotMatch(source, /<a className="site-video-play"/);
  assert.match(source, /disabled=\{!interactive\}/);
  assert.match(source, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(source, /const mirrorLink = mirrorId \?/);
});

test("Academy lesson thumbnails start inline YouTube, external watch stays secondary", () => {
  const single = read("components/academy-video-player.tsx");
  const library = read("components/academy-video-library-client.tsx");
  assert.match(single, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.match(single, /\{playing \? \(\s*<div className="academy-video-frame">\s*<iframe/);
  assert.match(single, /youtube-nocookie\.com\/embed/);
  assert.match(single, /autoplay=1&playsinline=1&rel=0/);
  assert.match(single, /className="academy-video-direct-link"/);
  assert.match(library, /onClick=\{\(\) => openVideoById\(key\)\}/);
  assert.match(library, /\{playing \? \(\s*<div className=\{styles\.player\}>/);
  assert.match(library, /youtube-nocookie\.com\/embed/);
  assert.match(library, /autoplay=1&playsinline=1&rel=0/);
  assert.match(library, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.doesNotMatch(library, /<a className=\{styles\.lessonToggle\}/);
});

test("public practitioner videos stay on-site and do not iframe before click", () => {
  const gallery = read("components/practitioner-video-gallery.tsx");
  const presentation = read("components/practitioner-presentation-video.tsx");
  assert.match(gallery, /\{active\s*\?<iframe/);
  assert.match(gallery, /onClick=\{\(\) => setPlaying\(id\)\}/);
  assert.match(gallery, /youtube-nocookie\.com\/embed/);
  assert.match(gallery, /autoplay=1&playsinline=1&rel=0/);
  assert.doesNotMatch(gallery, /directYouTube|<a className=\{styles\.poster\}/);
  assert.match(presentation, /\{!playing\?<button/);
  assert.match(presentation, /isExternal\?<iframe/);
  assert.match(presentation, /youtube-nocookie\.com\/embed/);
  assert.match(presentation, /autoplay=1&playsinline=1&rel=0/);
  assert.match(presentation, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(presentation, /loading="eager"/);
  assert.doesNotMatch(presentation, /isExternal&&posterUrl\?<a/);
});

test("admin identifies public HeyGen-only migration gaps without forcing private YouTube uploads", () => {
  const admin = read("components/site-video-manager.tsx");
  assert.match(admin, /missingYouTubeCount/);
  assert.match(admin, /data-youtube-migration="pending"/);
  assert.match(admin, /href="\/admin\/youtube-upload"/);
  assert.match(admin, /existingYouTubeMirrors/);
  const player = read("components/site-video-player.tsx");
  assert.match(player, /export const existingYouTubeMirrors/);
});
