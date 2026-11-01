import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const story = readFileSync("components/tantra-reiki-story.tsx", "utf8");
const record = readFileSync("components/academy-record-page.tsx", "utf8");
const css = readFileSync("app/academy.css", "utf8");

test("Teacher uses existing verified photo, original About page and localised concise text", () => {
  assert.match(story, /<StaticPortrait/);
  assert.match(story, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(story, /href=\{"\/" \+ locale \+ "\/about"\}/);
  for (const text of ["Learn Tantra Reiki with Andy", "Тантра Рейки с Андреем", "Aprende Tantra Reiki con Andy"]) {
    assert.ok(story.includes(text), "locale title: " + text);
  }
  for (const text of ["History & biography", "История и биография", "Historia y biografía"]) {
    assert.ok(story.includes(text), "locale archive: " + text);
  }
});

test("One expandable source row retains both complete historical archives and attribution", () => {
  assert.equal((story.match(/<details className="tantra-source-disclosure tantra-teacher__history"/g) || []).length, 1);
  assert.match(story, /id="tantra-original-academy-history"/);
  assert.match(story, /id="tantra-original-author-biography"/);
  assert.match(story, /historicalSchoolIndices\.map/);
  assert.match(story, /historicalBiographyIndices\.map/);
  assert.match(story, /href=\{sourceUrl\}/);
  assert.match(record, /<TantraReikiTeacher locale=\{locale\} sourceUrl=\{record\.sourceUrl\} \/>/);
  assert.match(record, /!isCanonicalYggdrasil && !isVerbatimTantraArchive \? \(/);
  assert.doesNotMatch(story, /<details[^>]+id="tantra-original-author-biography"/);
});

test("Phone layout prioritises a short image, compact copy, 44px CTA and accessibility", () => {
  const fromMarker = css.slice(css.lastIndexOf("/* Tantra Reiki teacher: one short, photo-led phone screen"));
  assert.ok(fromMarker.startsWith("/* Tantra Reiki teacher:"), "dedicated teacher rules preserved");
  assert.match(fromMarker, /@media \(max-width: 620px\)/);
  assert.match(fromMarker, /height: clamp\(136px, 38vw, 164px\)/);
  assert.match(fromMarker, /font-size: clamp\(24px, 6\.1vw, 29px\)/);
  assert.match(fromMarker, /min-height: 44px/);
  assert.match(fromMarker, /:focus-visible/);
  assert.match(fromMarker, /prefers-reduced-motion: reduce/);
});
