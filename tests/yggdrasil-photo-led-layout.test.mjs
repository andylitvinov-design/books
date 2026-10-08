import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("every Basic Course stage has its own original PsiTrends photo", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  const urls = [
    "Screenshot_25.png",
    "photo_2023-07-10_08-26-39.jpg",
    "Screenshot_31.png",
    "tulumhypnotherapy.jpg",
    "world_magic_traditions_overview.jpg",
  ];
  for (const asset of urls) assert.ok(component.includes("https://psitrends.com/images/" + asset), "Missing original level image: " + asset);
  assert.match(component, /basicLevelPhotos\[step\.number\]/);
  assert.match(component, /basicLevelIntroductions\[locale\]\[step\.number\]/);
});

test("visual curriculum retains complete source content and language-specific videos", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.match(component, /className="yggdrasil-settings-list"/);
  assert.doesNotMatch(component, /step\.settings\.slice\(0, 4\)/);
  assert.match(component, /step\.settings\.map\(\(setting\)/);
  assert.match(component, /yggdrasilStepSummary/);
  assert.match(component, /russianVideos/);
  assert.match(component, /englishVideos/);
  assert.match(component, /yggdrasil-step-video-library/);
  assert.match(component, /sourceDetails/);
  assert.doesNotMatch(component, /yggdrasil-course-roadmap/);
});

test("new photo-led chapter cards have a responsive mobile image-first layout", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  const css = await readFile("components/yggdrasil-curriculum-visual.module.css", "utf8");
  assert.match(component, /visualStyles\.stepPhoto/);
  assert.match(component, /visualStyles\.stepHeader/);
  assert.match(component, /visualStyles\.stageNavigation/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*43%\)/);
  assert.match(css, /@media \(max-width:\s*700px\)/);
  assert.match(css, /\.stepCard\s*\{\s*grid-template-columns:\s*minmax\(0,1fr\)/);
});

test("Academy content security policy allows only required original photo origin", async () => {
  const middleware = await readFile("middleware.ts", "utf8");
  assert.match(middleware, /https:\/\/psitrends\.com https:\/\/www\.psitrends\.com/);
  assert.match(middleware, /academyVideoPage \? "img-src/);
});
