import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Dialog-first homepage replaces old 'EN/RU homepage uses only the newly approved presen' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test("Dialog-first homepage replaces old 'EN/RU/ES first screen presents seven visible steps' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

test("canonical TTFB measurement and nonce safety remain intact", () => {
  const meter = read("scripts/measure-hh-public-ttfb.mjs");
  assert.match(meter, /for \(const suffix of \['\/', '\/ru', '\/es'\]\)/);
  assert.doesNotMatch(meter, /for \(const suffix of \['\/\?lang=en', '\/\?lang=ru'\]\)/);
  assert.match(meter, /response\.status !== 200/);
  assert.match(read("middleware.ts"), /private, no-store, max-age=0, must-revalidate/);
  assert.match(read("app/layout.tsx"), /nonce=\{nonce\}/);
  assert.doesNotMatch(read("lib/site-videos/public.ts"), /force-static/);
});
