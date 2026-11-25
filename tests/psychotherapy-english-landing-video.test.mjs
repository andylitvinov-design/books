import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the supplied YouTube introduction belongs only to the English psychotherapy service landing", () => {
  const media = read("data/service-video-library.ts");
  const showcase = read("components/service-video-showcase.tsx");
  const landing = read("components/personal-service-landing.tsx");

  assert.match(media, /englishPsychotherapyLandingVideo: ServiceVideoMedia = \{[\s\S]*?youtubeId: "vqRmI79cecQ", language: "en"/);
  assert.match(media, /englishPsychotherapyLandingVideo: ServiceVideoMedia = \{[\s\S]*?poster: ""/);
  assert.match(showcase, /variant === "psychotherapy-en" && locale === "en" && topic === "hypnotherapy"/);
  assert.match(showcase, /isEnglishPsychotherapy \? englishPsychotherapyLandingVideo : getServiceVideoMedia\(topic, locale\)/);
  assert.match(showcase, /data-psychotherapy-video=\{isEnglishPsychotherapy \? "en" : undefined\}/);
  assert.match(landing, /variant=\{service === "imagery-therapy" && locale === "en" \? "psychotherapy-en" : "default"\}/);
  assert.match(landing, /id="service-video"/);
  assert.match(media, /youtubeId: "eLsjFaKCBhI", language: "ru"/);
  assert.match(media, /hypnotherapy: hypnotherapyRu,/);
  assert.doesNotMatch(media, /youtu\.be\/vqRmI79cecQ|drive\.google\.com\/.*vqRmI79cecQ/);
});

test("psychotherapy video uses the existing click-to-play YouTube player without extra renders or autoplay on page load", () => {
  const player = read("components/site-video-player.tsx");
  const showcase = read("components/service-video-showcase.tsx");
  assert.match(showcase, /<SiteVideoPlayer video=\{video\.video\} locale=\{locale\}/);
  assert.match(player, /const playbackYouTubeId = mirrorId \|\| video\.youtubeId/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /\{playing \? \(\s*<iframe/);
  assert.match(player, /<button className="site-video-play"/);
});
