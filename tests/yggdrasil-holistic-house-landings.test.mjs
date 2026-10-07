import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cyrillic = /[А-Яа-яЁё]/;

test("Reiki Yggdrasil has seven separate module landings including Basic and Instructor courses", async () => {
  const moduleMap = await readFile("data/academy/yggdrasil-module-map.ts", "utf8");
  const routePage = await readFile("app/[locale]/academy/[[...slug]]/page.tsx", "utf8");

  for (const slug of [
    "basic-course",
    "instructor-course",
    "temple-magic",
    "eastern-magic",
    "western-magic",
    "rune-magic",
    "higher-magic",
  ]) {
    assert.match(moduleMap, new RegExp(`slug: "${slug}"`));
  }

  assert.match(routePage, /YggdrasilModuleLandingPage/);
  assert.match(routePage, /YggdrasilSourceArchivePage/);
  assert.match(routePage, /reiki\/master-shamanic-healing.*yggdrasil\/basic-course/s);
});

test("all 177 canonical Reiki Yggdrasil attunements have English text", async () => {
  const curriculum = JSON.parse(await readFile("data/academy/yggdrasil-curriculum.json", "utf8"));
  const translated = {};
  for (let level = 1; level <= 7; level += 1) {
    Object.assign(translated, JSON.parse(await readFile(`data/academy/yggdrasil-en-settings-l${level}.json`, "utf8")));
  }

  const settings = curriculum.levels.flatMap((level) => level.steps.flatMap((step) => step.settings));
  assert.equal(settings.length, 177);
  assert.equal(Object.keys(translated).length, 177);

  for (const setting of settings) {
    const english = translated[setting.id];
    assert.ok(english, `Missing English translation for ${setting.id}`);
    assert.ok(english.title && english.description && english.effect, `Incomplete English translation for ${setting.id}`);
    assert.equal(cyrillic.test(`${english.title} ${english.description} ${english.effect}`), false, `Cyrillic leaked into English translation for ${setting.id}`);
  }
});

test("English Yggdrasil UI no longer forces Russian detailed content", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.doesNotMatch(component, /className="yggdrasil-step-body" lang="ru"/);
  assert.match(component, /lang=\{locale === "ru" \? "ru"/);
  assert.match(component, /englishSettings/);
  assert.match(component, /levelOneEnglish/);
  assert.match(component, /genericEnglishSource/);
});

test("full EN and RU historical source pages are preserved", async () => {
  const archive = JSON.parse(await readFile("data/academy/yggdrasil-source-archive.generated.json", "utf8"));
  assert.ok(archive.sources.en.markdown.length > 14000);
  assert.ok(archive.sources.ru.markdown.length > 14000);
  assert.equal(cyrillic.test(archive.sources.en.markdown), false);
  assert.ok(archive.sources.ru.images.length >= 15);
  assert.ok(archive.sources.en.images.length >= 19);
  assert.match(archive.sources.en.markdown, /BASIC COURSE OF TAO REIKI YGGDRASIL/);
  assert.match(archive.sources.ru.markdown, /БАЗОВЫЙ КУРС ДАО РЕЙКИ ИГГДРАСИЛЬ/);
  assert.match(archive.sources.en.markdown, /MODULE 2\. INSTRUCTOR of TAO RY/);
});
