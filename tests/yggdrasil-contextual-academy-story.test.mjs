import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

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

test("Academy story uses registered original photos and a text-only initiations card", async () => {
  const data = await readFile("data/academy/yggdrasil-program-map.ts", "utf8");

  assert.match(data, /https:\/\/psitrends\.com\/studies\/adv\/reiki/);
  const { outputText } = ts.transpileModule(data, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const { yggdrasilAcademyStoryImages } = await import(
    "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
  );
  assert.equal(yggdrasilAcademyStoryImages.initiations, null);
  const { assets } = JSON.parse(await readFile("data/academy/reiki-photo-assets.json", "utf8"));
  const registered = new Set(assets.map(({ source }) => source));
  for (const key of ["founder", "history", "teacher"]) {
    const photo = new URL(yggdrasilAcademyStoryImages[key]);
    assert.equal(photo.hostname, "psitrends.com");
    assert.ok(registered.has(photo.origin + decodeURIComponent(photo.pathname)), key + " photo must resolve locally");
  }
  const component = await readFile("components/yggdrasil-program-landing.tsx", "utf8");
  assert.match(component, /const photoUrl = yggdrasilAcademyStoryImages\[item.key\]/);
  assert.match(component, /photoUrl \? <SourceVisual url=\{photoUrl\} label=\{item.title\} \/> : null/);
});

test("contextual story keeps images attached to text on desktop and stacks on mobile", async () => {
  const css = await readFile("app/academy.css", "utf8");

  assert.match(css, /\.yggdrasil-school-story__item \{/);
  assert.match(css, /grid-template-columns: minmax\(220px, \.82fr\) minmax\(0, 1\.18fr\)/);
  assert.match(css, /\.yggdrasil-school-story__item--text-only \{ grid-template-columns: minmax\(0, 1fr\); min-height: 0;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.yggdrasil-school-story__item \{ grid-template-columns: 1fr/);
});
