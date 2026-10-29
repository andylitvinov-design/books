import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Academy home groups free courses, study programs and verified live events directly under the finder", () => {
  const hub = read("components/academy-hub.tsx");
  const discovery = read("components/academy-discovery.tsx");
  const css = read("components/academy-discovery.module.css");
  const services = read("components/services-smart-discovery.module.css");
  assert.match(hub, /<PublicSiteHeader locale=\{locale\} showAssessmentStrip=\{false\}/);
  assert.match(hub, /<AcademyDiscovery locale=\{locale\} view=\{view\} items=\{items\}/);
  assert.match(discovery, /<h1 id="academy-discovery-title">/);
  assert.match(discovery, /<DiscoverySectionTabs locale=\{locale\} active="courses"/);
  assert.match(discovery, /<AcademyCourseCardList locale=\{locale\} items=\{freeItems\}/);
  assert.match(discovery, /<AcademyCourseCardList locale=\{locale\} items=\{studyItems\}/);
  assert.doesNotMatch(discovery, /programTabs|browseTools|<CatalogShowcase|Refine courses|aiShort/);
  for (const anchor of ["academy-free-courses", "academy-study-programs", "academy-live-events"]) {
    assert.ok(discovery.includes('href="#' + anchor + '"'), anchor);
    assert.ok(discovery.includes('id="' + anchor + '"'), anchor);
  }
  assert.match(discovery, /className=\{styles\.quickPaths\}/);
  assert.match(discovery, /<AcademyLiveEventList locale=\{locale\} events=\{matchedEvents\}/);
  assert.doesNotMatch(hub, /<AcademyFreeCourseBanner/);
  assert.match(css, /linear-gradient\(121deg, #203450 0%, #283d5c 58%, #483a52 100%\)/);
  assert.ok(services.includes("linear-gradient(121deg,#203450 0%,#283d5c 58%,#483a52 100%)"));
});

