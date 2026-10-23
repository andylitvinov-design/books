import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const feature = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");

test("all home languages visibly show functional My Tests, My Courses, Reports and Development before direction tiles", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  for (const source of [home, es]) {
    assert.match(source, /<HomeFeaturedWorkspace locale=/);
    assert.ok(source.indexOf("<HomeConversationGuide") < source.indexOf("<HomePersonalSpaceCard"));
    assert.ok(source.indexOf("<HomePersonalSpaceCard") < source.indexOf("<HomeFeaturedWorkspace"));
    assert.ok(source.indexOf("<HomeFeaturedWorkspace") < source.indexOf("<HomepageTopicJourneys"));
    assert.ok(source.indexOf("<HomepageTopicJourneys") < source.indexOf("<HomeMoreDisclosure"));
  }
  for (const id of ["tests","courses","reports","development"]) {
    assert.ok(feature.includes('data-home-feature="' + id + '"'), id);
  }
  assert.match(feature, /data-home-featured-workspace/);
  assert.match(feature, /Discover. Learn. Grow./);
  assert.match(feature, /Узнавайте себя. Учитесь. Развивайтесь./);
  assert.match(feature, /Descubre. Aprende. Crece./);
});

test("self-check topic chips use only allowlisted public explorer focus and have functioning destinations", () => {
  const topics = read("lib/assessments/test-recommendations.js");
  for (const key of ["stress","resources","relationships","attention"]) {
    assert.ok(feature.includes('key: "' + key + '"'));
    assert.ok(topics.includes("key: '" + key + "'"));
  }
  assert.match(feature, /client\/tests\?focus=/);
  assert.match(feature, /data-home-test-topic/);
  assert.match(feature, /data-home-tests-cta/);
  assert.ok(existsSync(new URL("../app/[locale]/client/tests/page.tsx", import.meta.url)));
  assert.match(feature, /myTests/);
});

test("all three course offers target existing app and Academy routes, without creating fake enrollments", () => {
  for (const id of ["opora","reiki","business"]) assert.ok(feature.includes('id: "' + id + '"'));
  const publicCourse = read("app/[locale]/courses/antistress/page.tsx");
  const academyRoute = read("app/[locale]/academy/[[...slug]]/page.tsx");
  const accountRoute = read("app/[locale]/app/[[...path]]/page.jsx");
  assert.match(feature, /courses\/antistress/);
  assert.match(publicCourse, /PublicAntistressLanding/);
  assert.match(feature, /academy\/principles-of-energywork\/learn/);
  assert.match(academyRoute, /EnergyworkAiLearner/);
  assert.match(feature, /accountRoot \+ "\/business"/);
  assert.match(accountRoute, /business/);
  assert.match(feature, /course\?view=courses/);
  assert.match(feature, /course\?courseId=/);
  assert.match(feature, /data-home-academy-cta/);
  assert.doesNotMatch(feature, /fetch\(|\.post\(|localStorage|sessionStorage|sendBeacon/);
});

test("signed-in actions are conditional and non-authenticated HTML never renders private values", () => {
  const space = read("components/home-personal-space.tsx");
  assert.match(space, /export function useHomePersonalSpace/);
  assert.match(feature, /space\?\.status === "ready"/);
  assert.match(feature, /signedIn &&/);
  assert.match(feature, /space\?\.summary\?\.professional/);
  assert.match(feature, /\/portrait#personal-reports/);
  assert.match(feature, /\/portfolio#hh-development-program/);
  assert.match(feature, /data-home-my-tests/);
  assert.match(feature, /data-home-my-courses/);
  assert.doesNotMatch(feature, /testScore|diagnosis|\bmedicalResults\b|healthData|personalAnswers/);
});

test("photographic blocks are compact, accessible, budget-safe and mobile friendly", () => {
  for (const img of [
    "public/images/holistic-house/report-lighthouse-coast.webp",
    "public/images/holistic-house/course-focus-mountain-boy.webp",
  ]) assert.ok(existsSync(new URL("../" + img, import.meta.url)), img);
  assert.match(feature, /fill unoptimized loading="lazy"/);
  assert.match(feature, /aria-label=\{t.chooseFocus\}/);
  assert.match(feature, /aria-labelledby="hh-home-features-title"/);
  assert.match(css, /grid-template-columns: clamp\(142px, 21%, 232px\) minmax\(0,1fr\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
