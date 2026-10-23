import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const feature = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");

test("home keeps one five-stage journey in EN/RU/ES using existing modules", () => {
  const enRu = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  for (const home of [enRu, es]) {
    assert.match(home, /<HomeMasterPath locale=/);
    assert.match(home, /<HomeFeaturedWorkspace locale=/);
    const ordered = ["HomeSectionCarousel", "HomeMasterPath", "HomeFreeDiagnosisBanner",
      "HomeConversationGuide", "HomePersonalSpaceCard", "HomeFeaturedWorkspace",
      "HomepageTopicJourneys", "HomeMoreDisclosure"];
    let previous = -1;
    for (const name of ordered) {
      const position = home.indexOf("<" + name);
      assert.ok(position > previous, "Existing homepage architecture is preserved: " + name);
      previous = position;
    }
  }
  assert.match(feature, /type ModuleKey = "tests" \| "courses" \| "services" \| "learning" \| "master"/);
  assert.match(feature, /moduleIds: ModuleKey\[\] = \["tests", "courses", "services", "learning", "master"\]/);
  assert.match(feature, /data-home-path-stages="5"/);
  for (const id of ["tests", "courses", "services", "learning", "master"]) {
    assert.ok(feature.includes('data-home-module={id}'), "One shared selector for stage " + id);
    assert.ok(feature.includes('data-home-module-detail={selected}'));
    assert.ok(feature.includes(id + ": { title:"), "Localized copy for " + id);
  }
  for (const label of ["Discover yourself", "Take a free course", "Try a free service",
    "Professional training", "Become a Master",
    "Узнай себя", "Пройди бесплатный курс", "Получи бесплатную услугу",
    "Профессиональное обучение", "Стань мастером",
    "Conócete mejor", "Haz un curso gratis", "Recibe ayuda gratis",
    "Formación profesional", "Sé profesional"]) {
    assert.ok(feature.includes(label), "Missing five-stage locale label: " + label);
  }
});

test("each action has a real existing route; free and professional routes are distinct", () => {
  for (const value of [
    'selected === "tests"', 'selected === "courses"', 'selected === "services"',
    'selected === "learning"', 'master: { title:',
    '/client/tests', '/client/tests?focus=stress', 'accountRoot + "/portrait"',
    '/academy/principles-of-energywork/learn', '/courses/antistress',
    '/services/free-situation-review', '/academy/reiki/tantra-reiki/free-initiation', '/wu-xing',
    '/academy/reiki', '"/" + locale + "/pro"', '"/" + locale + "/academy"',
    '/practice?panel=profile', '/practice?panel=services&create=1',
    '/practice?panel=materials&materialTab=courses&create=1',
  ]) assert.ok(feature.includes(value), "Missing route in five-stage flow: " + value);
  const academy = read("app/[locale]/academy/[[...slug]]/page.tsx");
  assert.match(academy, /principles-of-energywork\/learn/);
  assert.match(academy, /reiki\/tantra-reiki\/free-initiation/);
  assert.ok(existsSync(new URL("../app/[locale]/pro/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/[locale]/courses/antistress/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/[locale]/client/tests/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../app/[locale]/wu-xing/page.tsx", import.meta.url)));
  assert.doesNotMatch(feature, /fetch\(|axios|localStorage|sessionStorage|sendBeacon|autoEnroll/);
});

test("step selection stays accessible and one compact detail panel follows it", () => {
  assert.match(feature, /useState<ModuleKey>\("tests"\)/);
  assert.match(feature, /onClick=\{\(\) => setSelected\(id\)\}/);
  assert.match(feature, /aria-pressed=\{selected === id\}/);
  assert.match(feature, /aria-controls="hh-home-module-detail"/);
  assert.match(feature, /role="group"/);
  assert.match(feature, /aria-live="polite"/);
  assert.match(feature, /aria-label=\{t\.modules\[selected\]\.panel\}/);
  assert.match(feature, /data-home-module-action=\{action\.id\}/);
  assert.match(feature, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(css, /\.grid \{ display: grid; grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0,1fr\)\)/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /\.stepNum/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /min-height: 245px|grid-template-columns: clamp\(142px/);
});

test("photos are local; private results, drafts, and progress stay gated", () => {
  for (const photo of [
    "report-lighthouse-coast.webp", "course-focus-mountain-boy.webp",
    "andy-about.png", "reiki-approved-sunrise-v3.webp",
    "portrait-static/andy-828-3dcbabded1e9.webp",
  ]) assert.ok(existsSync(new URL("../public/images/holistic-house/" + photo, import.meta.url)), photo);
  assert.match(feature, /sizes="\(max-width: 640px\) 48px, 56px"/);
  assert.match(feature, /fill unoptimized loading="lazy"/);
  assert.match(feature, /const signedIn = space\?\.status === "ready"/);
  assert.match(feature, /\.\.\.\(signedIn \?/);
  assert.match(feature, /data-home-reports-cta/);
  assert.match(feature, /data-home-development-cta/);
  assert.match(feature, /\/portrait#personal-reports/);
  assert.match(feature, /\/portfolio#hh-development-program/);
  assert.match(feature, /locale === "es" \? "en" : locale/);
  assert.doesNotMatch(feature, /score|symptoms|medicalResults|privateAnswers|testAnswers|diagnosis/);
});

test("free means free; later paid training and practitioner publishing are not overstated", () => {
  assert.match(feature, /initiation is arranged personally/i);
  assert.match(feature, /website checkout and automatic paid access are not live/i);
  assert.match(feature, /public offers require approval/i);
  assert.match(feature, /заявка не означает бронь или оплату/i);
  assert.match(feature, /La iniciación Reiki necesita confirmación personal/i);
  assert.doesNotMatch(feature, /Buy now|Pay now|Purchase|guaranteed certification/i);
});
