import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Locale-appropriate owner videos are first on the canonical Alchemy landing in EN/RU/ES", () => {
  const landing = read("components/alchemy-soul-landing.tsx");
  const css = read("components/alchemy-soul-landing.module.css");
  const first = landing.indexOf('data-alchemy-panel="featured-video"');
  const hero = landing.indexOf('data-alchemy-panel="hero"');
  const methods = landing.indexOf('data-alchemy-panel="method"');
  assert.ok(first > 0 && first < hero && hero < methods, "Owner video must appear before the hero and methods");
  assert.match(landing, /youtubeId: "-zacUn_zN6g"/);
  assert.match(landing, /youtubeId: "IF0HAhSDwks"/);
  assert.match(landing, /language: "ru" as const/);
  assert.match(landing, /const featuredIntroVideo = locale === "ru" \? featuredIntroVideoRu : featuredIntroVideoEn;/);
  assert.match(landing, /<SiteVideoPlayer video=\{featuredIntroVideo\} locale=\{locale\} compact minimal posterPriority/);
  assert.match(landing, /data-alchemy-featured-video=\{featuredIntroVideo\.youtubeId\}/);
  for (const text of ["Psychic Alchemy — in my own words", "Психогомеопатия и Алхимия души — рассказываю сам", "Psychic Alchemy — explicado por mí", "YouTube solo se carga", "Видео загружается только после нажатия Play", "Оригинальная запись на русском"]) {
    assert.ok(landing.includes(text), "Missing language-consistent introduction: " + text);
  }
  assert.match(landing, /href="#alchemy-request"/);
  assert.match(landing, /href=\{freeReview\}/);
  assert.doesNotMatch(landing, /autoplay=\{true\}/);
  assert.match(css, /\.featuredVideoSection\{display:grid/);
  assert.match(css, /@media\(max-width:680px\)\{/);
});

test("Featured video does not duplicate the enquiry form or drop existing method and reviews", () => {
  const landing = read("components/alchemy-soul-landing.tsx");
  assert.equal((landing.match(/<AlchemySoulLeadForm locale=\{locale\}/g) || []).length, 1);
  assert.match(landing, /getServiceVideoMedia\("alchemy", locale\)/);
  assert.match(landing, /data-alchemy-review-stack/);
  for (const id of ["hero", "situations", "method", "video", "reviews", "formats", "faq", "request"]) assert.match(landing, new RegExp('data-alchemy-panel="' + id + '"'));
});
