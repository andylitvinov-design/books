import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Services uses four shorter problem-led cards and keeps details optional", () => {
  const page = read("app/[locale]/services/page.tsx");
  const cards = read("components/services-solutions.tsx");
  const css = read("components/services-solutions.module.css");

  assert.match(page, /<ServicesSolutions locale=/);
  assert.match(cards, /t\.solutions\.map/);
  for (const topic of ["wellbeing", "personal", "goal", "business"]) {
    assert.ok(cards.includes('topic: "' + topic + '"'), "Missing " + topic + " topic");
  }
  assert.match(cards, /Low energy or constant tension/);
  assert.match(cards, /Work & difficult decisions/);
  assert.match(cards, /Отношения и эмоции/);
  assert.match(cards, /Работа и сложные решения/);
  assert.match(cards, /<details className=\{styles\.cardMore\}>/);
  assert.match(cards, /<summary>\{t\.outcomeLabel\}<ChevronDown/);
  assert.ok(cards.indexOf('<details className={styles.cardMore}>') < cards.indexOf('className={styles.cardCta}'));
  assert.match(cards, /free-situation-review\?topic=/);
  assert.match(css, /\.cardMore summary:focus-visible/);
  assert.match(css, /\.cardMore\[open\] summary svg/);
  assert.match(css, /\.cardCta \{margin:0 16px 16px;min-height:47px/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.cardTop \{grid-template-columns:84px/);
  assert.doesNotMatch(cards, /guaranteed cure|homeopathy cures|лечит болезни/i);
});

test("Home and Services have genuinely compact, separate mobile card layouts", () => {
  const home = read("components/holistic-house-home.tsx");
  const journey = read("components/personal-work-journey.tsx");
  const journeyCss = read("components/personal-work-journey.module.css");
  const homeCss = read("app/holistic-house-home.css");

  assert.match(home, /<PersonalWorkJourney locale=\{locale\} variant="compact" \/>/);
  assert.match(home, /heroSecondary: "Explore services"/);
  assert.match(home, /heroSecondary: "Все услуги"/);
  assert.match(journey, /These are three different services\. Unsure\?/);
  assert.match(journey, /Три формата на выбор/);
  assert.match(journeyCss, /\.compact \.service:first-child/);
  assert.match(journeyCss, /min-height:169px/);
  assert.doesNotMatch(journeyCss, /height:103px/);
  assert.match(journeyCss, /\.compact \.focus/);
  assert.match(journeyCss, /\.compact \.serviceLink/);
  assert.match(homeCss, /\.house-home--services \.service-home-start-card/);
  assert.match(homeCss, /\.house-home--services \.service-home-start__grid/);
  assert.match(home, /<HomepageContactCta locale=\{locale\}/);
  assert.match(home, /services\/free-situation-review/);
  assert.match(journey, /slug: "psychohomeopathy"/);
  assert.match(journey, /slug: "imagery-therapy"/);
  assert.match(journey, /slug: "systemic-constellations"/);
});
