import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Academy home keeps one Services-style first screen instead of stacked legacy headings", () => {
  const hub = read("components/academy-hub.tsx");
  const hero = read("components/academy-discovery.tsx");
  const styles = read("components/academy-discovery.module.css");
  const servicesStyles = read("components/services-smart-discovery.module.css");

  assert.match(hub, /<PublicSiteHeader locale=\{locale\} showAssessmentStrip=\{false\}/);
  assert.match(hub, /<AcademyDiscovery locale=\{locale\} view=\{view\} items=\{items\}/);
  assert.doesNotMatch(hub, /<header className="library-heading">/);
  assert.doesNotMatch(hub, /<nav className="library-media-switch"/);
  assert.match(hero, /<h1 id="academy-discovery-title">/);
  assert.match(hero, /academy\?view=videos/);
  assert.match(hero, /aria-current=\{view === "programs"/);
  assert.match(hero, /aria-current=\{view === "videos"/);
  assert.match(styles, /linear-gradient\(121deg, #203450 0%, #283d5c 58%, #483a52 100%\)/);
  assert.ok(servicesStyles.includes("linear-gradient(121deg,#203450 0%,#283d5c 58%,#483a52 100%)"));
});

test("EN RU ES Academy discovery filters real published programs locally", () => {
  const hero = read("components/academy-discovery.tsx");
  for (const label of ["Find your learning path", "Найдите свою программу обучения", "Encuentra tu ruta de aprendizaje"]) {
    assert.ok(hero.includes(label), label);
  }
  for (const id of ["academy-featured-principles-energywork", "academy-featured-yggdrasil", "academy-featured-tantra-reiki", "academy-featured-kundalini-reiki", "academy-featured-temple-studies"]) {
    assert.ok(hero.includes(id), id);
  }
  assert.match(hero, /useMemo\(\(\) => items\.filter/);
  assert.match(hero, /meta\?\.topic !== topic/);
  assert.match(hero, /meta\?\.start !== startingPoint/);
  assert.match(hero, /matchesTerms\(/);
  assert.match(hero, /role="search"/);
  assert.match(hero, /onSubmit=\{submitSearch\}/);
  assert.match(hero, /scrollIntoView/);
  assert.match(hero, /matchingStress/);
  assert.match(hero, /courses\/antistress/);
  assert.doesNotMatch(hero, /fetch\(|localStorage\.|sessionStorage\./);
});

test("Academy retains its real courses, video archive, free OPORA banner and Tantra invitation", () => {
  const hub = read("components/academy-hub.tsx");
  const hero = read("components/academy-discovery.tsx");
  assert.match(hub, /<AcademyFreeCourseBanner locale=\{locale\}/);
  assert.match(hub, /<AcademyVideoCourses locale=\{locale\}/);
  assert.match(hub, /id="academy-video-courses"/);
  assert.match(hub, /<AcademyCourseCapture locale=\{locale\}/);
  assert.match(hub, /academy-featured-temple-studies/);
  assert.match(hero, /academy\/reiki\/tantra-reiki\/free-initiation/);
  assert.match(hub, /academy\/archive/);
});
