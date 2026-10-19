import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("components/academy-record-page.tsx");
const journey = read("components/tantra-reiki-journey.tsx");
const css = read("app/academy.css");

test("Tantra Reiki has one real hero heading and two distinct first-screen learning routes", () => {
  assert.match(page, /!isCanonicalYggdrasil && !isVerbatimTantraArchive \? \(/);
  assert.match(page, /<h1 id="tantra-course-hero-title">/);
  assert.doesNotMatch(page, /<h2 id="tantra-course-hero-title">/);
  assert.match(page, /className="tantra-course-hero__cta"/);
  assert.match(page, /className="tantra-course-hero__course-cta" href=\{REIKI_FREE_COURSE_PATH\}/);
  assert.match(page, /className="tantra-course-hero__more"/);
  assert.match(page, /<nav className="tantra-course-hero__secondary-links"/);
  assert.match(page, /href="#tantra-level-1"/);
  assert.match(page, /href="#tantra-next-levels"/);
  assert.match(page, /className="tantra-course-hero__tests-cta"/);
  assert.match(page, /reiki-guide\?course=tantra&locale=/);
  for (const phrase of [
    "Personal initiation requires Andrey", "согласования с Андреем", "requiere confirmación de Andrey",
  ]) assert.ok(page.includes(phrase), phrase);
});

test("First Tantra level is a single scenic reading screen with original text behind disclosure", () => {
  assert.doesNotMatch(journey, /<header className="tantra-journey__focus-heading"/);
  assert.match(journey, /<figure className="tantra-journey__photo"/);
  assert.match(journey, /n === 1 \? <h2 id=\{"tantra-heading-" \+ n\}>\{focus.title\}<\/h2> : <h3 id=\{"tantra-heading-" \+ n\}>\{copy.title\}<\/h3>/);
  assert.match(journey, /className="tantra-journey__first-description"/);
  assert.match(journey, /<details className="tantra-journey__source">/);
  assert.match(journey, /<div className="tantra-journey__source-body">/);
  assert.match(journey, /originalAuthorDescription\(locale, i\)\.map/);
  assert.match(journey, /originalProgrammeStudyStep\(locale, i\)/);
  assert.match(journey, /<details className="tantra-journey__extras" open=\{i === 0\}>/);
  assert.equal((journey.match(/className="tantra-journey__first-cta"/g) || []).length, 1);
  assert.match(journey, /if \(n === 1\) return article/);
  assert.match(journey, /<details className="tantra-journey__collapsed"/);
  assert.match(journey, /id=\{"tantra-level-"\+n\}/);
  assert.match(journey, /id="tantra-next-levels"/);
});

test("PDF course map remains available behind an accessible compact disclosure", () => {
  assert.match(page, /className="tantra-mobile-guide tantra-mobile-guide--combined"/);
  assert.match(page, /<details className="tantra-mobile-guide__toc">/);
  assert.match(page, /<TantraReikiOverviewLinks locale=\{locale\} \/>/);
  assert.match(page, /className="tantra-mobile-guide__download"/);
});

test("Mobile layout widens scenes and fits brief story cards without forced scroll snapping", () => {
  assert.match(css, /Tantra Reiki 2026-10-19: full-width/);
  assert.match(css, /\.academy-reading-shell--tantra \{\s*width: 100%;\s*max-width: none;/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-journey__level--first \.tantra-journey__photo \{/);
  assert.match(css, /aspect-ratio: 16 \/ 7;/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-journey__source > summary/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-journey__collapsed-summary \{/);
  assert.doesNotMatch(css.slice(css.indexOf("Tantra Reiki 2026-10-19")), /scroll-snap-type:\s*mandatory/);
});
