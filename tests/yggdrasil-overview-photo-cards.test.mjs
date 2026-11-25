import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Yggdrasil overview displays five authentic level photos reused from the complete course", async () => {
  const overview = await readFile("components/yggdrasil-program-landing.tsx", "utf8");
  const fullCourse = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  const photos = [
    "Screenshot_25.png",
    "photo_2023-07-10_08-26-39.jpg",
    "Screenshot_31.png",
    "tulumhypnotherapy.jpg",
    "world_magic_traditions_overview.jpg",
  ];
  for (const photo of photos) {
    const source = "https://psitrends.com/images/" + photo;
    assert.ok(overview.includes(source), "Overview missing source image: " + photo);
    assert.ok(fullCourse.includes(source), "Detailed course photo differs: " + photo);
  }
  assert.match(overview, /SourceVisual[\s\S]*?url=\{basicLevelPhotos\[step\.number\]\}/);
  assert.match(overview, /basicLevelPhotos: Record<number, string>/);
});

test("all five levels have readable and localized descriptions, not bare keyword lists", async () => {
  const overview = await readFile("components/yggdrasil-program-landing.tsx", "utf8");
  for (let level = 1; level <= 5; level += 1) {
    assert.match(overview, new RegExp("  " + level + ': \\{\\n    en: "[^"]{70,}"'));
  }
  assert.match(overview, /basicStepDescriptions\[step\.number\]\[locale\]/);
  assert.match(overview, /basicStepOpen: "Explore level"/);
  assert.match(overview, /basicStepOpen: "Подробнее о ступени"/);
  assert.match(overview, /basicStepOpen: "Explorar nivel"/);
  assert.match(overview, /basicLevelPhotos\[step\.number\]/);
  assert.match(overview, /basic-course#\$\{step\.id\.toLowerCase\(\)\}/);
});

test("the Yggdrasil five-level preview has a photo-first responsive card layout", async () => {
  const styles = await readFile("app/academy.css", "utf8");
  const overview = await readFile("components/yggdrasil-program-landing.tsx", "utf8");
  assert.match(styles, /\.yggdrasil-basic-level-card\s*\{[\s\S]*?grid-template-columns: minmax\(195px, 34%\)/);
  assert.match(styles, /@media \(max-width: 550px\)/);
  assert.match(styles, /\.yggdrasil-basic-level-card\s*\{ grid-template-columns: minmax\(0,1fr\)/);
  assert.match(overview, /yggdrasil-basic-level-photo-link/);
  assert.match(overview, /yggdrasil-basic-level-photo-number/);
  assert.match(overview, /yggdrasil-basic-course-actions/);
  assert.doesNotMatch(overview, /<div className="yggdrasil-basic-level-number">/);
});