test("EN RU ES course search includes Personal Coaching Session and existing destinations", () => {
  const hub = read("components/academy-hub.tsx");
  const discovery = read("components/academy-discovery.tsx");
  for (const title of [
    "Find your learning path", "Найдите свою программу обучения", "Encuentra tu ruta de aprendizaje",
  ]) assert.ok(discovery.includes(title), title);
  for (const id of [
    "academy-free-personal-coaching", "academy-free-opora", "academy-featured-principles-energywork", "academy-featured-egypt-priesthood",
    "academy-free-tantra-introduction", "academy-free-yggdrasil-introduction",
    "academy-featured-yggdrasil", "academy-featured-tantra-reiki",
    "academy-featured-kundalini-reiki", "academy-featured-temple-studies",
  ]) assert.ok(hub.includes('id: "' + id + '"'), id);
  assert.match(hub, /courseHref: REIKI_FREE_COURSE_PATH/);
  assert.match(hub, /courseHref: "\/" \+ \(locale === "es" \? "en" : locale\) \+ "\/app\/course\?program=stress"/);
  assert.match(hub, /tantra-reiki-yin-yang-cover\.svg/);
  assert.equal((hub.match(/free: true/g) || []).length, 6);
  assert.match(discovery, /useMemo\(\(\) => items\.filter/);
  assert.match(discovery, /matchesTerms/);
  assert.match(discovery, /role="search"/);
  assert.match(discovery, /onSubmit=\{submitSearch\}/);
  assert.match(discovery, /scrollIntoView/);
  assert.match(discovery, /academy\?view=videos/);
  assert.match(hub, /<AcademyVideoCourses locale=\{locale\}/);
  assert.match(hub, /id="academy-video-courses"/);
  const academyRoute=read("app/[locale]/academy/[[...slug]]/page.tsx");
  assert.match(academyRoute, /if \(key === "free-ai-courses"\) return/);
  assert.match(academyRoute, /<PublicGrowthCourses locale=\{locale\}/);
  assert.match(academyRoute, /<PublicPractitionerCourses locale=\{locale\}/);
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
  assert.equal((hub.match(/detailsHint:/g) || []).length, 10, "All remaining Academy offers need a specific explanation");
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


test("Academy photo-led first screen mirrors Holistic Support at mobile widths in EN RU ES", () => {
  const source = read("components/academy-discovery.tsx");
  const styles = read("components/academy-discovery.module.css");
  const support = read("components/holistic-support-choices.tsx");

  for (const word of [
    "Free Courses", "Study Programs", "Live Events",
    "Бесплатные курсы", "Программы обучения", "Живые встречи",
    "Cursos gratis", "Programas de estudio", "Eventos en vivo",
    "How would you like to begin?", "С чего хотите начать?", "¿Por dónde quieres empezar?",
  ]) assert.ok(source.includes(word), word);

  assert.match(source, /data-academy-first-screen/);
  assert.match(support, /data-holistic-first-screen/);
  assert.match(source, /<nav className=\{styles\.quickPaths\}/);
  assert.match(source, /<Image src="\/images\/holistic-house\/hero-olive-incense\.webp" alt="" fill priority/);
  assert.match(source, /data-academy-path="free"/);
  assert.match(source, /data-academy-path="study"/);
  assert.match(source, /data-academy-path="events"/);
  assert.match(source, /<BookOpen size=\{18\}/);
  assert.match(source, /<GraduationCap size=\{18\}/);
  assert.match(source, /<CalendarDays size=\{18\}/);

  for (const path of [
    "/images/holistic-house/reiki-practitioner-sunrise.webp",
    "/academy/reiki-yggdrasil/source/temple-studies.png",
    "/images/holistic-house/video-posters/constellations-en-v1.webp",
  ]) assert.ok(source.includes(path), path);
  for (const section of ["academy-free-courses", "academy-study-programs", "academy-live-events"]) {
    assert.ok(source.includes('href="#' + section + '"'), section);
    assert.ok(source.includes('id="' + section + '"'), section);
  }

  assert.match(styles, /\.quickPaths \{ display: grid; grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.quickPaths \{ grid-template-columns: minmax\(0,1fr\); gap: 7px; \}/);
  assert.match(styles, /@media \(max-width: 350px\)/);
  assert.match(styles, /@media \(max-width: 700px\) and \(max-height: 700px\)/);
  assert.match(styles, /\.pathCard:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("Academy keeps search, archive, video tab and personal cabinet below the photo entry", () => {
  const source = read("components/academy-discovery.tsx");
  const hero = source.indexOf("data-academy-first-screen");
  const results = source.indexOf('id="academy-programs"');
  const myCourses = source.indexOf("<AcademyMyCourses locale={locale} />");
  const finder = source.indexOf("data-academy-course-finder");
  const search = source.indexOf('id="academy-program-query"');
  const heading = source.indexOf('id="academy-course-results"');
  assert.ok(hero >= 0 && hero < results && results < myCourses && myCourses < finder && finder < search && search < heading);
  assert.match(source, /role="search" onSubmit=\{submitSearch\}/);
  assert.match(source, /onChange=\{\(event\) => setQuery\(event\.target\.value\)\}/);
  assert.match(source, /document\.getElementById\("academy-course-results"\)/);
  assert.match(source, /href="#academy-psimaster-courses"/);
  assert.match(source, /<DiscoverySectionTabs locale=\{locale\} active="courses" \/>/);
  assert.match(source, /href="#academy-video-courses"/);
  assert.match(source, /<AcademyLiveEventList locale=\{locale\} events=\{matchedEvents\}/);
  assert.doesNotMatch(source, /fetch\(|localStorage\.|sessionStorage\./);
});

test("Live academy cards show only confirmed future events with real registration links", () => {
  const source = read("components/academy-discovery.tsx");
  assert.match(source, /event\.status === "published"/);
  assert.match(source, /Number\.isFinite\(Date\.parse\(event\.startsAt\)\)/);
  assert.match(source, /Date\.parse\(event\.startsAt\) >= now/);
  assert.match(source, /event\.registrationHref\.startsWith\("https:\/\/"\)/);
  assert.match(source, /eventSchedule\(event, locale\)/);
  assert.match(source, /event\.highlights\?\.\[locale\]/);
  assert.match(source, /event\.registrationHref/);
  assert.match(source, /href=\{event\.registrationHref\}/);
  assert.match(source, /setExpandedEvent\(expanded \? null : event\.id\)/);
  assert.ok(source.includes('href={"/" + locale + "/events"}'));
  assert.doesNotMatch(source, /fetch\(|localStorage\.|sessionStorage\./);
});

test("Personal Coaching is a distinct photo-led Academy spotlight; Egyptian and Greek only in Coaching", () => {
 const hub=read("components/academy-hub.tsx");
 const discovery=read("components/academy-discovery.tsx");
 const css=read("components/academy-discovery.module.css");
 const lounge=read("components/public-coaching-discovery.jsx");
 const art=read("lib/coaching/public-session-art.js");
 assert.ok(hub.includes("const coachingItem: AcademyCourseItem = "));
 assert.ok(hub.includes("coachingItem={coachingItem}"));
 assert.ok(discovery.includes("data-academy-coaching-session"));
 assert.ok(discovery.includes("coachingSpotlightPhoto"));
 assert.ok(discovery.includes("const freeItems = matchedItems.filter"));
 assert.doesNotMatch(hub,/academy-free-egyptian-goal-planning|academy-free-greek-goal-planning/);
 assert.match(css,/coachingSpotlightCTA/);
 for(const word of ["PERSONAL COACHING","ЛИЧНАЯ КОУЧ-СЕССИЯ","COACHING PERSONAL"])assert.ok(discovery.includes(word));
 for(const slug of ["egyptian","greek"])assert.ok(lounge.includes("traditionCoachingArt."+slug));
 // Existing first-party originals are mirrored to canonical local cover paths;
 // testing retired upstream filenames would reject a valid production asset.
 assert.match(art, /egyptian:'\/images\/holistic-house\/coaching-ancient\/egyptian-cover\.jpg'/);
 assert.match(art, /greek:'\/images\/holistic-house\/coaching-ancient\/greek-cover\.jpg'/);
 assert.doesNotMatch(art, /https?:\/\//);
});
