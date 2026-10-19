import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Academy home has a single course catalogue directly under the search hero, without the old three-way switch", () => {
  const hub = read("components/academy-hub.tsx");
  const discovery = read("components/academy-discovery.tsx");
  const css = read("components/academy-discovery.module.css");
  const services = read("components/services-smart-discovery.module.css");
  assert.match(hub, /<PublicSiteHeader locale=\{locale\} showAssessmentStrip=\{false\}/);
  assert.match(hub, /<AcademyDiscovery locale=\{locale\} view=\{view\} items=\{items\}/);
  assert.match(discovery, /<h1 id="academy-discovery-title">/);
  assert.match(discovery, /<DiscoverySectionTabs locale=\{locale\} active="courses"/);
  assert.match(discovery, /<AcademyCourseCardList locale=\{locale\} items=\{matchedItems\}/);
  assert.doesNotMatch(discovery, /programTabs|browseTools|<CatalogShowcase|Refine courses|aiShort|<nav/);
  assert.doesNotMatch(hub, /<AcademyFreeCourseBanner/);
  assert.match(css, /linear-gradient\(121deg, #203450 0%, #283d5c 58%, #483a52 100%\)/);
  assert.ok(services.includes("linear-gradient(121deg,#203450 0%,#283d5c 58%,#483a52 100%)"));
});

