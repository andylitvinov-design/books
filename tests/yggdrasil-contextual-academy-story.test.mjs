import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Yggdrasil overview replaces the loose source gallery with contextual Academy story sections", async () => {
  const component = await readFile("components/yggdrasil-program-landing.tsx", "utf8");

  assert.match(component, /className="yggdrasil-school-story"/);
  assert.match(component, /academyStory\[locale\]/);
  assert.match(component, /yggdrasilAcademyStoryImages/);
  assert.match(component, /yggdrasilAcademyStorySourcePage/);
  assert.match(component, /Nicolai Zhuravlev/);
  assert.match(component, /Инициации, самостоятельная работа, практика и экзамен/);
  assert.match(component, /Andrii Litvinov/);
  assert.doesNotMatch(component, /className="yggdrasil-source-gallery"/);
  assert.doesNotMatch(component, /sourcePhotos\.map/);
});

test("Academy story media comes from the requested PsiTrends Academy landing", async () => {
  const data = await readFile("data/academy/yggdrasil-program-map.ts", "utf8");

  assert.match(data, /https:\/\/psitrends\.com\/studies\/adv\/reiki/);
  assert.match(data, /photo_2023-01-20_22-10-58\.jpg/);
  assert.match(data, /photo_2023-01-20_22-19-43\.jpg/);
  assert.match(data, /Screenshot_9\.png/);
  assert.match(data, /Screenshot_11\.png/);
});

test("contextual story keeps images attached to text on desktop and stacks on mobile", async () => {
  const css = await readFile("app/academy.css", "utf8");

  assert.match(css, /\.yggdrasil-school-story__item \{/);
  assert.match(css, /grid-template-columns: minmax\(220px, \.82fr\) minmax\(0, 1\.18fr\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.yggdrasil-school-story__item \{ grid-template-columns: 1fr/);
});
