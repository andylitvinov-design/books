import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Tantra Reiki landing leads with the first initiation in all locales", async () => {
  const [page, metadata] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("data/academy/seo-overrides.js"),
  ]);
  for (const phrase of [
    "Первая ступень Тантра Рейки: «Родник жизни»",
    "Tantra Reiki Level 1: Spring of Life",
    "Tantra Reiki Nivel 1: Manantial de vida",
  ]) assert.ok(page.includes(phrase), phrase);
  assert.match(page, /href="#tantra-level-1"/);
  assert.match(page, /href="#tantra-next-levels"/);
  assert.match(page, /\/academy\/reiki\/tantra-reiki\/free-initiation/);
  for (const phrase of ["Тантра Рейки — 1-я ступень", "Tantra Reiki Level 1 — Spring of Life", "Tantra Reiki Nivel 1 — Manantial de vida"]) {
    assert.ok(metadata.includes(phrase), "SEO " + phrase);
  }
  const firstLesson = page.indexOf('<TantraReikiJourney locale={locale} />');
  const guide = page.indexOf('className="tantra-mobile-guide tantra-mobile-guide--combined"');
  const festival = page.indexOf('<TantraReikiFestivalMoments locale={locale} />');
  const reviews = page.indexOf('<TantraReikiTestimonials locale={locale} />');
  assert.ok(firstLesson > 0 && firstLesson < guide && guide < festival && festival < reviews);
  assert.equal((page.match(/<TantraReikiJourney locale=\{locale\} \/>/g) ?? []).length, 1);
});

test("all nine author chapters remain, with first level visible and optional attunements expandable", async () => {
  const [journey, css] = await Promise.all([
    read("components/tantra-reiki-journey.tsx"),
    read("app/academy.css"),
  ]);
  assert.match(journey, /stages.map\(\(stage, i\) =>/);
  assert.match(journey, /if \(n === 1\) return article;/);
  assert.match(journey, /<details className="tantra-journey__collapsed"/);
  assert.match(journey, /id=\{"tantra-level-"\+n\}/);
  assert.match(journey, /<summary className="tantra-journey__collapsed-summary">/);
  assert.match(journey, /<details className="tantra-journey__extras">/);
  assert.doesNotMatch(journey, /<details className="tantra-journey__extras" open=/);
  assert.match(journey, /originalAuthorDescription\(locale, i\)\.map/);
  assert.match(journey, /originalProgrammeStudyStep\(locale, i\)/);
  assert.match(journey, /levelPhotos\[i\]/);
  assert.match(journey, /focus.request/);
  assert.match(journey, /free-initiation/);
  assert.match(journey, /id="tantra-next-levels"/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-journey__collapsed-summary:focus-visible/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
