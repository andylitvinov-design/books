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

test("English Yggdrasil UI uses English settings and source-based step summaries", async () => {
  const component = await readFile("components/yggdrasil-curriculum.tsx", "utf8");
  assert.doesNotMatch(component, /className="yggdrasil-step-body" lang="ru"/);
  assert.match(component, /lang=\{locale === "ru" \? "ru"/);
  assert.match(component, /englishSettings/);
  assert.match(component, /yggdrasilStepSummary/);
  assert.doesNotMatch(component, /genericEnglishSource/);
  assert.doesNotMatch(component, /levelOneEnglish/);
});

test("full EN and RU historical source pages are preserved", async () => {
  const archive = JSON.parse(await readFile("data/academy/yggdrasil-source-archive.generated.json", "utf8"));
  assert.ok(archive.sources.en.markdown.length > 14500);
  assert.ok(archive.sources.ru.markdown.length > 14500);
  assert.equal(cyrillic.test(archive.sources.en.markdown), false);
  assert.equal(archive.sources.en.images.length, 19);
  assert.equal(archive.sources.ru.images.length, 14);
  assert.equal(archive.sources.ru.images.some((url) => url.includes("telegram-svgrepo-com.svg")), false);

  for (const marker of [
    "MAGISTER of SHAMANIC & TEMPLE WORK",
    "PROGRAM OVERVIEW",
    "Module 10. Magister Temple Attunements",
    "BASIC COURSE OF TAO REIKI YGGDRASIL",
    "## REGISTRATION",
    "The Academy was founded by Nicolai Zhuravlev 30 years ago",
    "## LEVELS & CERTIFICATES",
    "MODULE 2. INSTRUCTOR of TAO RY",
    "## Testimonials",
    "## REGISTER NOW",
    "### ANDRII LITVINOV",
    "Send a message to get details and register.",
  ]) {
    assert.ok(archive.sources.en.markdown.includes(marker), `Missing EN source marker: ${marker}`);
  }

  for (const marker of [
    "Рейки Иггдрасиль - уникальная система",
    "Обзор программы:",
    "Модуль 10: Магистерские настройки храма",
    "БАЗОВЫЙ КУРС ДАО РЕЙКИ ИГГДРАСИЛЬ",
    "## РЕГИСТРАЦИЯ",
    "Академия была основана Николаем Журавлевым 30 лет назад",
    "## УРОВНИ И СЕРТИФИКАТЫ",
    "МОДУЛЬ 2. ИНСТРУКТОР TAO RY",
    "### АНДРЕЙ ЛИТВИНОВ",
    "Напишите нам и узнайте детали!",
  ]) {
    assert.ok(archive.sources.ru.markdown.includes(marker), `Missing RU source marker: ${marker}`);
  }

  assert.equal(archive.verification.sourceContentImages.en, 19);
  assert.equal(archive.verification.sourceContentImages.ru, 14);
});

test("historical source-photo set stays in the archive while the program hub no longer renders a photo catalog", async () => {
  const [programMap, landing, sourceArchive] = await Promise.all([
    readFile("data/academy/yggdrasil-program-map.ts", "utf8"),
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("components/yggdrasil-source-archive.tsx", "utf8"),
  ]);

  for (const id of [
    "hero", "overview", "basic", "shamanic", "temple", "runes", "western", "eastern", "slavic", "toltec",
    "school-founder", "academy-history", "levels-certificates",
    "testimonial-1", "testimonial-2", "testimonial-3", "testimonial-4", "testimonial-5",
    "teacher-andrii",
  ]) {
    assert.match(programMap, new RegExp(`id: "${id}"`));
  }

  assert.doesNotMatch(landing, /yggdrasil-source-gallery/);
  assert.doesNotMatch(landing, /sourcePhotos = yggdrasilSourceImages\.filter/);
  assert.match(landing, /YggdrasilTestimonials/);
  assert.match(sourceArchive, /normalizedSourceUrl/);
  assert.match(sourceArchive, /preserved\?\.label\[locale\]/);
  assert.match(sourceArchive, /preserved\?\.localUrl \?\? src/);
});

test("the canonical Reiki Yggdrasil landing has no obsolete site/archive footer links", async () => {
  const recordPage = await readFile("components/academy-record-page.tsx", "utf8");
  const program = await readFile("components/yggdrasil-program-landing.tsx", "utf8");
  assert.ok(recordPage.includes('!isCanonicalYggdrasil ? (\n          <footer className="academy-source-footer">'));
  assert.ok(!recordPage.includes('href="https://reiki-yggdrasil.vercel.app/"'));
  assert.ok(!recordPage.includes('className="academy-secondary-source" href={record.sourceUrl}'));
  assert.ok(!recordPage.includes('reiki-yggdrasil@3fd7960aa77862c38f8a5754b64c3a79f5e0c96a'));
  assert.ok(!program.includes("yggdrasil-source-footer-panel"));
});

test("Higher Magic adopts the My Reiki chrome and keeps canonical curriculum and module routes", async () => {
  const [page, header, curriculumView, theme, detail, dock, model, data] = await Promise.all([
    readFile("components/yggdrasil-module-landing.tsx", "utf8"),
    readFile("components/my-reiki-header.tsx", "utf8"),
    readFile("components/yggdrasil-curriculum.tsx", "utf8"),
    readFile("components/yggdrasil-curriculum-visual.module.css", "utf8"),
    readFile("components/yggdrasil-pro-detail.module.css", "utf8"),
    readFile("app/unified-mobile-dock.css", "utf8"),
    readFile("lib/unified-mobile-dock.mjs", "utf8"),
    readFile("data/academy/yggdrasil-curriculum.json", "utf8"),
  ]);
  const branch = page.slice(page.indexOf('if (module.slug === "higher-magic")'), page.indexOf('<main className={"academy-reading-shell'));
  assert.ok(branch.includes('data-my-reiki-module-landing="higher-magic"'));
  assert.ok(branch.includes('<MyReikiHeader locale={locale} program="pro" modulePath="/academy/reiki/yggdrasil/higher-magic"'));
  assert.ok(branch.includes('<ReikiProgramNavigation locale={locale} active="pro"'));
  assert.ok(branch.includes('program=pro#reiki-pro-higher-magic'));
  assert.ok(branch.includes('href="#yggdrasil-curriculum-title"'));
  assert.ok(branch.includes('visualTheme="my-reiki"'));
  assert.ok(branch.includes('<PublicConsultationCta locale={locale} />'));
  assert.ok(branch.includes('<YggdrasilSideNavigation locale={locale} activeSlug={module.slug} />'));
  assert.ok(!branch.includes('<PublicSiteHeader'));
  assert.ok(header.includes('modulePath ? "/" + language + modulePath'));
  assert.ok(curriculumView.includes('visualTheme?: "navy" | "my-reiki"'));
  assert.ok(curriculumView.includes("step.settings.map((setting)"));
  assert.ok(theme.includes('[data-visual-theme="my-reiki"] .stageNavigation'));
  assert.ok(theme.includes('white-space: normal') && theme.includes('overflow-wrap: anywhere'));
  assert.ok(detail.includes('support-therapy-cabinet-hd.webp') && detail.includes('#fff19b,#ffc520 44%,#e99000'));
  assert.ok(dock.includes('body:has([data-my-reiki-module-landing])'));
  assert.ok(model.includes('higher-magic') && model.includes('return "reiki"'));
  const level = JSON.parse(data).levels.find(item => item.id === 7);
  assert.equal(level.steps.length, 6);
  assert.equal(level.steps.reduce((sum, step) => sum + step.settings.length, 0), 32);
  assert.equal(level.steps.reduce((sum, step) => sum + (step.video?.videos?.filter(v => Boolean(v.youtubeId)).length ?? 0), 0), 13);
});
