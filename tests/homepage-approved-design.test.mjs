import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Dialog-first homepage replaces old 'seven-stage main home retains three real services ' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test("homeopathy card has a complete local illustration instead of the observed broken image", () => {
  const journey = read("components/personal-work-journey.tsx");
  const svg = read("public/images/holistic-house/homeopathy-still-life.svg");
  assert.match(journey, /homeopathy-still-life\.svg/);
  assert.doesNotMatch(journey, /distance-homeopathy\.webp/);
  assert.match(svg, /<svg /);
  assert.match(svg, /<rect width="960" height="600"/);
  assert.match(svg, /<linearGradient id="amber"/);
  assert.ok(svg.length > 2000);
  assert.match(journey, /hypnotherapy-en-v1\.webp/);
  assert.match(journey, /constellations-en-v1\.webp/);
});

test("Dialog-first homepage replaces old 'approved design uses actual teacher portrait, not ' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test("premium botanical cards are responsive, keyboard-accessible and do not alter full Services", () => {
  const style = read("components/personal-work-journey.module.css");
  const homeStyle = read("app/holistic-house-home.css");
  const leaf = read("public/images/holistic-house/homepage-botanical.svg");
  assert.match(leaf, /<svg /);
  assert.match(style, /\.compact \.intro::after/);
  assert.match(style, /\.compact \.service/);
  assert.match(style, /@media\(max-width:767px\)/);
  assert.match(style, /grid-template-columns:clamp\(106px,29vw,146px\) minmax\(0,1fr\)/);
  assert.match(style, /\.full \.serviceLink/);
  assert.match(style, /:focus-visible/);
  assert.match(homeStyle, /\.house-home--services \.service-home-start__grid/);
  assert.match(homeStyle, /\.house-home--services \.service-home-start-card--learning/);
  assert.match(homeStyle, /\.house-home--services \.home-contact-capture/);
  assert.match(homeStyle, /prefers-reduced-motion:reduce/);
});

test("Dialog-first homepage replaces old 'homepage uses the real blue enquiry chooser instea' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test("Dialog-first homepage replaces old 'home converts visitors through one stage and prese' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