test("EN RU ES course search is local, keeps all eight real destinations and preserves video archive access", () => {
  const hub = read("components/academy-hub.tsx");
  const discovery = read("components/academy-discovery.tsx");
  for (const title of [
    "Find your learning path", "Найдите свою программу обучения", "Encuentra tu ruta de aprendizaje",
  ]) assert.ok(discovery.includes(title), title);
  for (const id of [
    "academy-free-opora", "academy-featured-principles-energywork",
    "academy-free-tantra-introduction", "academy-free-yggdrasil-introduction",
    "academy-featured-yggdrasil", "academy-featured-tantra-reiki",
    "academy-featured-kundalini-reiki", "academy-featured-temple-studies",
  ]) assert.ok(hub.includes('id: "' + id + '"'), id);
  assert.match(hub, /courseHref: REIKI_FREE_COURSE_PATH/);
  assert.match(hub, /courseHref: "\/" \+ \(locale === "es" \? "en" : locale\) \+ "\/app\/course\?program=stress"/);
  assert.match(hub, /tantra-reiki-yin-yang-cover\.svg/);
  assert.equal((hub.match(/free: true/g) || []).length, 4);
  assert.match(discovery, /useMemo\(\(\) => items\.filter/);
  assert.match(discovery, /matchesTerms/);
  assert.match(discovery, /role="search"/);
  assert.match(discovery, /onSubmit=\{submitSearch\}/);
  assert.match(discovery, /scrollIntoView/);
  assert.match(discovery, /academy\?view=videos/);
  assert.match(hub, /<AcademyVideoCourses locale=\{locale\}/);
  assert.match(hub, /id="academy-video-courses"/);
  assert.match(read("app/[locale]/academy/[[...slug]]/page.tsx"), /if \(key === "free-ai-courses"\) return <PublicGrowthCourses locale=\{locale\}/);
  assert.doesNotMatch(discovery, /fetch\(|localStorage\.|sessionStorage\./);
});

test("Course cards have photo-left media, a high-contrast FREE label and separate detail/start actions on phones", () => {
  const cards = read("components/academy-course-card-list.tsx");
  const css = read("components/academy-course-card-list.module.css");
  for (const text of ["FREE", "Подробнее", "Пройти курс", "Take course", "Detalles", "Empezar curso"]) {
    assert.ok(cards.includes(text), text);
  }
  assert.match(cards, /<Image[\s\S]+?src=\{cardArtworkUrl\(item\.image\)\}/);
  assert.match(cards, /item\.free \? <span className=\{styles\.free\}/);
  assert.match(cards, /className=\{styles\.details\}/);
  assert.match(cards, /aria-expanded=\{showDetails\}/);
  assert.match(cards, /aria-controls=\{hintId\}/);
  assert.match(cards, /onClick=\{\(\) => setShowDetails\(!showDetails\)\}/);
  assert.match(cards, /className=\{styles\.hint\} id=\{hintId\} hidden=\{!showDetails\}/);
  assert.match(cards, /className=\{styles\.landing\} href=\{item\.href\}/);
  assert.match(cards, /className=\{styles\.take\} href=\{item\.courseHref \?\? item\.href\}/);
  assert.match(cards, /prefetch=\{false\}/);
  assert.match(cards, /data-academy-course-card=\{item\.id\}/);
  assert.match(css, /grid-template-columns: minmax\(114px, 32%\) minmax\(0, 1fr\)/);
  assert.match(css, /background: linear-gradient\(115deg, #a23762, #db527c\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /grid-template-columns: minmax\(98px, 30%\) minmax\(0, 1fr\)/);
  assert.match(css, /\.actions \{/);
  assert.match(css, /\.hint\[hidden\] \{ display: none; \}/);
  assert.match(css, /min-height: 36px/);
  assert.match(css, /:focus-visible/);
});

test("Every Academy course expands a distinct EN/RU/ES explanation and the Reiki Practitioner name is consistent", () => {
  const hub = read("components/academy-hub.tsx");
  const landing = read("components/principles-of-energywork.tsx");
  const metadata = read("app/[locale]/academy/[[...slug]]/page.tsx");
  const discovery = read("components/academy-discovery.tsx");
  const keys = ["opora", "practitioner", "tantraIntro", "yggdrasilIntro", "yggdrasilFull", "tantraFull", "kundaliniFull", "temple"];
  assert.equal((hub.match(/detailsHint: hints\.[A-Za-z]+/g) || []).length, 8, "Every course needs its own hint");
  for (const key of keys) assert.ok(hub.includes("detailsHint: hints." + key), "Missing course-specific help: " + key);
  for (const example of [
    "Fourteen gentle daily practices", "14 дней коротких практик", "Catorce prácticas breves",
    "Flight to the Sun", "Полёт к Солнцу", "Vuelo hacia el Sol",
    "Spring of Life", "Родник жизни", "Manantial de Vida",
    "original Paul Crick", "оригинальные материалы Пола Крика", "materiales originales de Paul Crick",
    "runes, Tarot", "руны, Таро", "runas, Tarot",
  ]) assert.ok(hub.includes(example), "Missing localized explanatory detail: " + example);
  for (const name of [
    "Free Course Reiki Practitioner: Study & Initiation",
    "Бесплатный курс «Практик Рейки»: обучение и инициация",
    "Curso gratis Reiki Practitioner: estudio e iniciación",
  ]) {
    assert.ok(hub.includes(name), "Missing course card name: " + name);
    assert.ok(landing.includes(name), "Missing course landing name: " + name);
    assert.ok(metadata.includes(name), "Missing page metadata title: " + name);
  }
  assert.match(discovery, /reiki practitioner study initiation/);
  assert.match(hub, /initiation is arranged separately with Andrey/);
  assert.match(hub, /инициация согласуется с Андреем отдельно/);
});

test("Academy still offers original source programmes, archives and consultations", () => {
  const hub = read("components/academy-hub.tsx");
  assert.match(hub, /<AcademyCourseCapture locale=\{locale\}/);
  assert.match(hub, /academy-featured-temple-studies/);
  assert.match(hub, /academy\/archive/);
});

test("Featured programme buttons open their own landings; only real AI lessons say Take course", () => {
  const hub = read("components/academy-hub.tsx");
  const cards = read("components/academy-course-card-list.tsx");
  const expectedLandings = [
    ["academy-featured-yggdrasil", "/academy/reiki/yggdrasil"],
    ["academy-featured-tantra-reiki", "/academy/reiki/tantra-reiki"],
    ["academy-featured-kundalini-reiki", "/academy/reiki/kundalini-reiki"],
    ["academy-featured-temple-studies", "/academy/temple-studies"],
  ];
  for (const [id, landing] of expectedLandings) {
    const start = hub.indexOf('id: "' + id + '"');
    assert.ok(start >= 0, id);
    const end = hub.indexOf("actionLabel: action.program,", start);
    assert.ok(end > start, id);
    const block = hub.slice(start, end);
    assert.ok(block.includes('href: "/" + locale + "' + landing + '"'), id + " must open its programme landing");
    assert.doesNotMatch(block, /courseHref:/, id + " must not masquerade as an AI lesson");
  }
  assert.ok(cards.includes("href={item.courseHref ?? item.href}"));
  assert.ok(cards.includes("item.courseHref ? t.start : t.open"));
  for (const id of ["academy-free-opora", "academy-featured-principles-energywork", "academy-free-tantra-introduction", "academy-free-yggdrasil-introduction"]) {
    const start = hub.indexOf('id: "' + id + '"');
    const end = hub.indexOf("actionLabel:", start);
    assert.ok(start >= 0 && end > start && hub.slice(start, end).includes("courseHref:"), id + " should retain an actual AI lesson link");
  }
});
