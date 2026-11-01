import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("mandala meditation has an EN/RU/ES public route, locale handoff and a clear Holistic Support entry", () => {
  const route = read("app/[locale]/holistic-support/mandala/page.tsx");
  const support = read("app/[locale]/holistic-support/page.tsx");
  const locales = read("lib/public-locales.ts");
  assert.match(route, /<PublicSiteHeader locale=\{locale\}/);
  assert.match(route, /<MandalaMeditationClient locale=\{locale\} videos=\{freeMeditationVideos\(locale\)\}/);
  for (const locale of ["en", "ru", "es"]) {
    assert.ok(route.includes('"/' + locale + '/holistic-support/mandala"'), locale + " localized canonical");
  }
  assert.match(route, /isPublicLocale\(locale\)/);
  assert.match(route, /metadataBaseFor\(\)/);
  assert.match(locales, /holistic-support\\\/mandala/);
  assert.match(support, /data-holistic-mandala-entry/);
  assert.match(support, /meditationMandalaAction/);
  assert.match(support, /holistic-support\/mandala/);
});

test("public mandala adapts original seven Power Place geometries and stone-mosaic asset", () => {
  const client = read("components/mandala-meditation-client.tsx");
  const mosaic = read("public/mandalas/legacy-stone-mosaic.svg");
  for (const id of ["client", "zodiac", "star", "chess", "altar", "business", "dao", "stone"]) {
    assert.match(client, new RegExp('id: "' + id + '"'), id + " preset missing");
  }
  assert.match(client, /<MandalaArt option=\{current\}/);
  assert.match(client, /data-mandala-preset=\{option\.id\}/);
  assert.match(client, /legacy-stone-mosaic\.svg/);
  assert.match(mosaic, /viewBox="0 0 1200 1200"/);
  assert.match(mosaic, /id="pebbles"/);
});

test("private photo never leaves the browser and can be cropped or removed", () => {
  const client = read("components/mandala-meditation-client.tsx");
  assert.match(client, /type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(client, /image\.size > 10 \* 1024 \* 1024/);
  assert.match(client, /URL\.createObjectURL\(image\)/);
  assert.match(client, /URL\.revokeObjectURL\(imageUrl\)/);
  assert.match(client, /setImageUrl\(null\)/);
  assert.match(client, /setZoom\(/);
  assert.match(client, /setOffsetX\(/);
  assert.match(client, /setOffsetY\(/);
  assert.match(client, /setSquarePhoto\(/);
  assert.match(client, /maxLength=\{140\}/);
  assert.doesNotMatch(client, /fetch\s*\(|XMLHttpRequest|FormData|localStorage|sessionStorage|navigator\.sendBeacon/);
});

test("mandala uses source-approved video meditations rather than fake dubbed audio", () => {
  const route = read("app/[locale]/holistic-support/mandala/page.tsx");
  const client = read("components/mandala-meditation-client.tsx");
  const source = read("data/academy/holistic-support-meditations.ts");
  assert.match(route, /freeMeditationVideos\(locale\)/);
  assert.match(client, /<AcademyVideoPlayer key=\{activeVideo\.id\}/);
  assert.match(client, /videos\.filter\(video => activeTopic === "all" \|\| video\.topics\.includes\(activeTopic\)\)/);
  assert.match(client, /topic === "all" \|\| video\.topics\.includes\(topic\)/);
  assert.match(source, /verified_legacy_public_embed/);
  assert.match(source, /if \(locale !== "ru"\)/);
  assert.doesNotMatch(client, /youtubeId:\s*["']|\.mp3|autoplay=1|audio\.src/);
});

test("focus screen has mobile-safe controls, visible player and Escape handling", () => {
  const client = read("components/mandala-meditation-client.tsx");
  const styles = read("components/mandala-meditation.module.css");
  assert.match(client, /setFocusMode\(/);
  assert.match(client, /onClick=\{toggleFocusMode\}/);
  assert.match(client, /function toggleFocusMode\(\) \{ setFocusMode\(value => !value\); \}/);
  assert.doesNotMatch(client, /onPointerUp=|onPointerDown=|pointerHandledRef|onFocusPointerUp|onFocusClick/);
  assert.doesNotMatch(client, /lastFocusPress/);
  assert.match(client, /event\.key === "Escape"/);
  assert.match(client, /document\.body\.style\.overflow = "hidden"/);
  assert.match(client, /aria-pressed=\{focusMode\}/);
  assert.match(styles, /\.focus .videoFrame/);
  assert.match(styles, /\.focus .editor,\.focus .caution\{display:none\}/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /@media\(max-width:350px\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(styles, /\.focus .videoPane\{display:none\}/);
});
