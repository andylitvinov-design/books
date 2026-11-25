import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki Yggdrasil has a persistent module switcher on overview and module pages", async () => {
  const [nav, record, modulePage] = await Promise.all([
    readFile("components/reiki-course-side-nav.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/yggdrasil-module-landing.tsx", "utf8"),
  ]);

  assert.match(nav, /YggdrasilSideNavigation/);
  assert.match(nav, /yggdrasilModuleLandings\.map/);
  assert.match(nav, /Program overview/);
  assert.match(record, /<YggdrasilSideNavigation locale=\{locale\} \/>/);
  assert.match(modulePage, /<YggdrasilSideNavigation locale=\{locale\} activeSlug=\{module\.slug\} \/>/);
});

test("Tantra Reiki side navigation links all nine levels plus media and source", async () => {
  const [nav, record, journey] = await Promise.all([
    readFile("components/reiki-course-side-nav.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
  ]);

  assert.match(nav, /TantraReikiSideNavigation/);
  assert.match(nav, /#tantra-level-/);
  assert.match(nav, /#tantra-testimonials/);
  assert.match(nav, /#english-guided-meditations-tantra-reiki/);
  assert.match(nav, /#tantra-full-source/);
  assert.match(nav, /#tantra-teacher/);
  assert.match(nav, /#tantra-master-course/);
  assert.match(journey, /id=\{"tantra-level-"\+n\}/);
  assert.match(record, /levels=\{tantraReikiLevelSummary\[locale\]\.levels\}/);
});

test("course switcher is sticky on desktop and horizontal on smaller screens", async () => {
  const css = await readFile("app/academy.css", "utf8");

  assert.match(css, /\.academy-course-layout/);
  assert.match(css, /\.reiki-course-side-nav \{/);
  assert.match(css, /position: sticky/);
  assert.match(css, /@media \(max-width: 920px\)[\s\S]*\.reiki-course-side-nav__items[\s\S]*overflow-x: auto/);
  assert.match(css, /\.reiki-course-side-nav__item\.is-active/);
});


test("unnumbered Yggdrasil links use the full sidebar width on desktop and readable pills on mobile", async () => {
  const css = await readFile("app/academy.css", "utf8");
  const nav = await readFile("components/reiki-course-side-nav.tsx", "utf8");

  assert.match(nav, /!item\.number \? " reiki-course-side-nav__item--wide"/);
  // The overview CSS also defines a numbered two-column layout; unnumbered items
  // must explicitly override that more-specific rule rather than inherit a 34px track.
  assert.match(css, /\.academy-reading-shell--yggdrasil \.reiki-course-side-nav__item--wide\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.academy-reading-shell--yggdrasil \.reiki-course-side-nav__item > em\s*\{[^}]*overflow-wrap:\s*normal/);
  assert.match(css, /@media \(max-width: 920px\)\s*\{[\s\S]*?\.academy-reading-shell--yggdrasil \.reiki-course-side-nav__item--wide\s*\{\s*grid-template-columns:\s*auto/);
});
