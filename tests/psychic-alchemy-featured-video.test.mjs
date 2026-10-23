import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Owner-supplied Psychic Alchemy video is first on the canonical service landing in EN/RU/ES", () => {
  const landing = read("components/alchemy-soul-landing.tsx");
  const css = read("components/alchemy-soul-landing.module.css");
  const first = landing.indexOf('data-alchemy-panel="featured-video"');
  const hero = landing.indexOf('data-alchemy-panel="hero"');
  const methods = landing.indexOf('data-alchemy-panel="method"');
  assert.ok(first > 0 && first < hero && hero < methods, "Owner video must appear before the hero and methods");
  assert.match(landing, /youtubeId: "-zacUn_zN6g"/);
  assert.match(landing, /<SiteVideoPlayer video=\{featuredIntroVideo\} locale=\{locale\} compact minimal posterPriority/);
  assert.match(landing, /data-alchemy-featured-video="-zacUn_zN6g"/);
  for (const text of ["Psychic Alchemy — in my own words", "Psychic Alchemy — об этом рассказываю сам", "Psychic Alchemy — explicado por mí", "YouTube solo se carga", "Видео загружается только после нажатия Play"]) {
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
