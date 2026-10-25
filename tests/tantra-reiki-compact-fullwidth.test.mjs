import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("components/academy-record-page.tsx");
const journey = read("components/tantra-reiki-journey.tsx");
const css = read("app/academy.css");
const screensCss = read("app/reiki-landing-screens.css");

test("Tantra Reiki has one real hero heading and three distinct first-screen pathways", () => {
  assert.match(page, /!isCanonicalYggdrasil && !isVerbatimTantraArchive \? \(/);
  assert.match(page, /<h1 id="tantra-course-hero-title">/);
  assert.doesNotMatch(page, /<h2 id="tantra-course-hero-title">/);
  assert.match(page, /className="tantra-course-hero__cta"/);
  assert.match(page, /className="tantra-course-hero__cta" href=\{REIKI_FREE_COURSE_PATH\} data-reiki-course-cta/);
  assert.match(page, /className="tantra-course-hero__healing-cta"/);
  assert.match(page, /className="tantra-course-hero__initiation-cta" href=\{\"\/\" \+ locale \+ \"\/academy\/reiki\/tantra-reiki\/free-initiation#apply-personal\"\}/);
  assert.match(page, /className="tantra-course-hero__more"/);
  assert.match(page, /<nav className="tantra-course-hero__secondary-links"/);
  assert.match(page, /href="#tantra-level-1"/);
  assert.match(page, /href="#tantra-next-levels"/);
  assert.match(page, /className="tantra-course-hero__tests-cta"/);
  assert.match(page, /reiki-guide\?course=tantra&locale=/);
  for (const phrase of [
    "subject to Andrey's confirmation", "согласованию с Андреем", "confirmación de Andrey",
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
  assert.match(journey, /<details className="tantra-journey__extras">/);
  assert.doesNotMatch(journey, /<details className="tantra-journey__extras" open=/);
  assert.equal((journey.match(/className="tantra-journey__first-cta"/g) || []).length, 1);
  assert.match(journey, /if \(n === 1\) return article/);
  assert.match(journey, /<details className="tantra-journey__collapsed"/);
  assert.match(journey, /id=\{"tantra-level-"\+n\}/);
  assert.match(journey, /id="tantra-next-levels"/);
});

test("Tantra PDF remains downloadable, with a visible Reiki Practitioner offer instead of a duplicate map", () => {
  const block = page.slice(page.indexOf('<section className="tantra-mobile-guide'), page.indexOf('<TantraReikiFestivalMoments'));
  assert.match(block, /tantra-mobile-guide--promo reiki-screen/);
  assert.doesNotMatch(block, /tantra-mobile-guide__toc|TantraReikiOverviewLinks|Explore the 9-level study map/);
  assert.match(block, /tantra-mobile-guide__course-promo/);
  assert.match(block, /className="tantra-mobile-guide__course-link" href=\{REIKI_FREE_COURSE_PATH\} data-reiki-course-cta/);
  assert.match(block, /Reiki Practitioner: Study & Initiation/);
  assert.match(block, /Практик Рейки: обучение и инициация/);
  assert.match(block, /Reiki Practitioner: estudio e iniciación/);
  assert.match(block, /className="tantra-mobile-guide__download"/);
  assert.match(block, /\/api\/academy\/reiki-guide\?course=tantra&locale=/);
  assert.match(screensCss, /\.tantra-mobile-guide--promo \.tantra-mobile-guide__course-promo/);
  assert.match(screensCss, /@media \(max-width: 820px\)/);
  assert.match(screensCss, /@media \(max-width: 620px\)/);
  assert.match(screensCss, /@media \(max-width: 360px\)/);
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

test("Levels 2–9 show eight full-width photo-left disclosures with useful expanded previews", () => {
  assert.match(journey, /<details className="tantra-journey__collapsed" id=\{"tantra-level-"\+n\}/);
  assert.match(journey, /<summary className="tantra-journey__collapsed-summary">/);
  assert.match(journey, /<span className="tantra-journey__collapsed-photo">/);
  assert.match(journey, /<img src=\{reikiPhotoUrl\(photo\.src, 640\)\} alt=""[^>]*loading="lazy"/);
  assert.match(journey, /<span className="tantra-journey__collapsed-number">\{String\(n\)\.padStart\(2, "0"\)\}/);
  assert.match(journey, /<span className="tantra-journey__collapsed-title"><strong>\{copy\.title\}<\/strong><small>\{copy\.subtitle\}<\/small>/);
  assert.match(journey, /n === 1 \? \(\s*<figure className="tantra-journey__photo">/);
  assert.match(journey, /n > 1 \? \(\s*<div className="tantra-journey__collapsed-learning">/);
  assert.match(journey, /<p>\{levelApplications\[locale\]\[i\]\}<\/p>/);
  assert.match(journey, /<p>\{copy\.practice\}<\/p>/);
  assert.match(journey, /focus\.collapse/);
  for (const label of ["Close details", "Свернуть", "Cerrar detalles"]) assert.ok(journey.includes(label));

  const marker = "/* Tantra Reiki 2026-10-24: full-width photographic disclosures for levels 2–9. */";
  const rules = css.slice(css.indexOf(marker));
  assert.ok(rules.startsWith(marker), "Photo rows need their own latest CSS overrides");
  assert.match(rules, /\.tantra-journey \{\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(rules, /grid-template-columns: 128px minmax\(0, 1fr\) auto/);
  assert.match(rules, /\.tantra-journey__collapsed-photo img \{/);
  assert.match(rules, /@media \(max-width: 700px\)/);
  assert.match(rules, /grid-template-columns: 88px minmax\(0, 1fr\) 28px/);
  assert.match(rules, /@media \(max-width: 360px\)/);
  assert.match(rules, /grid-template-columns: 76px minmax\(0, 1fr\) 25px/);
  assert.match(rules, /\.tantra-journey__collapsed:not\(\[open\]\) \.tantra-journey__collapsed-title small \{\s*display: block/);
  assert.doesNotMatch(rules, /grid-template-columns: repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});
